import { describe, expect, it } from "vitest";
import { S3CompatibleStorageProvider } from "./s3-compatible-storage-provider";

describe("S3CompatibleStorageProvider", () => {
  it("assina PUT privado com validade curta e metadados vinculados ao upload", async () => {
    const provider = new S3CompatibleStorageProvider({
      endpoint: "https://storage.example.com",
      region: "us-east-1",
      bucket: "private-media",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      forcePathStyle: true,
    });

    const signed = new URL(await provider.createPresignedPutUrl({
      key: "owner/media/upload-id",
      contentType: "image/png",
      contentLength: 128,
      expiresInSeconds: 300,
      metadata: { "upload-id": "upload-id" },
    }));

    expect(`${signed.origin}${signed.pathname}`).toBe("https://storage.example.com/private-media/owner/media/upload-id");
    expect(signed.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(signed.searchParams.get("x-amz-meta-upload-id")).toBe("upload-id");
    expect(signed.toString()).not.toContain("test-secret-key");
  });
});
