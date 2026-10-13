import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";
import { deleteTemporaryTeamImages } from "@/modules/game-sessions/infrastructure/temporary-team-image-store";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const authSession = await auth();
    const user = authSession?.user ? assertUser(authSession.user) : undefined;
    const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
    const session = await getGameSession(id, user, controllerToken);
    if (!session.canControl) return NextResponse.json({ error: "Somente o apresentador pode encerrar os recursos da sessao." }, { status: 403 });
    await deleteTemporaryTeamImages(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return gameSessionErrorResponse(error);
  }
}
