import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { PutObjectInput, StorageProvider, StoredObject } from "../domain/storage-provider";

interface S3StorageOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
}

export class S3CompatibleStorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey }
          : undefined,
    });
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.options.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, Expires: input.expiresAt }));
  }

  async get(key: string): Promise<StoredObject> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.options.bucket, Key: key }));
    if (!result.Body) throw new Error("Objeto nao encontrado no storage.");
    return {
      body: await result.Body.transformToByteArray(),
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }
}
