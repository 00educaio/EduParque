import { expect, test } from "@playwright/test";
import { registerTeacher } from "./auth-helper";

test("visitante e identificado como anonimo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Você está navegando como visitante.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
});

test("cadastro por convite cria uma sessao autenticada", async ({ page }) => {
  const teacher = await registerTeacher(page, "professor-e2e");
  await page.goto("/");
  await expect(page.getByText(`Você está autenticado. ${teacher.email}`)).toBeVisible();
  await page.getByRole("link", { name: "Ver minhas atividades", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minhas atividades" })).toBeVisible();
});

test("professor cria e reabre conteudo pelo editor visual", async ({ page }) => {
  await registerTeacher(page, "editor-e2e");
  await page.goto("/");
  await page.getByRole("button", { name: "Criar atividade" }).click();
  await expect(page.getByRole("heading", { name: "Como você quer jogar?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar para conteúdo" }).click();
  await expect(page.getByRole("heading", { name: "O que seus alunos vão trabalhar?" })).toBeVisible();
  await page.getByRole("button", { name: /Perguntas e respostas/ }).click();
  await page.getByLabel("Título").fill("Quiz visual E2E");
  await page.getByPlaceholder("Digite a pergunta").fill("Qual é a capital do Brasil?");
  await page.getByPlaceholder("Resposta 1").fill("Brasília");
  await page.getByPlaceholder("Resposta 2").fill("Salvador");
  await page.locator('input[type="file"][accept^="image"]').first().setInputFiles({
    name: "mapa.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.getByText("mapa.png", { exact: true })).toBeVisible();
  await expect(page.getByText("Nao salvo", { exact: true })).toBeVisible();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByPlaceholder("Digite a pergunta")).toHaveValue("Qual é a capital do Brasil?");
  await expect(page.getByText("mapa.png", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("banner").getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/library$/);
});
