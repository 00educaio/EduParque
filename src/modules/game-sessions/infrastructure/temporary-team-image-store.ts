import "server-only";

import { fileTypeFromBuffer } from "file-type";
import { PostgresStorageProvider } from "@/modules/media/infrastructure/postgres-storage-provider";

const MAX_TEAM_IMAGE_BYTES = 3 * 1024 * 1024;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class InvalidTeamImageError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidTeamImageError";
  }
}

interface TeamImageMetadata {
  contentType: string;
  byteSize: number;
  updatedAt: string;
}

function imageKey(sessionId: string, teamId: string) {
  return `team-images/${sessionId}/${teamId}`;
}

async function validateImage(body: Uint8Array, declaredMimeType: string) {
  if (!body.byteLength) throw new InvalidTeamImageError("A imagem esta vazia.");
  if (body.byteLength > MAX_TEAM_IMAGE_BYTES) throw new InvalidTeamImageError("A imagem da equipe pode ter no maximo 3 MB.");
  if (!SUPPORTED_MIME_TYPES.has(declaredMimeType)) throw new InvalidTeamImageError("Use uma imagem PNG, JPG/JPEG ou WebP.");
  const detected = await fileTypeFromBuffer(body);
  if (!detected || !SUPPORTED_MIME_TYPES.has(detected.mime)) throw new InvalidTeamImageError("O arquivo nao e uma imagem PNG, JPG/JPEG ou WebP valida.");
  if (detected.mime !== declaredMimeType) throw new InvalidTeamImageError("O conteudo da imagem nao corresponde ao tipo informado.");
  return detected.mime;
}

export async function putTemporaryTeamImage(input: { sessionId: string; teamId: string; body: Uint8Array; declaredMimeType: string }) {
  const contentType = await validateImage(input.body, input.declaredMimeType);
  const storage = new PostgresStorageProvider();
  const now = new Date();
  await storage.cleanupExpired(now);
  await storage.put({
    key: imageKey(input.sessionId, input.teamId),
    body: input.body,
    contentType,
    expiresAt: new Date(now.getTime() + DEFAULT_TTL_MS),
  });
  const metadata: TeamImageMetadata = { contentType, byteSize: input.body.byteLength, updatedAt: now.toISOString() };
  return metadata;
}

export async function getTemporaryTeamImage(sessionId: string, teamId: string) {
  const object = await new PostgresStorageProvider().get(imageKey(sessionId, teamId));
  return { body: object.body, contentType: object.contentType, byteSize: object.contentLength ?? object.body.byteLength };
}

export async function listTemporaryTeamImageIds(sessionId: string) {
  const prefix = `team-images/${sessionId}/`;
  const keys = await new PostgresStorageProvider().listKeys(prefix);
  return keys.map((key) => key.slice(prefix.length));
}

export async function deleteTemporaryTeamImage(sessionId: string, teamId: string) {
  await new PostgresStorageProvider().delete(imageKey(sessionId, teamId));
}

export async function deleteTemporaryTeamImages(sessionId: string) {
  await new PostgresStorageProvider().deletePrefix(`team-images/${sessionId}/`);
}

export async function cleanupExpiredTemporaryTeamImages(now = Date.now()) {
  return new PostgresStorageProvider().cleanupExpired(new Date(now));
}

export { MAX_TEAM_IMAGE_BYTES };
