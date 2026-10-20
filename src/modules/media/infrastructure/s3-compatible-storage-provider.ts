import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
      // O navegador envia o corpo depois que a URL e assinada. Checksums
      // calculados pelo SDK neste momento descreveriam um corpo vazio.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey }
          : undefined,
    });
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.options.bucket, Key: input.key, Body: input.body, ContentType: input.contentType }));
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

  async getPrefix(key: string, maximumBytes: number): Promise<Uint8Array> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.options.bucket, Key: key, Range: `bytes=0-${Math.max(0, maximumBytes - 1)}` }));
    if (!result.Body) throw new Error("Objeto nao encontrado no storage.");
    return result.Body.transformToByteArray();
  }

  async head(key: string) {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }));
    if (result.ContentLength === undefined) throw new Error("O storage nao informou o tamanho do objeto.");
    return {
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength,
      metadata: result.Metadata,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  getPublicUrl(key: string): string {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    if (this.options.endpoint) return `${this.options.endpoint.replace(/\/$/, "")}/${this.options.bucket}/${encodedKey}`;
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com/${encodedKey}`;
  }

  async createPresignedPutUrl(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number; metadata?: Record<string, string> }) {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: input.metadata,
      IfNoneMatch: "*",
    });
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds });
  }

  async createPresignedGetUrl(key: string, expiresInSeconds: number) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.options.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }
}
