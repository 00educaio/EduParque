import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { createInviteLink, E2E_DATABASE_URL, E2E_PASSWORD, registerTeacher, revokeInvite } from "./auth-helper";

test("convite válido cria conta, autentica e não pode ser reutilizado", async ({ browser, page }) => {
  const teacher = await registerTeacher(page, "register-flow");
  await expect(page.getByRole("heading", { name: "Minhas atividades" })).toBeVisible();

  await page.goto(`/register?invite=${encodeURIComponent(new URL(teacher.link).searchParams.get("invite")!)}`);
  await expect(page).toHaveURL(/\/my-activities$/);

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(teacher.link);
  await expect(anonymousPage.getByText("Este convite é inválido, expirou ou já foi utilizado.")).toBeVisible();
  await anonymousContext.close();
});

test("formulário apresenta erros de validação sem apagar nome e usuário", async ({ page }) => {
  const invite = createInviteLink("register-validation");
  await page.goto(invite.link);
  await page.locator("#register-name").fill("M");
  await page.getByLabel("Nome de usuário").fill("Nome com espaço");
  await page.locator("#register-password").fill("curta");
  await page.getByLabel("Repita a senha").fill("diferente");
  await page.getByRole("button", { name: "Criar minha conta" }).click();

  await expect(page.getByText("Informe um nome com pelo menos 2 caracteres.")).toBeVisible();
  await expect(page.getByText(/Use de 3 a 32 letras minúsculas/)).toBeVisible();
  await expect(page.getByText("A senha deve ter pelo menos 14 caracteres.")).toBeVisible();
  await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  await expect(page.locator("#register-name")).toHaveValue("M");
  await expect(page.getByLabel("Nome de usuário")).toHaveValue("Nome com espaço");
});

test("convites ausente, adulterado, revogado e expirado são recusados", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText("Este convite é inválido, expirou ou já foi utilizado.")).toBeVisible();

  const tampered = createInviteLink("register-tampered");
  const tamperedUrl = new URL(tampered.link);
  const token = tamperedUrl.searchParams.get("invite")!;
  tamperedUrl.searchParams.set("invite", `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`);
  await page.goto(tamperedUrl.toString());
  await expect(page.getByText("Este convite é inválido, expirou ou já foi utilizado.")).toBeVisible();

  const revoked = createInviteLink("register-revoked");
  revokeInvite(revoked.id);
  await page.goto(revoked.link);
  await expect(page.getByText("Este convite é inválido, expirou ou já foi utilizado.")).toBeVisible();

  const expired = createInviteLink("register-expired");
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  await sql`UPDATE registration_invites SET expires_at = now() - interval '1 minute' WHERE id = ${expired.id}`;
  await sql.end();
  await page.goto(expired.link);
  await expect(page.getByText("Este convite é inválido, expirou ou já foi utilizado.")).toBeVisible();
});

test("e-mail permanece vinculado ao convite", async ({ page }) => {
  const invite = createInviteLink("register-email");
  await page.goto(invite.link);
  await expect(page.getByLabel("E-mail do convite")).toHaveValue(invite.email);
  await expect(page.getByLabel("E-mail do convite")).toHaveAttribute("readonly", "");
  await page.locator("#register-name").fill("Professora Teste");
  await page.getByLabel("Nome de usuário").fill(`teacher-${crypto.randomUUID().slice(0, 8)}`);
  await page.locator("#register-password").fill(E2E_PASSWORD);
  await page.getByLabel("Repita a senha").fill(E2E_PASSWORD);
});
