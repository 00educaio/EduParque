import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/shared/infrastructure/config/env";
import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

const sql =
  globalForDatabase.sql ??
  postgres(getEnv().DATABASE_URL, {
    max: process.env.NODE_ENV === "development" ? 5 : 3,
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDatabase.sql = sql;

export const db = drizzle(sql, { schema });
export { sql };
