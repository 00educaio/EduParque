import { randomUUID } from "node:crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/shared/infrastructure/database/client";
import { activities, activityRevisions, mediaAssets } from "@/shared/infrastructure/database/schema";
import { activityRevisionSnapshotSchema } from "@/modules/activities/domain/activity-schemas";
import { ForbiddenError } from "@/modules/auth/application/authorization";
import { getEnv } from "@/shared/infrastructure/config/env";
import { InvalidMediaError, validateMedia, validateMediaDeclaration, validateMediaSignature } from "../domain/media-validation";
import { getStorageProvider } from "../infrastructure/storage";

interface UploadMediaInput {
  ownerId: string;
  filename: string;
  declaredMimeType: string;
  body: Uint8Array;
}

interface BeginMediaUploadInput {
  ownerId: string;
  filename: string;
  declaredMimeType: string;
  byteSize: number;
}

export class DirectUploadUnavailableError extends Error {
  readonly status = 501;
  constructor() { super("Uploads diretos exigem um provider S3 compativel."); this.name = "DirectUploadUnavailableError"; }
}

function safeFilename(filename: string) {
  const normalized = filename.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!normalized) throw new InvalidMediaError("Informe o nome do arquivo.");
  return normalized.slice(0, 255);
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
        filename: safeFilename(input.filename),
        kind: validated.kind,
        mimeType: validated.mimeType,
        byteSize: input.body.byteLength,
        storageKey: key,
        uploadStatus: "ready",
        verifiedAt: new Date(),
      })
      .returning();
    if (!asset) throw new Error("Falha ao registrar o arquivo.");
    return asset;
  } catch (error) {
    await storage.delete(key);
    throw error;
  }
}

export async function beginMediaUpload(input: BeginMediaUploadInput) {
  const validated = validateMediaDeclaration(input.byteSize, input.declaredMimeType);
  const storage = getStorageProvider();
  if (!storage.createPresignedPutUrl) throw new DirectUploadUnavailableError();

  const id = randomUUID();
  const key = `${input.ownerId}/media/${id}`;
  const env = getEnv();
  const expiresAt = new Date(Date.now() + env.MEDIA_PENDING_TTL_MINUTES * 60_000);
  const [asset] = await db.insert(mediaAssets).values({
    id,
    ownerId: input.ownerId,
    filename: safeFilename(input.filename),
    kind: validated.kind,
    mimeType: validated.mimeType,
    byteSize: input.byteSize,
    storageKey: key,
    uploadStatus: "pending",
    uploadExpiresAt: expiresAt,
  }).returning();
  if (!asset) throw new Error("Falha ao preparar o upload.");

  try {
    const uploadUrl = await storage.createPresignedPutUrl({
      key,
      contentType: validated.mimeType,
      contentLength: input.byteSize,
      expiresInSeconds: env.MEDIA_UPLOAD_URL_TTL_SECONDS,
      metadata: { "upload-id": id },
    });
    return {
      asset,
      uploadUrl,
      uploadHeaders: { "Content-Type": validated.mimeType, "If-None-Match": "*" },
      expiresAt: new Date(Date.now() + env.MEDIA_UPLOAD_URL_TTL_SECONDS * 1_000),
    };
  } catch (error) {
    await db.delete(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.uploadStatus, "pending")));
    throw error;
  }
}

export async function finalizeMediaUpload(assetId: string, ownerId: string) {
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerId, ownerId))).limit(1);
  if (!asset) throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  if (asset.uploadStatus === "ready") return asset;
  if (asset.uploadExpiresAt && asset.uploadExpiresAt.getTime() < Date.now()) throw new InvalidMediaError("O upload expirou. Inicie um novo envio.");

  const storage = getStorageProvider();
  const object = await storage.head(asset.storageKey).catch(() => { throw new InvalidMediaError("O objeto enviado nao foi encontrado."); });
  const contentType = object.contentType.toLowerCase().split(";", 1)[0]!.trim();
  if (object.contentLength !== asset.byteSize) throw new InvalidMediaError("O tamanho enviado nao corresponde ao upload autorizado.");
  if (contentType !== asset.mimeType) throw new InvalidMediaError("O tipo enviado nao corresponde ao upload autorizado.");
  if (object.metadata?.["upload-id"] !== asset.id) throw new InvalidMediaError("A assinatura do upload nao corresponde ao objeto autorizado.");
  const prefix = await storage.getPrefix(asset.storageKey, 4_100);
  await validateMediaSignature(prefix, asset.mimeType, object.contentLength);

  const [ready] = await db.update(mediaAssets).set({ uploadStatus: "ready", uploadExpiresAt: null, verifiedAt: new Date() })
    .where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.uploadStatus, "pending"))).returning();
  if (!ready) throw new InvalidMediaError("O upload ja foi finalizado ou removido.");
  return ready;
}

export async function cleanupExpiredPendingMedia(now = new Date()) {
  const expired = await db.select().from(mediaAssets).where(and(eq(mediaAssets.uploadStatus, "pending"), lt(mediaAssets.uploadExpiresAt, now))).limit(100);
  const storage = getStorageProvider();
  let deleted = 0;
  for (const asset of expired) {
    await storage.delete(asset.storageKey);
    const removed = await db.delete(mediaAssets).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.uploadStatus, "pending"), lt(mediaAssets.uploadExpiresAt, now))).returning({ id: mediaAssets.id });
    deleted += removed.length;
  }
  return deleted;
}

function snapshotReferencesAsset(snapshot: unknown, assetId: string) {
  const parsed = activityRevisionSnapshotSchema.safeParse(snapshot);
  if (!parsed.success || parsed.data.visibility === "private") return false;
  const references = (media: { assetId: string } | { source: "external" } | undefined) => Boolean(media && "assetId" in media && media.assetId === assetId);
  return parsed.data.content.some((block) => {
    if (block.type === "prompt-answer" || block.type === "item-list") return block.items.some((item) => references(item.media));
    if (block.type === "pair") return block.pairs.some((item) => references(item.media) || references(item.leftMedia) || references(item.rightMedia));
    if (block.type === "categorized-item") return block.categories.some((category) => references(category.media) || category.items.some((item) => references(item.media)));
    return block.sequences.some((item) => references(item.media));
  });
}

export async function getReadableMedia(assetId: string, viewerId?: string) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset || asset.uploadStatus !== "ready") throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  if (asset.ownerId !== viewerId) {
    const candidates = await db.select({ snapshot: activityRevisions.snapshot })
      .from(activityRevisions)
      .innerJoin(activities, and(eq(activities.id, activityRevisions.activityId), eq(activities.currentPublishedRevision, activityRevisions.revision)))
      .where(and(isNull(activities.deletedAt), sql`${activityRevisions.snapshot}::text like ${`%${assetId}%`}`));
    if (!candidates.some((candidate) => snapshotReferencesAsset(candidate.snapshot, assetId))) throw new ForbiddenError("Midia nao encontrada ou sem acesso.");
  }
  const storage = getStorageProvider();
  const readUrl = storage.createPresignedGetUrl ? await storage.createPresignedGetUrl(asset.storageKey, getEnv().MEDIA_READ_URL_TTL_SECONDS) : undefined;
  return { asset, storage, readUrl };
}
