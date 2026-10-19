import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { activities, activityRevisions, users } from "@/shared/infrastructure/database/schema";
import { createActivity, getOwnedActivity, getPublicActivityBySlug, listPublicActivities, publishActivity, remixActivity, unpublishActivity, updateDraft } from "./activity-service";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const { db, sql } = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("ActivityService com PostgreSQL", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    if (userIds.length) {
      await db.delete(activities).where(inArray(activities.ownerId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    await sql.end();
  });

  it("preserva revision imutavel, incrementa apos unpublish e cria remix independente", async () => {
    const [owner, remixer] = await db.insert(users).values([{ email: `owner-${crypto.randomUUID()}@test.local` }, { email: `remixer-${crypto.randomUUID()}@test.local` }]).returning();
    userIds.push(owner!.id, remixer!.id);
    const created = await createActivity(owner!.id, "Capitais do mundo");
    const defaultPresentationId = created.presentations[0]!.id;
    const originalContent = [{ type: "prompt-answer" as const, id: "questions", items: [{ id: "q1", prompt: "Capital do Brasil?", answers: [{ id: "a1", text: "Brasilia", isCorrect: true }] }] }];
    await updateDraft(created.id, owner!.id, { title: "Capitais do mundo", description: "Geografia", tags: ["geografia"], visibility: "public", content: originalContent, defaultPresentationId });

    const firstRevision = await publishActivity(created.id, owner!.id);
    expect(firstRevision.revision).toBe(1);
    await updateDraft(created.id, owner!.id, { title: "Draft novo", description: null, tags: [], visibility: "public", content: originalContent, defaultPresentationId });
    const storedFirst = await db.query.activityRevisions.findFirst({ where: eq(activityRevisions.id, firstRevision.id) });
    expect(storedFirst?.snapshot).toMatchObject({ title: "Capitais do mundo" });
    await expect(db.update(activityRevisions).set({ snapshot: { tampered: true } }).where(eq(activityRevisions.id, firstRevision.id))).rejects.toThrow();
    expect((await db.query.activityRevisions.findFirst({ where: eq(activityRevisions.id, firstRevision.id) }))?.snapshot).toMatchObject({ title: "Capitais do mundo" });
    expect((await listPublicActivities("capitais")).map((item) => item.id)).toContain(created.id);
    expect((await getPublicActivityBySlug(created.slug)).snapshot.title).toBe("Capitais do mundo");

    await unpublishActivity(created.id, owner!.id);
    const secondRevision = await publishActivity(created.id, owner!.id);
    expect(secondRevision.revision).toBe(2);
    const remix = await remixActivity(created.id, remixer!.id);
    const remixed = await getOwnedActivity(remix.id, remixer!.id);
    expect(remixed.remixedFromActivityId).toBe(created.id);
    expect(remixed.remixedFromRevision).toBe(2);
    expect(remixed.visibility).toBe("private");

    await updateDraft(created.id, owner!.id, { title: "Privada", description: null, tags: [], visibility: "private", content: originalContent, defaultPresentationId });
    await publishActivity(created.id, owner!.id);
    await expect(getPublicActivityBySlug(created.slug)).rejects.toMatchObject({ status: 404 });
    expect((await getPublicActivityBySlug(created.slug, owner!.id)).snapshot.title).toBe("Privada");
  });
});
