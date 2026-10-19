import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getEnv } from "@/shared/infrastructure/config/env";
import { createDatabase } from "./client";

const { db, sql } = createDatabase(getEnv().DATABASE_URL);

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.info("Migrations aplicadas com sucesso.");
}

main().catch((error: unknown) => {
  console.error("Falha ao aplicar migrations.", error);
  process.exitCode = 1;
});
