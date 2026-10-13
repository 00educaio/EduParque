import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "./client";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.info("Migrations aplicadas com sucesso.");
}

main().catch((error: unknown) => {
  console.error("Falha ao aplicar migrations.", error);
  process.exitCode = 1;
});
