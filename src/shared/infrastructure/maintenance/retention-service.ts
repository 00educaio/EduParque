import "server-only";

import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { deleteTemporaryTeamImages } from "@/modules/game-sessions/infrastructure/temporary-team-image-store";
import { getEnv } from "@/shared/infrastructure/config/env";
import { db } from "@/shared/infrastructure/database/client";
import { authLoginAttempts, gameSessions, registrationInvites, sessions } from "@/shared/infrastructure/database/schema";

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60_000);
}

export async function cleanupExpiredAuthData(now = new Date()) {
  const cutoff = daysBefore(now, getEnv().LOGIN_ATTEMPT_RETENTION_DAYS);
  const [loginAttempts, expiredSessions, invites] = await Promise.all([
    db.delete(authLoginAttempts).where(and(lt(authLoginAttempts.updatedAt, cutoff), or(isNull(authLoginAttempts.lockedUntil), lt(authLoginAttempts.lockedUntil, now)))).returning({ id: authLoginAttempts.identifierHash }),
    db.delete(sessions).where(lt(sessions.expires, now)).returning({ id: sessions.sessionToken }),
    db.delete(registrationInvites).where(and(
      lt(registrationInvites.createdAt, cutoff),
      or(lt(registrationInvites.expiresAt, now), isNotNull(registrationInvites.usedAt), isNotNull(registrationInvites.revokedAt)),
    )).returning({ id: registrationInvites.id }),
  ]);
  return { loginAttempts: loginAttempts.length, sessions: expiredSessions.length, registrationInvites: invites.length };
}

export async function cleanupFinishedGameSessions(now = new Date()) {
  const cutoff = daysBefore(now, getEnv().SESSION_RETENTION_DAYS);
  const expired = await db.select({ id: gameSessions.id }).from(gameSessions)
    .where(and(eq(gameSessions.status, "finished"), lt(gameSessions.finishedAt, cutoff))).limit(100);
  let deleted = 0;
  for (const session of expired) {
    try {
      await deleteTemporaryTeamImages(session.id);
      const removed = await db.delete(gameSessions).where(and(eq(gameSessions.id, session.id), eq(gameSessions.status, "finished"), lt(gameSessions.finishedAt, cutoff))).returning({ id: gameSessions.id });
      deleted += removed.length;
    } catch (error) {
      console.error(`Falha ao limpar sessao finalizada ${session.id}.`, error);
    }
  }
  return deleted;
}
