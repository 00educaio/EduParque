import { getEnv } from "@/shared/infrastructure/config/env";
import type { StorageProvider } from "../domain/storage-provider";
import { PostgresStorageProvider } from "./postgres-storage-provider";

export async function getStorageProvider(): Promise<StorageProvider> {
  const env = getEnv();

  if (env.STORAGE_DRIVER === "postgres") return new PostgresStorageProvider();
  if (env.STORAGE_DRIVER === "s3") {
    const { S3CompatibleStorageProvider } = await import("./s3-compatible-storage-provider");
    return new S3CompatibleStorageProvider({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }

  const { LocalStorageProvider } = await import("./local-storage-provider");
  return new LocalStorageProvider(env.LOCAL_STORAGE_PATH);
}
