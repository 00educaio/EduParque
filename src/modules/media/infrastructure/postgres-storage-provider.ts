import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDatabase } from "@/shared/infrastructure/database/client";
import { storageObjects } from "@/shared/infrastructure/database/schema";
import type { PutObjectInput, StorageProvider, StoredObject } from "../domain/storage-provider";

export const POSTGRES_STORAGE_QUOTA_BYTES = 250 * 1024 * 1024;

export class StorageObjectNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Objeto nao encontrado no storage.");
    this.name = "StorageObjectNotFoundError";
  }
}

export class StorageQuotaExceededError extends Error {
  readonly status = 413;

  constructor() {
    super("A cota total de arquivos do prototipo foi atingida.");
    this.name = "StorageQuotaExceededError";
  }
}

export class PostgresStorageProvider implements StorageProvider {
  constructor(private readonly quotaBytes = POSTGRES_STORAGE_QUOTA_BYTES) {}

  async put(input: PutObjectInput): Promise<void> {
    const { db } = getDatabase();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('eduparque-storage-quota'))`);
      const [usage] = await tx
        .select({
          bytes: sql<number>`coalesce(sum(${storageObjects.byteSize}), 0)::integer`,
          replacedBytes: sql<number>`coalesce(max(case when ${storageObjects.key} = ${input.key} then ${storageObjects.byteSize} else 0 end), 0)::integer`,
        })
        .from(storageObjects);
      const nextUsage = Number(usage?.bytes ?? 0) - Number(usage?.replacedBytes ?? 0) + input.body.byteLength;
      if (nextUsage > this.quotaBytes) throw new StorageQuotaExceededError();

      await tx
        .insert(storageObjects)
        .values({
          key: input.key,
          content: input.body,
          mimeType: input.contentType,
          byteSize: input.body.byteLength,
          expiresAt: input.expiresAt,
        })
        .onConflictDoUpdate({
          target: storageObjects.key,
          set: {
            content: input.body,
            mimeType: input.contentType,
            byteSize: input.body.byteLength,
            updatedAt: new Date(),
            expiresAt: input.expiresAt ?? null,
          },
        });
    });
  }

  async get(key: string): Promise<StoredObject> {
    const { db } = getDatabase();
    const [object] = await db
      .select()
      .from(storageObjects)
      .where(and(eq(storageObjects.key, key), or(isNull(storageObjects.expiresAt), sql`${storageObjects.expiresAt} > now()`)))
      .limit(1);
    if (!object) {
      await db.delete(storageObjects).where(and(eq(storageObjects.key, key), sql`${storageObjects.expiresAt} < now()`));
      throw new StorageObjectNotFoundError();
    }
    return { body: object.content, contentType: object.mimeType, contentLength: object.byteSize };
  }

  async delete(key: string): Promise<void> {
    const { db } = getDatabase();
    await db.delete(storageObjects).where(eq(storageObjects.key, key));
  }

  async listKeys(prefix: string): Promise<string[]> {
    const { db } = getDatabase();
    const rows = await db
      .select({ key: storageObjects.key })
      .from(storageObjects)
      .where(and(sql`starts_with(${storageObjects.key}, ${prefix})`, or(isNull(storageObjects.expiresAt), sql`${storageObjects.expiresAt} > now()`)));
    return rows.map((row) => row.key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    const { db } = getDatabase();
    await db.delete(storageObjects).where(sql`starts_with(${storageObjects.key}, ${prefix})`);
  }

  async cleanupExpired(now = new Date()): Promise<number> {
    const { db } = getDatabase();
    const deleted = await db
      .delete(storageObjects)
      .where(sql`${storageObjects.expiresAt} < ${now.toISOString()}::timestamptz`)
      .returning({ key: storageObjects.key });
    return deleted.length;
  }

  async usageBytes(): Promise<number> {
    const { db } = getDatabase();
    const [usage] = await db.select({ bytes: sql<number>`coalesce(sum(${storageObjects.byteSize}), 0)::integer` }).from(storageObjects);
    return Number(usage?.bytes ?? 0);
  }
}
