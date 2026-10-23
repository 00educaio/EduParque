import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const E2E_PASSWORD = "Senha segura para E2E 123!";
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://eduparque:eduparque@localhost:5432/eduparque";

export function createInviteLink(label: string) {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const email = `${label}-${suffix}@eduparque.local`;
  const output = execFileSync(process.execPath, [
    "--conditions", "react-server",
    "--import", "tsx",
    "scripts/manage-auth-user.ts",
    "invite",
    "--email", email,
    "--base-url", "http://localhost:3000",
  ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL } });
  const link = output.match(/Link \(exibido somente agora\): (\S+)/)?.[1];
  const id = output.match(/Convite ([0-9a-f-]+) criado/)?.[1];
  if (!link || !id) throw new Error(`Saída inesperada ao criar convite: ${output}`);
  return { email, id, link };
}

export function revokeInvite(id: string) {
  execFileSync(process.execPath, [
    "--conditions", "react-server",
    "--import", "tsx",
    "scripts/manage-auth-user.ts",
    "revoke-invite",
    "--id", id,
  ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL } });
}

export async function registerTeacher(page: Page, label: string) {
  const invite = createInviteLink(label);
  const username = `${label}-${crypto.randomUUID().slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 32);
  await page.goto(invite.link);
  await page.locator("#register-name").fill(`Professor ${label}`);
  await page.getByLabel("Nome de usuário").fill(username);
  await page.locator("#register-password").fill(E2E_PASSWORD);
  await page.getByLabel("Repita a senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/my-activities$/);
  return { ...invite, username };
}
