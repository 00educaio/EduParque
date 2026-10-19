import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { activities, gameSessions, sessionEvents, users } from "@/shared/infrastructure/database/schema";
import { createActivity, publishActivity, updateDraft } from "@/modules/activities/application/activity-service";
import { createGameSession, executeSessionCommand, getGameSession } from "./game-session-service";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const { db, sql } = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("GameSessionService com PostgreSQL", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    if (userIds.length) {
      const ownedActivities = await db.select({ id: activities.id }).from(activities).where(inArray(activities.ownerId, userIds));
      if (ownedActivities.length) await db.delete(gameSessions).where(inArray(gameSessions.activityId, ownedActivities.map((item) => item.id)));
      await db.delete(activities).where(inArray(activities.ownerId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    await sql.end();
  });

  it("persiste comandos, eventos e restaura placar, etapa, equipes e template", async () => {
    const [user] = await db.insert(users).values({ email: `session-${crypto.randomUUID()}@test.local` }).returning();
    userIds.push(user!.id);
    const activity = await createActivity(user!.id, "Motor mock");
    const presentationId = activity.presentations[0]!.id;
    await updateDraft(activity.id, user!.id, {
      title: "Motor mock", description: null, tags: ["engine"], visibility: "public", defaultPresentationId: presentationId,
      content: [{ type: "prompt-answer", id: "questions", items: [{ id: "q1", prompt: "1 + 1?", answers: [{ id: "a1", text: "2", isCorrect: true }] }, { id: "q2", prompt: "2 + 2?", answers: [{ id: "a2", text: "4", isCorrect: true }] }] }],
    });
    await publishActivity(activity.id, user!.id);
    const authorizedUser = { id: user!.id, role: "USER" as const };
    const created = await createGameSession(authorizedUser, {
      activityId: activity.id, presentationId,
      teams: [{ name: "Verde", color: "#008844" }, { name: "Azul", color: "#0044aa" }],
      timer: { mode: "question", variant: "bomb", durationSeconds: 30, soundEnabled: false },
    });
    let result = await executeSessionCommand(created.id, { type: "startSession" }, authorizedUser);
    const firstTeamId = result.state.teams[0]!.id;
    result = await executeSessionCommand(created.id, { type: "awardPoints", teamId: firstTeamId, suggestedPoints: 100 }, authorizedUser);
    result = await executeSessionCommand(created.id, { type: "updateTemplateState", state: { completed: 1 } }, authorizedUser);
    result = await executeSessionCommand(created.id, { type: "next" }, authorizedUser);
    expect(result.state.currentItemIndex).toBe(1);

    const restored = await getGameSession(created.id, authorizedUser);
    expect(restored.state.teams.map((team) => team.score)).toEqual([100, 0]);
    expect(restored.state).toMatchObject({ currentItemIndex: 1, activeTeamIndex: 1, template: { state: { completed: 1 } } });
    expect((await db.select().from(sessionEvents).where(eq(sessionEvents.sessionId, created.id))).map((event) => event.type)).toEqual(["sessionCreated", "sessionStarted", "pointsAwarded", "templateStateUpdated", "itemAdvanced"]);

    const anonymous = await createGameSession(undefined, {
      activityId: activity.id, presentationId,
      teams: [{ name: "Visitante", color: "#008844" }],
      timer: { mode: "off", variant: "standard", durationSeconds: 30, soundEnabled: false },
    });
    expect(anonymous.controllerToken).toBeTypeOf("string");
    await expect(executeSessionCommand(anonymous.id, { type: "startSession" }, undefined, false, "token-invalido")).rejects.toMatchObject({ status: 403 });
    const anonymousStarted = await executeSessionCommand(anonymous.id, { type: "startSession" }, undefined, false, anonymous.controllerToken);
    expect(anonymousStarted.state.status).toBe("active");
    expect((await getGameSession(anonymous.id, undefined, anonymous.controllerToken)).canControl).toBe(true);
  });
});
