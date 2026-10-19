import { eq } from "drizzle-orm";
import { db, sql } from "../src/shared/infrastructure/database/client";
import { mediaAssets } from "../src/shared/infrastructure/database/schema";
import { getStorageProvider } from "../src/modules/media/infrastructure/storage";

async function main() {
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.uploadStatus, "ready"));
  const storage = getStorageProvider();
  const report = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    totalBytes: rows.reduce((sum, row) => sum + row.byteSize, 0),
    images: rows.filter((row) => row.kind === "image").length,
    audios: rows.filter((row) => row.kind === "audio").length,
    verified: 0,
    missing: [] as string[],
    mismatched: [] as Array<{ id: string; expectedBytes: number; actualBytes: number; expectedType: string; actualType: string }>,
  };

  for (const row of rows) {
    try {
      const object = await storage.head(row.storageKey);
      if (object.contentLength !== row.byteSize || object.contentType.split(";", 1)[0]!.toLowerCase() !== row.mimeType.toLowerCase()) {
        report.mismatched.push({ id: row.id, expectedBytes: row.byteSize, actualBytes: object.contentLength, expectedType: row.mimeType, actualType: object.contentType });
      } else {
        report.verified += 1;
      }
    } catch {
      report.missing.push(row.id);
    }
  }

  console.info(JSON.stringify(report, null, 2));
  if (report.missing.length || report.mismatched.length) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error("Falha ao inventariar midias.", error);
  process.exitCode = 1;
}).finally(() => sql.end());
