import { describe, expect, it } from "vitest";
import { InvalidMediaError, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, validateMedia, validateMediaDeclaration, validateMediaSignature } from "./media-validation";

const onePixelPng = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
);

describe("validateMedia", () => {
  it("aceita imagem cujo conteudo corresponde ao MIME", async () => {
    await expect(validateMedia(onePixelPng, "image/png")).resolves.toMatchObject({ kind: "image", mimeType: "image/png" });
  });

  it("rejeita divergencia entre MIME declarado e conteudo", async () => {
    await expect(validateMedia(onePixelPng, "audio/mpeg")).rejects.toBeInstanceOf(InvalidMediaError);
  });

  it("rejeita arquivo desconhecido", async () => {
    await expect(validateMedia(new TextEncoder().encode("nao e midia"), "image/png")).rejects.toBeInstanceOf(InvalidMediaError);
  });

  it("aplica limites separados para imagem e audio", () => {
    expect(validateMediaDeclaration(MAX_IMAGE_BYTES, "image/png")).toEqual({ kind: "image", mimeType: "image/png" });
    expect(validateMediaDeclaration(MAX_AUDIO_BYTES, "audio/mpeg")).toEqual({ kind: "audio", mimeType: "audio/mpeg" });
    expect(() => validateMediaDeclaration(MAX_IMAGE_BYTES + 1, "image/png")).toThrow(InvalidMediaError);
    expect(() => validateMediaDeclaration(MAX_AUDIO_BYTES + 1, "audio/mpeg")).toThrow(InvalidMediaError);
  });

  it("valida a assinatura usando apenas o prefixo e o tamanho confirmado", async () => {
    await expect(validateMediaSignature(onePixelPng.slice(0, 32), "image/png", onePixelPng.byteLength)).resolves.toMatchObject({ kind: "image", mimeType: "image/png" });
  });
});
