import { expect, test } from "@playwright/test";

test("Quiz, Matching e Roleta compartilham Activity, renderer e SessionShell", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("Nome").fill("Professor Task 04");
  await page.getByLabel("E-mail").fill(`task-04-${Date.now()}@eduparque.local`);
  await page.getByRole("button", { name: "Entrar localmente" }).click();
  await expect(page.getByText(/Você está autenticado\./)).toBeVisible();

  const source = await page.evaluate(async () => {
    async function json(url: string, init: RequestInit) {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
      if (!response.ok) throw new Error(`${init.method} ${url}: ${response.status} ${await response.text()}`);
      return response.json();
    }
    const activity = await json("/api/activities", { method: "POST", body: JSON.stringify({ title: "Jogos da TASK-04" }) }) as { id: string; slug: string; presentations: Array<{ id: string }> };
    const quizId = activity.presentations[0]!.id;
    const base = { teams: 2, scoring: { correct: 100 }, timer: { enabled: false, seconds: 30 }, shuffle: false, sound: false };
    await json(`/api/activities/${activity.id}`, { method: "PATCH", body: JSON.stringify({
      title: "Jogos da TASK-04", description: "Três jogos na mesma atividade", tags: ["task-04"], visibility: "public", defaultPresentationId: quizId,
      content: [
        { type: "prompt-answer", id: "quiz", items: [{ id: "q1", prompt: "Qual é a capital do Brasil?", answers: [{ id: "a1", text: "Brasília", isCorrect: true }, { id: "a2", text: "Salvador", isCorrect: false }], explanation: "Brasília é a capital federal." }] },
        { type: "pair", id: "pairs", pairs: [{ id: "p1", left: "Brasil", right: "Brasília" }, { id: "p2", left: "França", right: "Paris" }] },
        { type: "item-list", id: "wheel", items: [{ id: "w1", text: "Fotossíntese", prompt: "Explique o processo", answer: "Conversão de luz em energia química" }, { id: "w2", text: "Sistema Solar" }] },
      ],
    }) });
    await json(`/api/activities/${activity.id}/presentations/${quizId}`, { method: "PUT", body: JSON.stringify({ id: quizId, name: "Quiz", templateKey: "quiz", gameConfig: { base, template: { allowMultiple: true, revealExplanation: true } }, themeOverride: {}, isDefault: true }) });
    const matching = await json(`/api/activities/${activity.id}/presentations`, { method: "POST", body: JSON.stringify({ name: "Matching", templateKey: "matching", gameConfig: { base, template: { mode: "connect" } }, themeOverride: {}, isDefault: false }) }) as { id: string };
    const memory = await json(`/api/activities/${activity.id}/presentations`, { method: "POST", body: JSON.stringify({ name: "Memória", templateKey: "matching", gameConfig: { base, template: { mode: "memory" } }, themeOverride: {}, isDefault: false }) }) as { id: string };
    const wheel = await json(`/api/activities/${activity.id}/presentations`, { method: "POST", body: JSON.stringify({ name: "Roleta", templateKey: "wheel", gameConfig: { base, template: { removeAfterSpin: false, allowRepeat: false, timerAfterSpin: false } }, themeOverride: {}, isDefault: false }) }) as { id: string };
    await json(`/api/activities/${activity.id}/publish`, { method: "POST" });
    return { activityId: activity.id, slug: activity.slug, quizId, matchingId: matching.id, memoryId: memory.id, wheelId: wheel.id };
  });

  async function startPresentation(name: "Quiz" | "Matching" | "Memória" | "Roleta") {
    await page.goto(`/activity/${source.slug}`);
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.getByRole("button", { name: "Criar sessão" }).click();
    await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  }

  await page.goto(`/activity/${source.slug}`);
  await expect(page.getByRole("button", { name: "Quiz", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Matching", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Selecione os itens correspondentes" })).toBeVisible();
  await page.getByRole("button", { name: "Memória", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Encontre as combinações" })).toBeVisible();
  await page.getByRole("button", { name: "Roleta", exact: true }).click();
  await expect(page.getByText("Pronto para girar")).toBeVisible();

  await startPresentation("Quiz");
  await page.getByRole("button", { name: /Brasília/ }).click();
  await page.getByRole("button", { name: "Verificar resposta" }).click();
  await expect(page.getByText("Resposta correta!")).toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");
  await page.getByRole("button", { name: /Desfazer/ }).click();
  await expect(page.getByText("Resposta correta!")).not.toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("0");

  await startPresentation("Matching");
  await page.getByRole("button", { name: "Brasil", exact: true }).click();
  await page.getByRole("button", { name: "Brasília", exact: true }).click();
  await expect(page.getByText("Par correto!")).toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");

  await startPresentation("Memória");
  const cards = page.locator(".memory-grid button");
  await cards.first().click();
  for (let index = 1; index < await cards.count(); index += 1) {
    await cards.nth(index).click();
    if (await page.getByText("Par correto!").isVisible()) break;
    await page.getByRole("button", { name: "Fechar cartas" }).click();
    await cards.first().click();
  }
  await expect(page.getByText("Par correto!")).toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");

  await startPresentation("Roleta");
  await page.getByRole("button", { name: "Girar roleta" }).click();
  await expect(page.getByText("Item sorteado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Girar novamente" })).toBeVisible();

  await page.evaluate(async (activityId) => { await fetch(`/api/activities/${activityId}`, { method: "DELETE" }); }, source.activityId);
});
