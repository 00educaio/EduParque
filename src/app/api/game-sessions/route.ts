import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { createGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user ? assertUser(session.user) : undefined;
    const created = await createGameSession(user, await request.json());
    const response = Response.json({ id: created.id, state: created.state }, { status: 201 });
    if (created.controllerToken) response.headers.append("Set-Cookie", `${sessionControllerCookieName(created.id)}=${created.controllerToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  }
  catch (error) { return gameSessionErrorResponse(error); }
}
