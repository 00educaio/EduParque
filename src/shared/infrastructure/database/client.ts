import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/shared/infrastructure/config/env";
import * as schema from "./schema";

export function createDatabase(connectionString: string) {
  const sql = postgres(connectionString, {
    max: process.env.NODE_ENV === "development" ? 5 : 3,
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });
  return { db: drizzle(sql, { schema }), sql };
}

export type DatabaseContext = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as unknown as { database?: DatabaseContext };
const database = globalForDatabase.database ?? createDatabase(getEnv().DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForDatabase.database = database;

export function getDatabase() {
  return database;
}

export const { db, sql } = database;
