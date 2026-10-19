import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { storageObjects } from "@/shared/infrastructure/database/schema";
import {
  PostgresStorageProvider,
  StorageObjectNotFoundError,
  StorageQuotaExceededError,
} from "./postgres-storage-provider";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const { db, sql } = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("PostgresStorageProvider", () => {
  const keys: string[] = [];

  afterAll(async () => {
    if (keys.length) await db.delete(storageObjects).where(inArray(storageObjects.key, keys));
    await sql.end();
  });

  it("salva, le, substitui e apaga objetos", async () => {
    const key = `tests/storage/${crypto.randomUUID()}`;
    keys.push(key);
    const storage = new PostgresStorageProvider();
    await storage.put({ key, body: new TextEncoder().encode("primeiro"), contentType: "text/plain" });
    await expect(storage.get(key)).resolves.toMatchObject({ contentType: "text/plain", contentLength: 8 });
    await storage.put({ key, body: new TextEncoder().encode("novo"), contentType: "text/plain" });
    expect(new TextDecoder().decode((await storage.get(key)).body)).toBe("novo");
    await storage.delete(key);
    await expect(storage.get(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it("lista e remove por prefixo", async () => {
    const prefix = `tests/prefix/${crypto.randomUUID()}/`;
    const objectKeys = [`${prefix}a`, `${prefix}b`];
    keys.push(...objectKeys);
    const storage = new PostgresStorageProvider();
    await Promise.all(objectKeys.map((key) => storage.put({ key, body: new Uint8Array([1]), contentType: "application/octet-stream" })));
    expect((await storage.listKeys(prefix)).sort()).toEqual(objectKeys);
    await storage.deletePrefix(prefix);
    expect(await storage.listKeys(prefix)).toEqual([]);
  });

  it("expira e limpa objetos vencidos", async () => {
    const key = `tests/expired/${crypto.randomUUID()}`;
    keys.push(key);
    const storage = new PostgresStorageProvider();
    await storage.put({ key, body: new Uint8Array([1]), contentType: "application/octet-stream", expiresAt: new Date(Date.now() - 1_000) });
    await expect(storage.get(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
    expect(await storage.cleanupExpired()).toBeGreaterThanOrEqual(0);
  });

  it("rejeita escrita acima da cota configurada", async () => {
    const storage = new PostgresStorageProvider();
    const currentUsage = await storage.usageBytes();
    const limited = new PostgresStorageProvider(currentUsage + 1);
    const key = `tests/quota/${crypto.randomUUID()}`;
    keys.push(key);
    await expect(limited.put({ key, body: new Uint8Array([1, 2]), contentType: "application/octet-stream" })).rejects.toBeInstanceOf(StorageQuotaExceededError);
  });
});
