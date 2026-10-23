import { expect, test } from "@playwright/test";
import { registerTeacher } from "./auth-helper";

test("Group Sort, Unscramble e Team Grid executam no SessionShell compartilhado", async ({ page }) => {
  test.setTimeout(90_000);
  await registerTeacher(page, "task-05");

  const source = await page.evaluate(async () => {
    async function json(url: string, init: RequestInit) {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
      if (!response.ok) throw new Error(`${init.method} ${url}: ${response.status} ${await response.text()}`);
      return response.json();
    }
    const activity = await json("/api/activities", { method: "POST", body: JSON.stringify({ title: "Jogos da TASK-05" }) }) as { id: string; slug: string; presentations: Array<{ id: string }> };
    const boardId = activity.presentations[0]!.id;
    const base = { teams: 2, scoring: { correct: 100 }, timer: { enabled: false, seconds: 30 }, shuffle: false, sound: false };
    await json(`/api/activities/${activity.id}`, { method: "PATCH", body: JSON.stringify({
      title: "Jogos da TASK-05", description: "Três templates no shell compartilhado", tags: ["task-05"], visibility: "public", defaultPresentationId: boardId,
      content: [
        { type: "categorized-item", id: "groups", categories: [
          { id: "mammals", name: "Mamíferos", items: [{ id: "dog", text: "Cachorro" }] },
          { id: "birds", name: "Aves", items: [{ id: "macaw", text: "Arara" }] },
        ] },
        { type: "sequence", id: "sequences", sequences: [
          { id: "seq-token", prompt: "Forme a expressão", tokens: ["céu", "azul"], splitMode: "word" },
          { id: "seq-character", prompt: "Forme a palavra", tokens: ["s", "o", "l"], splitMode: "character" },
        ] },
        { type: "prompt-answer", id: "grid", items: [
          { id: "q1", prompt: "Capital do Brasil?", answers: [{ id: "a1", text: "Brasília", isCorrect: true }, { id: "a2", text: "Recife", isCorrect: false }] },
          { id: "q2", prompt: "Quanto é 2 + 2?", answers: [{ id: "a3", text: "4", isCorrect: true }, { id: "a4", text: "5", isCorrect: false }] },
        ] },
      ],
    }) });
    await json(`/api/activities/${activity.id}/presentations/${boardId}`, { method: "PUT", body: JSON.stringify({ id: boardId, name: "Board", templateKey: "group-sort", gameConfig: { base, template: { mode: "board" } }, themeOverride: {}, isDefault: true }) });
    const add = (name: string, templateKey: string, template: Record<string, unknown>) => json(`/api/activities/${activity.id}/presentations`, { method: "POST", body: JSON.stringify({ name, templateKey, gameConfig: { base, template }, themeOverride: {}, isDefault: false }) }) as Promise<{ id: string }>;
    await add("Um por vez", "group-sort", { mode: "one-by-one" });
    await add("Por tokens", "unscramble", { tokenMode: "token" });
    await add("Por letras", "unscramble", { tokenMode: "character" });
    await add("Grade", "team-grid", { gridColumns: 3, bombTimer: true });
    await json(`/api/activities/${activity.id}/publish`, { method: "POST" });
    return { activityId: activity.id, slug: activity.slug };
  });

  async function startPresentation(name: string) {
    await page.goto(`/activity/${source.slug}`);
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.getByRole("button", { name: "Criar sessão" }).click();
    await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  }

  await page.goto(`/activity/${source.slug}`);
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await page.getByRole("button", { name: "Cachorro", exact: true }).click();
  await page.getByRole("button", { name: "Mamíferos", exact: true }).click();
  await page.getByRole("button", { name: "Arara", exact: true }).click();
  await page.getByRole("button", { name: "Aves", exact: true }).click();
  await page.getByRole("button", { name: "Verificar grupos" }).click();
  await expect(page.getByText("Tudo certo! Cada item está em seu grupo.")).toBeVisible();

  await page.getByRole("button", { name: "Por letras", exact: true }).click();
  await expect(page.getByText("Ordene as letras")).toBeVisible();

  await startPresentation("Um por vez");
  await expect(page.getByRole("heading", { name: "Cachorro" })).toBeVisible();
  await page.getByRole("button", { name: "Mamíferos", exact: true }).click();
  await expect(page.getByText(/Correto! Cachorro pertence/)).toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");
  await expect(page.getByRole("heading", { name: "Arara" })).toBeVisible();

  await startPresentation("Por tokens");
  await page.getByRole("button", { name: "céu", exact: true }).click();
  await page.getByRole("button", { name: "azul", exact: true }).click();
  await page.getByRole("button", { name: "Verificar ordem" }).click();
  await expect(page.getByText("Sequência correta!")).toBeVisible();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");
  await page.getByRole("button", { name: /Desfazer/ }).click();
  await expect(page.getByText("Sequência correta!")).not.toBeVisible();

  await page.goto(`/activity/${source.slug}`);
  await page.getByRole("button", { name: "Grade", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await expect(page.getByLabel("Timer-bomba")).toBeChecked();
  await page.getByRole("button", { name: "Criar sessão" }).click();
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await page.locator(".team-grid-cards button").first().click();
  await expect(page.getByText("💣 Timer-bomba")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  await expect(page.getByText("Brasília", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Correto · \+100/ }).click();
  await expect(page.locator(".team-score").first().locator("strong")).toHaveText("100");
  await expect(page.getByText("Vez da equipe").locator("..").getByRole("heading", { name: "Equipe 2" })).toBeVisible();

  await page.evaluate(async (activityId) => { await fetch(`/api/activities/${activityId}`, { method: "DELETE" }); }, source.activityId);
});
