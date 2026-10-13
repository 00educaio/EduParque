import "server-only";

import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";

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

function storeRoot() {
  return resolve(process.env.TEAM_IMAGE_TEMP_DIR || join(tmpdir(), "eduparque-team-images"));
}

function safePath(...parts: string[]) {
  const root = storeRoot();
  const target = resolve(root, ...parts);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error("Chave temporaria invalida.");
  return target;
}

function imagePath(sessionId: string, teamId: string) {
  return safePath(sessionId, `${teamId}.image`);
}

function metadataPath(sessionId: string, teamId: string) {
  return safePath(sessionId, `${teamId}.json`);
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
  const directory = safePath(input.sessionId);
  const target = imagePath(input.sessionId, input.teamId);
  const metadata: TeamImageMetadata = { contentType, byteSize: input.body.byteLength, updatedAt: new Date().toISOString() };
  const temporaryTarget = `${target}.${randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporaryTarget, input.body);
  await rename(temporaryTarget, target);
  await writeFile(metadataPath(input.sessionId, input.teamId), JSON.stringify(metadata));
  return metadata;
}

export async function getTemporaryTeamImage(sessionId: string, teamId: string) {
  const [body, metadata] = await Promise.all([
    readFile(imagePath(sessionId, teamId)),
    readFile(metadataPath(sessionId, teamId), "utf8").then((value) => JSON.parse(value) as TeamImageMetadata),
  ]);
  return { body, ...metadata };
}

export async function listTemporaryTeamImageIds(sessionId: string) {
  const files = await readdir(safePath(sessionId)).catch(() => [] as string[]);
  return files.filter((filename) => filename.endsWith(".json")).map((filename) => filename.slice(0, -5));
}

export async function deleteTemporaryTeamImage(sessionId: string, teamId: string) {
  await Promise.all([
    rm(imagePath(sessionId, teamId), { force: true }),
    rm(metadataPath(sessionId, teamId), { force: true }),
  ]);
}

export async function deleteTemporaryTeamImages(sessionId: string) {
  await rm(safePath(sessionId), { recursive: true, force: true });
}

export async function cleanupExpiredTemporaryTeamImages(now = Date.now()) {
  const root = storeRoot();
  const ttl = Number(process.env.TEAM_IMAGE_TTL_MS) || DEFAULT_TTL_MS;
  const directories = await readdir(root, { withFileTypes: true }).catch(() => []);
  await Promise.all(directories.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const directory = safePath(entry.name);
    const details = await stat(directory).catch(() => undefined);
    if (details && now - details.mtimeMs > ttl) await rm(directory, { recursive: true, force: true });
  }));
}

export { MAX_TEAM_IMAGE_BYTES };
