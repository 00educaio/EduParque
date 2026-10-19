import "server-only";

import { and, asc, count, desc, eq, gte, ne } from "drizzle-orm";
import { getDatabase } from "@/shared/infrastructure/database/client";
import { supportMessages, supportTickets, users } from "@/shared/infrastructure/database/schema";
import {
  createSupportMessageSchema,
  createSupportTicketSchema,
  supportTicketStatusSchema,
  type SupportTicketStatus,
} from "@/modules/support/domain/support-ticket";

export class SupportTicketNotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Solicitação não encontrada.") { super(message); this.name = "SupportTicketNotFoundError"; }
}

export class SupportTicketClosedError extends Error {
  readonly status = 409;
  constructor() { super("Esta solicitação está encerrada e não recebe novas mensagens."); this.name = "SupportTicketClosedError"; }
}

export class SupportRateLimitError extends Error {
  readonly status = 429;
  constructor(message: string) { super(message); this.name = "SupportRateLimitError"; }
}

const ticketSelection = {
  id: supportTickets.id,
  ownerId: supportTickets.ownerId,
  category: supportTickets.category,
  subject: supportTickets.subject,
  status: supportTickets.status,
  createdAt: supportTickets.createdAt,
  updatedAt: supportTickets.updatedAt,
  closedAt: supportTickets.closedAt,
  ownerName: users.name,
  ownerEmail: users.email,
};

async function assertTicketCreationRate(ownerId: string) {
  const { db } = getDatabase();
  const since = new Date(Date.now() - 60 * 60 * 1_000);
  const [result] = await db.select({ value: count() }).from(supportTickets).where(and(eq(supportTickets.ownerId, ownerId), gte(supportTickets.createdAt, since)));
  if ((result?.value ?? 0) >= 5) throw new SupportRateLimitError("Você atingiu o limite de 5 novas solicitações por hora. Aguarde antes de tentar novamente.");
}

async function assertMessageRate(authorId: string) {
  const { db } = getDatabase();
  const since = new Date(Date.now() - 10 * 60 * 1_000);
  const [result] = await db.select({ value: count() }).from(supportMessages).where(and(eq(supportMessages.authorId, authorId), gte(supportMessages.createdAt, since)));
  if ((result?.value ?? 0) >= 20) throw new SupportRateLimitError("Muitas mensagens foram enviadas em pouco tempo. Aguarde alguns minutos.");
}

async function listMessages(ticketId: string) {
  const { db } = getDatabase();
  return db.select({
    id: supportMessages.id,
    ticketId: supportMessages.ticketId,
    authorId: supportMessages.authorId,
    authorKind: supportMessages.authorKind,
    authorName: users.name,
    body: supportMessages.body,
    createdAt: supportMessages.createdAt,
  }).from(supportMessages).innerJoin(users, eq(users.id, supportMessages.authorId))
    .where(eq(supportMessages.ticketId, ticketId)).orderBy(asc(supportMessages.createdAt), asc(supportMessages.id));
}

export async function listUserSupportTickets(ownerId: string) {
  const { db } = getDatabase();
  return db.select(ticketSelection).from(supportTickets).innerJoin(users, eq(users.id, supportTickets.ownerId))
    .where(eq(supportTickets.ownerId, ownerId)).orderBy(desc(supportTickets.updatedAt)).limit(100);
}

export async function getUserSupportTicket(ticketId: string, ownerId: string) {
  const { db } = getDatabase();
  const [ticket] = await db.select(ticketSelection).from(supportTickets).innerJoin(users, eq(users.id, supportTickets.ownerId))
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.ownerId, ownerId))).limit(1);
  if (!ticket) throw new SupportTicketNotFoundError();
  return { ticket, messages: await listMessages(ticket.id) };
}

export async function createSupportTicket(ownerId: string, input: unknown) {
  const { db } = getDatabase();
  const parsed = createSupportTicketSchema.parse(input);
  await assertTicketCreationRate(ownerId);
  await assertMessageRate(ownerId);
  return db.transaction(async (tx) => {
    const [ticket] = await tx.insert(supportTickets).values({ ownerId, category: parsed.category, subject: parsed.subject }).returning();
    if (!ticket) throw new Error("Não foi possível criar a solicitação.");
    await tx.insert(supportMessages).values({ ticketId: ticket.id, authorId: ownerId, authorKind: "teacher", body: parsed.description });
    return ticket;
  });
}

export async function addTeacherSupportMessage(ticketId: string, ownerId: string, input: unknown) {
  const { db } = getDatabase();
  const parsed = createSupportMessageSchema.parse(input);
  await assertMessageRate(ownerId);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [ticket] = await tx.update(supportTickets).set({ status: "open", updatedAt: now })
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.ownerId, ownerId), ne(supportTickets.status, "closed"))).returning();
    if (!ticket) {
      const [existing] = await tx.select({ status: supportTickets.status }).from(supportTickets)
        .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.ownerId, ownerId))).limit(1);
      if (!existing) throw new SupportTicketNotFoundError();
      throw new SupportTicketClosedError();
    }
    const [message] = await tx.insert(supportMessages).values({ ticketId, authorId: ownerId, authorKind: "teacher", body: parsed.body, createdAt: now }).returning();
    return message!;
  });
}

export async function listAdminSupportTickets(status?: string) {
  const { db } = getDatabase();
  const parsedStatus = status ? supportTicketStatusSchema.parse(status) : undefined;
  return db.select(ticketSelection).from(supportTickets).innerJoin(users, eq(users.id, supportTickets.ownerId))
    .where(parsedStatus ? eq(supportTickets.status, parsedStatus) : undefined)
    .orderBy(desc(supportTickets.updatedAt)).limit(200);
}

export async function getAdminSupportTicket(ticketId: string) {
  const { db } = getDatabase();
  const [ticket] = await db.select(ticketSelection).from(supportTickets).innerJoin(users, eq(users.id, supportTickets.ownerId))
    .where(eq(supportTickets.id, ticketId)).limit(1);
  if (!ticket) throw new SupportTicketNotFoundError();
  return { ticket, messages: await listMessages(ticket.id) };
}

export async function addAdminSupportMessage(ticketId: string, adminId: string, input: unknown) {
  const { db } = getDatabase();
  const parsed = createSupportMessageSchema.parse(input);
  await assertMessageRate(adminId);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [ticket] = await tx.update(supportTickets).set({ status: "answered", updatedAt: now })
      .where(and(eq(supportTickets.id, ticketId), ne(supportTickets.status, "closed"))).returning();
    if (!ticket) {
      const [existing] = await tx.select({ status: supportTickets.status }).from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
      if (!existing) throw new SupportTicketNotFoundError();
      throw new SupportTicketClosedError();
    }
    const [message] = await tx.insert(supportMessages).values({ ticketId, authorId: adminId, authorKind: "admin", body: parsed.body, createdAt: now }).returning();
    return message!;
  });
}

export async function closeSupportTicket(ticketId: string) {
  const { db } = getDatabase();
  const [ticket] = await db.update(supportTickets).set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId)).returning();
  if (!ticket) throw new SupportTicketNotFoundError();
  return ticket;
}

export function isSupportTicketStatus(value: string): value is SupportTicketStatus {
  return supportTicketStatusSchema.safeParse(value).success;
}
