import { getEnv } from "@/shared/infrastructure/config/env";
import type { StorageProvider } from "../domain/storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";
import { S3CompatibleStorageProvider } from "./s3-compatible-storage-provider";

let instance: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;
  const env = getEnv();

  instance =
    env.STORAGE_DRIVER === "s3"
      ? new S3CompatibleStorageProvider({
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION,
          bucket: env.S3_BUCKET!,
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
        })
      : new LocalStorageProvider(env.LOCAL_STORAGE_PATH);

  return instance;
}
