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

export interface StorageProvider {
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
