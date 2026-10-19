import { describe, expect, it } from "vitest";
import { InvalidMediaError, MAX_MEDIA_BYTES, validateMedia } from "./media-validation";

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

  it("rejeita arquivos acima de 5 MB", async () => {
    const oversized = new Uint8Array(MAX_MEDIA_BYTES + 1);
    oversized.set(onePixelPng.subarray(0, 32));
    await expect(validateMedia(oversized, "image/png")).rejects.toThrow("5 MB");
  });
});
