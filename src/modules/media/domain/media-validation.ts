import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_MIME_TYPES = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/flac"]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_MEDIA_BYTES = MAX_AUDIO_BYTES;

export class InvalidMediaError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidMediaError";
  }
}

export interface ValidatedMedia {
  kind: "image" | "audio";
  mimeType: string;
  extension: string;
}

function normalizedMimeType(mimeType: string) {
  return mimeType.toLowerCase().split(";", 1)[0]!.trim() === "audio/x-wav" ? "audio/wav" : mimeType.toLowerCase().split(";", 1)[0]!.trim();
}

export function validateMediaDeclaration(byteSize: number, declaredMimeType: string): Pick<ValidatedMedia, "kind" | "mimeType"> {
  if (!Number.isInteger(byteSize) || byteSize <= 0) throw new InvalidMediaError("O arquivo esta vazio.");
  const mimeType = normalizedMimeType(declaredMimeType);
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    if (byteSize > MAX_IMAGE_BYTES) throw new InvalidMediaError("Imagens podem ter no maximo 10 MiB.");
    return { kind: "image", mimeType };
  }
  if (AUDIO_MIME_TYPES.has(mimeType)) {
    if (byteSize > MAX_AUDIO_BYTES) throw new InvalidMediaError("Audios podem ter no maximo 25 MiB.");
    return { kind: "audio", mimeType };
  }
  throw new InvalidMediaError("Somente imagens e audios sao permitidos.");
}

export async function validateMediaSignature(prefix: Uint8Array, declaredMimeType: string, byteSize: number): Promise<ValidatedMedia> {
  const declaration = validateMediaDeclaration(byteSize, declaredMimeType);
  const detected = await fileTypeFromBuffer(prefix);
  if (!detected) throw new InvalidMediaError("Nao foi possivel reconhecer o formato do arquivo.");

  const detectedMime = normalizedMimeType(detected.mime);
  if (detectedMime !== declaration.mimeType) throw new InvalidMediaError("O conteudo do arquivo nao corresponde ao MIME informado.");
  return { ...declaration, extension: detected.ext };
}

export async function validateMedia(buffer: Uint8Array, declaredMimeType: string): Promise<ValidatedMedia> {
  return validateMediaSignature(buffer, declaredMimeType, buffer.byteLength);
}
