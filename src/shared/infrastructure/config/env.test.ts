import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("configuracao do ambiente", () => {
  it("mantem valores locais seguros para desenvolvimento", () => {
    expect(parseEnv({ NODE_ENV: "development" }).STORAGE_DRIVER).toBe("local");
  });

  it("rejeita um deploy Vercel sem segredos e storage persistente", () => {
    expect(() => parseEnv({ VERCEL: "1", NODE_ENV: "production" })).toThrow();
  });

  it("aceita um deploy Vercel totalmente configurado", () => {
    expect(parseEnv({
      VERCEL: "1",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:password@example.com:5432/eduparque",
      AUTH_SECRET: "a".repeat(32),
      AUTH_TRUST_HOST: "true",
      CRON_SECRET: "b".repeat(16),
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "c".repeat(32),
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://storage.example.com",
      S3_BUCKET: "eduparque",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    }).STORAGE_DRIVER).toBe("s3");
  });
});
