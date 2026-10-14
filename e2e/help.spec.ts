import { expect, test } from "@playwright/test";

test("ajuda global abre os dois guias e permite navegação manual", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/");
  await page.getByRole("link", { name: "Ajuda", exact: true }).click();
  await expect(page).toHaveURL(/\/ajuda$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "O próximo passo, sem complicação" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Falar com o suporte" })).toHaveAttribute("href", "/sac");

  const playGuide = page.locator(".guide-card").filter({ hasText: "Quero jogar uma atividade pronta" });
  await playGuide.getByRole("button", { name: "Abrir guia" }).click();
  await expect(playGuide.getByText("Passo 1 de 5")).toBeVisible();
  await playGuide.getByRole("button", { name: "Próximo" }).click();
  await expect(playGuide.getByText("Passo 2 de 5")).toBeVisible();
  await playGuide.getByRole("button", { name: "Voltar" }).click();
  await expect(playGuide.getByText("Passo 1 de 5")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(playGuide.getByRole("button", { name: "Abrir guia" })).toBeFocused();

  const createGuide = page.locator(".guide-card").filter({ hasText: "Quero criar minha primeira atividade" });
  await expect(createGuide.getByRole("button", { name: "Abrir guia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como funcionam os jogos?" })).toBeVisible();
  await expect(page.locator(".game-help-card")).toHaveCount(6);
});
