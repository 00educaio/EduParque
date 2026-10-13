import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalStorageProvider } from "./local-storage-provider";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("LocalStorageProvider", () => {
  it("grava, le e remove um objeto", async () => {
    const root = await mkdtemp(join(tmpdir(), "eduparque-storage-"));
    roots.push(root);
    const storage = new LocalStorageProvider(root);
    const body = new TextEncoder().encode("arquivo");

    await storage.put({ key: "owner/asset.png", body, contentType: "image/png" });
    await expect(storage.get("owner/asset.png")).resolves.toMatchObject({ contentType: "image/png", contentLength: body.byteLength });
    await storage.delete("owner/asset.png");
    await expect(storage.get("owner/asset.png")).rejects.toThrow();
  });

  it("impede path traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "eduparque-storage-"));
    roots.push(root);
    const storage = new LocalStorageProvider(root);
    await expect(storage.put({ key: "../escape", body: new Uint8Array(), contentType: "image/png" })).rejects.toThrow("invalida");
  });
});
