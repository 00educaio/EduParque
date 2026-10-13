import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/infrastructure/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://eduparque:eduparque@localhost:5432/eduparque",
  },
  strict: true,
  verbose: true,
});
