import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().default("postgresql://eduparque:eduparque@localhost:5432/eduparque"),
    AUTH_SECRET: optionalString,
    AUTH_TRUST_HOST: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    STORAGE_DRIVER: z.enum(["local", "postgres", "s3"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().default("./storage"),
    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  })
  .superRefine((env, context) => {
    if (env.STORAGE_DRIVER === "s3" && !env.S3_BUCKET) {
      context.addIssue({ code: "custom", message: "S3_BUCKET e obrigatorio para storage S3." });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}
