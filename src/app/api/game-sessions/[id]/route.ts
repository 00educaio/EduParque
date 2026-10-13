import { auth } from "@/modules/auth/infrastructure/auth";
import { cookies } from "next/headers";
import { assertUser } from "@/modules/auth/application/policies";
import { getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";

export async function GET(_request: Request, context: RouteContext<"/api/game-sessions/[id]">) {
  try {
    const session = await auth();
    const user = session?.user ? assertUser(session.user) : undefined;
    const { id } = await context.params;
    const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
    return Response.json(await getGameSession(id, user, controllerToken));
  } catch (error) { return gameSessionErrorResponse(error); }
}
