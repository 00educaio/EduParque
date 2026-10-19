import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/shared/infrastructure/database/client";
import { activities, activityRevisions, gameSessions, sessionEvents } from "@/shared/infrastructure/database/schema";
import { activityRevisionSnapshotSchema } from "@/modules/activities/domain/activity-schemas";
import { ForbiddenError, type AuthorizedUser } from "@/modules/auth/application/policies";
import { createInitialSessionState, InvalidSessionCommandError, reduceSession, restoreSessionState } from "@/modules/game-sessions/domain/session-reducer";
import { createSessionInputSchema, sessionCommandSchema, sessionStateSchema, type CreateSessionInput, type SessionCommand } from "@/modules/game-sessions/domain/session";
import { getGameTemplate } from "@/modules/game-templates";
import { deleteTemporaryTeamImages, listTemporaryTeamImageIds } from "@/modules/game-sessions/infrastructure/temporary-team-image-store";

export class GameSessionNotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Sessao nao encontrada.") { super(message); this.name = "GameSessionNotFoundError"; }
}

export function sessionControllerCookieName(sessionId: string) {
  return `eduparque_session_${sessionId}`;
}

function hashControllerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string | undefined, expectedHash: string | null) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashControllerToken(token));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function countItems(content: ReturnType<typeof activityRevisionSnapshotSchema.parse>["content"], supportedTypes: readonly string[]) {
  return content.filter((block) => supportedTypes.includes(block.type)).reduce((total, block) => {
    if (block.type === "prompt-answer" || block.type === "item-list") return total + block.items.length;
    if (block.type === "pair") return total + block.pairs.length;
    if (block.type === "categorized-item") return total + block.categories.reduce((sum, category) => sum + category.items.length, 0);
    return total + block.sequences.length;
  }, 0);
}

function extractDefaultPoints(gameConfig: Record<string, unknown>) {
  const base = typeof gameConfig.base === "object" && gameConfig.base ? gameConfig.base as Record<string, unknown> : {};
  const scoring = typeof base.scoring === "object" && base.scoring ? base.scoring as Record<string, unknown> : {};
  return typeof scoring.correct === "number" ? scoring.correct : 100;
}

async function getPublishedSource(activityId: string) {
  const { db } = getDatabase();
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) });
  if (!activity?.currentPublishedRevision || activity.deletedAt) throw new GameSessionNotFoundError("Atividade publicada nao encontrada.");
  const revision = await db.query.activityRevisions.findFirst({ where: and(eq(activityRevisions.activityId, activityId), eq(activityRevisions.revision, activity.currentPublishedRevision)) });
  if (!revision) throw new GameSessionNotFoundError("Revisao publicada nao encontrada.");
  return { activity, revision, snapshot: activityRevisionSnapshotSchema.parse(revision.snapshot) };
}

export async function createGameSession(user: AuthorizedUser | undefined, rawInput: unknown) {
  const { db } = getDatabase();
  const input: CreateSessionInput = createSessionInputSchema.parse(rawInput);
  const source = await getPublishedSource(input.activityId);
  if (source.snapshot.visibility === "private" && source.activity.ownerId !== user?.id && user?.role !== "ADMIN") throw new ForbiddenError();
  const presentation = source.snapshot.presentations.find((item) => item.id === input.presentationId);
  if (!presentation) throw new GameSessionNotFoundError("Apresentacao publicada nao encontrada.");
  const totalItems = countItems(source.snapshot.content, getGameTemplate(presentation.templateKey).supportedContentTypes);
  if (!totalItems) throw new InvalidSessionCommandError("A apresentacao nao possui conteudo compativel para iniciar.");
  const sessionId = crypto.randomUUID();
  const controllerToken = user ? undefined : randomBytes(32).toString("base64url");
  const state = createInitialSessionState({
    sessionId, teams: input.teams, timer: input.timer, totalItems,
    sourceTemplateKey: presentation.templateKey, defaultPoints: extractDefaultPoints(presentation.gameConfig),
  });
  await db.transaction(async (tx) => {
    await tx.insert(gameSessions).values({ id: sessionId, activityId: input.activityId, revisionId: source.revision.id, presentationId: input.presentationId, hostUserId: user?.id ?? null, hostTokenHash: controllerToken ? hashControllerToken(controllerToken) : null, status: "created", state });
    await tx.insert(sessionEvents).values({ sessionId, sequence: 0, type: "sessionCreated", payload: { teams: state.teams.length, timer: state.timer.mode, templateKey: presentation.templateKey } });
  });
  return { id: sessionId, state, controllerToken };
}

