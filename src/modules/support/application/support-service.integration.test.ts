import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { supportMessages, supportTickets, users } from "@/shared/infrastructure/database/schema";
import {
  addAdminSupportMessage,
  addTeacherSupportMessage,
  closeSupportTicket,
  createSupportTicket,
  getAdminSupportTicket,
  getUserSupportTicket,
} from "./support-service";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const { db, sql } = createDatabase(getEnv().DATABASE_URL);

databaseDescribe("SupportService com PostgreSQL", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    if (userIds.length) {
      const ticketIds = (
        await db
          .select({ id: supportTickets.id })
          .from(supportTickets)
          .where(inArray(supportTickets.ownerId, userIds))
      ).map((ticket) => ticket.id);
      if (ticketIds.length) await db.delete(supportMessages).where(inArray(supportMessages.ticketId, ticketIds));
      await db.delete(supportTickets).where(inArray(supportTickets.ownerId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    await sql.end();
  });

  it("protege ownership e executa o ciclo aberto, respondido e encerrado", async () => {
    const suffix = crypto.randomUUID();
    const [owner, intruder, admin] = await db.insert(users).values([
      { name: "Professor", email: `support-owner-${suffix}@test.local` },
      { name: "Outro professor", email: `support-other-${suffix}@test.local` },
      { name: "Administrador", email: `support-admin-${suffix}@test.local`, role: "ADMIN" },
    ]).returning();
    userIds.push(owner!.id, intruder!.id, admin!.id);

    const created = await createSupportTicket(owner!.id, { category: "question", subject: "Como publicar?", description: "Preciso de ajuda para publicar uma atividade." });
    expect(created.status).toBe("open");
    await expect(getUserSupportTicket(created.id, intruder!.id)).rejects.toMatchObject({ status: 404 });

    const initial = await getUserSupportTicket(created.id, owner!.id);
    expect(initial.messages.map((message) => message.body)).toEqual(["Preciso de ajuda para publicar uma atividade."]);

    await addAdminSupportMessage(created.id, admin!.id, { body: "Abra o editor e use o botão Publicar." });
    expect((await getAdminSupportTicket(created.id)).ticket.status).toBe("answered");

    await addTeacherSupportMessage(created.id, owner!.id, { body: "Funcionou, obrigado!" });
    expect((await getUserSupportTicket(created.id, owner!.id)).ticket.status).toBe("open");

    await closeSupportTicket(created.id);
    expect((await getAdminSupportTicket(created.id)).ticket.status).toBe("closed");
    await expect(addTeacherSupportMessage(created.id, owner!.id, { body: "Nova mensagem" })).rejects.toMatchObject({ status: 409 });
    await expect(addAdminSupportMessage(created.id, admin!.id, { body: "Nova resposta" })).rejects.toMatchObject({ status: 409 });
  });
});
