import { expect, test } from "@playwright/test";

test("visitante e identificado como anonimo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Você está navegando como visitante.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
});

test("acesso local de desenvolvimento cria uma sessao autenticada", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Acesso local de desenvolvimento")).toBeVisible();
  await page.getByLabel("Nome").fill("Professor E2E");
  await page.getByLabel("E-mail").fill("professor-e2e@eduparque.local");
  await page.getByRole("button", { name: "Entrar localmente" }).click();
  await expect(page.getByText(/Você está autenticado\. professor-e2e@eduparque\.local/)).toBeVisible();
  await page.getByRole("link", { name: "Minhas atividades", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minhas atividades" })).toBeVisible();
});

test("professor cria e reabre conteudo pelo editor visual", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Nome").fill("Professor Editor E2E");
  await page.getByLabel("E-mail").fill("editor-e2e@eduparque.local");
  await page.getByRole("button", { name: "Entrar localmente" }).click();
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
