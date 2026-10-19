import { and, eq } from "drizzle-orm";
import { createActivity, publishActivity, savePresentation, updateDraft } from "@/modules/activities/application/activity-service";
import { getGameTemplate } from "@/modules/game-templates";
import { defaultSystemTheme } from "@/modules/themes/domain/theme-values";
import { getEnv } from "@/shared/infrastructure/config/env";
import { createDatabase } from "./client";
import { activities, presentations, themes, users } from "./schema";

const { db, sql } = createDatabase(getEnv().DATABASE_URL);

const DEMO_EMAIL = "demo@eduparque.local";

async function ensureThemes() {
  const definitions = [
    { name: "Parque", values: defaultSystemTheme },
    { name: "Oceano", values: { ...defaultSystemTheme, primaryColor: "#0369a1", secondaryColor: "#0e7490", surfaceColor: "#f0f9ff", textColor: "#0c4a6e" } },
    { name: "Energia", values: { ...defaultSystemTheme, primaryColor: "#b45309", secondaryColor: "#c2410c", surfaceColor: "#fff7ed", textColor: "#7c2d12" } },
  ];
  for (const definition of definitions) {
    const existing = await db.query.themes.findFirst({ where: and(eq(themes.kind, "system"), eq(themes.name, definition.name)) });
    if (!existing) await db.insert(themes).values({ kind: "system", name: definition.name, values: definition.values });
  }
}

async function ensureDemoActivity(ownerId: string) {
  const existing = await db.query.activities.findFirst({ where: and(eq(activities.ownerId, ownerId), eq(activities.title, "Desafio EduParque")) });
  if (existing) return existing;
  const created = await createActivity(ownerId, "Desafio EduParque");
  const quizId = created.presentations[0]!.id;
  await updateDraft(created.id, ownerId, {
    title: "Desafio EduParque", description: "Atividade demonstrativa com os seis jogos do MVP.", tags: ["demo", "interdisciplinar"], visibility: "public", defaultPresentationId: quizId,
    content: [
      { type: "prompt-answer", id: "demo-questions", items: [{ id: "q1", prompt: "Qual é a capital do Brasil?", answers: [{ id: "q1-a", text: "Brasília", isCorrect: true }, { id: "q1-b", text: "Salvador", isCorrect: false }], explanation: "Brasília é a capital federal desde 1960." }, { id: "q2", prompt: "Quanto é 6 × 7?", answers: [{ id: "q2-a", text: "42", isCorrect: true }, { id: "q2-b", text: "36", isCorrect: false }] }] },
      { type: "pair", id: "demo-pairs", pairs: [{ id: "p1", left: "Brasil", right: "Brasília" }, { id: "p2", left: "França", right: "Paris" }] },
      { type: "item-list", id: "demo-wheel", items: [{ id: "w1", text: "Fotossíntese", prompt: "Explique o processo", answer: "Conversão de luz em energia química" }, { id: "w2", text: "Sistema Solar" }] },
      { type: "categorized-item", id: "demo-groups", categories: [{ id: "c1", name: "Mamíferos", items: [{ id: "i1", text: "Baleia" }] }, { id: "c2", name: "Aves", items: [{ id: "i2", text: "Arara" }] }] },
      { type: "sequence", id: "demo-sequences", sequences: [{ id: "s1", prompt: "Forme a expressão", tokens: ["céu", "azul"], splitMode: "word" }] },
    ],
  });
  const names: Record<string, string> = { quiz: "Quiz", matching: "Combinações", wheel: "Roleta", "group-sort": "Separar grupos", unscramble: "Ordenar", "team-grid": "Grade de equipes" };
  await savePresentation(created.id, ownerId, { id: quizId, name: names.quiz, templateKey: "quiz", gameConfig: getGameTemplate("quiz").defaultConfig, themeOverride: {}, isDefault: true });
  for (const key of ["matching", "wheel", "group-sort", "unscramble", "team-grid"] as const) {
    await savePresentation(created.id, ownerId, { name: names[key], templateKey: key, gameConfig: getGameTemplate(key).defaultConfig, themeOverride: {}, isDefault: false });
  }
  await publishActivity(created.id, ownerId);
  return created;
}

async function main() {
  await ensureThemes();
  const [owner] = await db.insert(users).values({ name: "Professor Demo", email: DEMO_EMAIL, emailVerified: new Date(), role: "ADMIN" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Professor Demo", role: "ADMIN", updatedAt: new Date() } }).returning();
  await ensureDemoActivity(owner!.id);
  const demoPresentations = await db.select().from(presentations).innerJoin(activities, eq(activities.id, presentations.activityId)).where(eq(activities.ownerId, owner!.id));
  console.info(`Seed concluido: ${demoPresentations.length} presentations demonstrativas disponiveis.`);
}

main().catch((error: unknown) => { console.error("Falha ao executar seed.", error); process.exitCode = 1; }).finally(() => sql.end());
