import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/shared/infrastructure/database/client";
import { activities, activityRevisions, mediaAssets } from "@/shared/infrastructure/database/schema";
import { activityRevisionSnapshotSchema } from "@/modules/activities/domain/activity-schemas";
import { ForbiddenError } from "@/modules/auth/application/authorization";
import { validateMedia } from "../domain/media-validation";
import { getStorageProvider } from "../infrastructure/storage";

interface UploadMediaInput {
  ownerId: string;
  filename: string;
  declaredMimeType: string;
  body: Uint8Array;
}

export async function uploadMedia(input: UploadMediaInput) {
  const validated = await validateMedia(input.body, input.declaredMimeType);
  const storage = getStorageProvider();
  const key = `${input.ownerId}/${randomUUID()}.${validated.extension}`;

  await storage.put({ key, body: input.body, contentType: validated.mimeType });
  try {
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        ownerId: input.ownerId,
        filename: input.filename.slice(0, 255),
        kind: validated.kind,
        mimeType: validated.mimeType,
        byteSize: input.body.byteLength,
        storageKey: key,
      })
      .returning();
    if (!asset) throw new Error("Falha ao registrar o arquivo.");
    return asset;
  } catch (error) {
    await storage.delete(key);
    throw error;
  }
}

export async function getOwnedMedia(assetId: string, ownerId: string) {
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerId, ownerId))).limit(1);
  if (!asset) throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  return { asset, object: await getStorageProvider().get(asset.storageKey) };
}

function snapshotReferencesAsset(snapshot: unknown, assetId: string) {
  const parsed = activityRevisionSnapshotSchema.safeParse(snapshot);
  if (!parsed.success || parsed.data.visibility === "private") return false;
  return parsed.data.content.some((block) => {
    if (block.type === "prompt-answer" || block.type === "item-list") return block.items.some((item) => item.media?.assetId === assetId);
    if (block.type === "pair") return block.pairs.some((item) => item.media?.assetId === assetId || item.leftMedia?.assetId === assetId || item.rightMedia?.assetId === assetId);
    if (block.type === "categorized-item") return block.categories.some((category) => category.media?.assetId === assetId || category.items.some((item) => item.media?.assetId === assetId));
    return block.sequences.some((item) => item.media?.assetId === assetId);
  });
}

export async function getReadableMedia(assetId: string, viewerId?: string) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset) throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  if (asset.ownerId !== viewerId) {
    const candidates = await db.select({ snapshot: activityRevisions.snapshot })
      .from(activityRevisions)
      .innerJoin(activities, and(eq(activities.id, activityRevisions.activityId), eq(activities.currentPublishedRevision, activityRevisions.revision)))
      .where(and(isNull(activities.deletedAt), sql`${activityRevisions.snapshot}::text like ${`%${assetId}%`}`));
    if (!candidates.some((candidate) => snapshotReferencesAsset(candidate.snapshot, assetId))) throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  }
  return { asset, object: await getStorageProvider().get(asset.storageKey) };
}
