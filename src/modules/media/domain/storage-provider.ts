export interface StoredObject {
  body: Uint8Array;
  contentType: string;
  contentLength?: number;
}

export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
}

export interface ObjectMetadata {
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

export interface PresignedPutInput {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds: number;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<StoredObject>;
  getPrefix(key: string, maximumBytes: number): Promise<Uint8Array>;
  head(key: string): Promise<ObjectMetadata>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  createPresignedPutUrl?(input: PresignedPutInput): Promise<string>;
  createPresignedGetUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
