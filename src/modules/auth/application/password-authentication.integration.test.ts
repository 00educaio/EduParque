import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { createCredentialUser } from "./credential-administration";
import { authenticateCredentials, LOGIN_LOCK_MS, LOGIN_MAX_ATTEMPTS } from "./password-authentication";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { authLoginAttempts, users } from "@/shared/infrastructure/database/schema";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const database = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("autenticação por senha com PostgreSQL", () => {
  const userIds: string[] = [];
  const unknownIdentifier = `missing-${crypto.randomUUID()}@test.local`;

  async function createUser(label: string) {
    const suffix = crypto.randomUUID();
    const usernameSuffix = suffix.slice(0, 12);
    const password = `Senha segura ${label} ${suffix}!`;
    const user = await createCredentialUser({
      name: `Professor ${label}`,
      email: `${label}-${suffix}@test.local`,
      username: `${label}-${usernameSuffix}`,
      password,
      role: "ADMIN",
    }, database);
    userIds.push(user.id);
    return { ...user, password };
  }

  beforeAll(async () => {
    await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  });

  afterAll(async () => {
    if (userIds.length) await database.db.delete(users).where(inArray(users.id, userIds));
    await database.db.delete(authLoginAttempts);
    await database.sql.end();
  });

  it("aceita a senha correta por e-mail ou usuário", async () => {
    const user = await createUser("correct");
    await expect(authenticateCredentials({ identifier: user.email.toUpperCase(), password: user.password }, database)).resolves.toMatchObject({ id: user.id, role: "ADMIN" });
    await expect(authenticateCredentials({ identifier: user.username, password: user.password }, database)).resolves.toMatchObject({ id: user.id });
  });

  it("rejeita senha incorreta e identificador inexistente", async () => {
    const user = await createUser("invalid");
    await expect(authenticateCredentials({ identifier: user.email, password: "senha errada" }, database)).resolves.toBeNull();
    await expect(authenticateCredentials({ identifier: unknownIdentifier, password: "senha errada" }, database)).resolves.toBeNull();
  });

  it("bloqueia temporariamente e reativa automaticamente após o prazo", async () => {
    const user = await createUser("lock");
    const startedAt = new Date("2026-10-15T12:00:00.000Z");
    for (let index = 0; index < LOGIN_MAX_ATTEMPTS; index += 1) {
      await expect(authenticateCredentials(
        { identifier: user.email, password: "senha errada" },
        database,
        new Date(startedAt.getTime() + index * 1_000),
      )).resolves.toBeNull();
    }

    await expect(authenticateCredentials(
      { identifier: user.email, password: user.password },
      database,
      new Date(startedAt.getTime() + 10_000),
    )).resolves.toBeNull();

    await expect(authenticateCredentials(
      { identifier: user.email, password: user.password },
      database,
      new Date(startedAt.getTime() + 4_000 + LOGIN_LOCK_MS + 1),
    )).resolves.toMatchObject({ id: user.id });
  });
});
