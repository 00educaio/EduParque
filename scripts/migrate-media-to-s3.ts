import { fileTypeFromBuffer } from "file-type";
import { eq } from "drizzle-orm";
import { db, sql } from "../src/shared/infrastructure/database/client";
import { mediaAssets } from "../src/shared/infrastructure/database/schema";
import type { StorageProvider } from "../src/modules/media/domain/storage-provider";
import { LocalStorageProvider } from "../src/modules/media/infrastructure/local-storage-provider";
import { S3CompatibleStorageProvider } from "../src/modules/media/infrastructure/s3-compatible-storage-provider";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}.`);
  return value;
}

function s3Provider(prefix: "LEGACY_" | "") {
  return new S3CompatibleStorageProvider({
    endpoint: required(`${prefix}S3_ENDPOINT`),
    region: process.env[`${prefix}S3_REGION`] || "us-east-1",
    bucket: required(`${prefix}S3_BUCKET`),
    accessKeyId: required(`${prefix}S3_ACCESS_KEY_ID`),
    secretAccessKey: required(`${prefix}S3_SECRET_ACCESS_KEY`),
    forcePathStyle: process.env[`${prefix}S3_FORCE_PATH_STYLE`] !== "false",
  });
}

function sourceProvider(): StorageProvider {
  if ((process.env.LEGACY_STORAGE_DRIVER || "local") === "s3") return s3Provider("LEGACY_");
  return new LocalStorageProvider(process.env.LEGACY_LOCAL_STORAGE_PATH || process.env.LOCAL_STORAGE_PATH || "./storage");
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.code === "ENOENT" || candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}

async function optionalHead(provider: StorageProvider, key: string) {
  try {
    return await provider.head(key);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const source = sourceProvider();
  const destination = s3Provider("");
  if (process.env.LEGACY_STORAGE_DRIVER === "s3" && process.env.LEGACY_S3_ENDPOINT === process.env.S3_ENDPOINT && process.env.LEGACY_S3_BUCKET === process.env.S3_BUCKET) {
    throw new Error("Origem e destino S3 sao iguais; a migracao foi recusada.");
  }

  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.uploadStatus, "ready"));
  const report = { mode: apply ? "apply" : "dry-run", total: rows.length, planned: 0, copied: 0, alreadyPresent: 0, failed: [] as Array<{ id: string; reason: string }> };
  for (const row of rows) {
    try {
      const sourceHead = await source.head(row.storageKey);
      if (sourceHead.contentLength !== row.byteSize) throw new Error(`tamanho da origem ${sourceHead.contentLength}, esperado ${row.byteSize}`);
      const existing = await optionalHead(destination, row.storageKey);
      if (existing) {
        if (existing.contentLength !== row.byteSize || existing.contentType.split(";", 1)[0]!.toLowerCase() !== row.mimeType.toLowerCase()) throw new Error("objeto divergente ja existe no destino");
        report.alreadyPresent += 1;
        continue;
      }
      report.planned += 1;
      if (!apply) continue;

      const object = await source.get(row.storageKey);
      const detected = await fileTypeFromBuffer(object.body.slice(0, 4_100));
      const detectedMime = detected?.mime === "audio/x-wav" ? "audio/wav" : detected?.mime;
      if (!detectedMime || detectedMime !== row.mimeType) throw new Error("assinatura da origem diverge do metadado");
      await destination.put({ key: row.storageKey, body: object.body, contentType: row.mimeType });
      const copied = await destination.head(row.storageKey);
      if (copied.contentLength !== row.byteSize || copied.contentType.split(";", 1)[0]!.toLowerCase() !== row.mimeType.toLowerCase()) throw new Error("validacao pos-copia falhou");
      report.copied += 1;
    } catch (error) {
      report.failed.push({ id: row.id, reason: error instanceof Error ? error.message : "erro desconhecido" });
    }
  }

  console.info(JSON.stringify(report, null, 2));
  if (report.failed.length) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error("Falha ao migrar midias.", error);
  process.exitCode = 1;
}).finally(() => sql.end());