async function readSessionRecord(sessionId: string) {
  const { db } = getDatabase();
  const [record] = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
  if (!record) throw new GameSessionNotFoundError();
  const revision = record.revisionId ? await db.query.activityRevisions.findFirst({ where: eq(activityRevisions.id, record.revisionId) }) : null;
  if (!revision) throw new GameSessionNotFoundError("A revisao da sessao nao foi encontrada.");
  const snapshot = activityRevisionSnapshotSchema.parse(revision.snapshot);
  const presentation = snapshot.presentations.find((item) => item.id === record.presentationId);
  if (!presentation) throw new GameSessionNotFoundError("A apresentacao da sessao nao foi encontrada.");
  return { record, snapshot, presentation };
}

function assertCanView(hostUserId: string | null, visibility: "private" | "unlisted" | "public", user?: AuthorizedUser) {
  if (visibility === "private" && hostUserId !== user?.id && user?.role !== "ADMIN") throw new ForbiddenError();
}

function canControl(hostUserId: string | null, hostTokenHash: string | null, user?: AuthorizedUser, controllerToken?: string) {
  return user?.role === "ADMIN" || (Boolean(hostUserId) && hostUserId === user?.id) || (!hostUserId && tokenMatches(controllerToken, hostTokenHash));
}

function assertCanControl(hostUserId: string | null, hostTokenHash: string | null, user?: AuthorizedUser, controllerToken?: string) {
  if (!canControl(hostUserId, hostTokenHash, user, controllerToken)) throw new ForbiddenError("Somente o apresentador pode controlar esta sessao.");
}

export async function getGameSession(sessionId: string, user?: AuthorizedUser, controllerToken?: string) {
  let source = await readSessionRecord(sessionId);
  assertCanView(source.record.hostUserId, source.snapshot.visibility, user);
  const parsed = sessionStateSchema.parse(source.record.state);
  const restored = restoreSessionState(parsed);
  if (parsed.timer.running && restored.timer.remainingSeconds === 0) {
    try { await executeSessionCommand(sessionId, { type: "expireTimer" }, { id: source.record.hostUserId!, role: "USER" }, true); }
    catch (error) { if (!(error instanceof InvalidSessionCommandError)) throw error; }
    source = await readSessionRecord(sessionId);
  }
  return { id: source.record.id, hostUserId: source.record.hostUserId, canControl: canControl(source.record.hostUserId, source.record.hostTokenHash, user, controllerToken), state: restoreSessionState(source.record.state), teamImageTeamIds: await listTemporaryTeamImageIds(sessionId), snapshot: source.snapshot, presentation: source.presentation };
}

export async function executeSessionCommand(sessionId: string, rawCommand: unknown, user?: AuthorizedUser, internal = false, controllerToken?: string) {
  const { db } = getDatabase();
  const command: SessionCommand = sessionCommandSchema.parse(rawCommand);
  if (command.type === "expireTimer" && !internal) throw new ForbiddenError();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${gameSessions} where ${gameSessions.id} = ${sessionId} for update`);
    const [record] = await tx.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
    if (!record) throw new GameSessionNotFoundError();
    if (!internal) assertCanControl(record.hostUserId, record.hostTokenHash, user, controllerToken);
    const result = reduceSession(sessionStateSchema.parse(record.state), command);
    await tx.update(gameSessions).set({ state: result.state, status: result.state.status, updatedAt: new Date(), finishedAt: result.state.finishedAt ? new Date(result.state.finishedAt) : null }).where(eq(gameSessions.id, sessionId));
    await tx.insert(sessionEvents).values({ sessionId, sequence: result.event.sequence, type: result.event.type, payload: result.event.payload });
    return result;
  });
  if (result.state.status === "finished") await deleteTemporaryTeamImages(sessionId);
  return result;
}

export { InvalidSessionCommandError };

export class GameSessionService {
  create = createGameSession;
  get = getGameSession;
  execute = executeSessionCommand;
}
