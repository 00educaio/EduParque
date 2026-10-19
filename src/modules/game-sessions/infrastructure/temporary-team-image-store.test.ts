import { afterAll, describe, expect, it } from "vitest";
import {
  deleteTemporaryTeamImages,
  getTemporaryTeamImage,
  InvalidTeamImageError,
  listTemporaryTeamImageIds,
  putTemporaryTeamImage,
} from "./temporary-team-image-store";

const onePixelPng = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
);

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

databaseDescribe("temporary-team-image-store com PostgreSQL", () => {
  const sessionIds: string[] = [];

  afterAll(async () => {
    await Promise.all(sessionIds.map(deleteTemporaryTeamImages));
  });

  it("grava, lista e remove imagens sem persistir dados de sessao", async () => {
    const sessionId = crypto.randomUUID();
    sessionIds.push(sessionId);
    const teamId = crypto.randomUUID();
    await putTemporaryTeamImage({ sessionId, teamId, body: onePixelPng, declaredMimeType: "image/png" });
    expect(await listTemporaryTeamImageIds(sessionId)).toEqual([teamId]);
    await expect(getTemporaryTeamImage(sessionId, teamId)).resolves.toMatchObject({ contentType: "image/png", byteSize: onePixelPng.byteLength });
    await deleteTemporaryTeamImages(sessionId);
    expect(await listTemporaryTeamImageIds(sessionId)).toEqual([]);
  });

});

describe("validacao de imagens temporarias", () => {
  it("rejeita MIME divergente, formatos fora da lista e arquivos grandes", async () => {
    await expect(putTemporaryTeamImage({ sessionId: crypto.randomUUID(), teamId: crypto.randomUUID(), body: onePixelPng, declaredMimeType: "image/jpeg" })).rejects.toBeInstanceOf(InvalidTeamImageError);
    await expect(putTemporaryTeamImage({ sessionId: crypto.randomUUID(), teamId: crypto.randomUUID(), body: onePixelPng, declaredMimeType: "image/gif" })).rejects.toBeInstanceOf(InvalidTeamImageError);
    const oversized = new Uint8Array(3 * 1024 * 1024 + 1);
    oversized.set(onePixelPng.subarray(0, 32));
    await expect(putTemporaryTeamImage({ sessionId: crypto.randomUUID(), teamId: crypto.randomUUID(), body: oversized, declaredMimeType: "image/png" })).rejects.toBeInstanceOf(InvalidTeamImageError);
  });
});
