import { auth } from "@/modules/auth/infrastructure/auth";
import { cookies } from "next/headers";
import { assertUser } from "@/modules/auth/application/policies";
import { getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";

export async function GET(request: Request, context: RouteContext<"/api/game-sessions/[id]">) {
  try {
    const session = await auth();
    const user = session?.user ? assertUser(session.user) : undefined;
    const { id } = await context.params;
    const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
    const result = await getGameSession(id, user, controllerToken);
    const imageVersion = [...result.teamImageTeamIds].sort().join(".");
    const etag = `W/"${result.state.sequence}-${result.state.updatedAt}-${imageVersion}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "private, no-store" } });
    return Response.json(result, { headers: { ETag: etag, "Cache-Control": "private, no-store" } });
  } catch (error) { return gameSessionErrorResponse(error); }
}
