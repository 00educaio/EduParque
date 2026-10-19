import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import { getEnv } from "@/shared/infrastructure/config/env";
import { createDatabase } from "./client";
import { mediaAssets, storageObjects } from "./schema";

const env = getEnv();
const root = resolve(env.LOCAL_STORAGE_PATH);
const { db, sql } = createDatabase(env.DATABASE_URL);

function resolveStorageKey(key: string) {
  const path = resolve(root, key);
  if (!path.startsWith(`${root}${sep}`)) throw new Error(`Chave de storage invalida: ${key}`);
  return path;
}

async function main() {
  const assets = await db.select().from(mediaAssets);
  let imported = 0;

  for (const asset of assets) {
    const existing = await db.select({ key: storageObjects.key }).from(storageObjects).where(eq(storageObjects.key, asset.storageKey)).limit(1);
    if (existing.length) continue;
    const content = new Uint8Array(await readFile(resolveStorageKey(asset.storageKey)));
    if (content.byteLength !== asset.byteSize) throw new Error(`Tamanho divergente para ${asset.storageKey}.`);
    await db.insert(storageObjects).values({
      key: asset.storageKey,
      content,
      mimeType: asset.mimeType,
      byteSize: content.byteLength,
    });
    imported += 1;
  }

  await sql.unsafe('alter table "media_assets" validate constraint "media_assets_storage_key_storage_objects_key_fk"');
  console.info(`${imported} objeto(s) local(is) importado(s); integridade validada.`);
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao importar o storage local.", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
