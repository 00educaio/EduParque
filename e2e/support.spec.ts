import { expect, test } from "@playwright/test";

test("SAC direciona visitantes ao login antes de consultar dados", async ({ page }) => {
  await page.goto("/sac");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/sac/nova");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/sac/dd688450-484d-42e3-a735-9d84f34d42d3");
  await expect(page).toHaveURL(/\/login$/);
});

test("painel de chamados não é exposto a visitantes", async ({ page }) => {
  await page.goto("/admin/tickets");
  await expect(page).toHaveURL(/\/$/);
});
