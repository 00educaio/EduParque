import { cookies } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { executeSessionCommand, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";

export async function POST(request: Request, context: RouteContext<"/api/game-sessions/[id]/commands">) {
  try {
    const session = await auth();
    const user = session?.user ? assertUser(session.user) : undefined;
    const { id } = await context.params;
    const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
    return Response.json(await executeSessionCommand(id, await request.json(), user, false, controllerToken));
  } catch (error) { return gameSessionErrorResponse(error); }
}
