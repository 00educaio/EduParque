import { describe, expect, it } from "vitest";
import {
  InvalidTeamImageError,
  MAX_TEAM_IMAGE_BYTES,
  validateTeamImageDeclaration,
  validateTeamImageSignature,
} from "./temporary-team-image-store";

const onePixelPng = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
);

describe("temporary-team-image-store", () => {
  it("valida imagem pelo MIME, assinatura e limite unificado de 5 MiB", async () => {
    expect(validateTeamImageDeclaration(MAX_TEAM_IMAGE_BYTES, "image/png")).toBe("image/png");
    await expect(validateTeamImageSignature(onePixelPng.slice(0, 32), "image/png", onePixelPng.byteLength)).resolves.toBe("image/png");
  });

  it("rejeita tamanho, MIME divergente e formatos fora da lista", async () => {
    expect(() => validateTeamImageDeclaration(MAX_TEAM_IMAGE_BYTES + 1, "image/png")).toThrow(InvalidTeamImageError);
    await expect(validateTeamImageSignature(onePixelPng, "image/jpeg", onePixelPng.byteLength)).rejects.toBeInstanceOf(InvalidTeamImageError);
    expect(() => validateTeamImageDeclaration(onePixelPng.byteLength, "image/gif")).toThrow(InvalidTeamImageError);
  });
});
