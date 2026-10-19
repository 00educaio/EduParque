import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_MIME_TYPES = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/flac"]);

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

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

export async function validateMedia(buffer: Uint8Array, declaredMimeType: string): Promise<ValidatedMedia> {
  if (buffer.byteLength === 0) throw new InvalidMediaError("O arquivo esta vazio.");

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) throw new InvalidMediaError("Nao foi possivel reconhecer o formato do arquivo.");

  const detectedMime = detected.mime === "audio/x-wav" ? "audio/wav" : detected.mime;
  const declaredMime = declaredMimeType === "audio/x-wav" ? "audio/wav" : declaredMimeType;
  if (detectedMime !== declaredMime) throw new InvalidMediaError("O conteudo do arquivo nao corresponde ao MIME informado.");

  if (IMAGE_MIME_TYPES.has(detectedMime)) {
    if (buffer.byteLength > MAX_MEDIA_BYTES) throw new InvalidMediaError("Arquivos podem ter no maximo 5 MB.");
    return { kind: "image", mimeType: detectedMime, extension: detected.ext };
  }

  if (AUDIO_MIME_TYPES.has(detectedMime)) {
    if (buffer.byteLength > MAX_MEDIA_BYTES) throw new InvalidMediaError("Arquivos podem ter no maximo 5 MB.");
    return { kind: "audio", mimeType: detectedMime, extension: detected.ext };
  }

  throw new InvalidMediaError("Somente imagens e audios sao permitidos.");
}
