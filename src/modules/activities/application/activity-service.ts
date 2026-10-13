import "server-only";
import { and, desc, eq, isNull, max, or, sql } from "drizzle-orm";
import { db } from "@/shared/infrastructure/database/client";
import { activities, activityRevisions, favorites, presentations, themes } from "@/shared/infrastructure/database/schema";
import { activityContentSchema } from "@/shared/domain/content-blocks";
import { activityDraftInputSchema, activityRevisionSnapshotSchema, presentationInputSchema, type ActivityDraftInput, type ActivityRevisionSnapshot } from "@/modules/activities/domain/activity-schemas";
import { defaultSystemTheme, resolveTheme } from "@/modules/themes/domain/theme-values";
import { getGameTemplate, parseGameConfig } from "@/modules/game-templates";

export class ActivityNotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Atividade nao encontrada.") { super(message); this.name = "ActivityNotFoundError"; }
}

export class InvalidActivityError extends Error {
  readonly status = 400;
  constructor(message: string) { super(message); this.name = "InvalidActivityError"; }
}

function slugify(title: string) {
  const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "atividade";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createActivity(ownerId: string, title = "Atividade sem titulo") {
  const template = getGameTemplate("quiz");
  return db.transaction(async (tx) => {
    const [activity] = await tx.insert(activities).values({ ownerId, title, slug: slugify(title), draftContent: [] }).returning();
    if (!activity) throw new Error("Falha ao criar atividade.");
    const [presentation] = await tx.insert(presentations).values({
      activityId: activity.id, name: "Quiz", templateKey: template.key,
      gameConfig: template.defaultConfig as Record<string, unknown>, themeOverride: {}, isDefault: true,
    }).returning();
    if (!presentation) throw new Error("Falha ao criar apresentacao.");
    const [updated] = await tx.update(activities).set({ defaultPresentationId: presentation.id }).where(eq(activities.id, activity.id)).returning();
    return { ...updated!, presentations: [presentation] };
  });
}

export async function getOwnedActivity(activityId: string, ownerId: string) {
  const activity = await db.query.activities.findFirst({ where: and(eq(activities.id, activityId), eq(activities.ownerId, ownerId), isNull(activities.deletedAt)) });
  if (!activity) throw new ActivityNotFoundError();
  const activityPresentations = await db.select().from(presentations).where(eq(presentations.activityId, activity.id)).orderBy(presentations.createdAt);
  return { ...activity, presentations: activityPresentations };
}

export async function listOwnedActivities(ownerId: string) {
  return db.select().from(activities).where(and(eq(activities.ownerId, ownerId), isNull(activities.deletedAt))).orderBy(desc(activities.updatedAt));
}

export async function updateDraft(activityId: string, ownerId: string, input: unknown) {
  const parsed = activityDraftInputSchema.parse(input);
  const activity = await getOwnedActivity(activityId, ownerId);
  if (parsed.defaultPresentationId && !activity.presentations.some((item) => item.id === parsed.defaultPresentationId)) {
    throw new InvalidActivityError("A apresentacao padrao precisa pertencer a atividade.");
  }
  const [updated] = await db.update(activities).set({
    title: parsed.title, description: parsed.description, tags: [...new Set(parsed.tags.map((tag) => tag.toLowerCase()))],
    visibility: parsed.visibility, draftContent: parsed.content, defaultPresentationId: parsed.defaultPresentationId, updatedAt: new Date(),
  }).where(and(eq(activities.id, activityId), eq(activities.ownerId, ownerId))).returning();
  return updated!;
}

export async function savePresentation(activityId: string, ownerId: string, input: unknown) {
  const parsed = presentationInputSchema.parse(input);
  await getOwnedActivity(activityId, ownerId);
  getGameTemplate(parsed.templateKey);
  let gameConfig: Record<string, unknown>;
  try { gameConfig = parseGameConfig(parsed.templateKey, parsed.gameConfig); }
  catch { throw new InvalidActivityError("A configuracao do jogo e invalida para o template escolhido."); }

  return db.transaction(async (tx) => {
    let result;
    if (parsed.id) {
      [result] = await tx.update(presentations).set({ name: parsed.name, templateKey: parsed.templateKey, gameConfig, themeOverride: parsed.themeOverride, isDefault: parsed.isDefault, updatedAt: new Date() })
        .where(and(eq(presentations.id, parsed.id), eq(presentations.activityId, activityId))).returning();
      if (!result) throw new ActivityNotFoundError("Apresentacao nao encontrada.");
    } else {
      [result] = await tx.insert(presentations).values({ activityId, name: parsed.name, templateKey: parsed.templateKey, gameConfig, themeOverride: parsed.themeOverride, isDefault: parsed.isDefault }).returning();
    }
    if (parsed.isDefault) {
      await tx.update(presentations).set({ isDefault: false }).where(and(eq(presentations.activityId, activityId), sql`${presentations.id} <> ${result!.id}`));
      await tx.update(activities).set({ defaultPresentationId: result!.id, updatedAt: new Date() }).where(eq(activities.id, activityId));
    }
    return result!;
  });
}

export async function removePresentation(activityId: string, presentationId: string, ownerId: string) {
  const activity = await getOwnedActivity(activityId, ownerId);
  if (activity.presentations.length <= 1) throw new InvalidActivityError("A atividade precisa manter ao menos uma apresentacao.");
  await db.transaction(async (tx) => {
    await tx.delete(presentations).where(and(eq(presentations.id, presentationId), eq(presentations.activityId, activityId)));
    if (activity.defaultPresentationId === presentationId) {
      const replacement = activity.presentations.find((item) => item.id !== presentationId)!;
      await tx.update(presentations).set({ isDefault: true }).where(eq(presentations.id, replacement.id));
      await tx.update(activities).set({ defaultPresentationId: replacement.id }).where(eq(activities.id, activityId));
    }
  });
}

async function getBaseTheme(ownerId: string) {
  const userTheme = await db.query.themes.findFirst({ where: and(eq(themes.ownerId, ownerId), eq(themes.kind, "user")), orderBy: [desc(themes.updatedAt)] });
  return userTheme?.values ?? defaultSystemTheme;
}

export async function publishActivity(activityId: string, ownerId: string) {
  const activity = await getOwnedActivity(activityId, ownerId);
  if (!activity.presentations.length || !activity.defaultPresentationId) throw new InvalidActivityError("Adicione uma apresentacao padrao antes de publicar.");
  if (!activity.presentations.some((item) => item.id === activity.defaultPresentationId)) throw new InvalidActivityError("Selecione uma apresentacao padrao valida.");
  const content = activityContentSchema.parse(activity.draftContent);
  if (!content.length) throw new InvalidActivityError("Adicione conteudo antes de publicar.");
  const baseTheme = await getBaseTheme(ownerId);
  const [latest] = await db.select({ revision: max(activityRevisions.revision) }).from(activityRevisions).where(eq(activityRevisions.activityId, activityId));
  const revisionNumber = (latest?.revision ?? 0) + 1;
  const snapshot: ActivityRevisionSnapshot = activityRevisionSnapshotSchema.parse({
    activityId: activity.id, slug: activity.slug, title: activity.title, description: activity.description,
    tags: activity.tags, visibility: activity.visibility, content, defaultPresentationId: activity.defaultPresentationId,
    presentations: activity.presentations.map((item) => ({ ...item, themeOverride: item.themeOverride })),
    resolvedTheme: resolveTheme(baseTheme, {}), publishedAt: new Date().toISOString(),
  });
  return db.transaction(async (tx) => {
    const [revision] = await tx.insert(activityRevisions).values({ activityId, revision: revisionNumber, snapshot, publishedById: ownerId }).returning();
    await tx.update(activities).set({ currentPublishedRevision: revisionNumber, updatedAt: new Date() }).where(eq(activities.id, activityId));
    return revision!;
  });
}

export async function unpublishActivity(activityId: string, ownerId: string) {
  await getOwnedActivity(activityId, ownerId);
  await db.update(activities).set({ currentPublishedRevision: null, updatedAt: new Date() }).where(eq(activities.id, activityId));
}

export async function deleteActivity(activityId: string, ownerId: string) {
  await getOwnedActivity(activityId, ownerId);
  await db.update(activities).set({ deletedAt: new Date(), currentPublishedRevision: null, updatedAt: new Date() }).where(eq(activities.id, activityId));
}

async function loadPublished(activityId: string) {
  const activity = await db.query.activities.findFirst({ where: and(eq(activities.id, activityId), isNull(activities.deletedAt)) });
  if (!activity?.currentPublishedRevision) throw new ActivityNotFoundError("Esta atividade nao esta publicada.");
  const revision = await db.query.activityRevisions.findFirst({ where: and(eq(activityRevisions.activityId, activityId), eq(activityRevisions.revision, activity.currentPublishedRevision)) });
  if (!revision) throw new ActivityNotFoundError("Revisao publicada nao encontrada.");
  return { activity, revision, snapshot: activityRevisionSnapshotSchema.parse(revision.snapshot) };
}

export async function remixActivity(activityId: string, ownerId: string) {
  const source = await loadPublished(activityId);
  if (source.snapshot.visibility === "private") throw new ActivityNotFoundError();
  return db.transaction(async (tx) => {
    const [copy] = await tx.insert(activities).values({
      ownerId, slug: slugify(source.snapshot.title), title: `${source.snapshot.title} (remix)`, description: source.snapshot.description,
      tags: source.snapshot.tags, visibility: "private", draftContent: source.snapshot.content,
      remixedFromActivityId: source.activity.id, remixedFromRevision: source.revision.revision,
    }).returning();
    if (!copy) throw new Error("Falha ao remixar atividade.");
    let defaultId: string | null = null;
    for (const item of source.snapshot.presentations) {
      const [created] = await tx.insert(presentations).values({ activityId: copy.id, name: item.name, templateKey: item.templateKey, gameConfig: item.gameConfig, themeOverride: resolveTheme(source.snapshot.resolvedTheme, item.themeOverride), isDefault: item.id === source.snapshot.defaultPresentationId }).returning();
      if (item.id === source.snapshot.defaultPresentationId) defaultId = created!.id;
    }
    await tx.update(activities).set({ defaultPresentationId: defaultId }).where(eq(activities.id, copy.id));
    return { ...copy, defaultPresentationId: defaultId };
  });
}

export async function getPublicActivityBySlug(slug: string, viewerId?: string) {
  const activity = await db.query.activities.findFirst({ where: and(eq(activities.slug, slug), isNull(activities.deletedAt)) });
  if (!activity?.currentPublishedRevision) throw new ActivityNotFoundError();
  const loaded = await loadPublished(activity.id);
  if (loaded.snapshot.visibility === "private" && activity.ownerId !== viewerId) throw new ActivityNotFoundError();
  return loaded;
}

export async function listPublicActivities(search = "", userId?: string) {
  const term = search.trim();
  const rows = await db.select({ activity: activities, revision: activityRevisions })
    .from(activities)
    .innerJoin(activityRevisions, and(eq(activityRevisions.activityId, activities.id), eq(activityRevisions.revision, activities.currentPublishedRevision)))
    .where(and(isNull(activities.deletedAt), sql`${activityRevisions.snapshot}->>'visibility' = 'public'`, term ? or(
      sql`${activityRevisions.snapshot}->>'title' ILIKE ${`%${term}%`}`,
      sql`${activityRevisions.snapshot}->>'description' ILIKE ${`%${term}%`}`,
      sql`(${activityRevisions.snapshot}->'tags')::text ILIKE ${`%${term}%`}`,
    ) : undefined))
    .orderBy(desc(activityRevisions.createdAt)).limit(60);
  const favoriteIds = userId ? new Set((await db.select({ activityId: favorites.activityId }).from(favorites).where(eq(favorites.userId, userId))).map((item) => item.activityId)) : new Set<string>();
  return rows.flatMap(({ activity, revision }) => {
    const result = activityRevisionSnapshotSchema.safeParse(revision.snapshot);
    return result.success && result.data.visibility === "public" ? [{ id: activity.id, slug: activity.slug, snapshot: result.data, isFavorite: favoriteIds.has(activity.id) }] : [];
  });
}

export async function setFavorite(activityId: string, userId: string, enabled: boolean) {
  const published = await loadPublished(activityId);
  if (published.snapshot.visibility !== "public") throw new ActivityNotFoundError();
  if (enabled) await db.insert(favorites).values({ activityId, userId }).onConflictDoNothing();
  else await db.delete(favorites).where(and(eq(favorites.activityId, activityId), eq(favorites.userId, userId)));
}

export async function isActivityFavorite(activityId: string, userId?: string) {
  if (!userId) return false;
  return Boolean(await db.query.favorites.findFirst({ where: and(eq(favorites.activityId, activityId), eq(favorites.userId, userId)) }));
}

export function toEditorDraft(activity: Awaited<ReturnType<typeof getOwnedActivity>>): ActivityDraftInput {
  return activityDraftInputSchema.parse({ title: activity.title, description: activity.description, tags: activity.tags, visibility: activity.visibility, content: activity.draftContent, defaultPresentationId: activity.defaultPresentationId });
}
