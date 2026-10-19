import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import { getEnv } from "@/shared/infrastructure/config/env";
import { db } from "@/shared/infrastructure/database/client";
import { temporaryTeamImages } from "@/shared/infrastructure/database/schema";
import { getStorageProvider } from "@/modules/media/infrastructure/storage";

export const MAX_TEAM_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class InvalidTeamImageError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidTeamImageError";
  }
}

export class TeamImageNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Imagem da equipe nao encontrada.");
    this.name = "TeamImageNotFoundError";
  }
}

export class TeamImageDirectUploadUnavailableError extends Error {
  readonly status = 501;

  constructor() {
    super("Uploads diretos exigem um provider S3 compativel.");
    this.name = "TeamImageDirectUploadUnavailableError";
  }
}

function normalizeMimeType(value: string) {
  return value.toLowerCase().split(";", 1)[0]!.trim();
}

export function validateTeamImageDeclaration(byteSize: number, declaredMimeType: string) {
  if (!Number.isInteger(byteSize) || byteSize <= 0) throw new InvalidTeamImageError("A imagem esta vazia.");
  if (byteSize > MAX_TEAM_IMAGE_BYTES) throw new InvalidTeamImageError("A imagem da equipe pode ter no maximo 5 MiB.");
  const contentType = normalizeMimeType(declaredMimeType);
  if (!SUPPORTED_MIME_TYPES.has(contentType)) throw new InvalidTeamImageError("Use uma imagem PNG, JPG/JPEG ou WebP.");
  return contentType;
}

export async function validateTeamImageSignature(prefix: Uint8Array, declaredMimeType: string, byteSize: number) {
  const contentType = validateTeamImageDeclaration(byteSize, declaredMimeType);
  const detected = await fileTypeFromBuffer(prefix);
  if (!detected || !SUPPORTED_MIME_TYPES.has(detected.mime)) throw new InvalidTeamImageError("O arquivo nao e uma imagem PNG, JPG/JPEG ou WebP valida.");
  if (detected.mime !== contentType) throw new InvalidTeamImageError("O conteudo da imagem nao corresponde ao tipo informado.");
  return contentType;
}

function pendingExpiry() {
  return new Date(Date.now() + getEnv().MEDIA_PENDING_TTL_MINUTES * 60_000);
}

function readyExpiry() {
  return new Date(Date.now() + getEnv().TEAM_IMAGE_TTL_HOURS * 60 * 60_000);
}

export async function beginTemporaryTeamImageUpload(input: { sessionId: string; teamId: string; declaredMimeType: string; byteSize: number }) {
  const contentType = validateTeamImageDeclaration(input.byteSize, input.declaredMimeType);
  const storage = getStorageProvider();
  if (!storage.createPresignedPutUrl) throw new TeamImageDirectUploadUnavailableError();

  const id = randomUUID();
  const storageKey = `temporary/team-images/${input.sessionId}/${input.teamId}/${id}`;
  const [previousPending] = await db.select().from(temporaryTeamImages).where(and(
    eq(temporaryTeamImages.sessionId, input.sessionId),
    eq(temporaryTeamImages.teamId, input.teamId),
    eq(temporaryTeamImages.uploadStatus, "pending"),
  )).limit(1);

  await db.transaction(async (tx) => {
    await tx.delete(temporaryTeamImages).where(and(
      eq(temporaryTeamImages.sessionId, input.sessionId),
      eq(temporaryTeamImages.teamId, input.teamId),
      eq(temporaryTeamImages.uploadStatus, "pending"),
    ));
    await tx.insert(temporaryTeamImages).values({ id, sessionId: input.sessionId, teamId: input.teamId, storageKey, contentType, byteSize: input.byteSize, uploadStatus: "pending", expiresAt: pendingExpiry() });
  });

  if (previousPending) await storage.delete(previousPending.storageKey).catch(console.error);
  try {
    const uploadUrl = await storage.createPresignedPutUrl({
      key: storageKey,
      contentType,
      contentLength: input.byteSize,
      expiresInSeconds: getEnv().MEDIA_UPLOAD_URL_TTL_SECONDS,
      metadata: { "upload-id": id },
    });
    return { id, uploadUrl, uploadHeaders: { "Content-Type": contentType, "If-None-Match": "*" } };
  } catch (error) {
    await db.delete(temporaryTeamImages).where(eq(temporaryTeamImages.id, id));
    throw error;
  }
}

