import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import {
  createRegistrationInvite,
  getAvailableRegistrationInvite,
  InvalidRegistrationInviteError,
  registerInvitedUser,
  revokeRegistrationInvite,
} from "./registration-invites";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { registrationInvites, users } from "@/shared/infrastructure/database/schema";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const database = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("convites de cadastro com PostgreSQL", () => {
  const inviteIds: string[] = [];
  const userIds: string[] = [];

  async function invite(label: string, now = new Date()) {
    const email = `${label}-${crypto.randomUUID()}@test.local`;
    const created = await createRegistrationInvite({ email, baseUrl: "https://eduparque.test" }, database, now);
    inviteIds.push(created.id);
    const token = new URL(created.url).searchParams.get("invite")!;
    return { ...created, token };
  }

  function registration(created: Awaited<ReturnType<typeof invite>>, suffix = crypto.randomUUID().slice(0, 10)) {
    return {
      invite: created.token,
      name: "Professora Convidada",
      email: created.email,
      username: `prof-${suffix}`,
      password: "Senha segura de teste 123!",
      passwordConfirmation: "Senha segura de teste 123!",
    };
  }

  beforeAll(async () => {
    await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  });

  afterAll(async () => {
    if (userIds.length) await database.db.delete(users).where(inArray(users.id, userIds));
    if (inviteIds.length) await database.db.delete(registrationInvites).where(inArray(registrationInvites.id, inviteIds));
    await database.sql.end();
  });

  it("armazena apenas o hash e apresenta um convite disponível", async () => {
    const created = await invite("hash");
    const secret = created.token.split(".")[1]!;
    const [stored] = await database.sql<{ token_hash: string }[]>`
      SELECT token_hash FROM registration_invites WHERE id = ${created.id}
    `;
    expect(stored?.token_hash).not.toBe(secret);
    await expect(getAvailableRegistrationInvite(created.token, database)).resolves.toMatchObject({ email: created.email });
    await expect(getAvailableRegistrationInvite(`${created.id}.${"A".repeat(43)}`, database)).resolves.toBeNull();
  });

  it("cria USER e consome o convite uma única vez", async () => {
    const created = await invite("consume");
    const input = registration(created);
    const user = await registerInvitedUser(input, database);
    userIds.push(user.id);

    const [stored] = await database.sql<{ role: string; email_verified: Date | null }[]>`
      SELECT role, email_verified FROM users WHERE id = ${user.id}
    `;
    expect(stored).toMatchObject({ role: "USER" });
    expect(stored?.email_verified).not.toBeNull();
    await expect(getAvailableRegistrationInvite(created.token, database)).resolves.toBeNull();
    await expect(registerInvitedUser(input, database)).rejects.toBeInstanceOf(InvalidRegistrationInviteError);
  });

  it("recusa outro e-mail, convites expirados e convites revogados", async () => {
    const bound = await invite("bound");
    await expect(registerInvitedUser({ ...registration(bound), email: "outro@test.local" }, database))
      .rejects.toBeInstanceOf(InvalidRegistrationInviteError);

    const expiredNow = new Date("2026-10-01T12:00:00.000Z");
    const expired = await invite("expired", expiredNow);
    await expect(getAvailableRegistrationInvite(expired.token, database, new Date("2026-10-09T12:00:00.000Z"))).resolves.toBeNull();

    const revoked = await invite("revoked");
    await expect(revokeRegistrationInvite(revoked.id, database)).resolves.toBe(true);
    await expect(getAvailableRegistrationInvite(revoked.token, database)).resolves.toBeNull();
    await expect(revokeRegistrationInvite(revoked.id, database)).resolves.toBe(false);
  });

  it("informa conflitos de e-mail e usuário sem consumir o convite", async () => {
    const first = await invite("conflict-first");
    const firstInput = registration(first);
    const user = await registerInvitedUser(firstInput, database);
    userIds.push(user.id);

    const emailConflict = await createRegistrationInvite({ email: first.email, baseUrl: "https://eduparque.test" }, database);
    inviteIds.push(emailConflict.id);
    const emailToken = new URL(emailConflict.url).searchParams.get("invite")!;
    await expect(registerInvitedUser({ ...firstInput, invite: emailToken, username: `other-${crypto.randomUUID().slice(0, 8)}` }, database))
      .rejects.toMatchObject({ field: "email" });

    const usernameConflict = await invite("conflict-username");
    await expect(registerInvitedUser({ ...registration(usernameConflict), username: firstInput.username }, database))
      .rejects.toMatchObject({ field: "username" });
    await expect(getAvailableRegistrationInvite(usernameConflict.token, database)).resolves.not.toBeNull();
  });

  it("permite somente uma das submissões concorrentes", async () => {
    const created = await invite("race");
    const input = registration(created);
    const results = await Promise.allSettled([
      registerInvitedUser(input, database),
      registerInvitedUser({ ...input, username: `${input.username}-b` }, database),
    ]);
    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    const success = successes[0];
    if (success?.status === "fulfilled") userIds.push(success.value.id);
  });
});
