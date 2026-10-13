import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

describe("temporary-team-image-store", () => {
  let directory = "";

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "eduparque-team-image-test-"));
    process.env.TEAM_IMAGE_TEMP_DIR = directory;
  });

  afterEach(async () => {
    delete process.env.TEAM_IMAGE_TEMP_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it("grava, lista e remove imagens sem persistir dados de sessao", async () => {
    const sessionId = crypto.randomUUID();
    const teamId = crypto.randomUUID();
    await putTemporaryTeamImage({ sessionId, teamId, body: onePixelPng, declaredMimeType: "image/png" });
    expect(await listTemporaryTeamImageIds(sessionId)).toEqual([teamId]);
    await expect(getTemporaryTeamImage(sessionId, teamId)).resolves.toMatchObject({ contentType: "image/png", byteSize: onePixelPng.byteLength });
    await deleteTemporaryTeamImages(sessionId);
    expect(await listTemporaryTeamImageIds(sessionId)).toEqual([]);
  });

  it("rejeita MIME divergente e formatos fora da lista", async () => {
    await expect(putTemporaryTeamImage({ sessionId: crypto.randomUUID(), teamId: crypto.randomUUID(), body: onePixelPng, declaredMimeType: "image/jpeg" })).rejects.toBeInstanceOf(InvalidTeamImageError);
    await expect(putTemporaryTeamImage({ sessionId: crypto.randomUUID(), teamId: crypto.randomUUID(), body: onePixelPng, declaredMimeType: "image/gif" })).rejects.toBeInstanceOf(InvalidTeamImageError);
  });
});
