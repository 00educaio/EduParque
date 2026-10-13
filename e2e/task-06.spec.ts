import { expect, test } from "@playwright/test";

test("fluxo principal termina uma partida publica sem conta", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("Nome").fill("Professor Task 06");
  await page.getByLabel("E-mail").fill(`task-06-${Date.now()}@eduparque.local`);
  await page.getByRole("button", { name: "Entrar localmente" }).click();
  await page.getByRole("button", { name: "Criar atividade" }).click();
  await page.getByRole("button", { name: "Continuar para conteúdo" }).click();
  await page.getByRole("button", { name: /Perguntas e respostas/ }).click();
  await page.getByLabel("Título").fill("Fluxo completo TASK-06");
  await page.getByLabel("Visibilidade").selectOption("public");
  await page.getByPlaceholder("Digite a pergunta").fill("Qual é a capital do Brasil?");
  await page.getByPlaceholder("Resposta 1").fill("Brasília");
  await page.getByPlaceholder("Resposta 2").fill("Salvador");
  await page.getByRole("button", { name: /APARÊNCIA/ }).click();
  await page.getByLabel("Cor principal").fill("#2563eb");
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("button", { name: "Despublicar" })).toBeVisible();

  const source = await page.evaluate(async () => {
    const activityId = location.pathname.split("/").pop()!;
    const response = await fetch(`/api/activities/${activityId}`);
    return response.json() as Promise<{ id: string; slug: string }>;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByText("Você está navegando como visitante.")).toBeVisible();

  await page.goto(`/activity/${source.slug}`);
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await page.getByRole("button", { name: "Criar sessão" }).click();
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await page.getByRole("button", { name: /Brasília/ }).click();
  await page.getByRole("button", { name: "Verificar resposta" }).click();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Resultado final")).toBeVisible();
});
