import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalHttpsUrl = z.preprocess(emptyToUndefined, z.string().url().refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.").optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().default("postgresql://eduparque:eduparque@localhost:5432/eduparque"),
    AUTH_SECRET: optionalString,
    AUTH_TRUST_HOST: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    CRON_SECRET: optionalString,
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().default("./storage"),
    S3_ENDPOINT: optionalHttpsUrl,
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    MEDIA_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    MEDIA_READ_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    MEDIA_PENDING_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
    TEAM_IMAGE_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  })
  .superRefine((env, context) => {
    if ((env.S3_ACCESS_KEY_ID && !env.S3_SECRET_ACCESS_KEY) || (!env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)) {
      context.addIssue({ code: "custom", message: "S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY devem ser definidos juntos." });
    }
    if (env.STORAGE_DRIVER === "s3" && (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY)) {
      context.addIssue({ code: "custom", message: "S3_ENDPOINT, S3_BUCKET e credenciais sao obrigatorios para storage S3." });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}
