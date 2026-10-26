import { timingSafeEqual } from "node:crypto";
import { cleanupExpiredTemporaryTeamImages } from "@/modules/game-sessions/infrastructure/temporary-team-image-store";
import { cleanupExpiredPendingMedia } from "@/modules/media/application/media-service";
import { getEnv } from "@/shared/infrastructure/config/env";
import { cleanupExpiredAuthData, cleanupFinishedGameSessions } from "@/shared/infrastructure/maintenance/retention-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request, getEnv().CRON_SECRET)) return Response.json({ error: "Nao autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const [pendingMedia, temporaryTeamImages, authData, gameSessions] = await Promise.all([
      cleanupExpiredPendingMedia(),
      cleanupExpiredTemporaryTeamImages(),
      cleanupExpiredAuthData(),
      cleanupFinishedGameSessions(),
    ]);
    return Response.json({ status: "ok", deleted: { pendingMedia, temporaryTeamImages, ...authData, gameSessions } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha na limpeza diaria de midias.", error);
    return Response.json({ status: "error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
