import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/shared/infrastructure/database/client";
import { activities, mediaAssets, users } from "@/shared/infrastructure/database/schema";
import { ForbiddenError } from "@/modules/auth/application/policies";
import { getStorageProvider } from "@/modules/media/infrastructure/storage";

export class AdminResourceNotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Registro nao encontrado.") { super(message); this.name = "AdminResourceNotFoundError"; }
}

export class AdminResourceConflictError extends Error {
  readonly status = 409;
  constructor(message: string) { super(message); this.name = "AdminResourceConflictError"; }
}

export async function listUsers(search = "") {
  const term = search.trim().slice(0, 120);
  return db.select({
    id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt,
    activityCount: sql<number>`count(${activities.id})::int`,
  }).from(users).leftJoin(activities, and(eq(activities.ownerId, users.id), isNull(activities.deletedAt)))
    .where(term ? or(ilike(users.email, `%${term}%`), ilike(users.name, `%${term}%`)) : undefined)
    .groupBy(users.id).orderBy(asc(users.email)).limit(100);
}

export async function setUserRole(targetId: string, role: "USER" | "ADMIN", actorId: string) {
  if (targetId === actorId && role !== "ADMIN") throw new ForbiddenError("Voce nao pode remover seu proprio acesso administrativo.");
  const [updated] = await db.update(users).set({
    role,
    authVersion: sql`${users.authVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(users.id, targetId)).returning({ id: users.id, role: users.role });
  if (!updated) throw new AdminResourceNotFoundError("Usuario nao encontrado.");
  return updated;
}

export async function removeUser(targetId: string, actorId: string) {
  if (targetId === actorId) throw new ForbiddenError("Voce nao pode remover sua propria conta pelo painel.");
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) throw new AdminResourceNotFoundError("Usuario nao encontrado.");
  if (target.role === "ADMIN") throw new ForbiddenError("Rebaixe o administrador para USER antes de remove-lo.");
  const ownedMedia = await db.select({ storageKey: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.ownerId, targetId));
  try {
    await db.delete(users).where(eq(users.id, targetId));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      throw new AdminResourceConflictError("Este usuario possui publicacoes ou chamados que precisam ser preservados. Bloqueie o acesso ou transfira os registros antes de remover a conta.");
    }
    throw error;
  }
  const storage = getStorageProvider();
  const cleanup = await Promise.allSettled(ownedMedia.map((asset) => storage.delete(asset.storageKey)));
  cleanup.forEach((result, index) => {
    if (result.status === "rejected") console.error(`Falha ao remover objeto da conta excluida: ${ownedMedia[index]!.storageKey}.`, result.reason);
  });
}

export async function listActivities(search = "") {
  const term = search.trim().slice(0, 120);
  return db.select({
    id: activities.id, title: activities.title, slug: activities.slug, visibility: activities.visibility,
    currentPublishedRevision: activities.currentPublishedRevision, deletedAt: activities.deletedAt,
    updatedAt: activities.updatedAt, ownerId: activities.ownerId, ownerName: users.name, ownerEmail: users.email,
  }).from(activities).innerJoin(users, eq(users.id, activities.ownerId))
    .where(term ? or(ilike(activities.title, `%${term}%`), ilike(activities.slug, `%${term}%`), ilike(users.email, `%${term}%`)) : undefined)
    .orderBy(desc(activities.updatedAt)).limit(100);
}

export async function setActivityHidden(activityId: string, hidden: boolean) {
  const [updated] = await db.update(activities).set({
    deletedAt: hidden ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(activities.id, activityId)).returning({ id: activities.id, deletedAt: activities.deletedAt });
  if (!updated) throw new AdminResourceNotFoundError("Atividade nao encontrada.");
  return updated;
}
