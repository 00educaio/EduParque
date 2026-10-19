import { describe, expect, it } from "vitest";
import { InvalidMediaError, MAX_MEDIA_BYTES, validateMedia, validateMediaDeclaration, validateMediaSignature } from "./media-validation";

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

  it("padroniza o limite de uploads em 5 MiB", () => {
    expect(validateMediaDeclaration(MAX_MEDIA_BYTES, "image/png")).toEqual({ kind: "image", mimeType: "image/png" });
    expect(() => validateMediaDeclaration(MAX_MEDIA_BYTES + 1, "image/png")).toThrow(InvalidMediaError);
  });

  it("valida a assinatura usando apenas o prefixo e o tamanho confirmado", async () => {
    await expect(validateMediaSignature(onePixelPng.slice(0, 32), "image/png", onePixelPng.byteLength)).resolves.toMatchObject({ kind: "image", mimeType: "image/png" });
  });
});