export async function completeTemporaryTeamImageUpload(input: { sessionId: string; teamId: string; uploadId: string }) {
  const [pending] = await db.select().from(temporaryTeamImages).where(and(
    eq(temporaryTeamImages.id, input.uploadId),
    eq(temporaryTeamImages.sessionId, input.sessionId),
    eq(temporaryTeamImages.teamId, input.teamId),
    eq(temporaryTeamImages.uploadStatus, "pending"),
  )).limit(1);
  if (!pending) throw new InvalidTeamImageError("Upload pendente nao encontrado.");
  if (pending.expiresAt.getTime() < Date.now()) throw new InvalidTeamImageError("O upload expirou. Inicie um novo envio.");

  const storage = getStorageProvider();
  const object = await storage.head(pending.storageKey).catch(() => { throw new InvalidTeamImageError("O objeto enviado nao foi encontrado."); });
  const contentType = normalizeMimeType(object.contentType);
  if (object.contentLength !== pending.byteSize) throw new InvalidTeamImageError("O tamanho enviado nao corresponde ao upload autorizado.");
  if (contentType !== pending.contentType) throw new InvalidTeamImageError("O tipo enviado nao corresponde ao upload autorizado.");
  if (object.metadata?.["upload-id"] !== pending.id) throw new InvalidTeamImageError("A assinatura do upload nao corresponde ao objeto autorizado.");
  await validateTeamImageSignature(await storage.getPrefix(pending.storageKey, 4_100), contentType, object.contentLength);

  const [previousReady] = await db.select().from(temporaryTeamImages).where(and(
    eq(temporaryTeamImages.sessionId, input.sessionId),
    eq(temporaryTeamImages.teamId, input.teamId),
    eq(temporaryTeamImages.uploadStatus, "ready"),
  )).limit(1);
  const [ready] = await db.transaction(async (tx) => {
    await tx.delete(temporaryTeamImages).where(and(
      eq(temporaryTeamImages.sessionId, input.sessionId),
      eq(temporaryTeamImages.teamId, input.teamId),
      eq(temporaryTeamImages.uploadStatus, "ready"),
    ));
    return tx.update(temporaryTeamImages).set({ uploadStatus: "ready", expiresAt: readyExpiry(), updatedAt: new Date() })
      .where(and(eq(temporaryTeamImages.id, pending.id), eq(temporaryTeamImages.uploadStatus, "pending"))).returning();
  });
  if (!ready) throw new InvalidTeamImageError("O upload ja foi finalizado ou removido.");
  if (previousReady) await storage.delete(previousReady.storageKey).catch(console.error);
  return ready;
}

export async function putTemporaryTeamImage(input: { sessionId: string; teamId: string; body: Uint8Array; declaredMimeType: string }) {
  const contentType = await validateTeamImageSignature(input.body, input.declaredMimeType, input.body.byteLength);
  const storage = getStorageProvider();
  const storageKey = `temporary/team-images/${input.sessionId}/${input.teamId}/${randomUUID()}`;
  await storage.put({ key: storageKey, body: input.body, contentType });
  const [previousReady] = await db.select().from(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, input.sessionId), eq(temporaryTeamImages.teamId, input.teamId), eq(temporaryTeamImages.uploadStatus, "ready"))).limit(1);
  try {
    const [stored] = await db.transaction(async (tx) => {
      await tx.delete(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, input.sessionId), eq(temporaryTeamImages.teamId, input.teamId), eq(temporaryTeamImages.uploadStatus, "ready")));
      return tx.insert(temporaryTeamImages).values({ sessionId: input.sessionId, teamId: input.teamId, storageKey, contentType, byteSize: input.body.byteLength, uploadStatus: "ready", expiresAt: readyExpiry() }).returning();
    });
    if (!stored) throw new Error("Falha ao registrar a imagem temporaria.");
    if (previousReady) await storage.delete(previousReady.storageKey).catch(console.error);
    return stored;
  } catch (error) {
    await storage.delete(storageKey).catch(console.error);
    throw error;
  }
}

export async function getTemporaryTeamImage(sessionId: string, teamId: string) {
  const [record] = await db.select().from(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, sessionId), eq(temporaryTeamImages.teamId, teamId), eq(temporaryTeamImages.uploadStatus, "ready"))).limit(1);
  if (!record) throw new TeamImageNotFoundError();
  const storage = getStorageProvider();
  const readUrl = storage.createPresignedGetUrl ? await storage.createPresignedGetUrl(record.storageKey, getEnv().MEDIA_READ_URL_TTL_SECONDS) : undefined;
  return { record, storage, readUrl };
}

export async function listTemporaryTeamImageIds(sessionId: string) {
  const rows = await db.select({ teamId: temporaryTeamImages.teamId }).from(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, sessionId), eq(temporaryTeamImages.uploadStatus, "ready")));
  return rows.map((row) => row.teamId);
}

export async function deleteTemporaryTeamImage(sessionId: string, teamId: string) {
  const rows = await db.select().from(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, sessionId), eq(temporaryTeamImages.teamId, teamId)));
  const storage = getStorageProvider();
  await Promise.all(rows.map((row) => storage.delete(row.storageKey)));
  await db.delete(temporaryTeamImages).where(and(eq(temporaryTeamImages.sessionId, sessionId), eq(temporaryTeamImages.teamId, teamId)));
}

export async function deleteTemporaryTeamImages(sessionId: string) {
  const rows = await db.select().from(temporaryTeamImages).where(eq(temporaryTeamImages.sessionId, sessionId));
  const storage = getStorageProvider();
  await Promise.all(rows.map((row) => storage.delete(row.storageKey)));
  await db.delete(temporaryTeamImages).where(eq(temporaryTeamImages.sessionId, sessionId));
}

export async function cleanupExpiredTemporaryTeamImages(now = new Date()) {
  const expired = await db.select().from(temporaryTeamImages).where(lt(temporaryTeamImages.expiresAt, now)).limit(100);
  const storage = getStorageProvider();
  let deleted = 0;
  for (const row of expired) {
    await storage.delete(row.storageKey);
    const removed = await db.delete(temporaryTeamImages).where(and(eq(temporaryTeamImages.id, row.id), lt(temporaryTeamImages.expiresAt, now))).returning({ id: temporaryTeamImages.id });
    deleted += removed.length;
  }
  return deleted;
}
