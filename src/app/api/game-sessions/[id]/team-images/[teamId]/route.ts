import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";
import {
  deleteTemporaryTeamImage,
  getTemporaryTeamImage,
  InvalidTeamImageError,
  MAX_TEAM_IMAGE_BYTES,
  putTemporaryTeamImage,
} from "@/modules/game-sessions/infrastructure/temporary-team-image-store";
import { StorageObjectNotFoundError } from "@/modules/media/infrastructure/postgres-storage-provider";

async function sessionAccess(id: string) {
  const authSession = await auth();
  const user = authSession?.user ? assertUser(authSession.user) : undefined;
  const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
  return getGameSession(id, user, controllerToken);
}

function assertKnownTeam(session: Awaited<ReturnType<typeof getGameSession>>, teamId: string) {
  if (!session.state.teams.some((team) => team.id === teamId)) throw new InvalidTeamImageError("Equipe nao encontrada nesta sessao.");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; teamId: string }> }) {
  try {
    const { id, teamId } = await context.params;
    const session = await sessionAccess(id);
    assertKnownTeam(session, teamId);
    const image = await getTemporaryTeamImage(id, teamId);
    return new Response(new Uint8Array(image.body).buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.byteSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof InvalidTeamImageError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof StorageObjectNotFoundError) return new Response(null, { status: 404 });
    return gameSessionErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; teamId: string }> }) {
  try {
    const { id, teamId } = await context.params;
    const session = await sessionAccess(id);
    if (!session.canControl) return NextResponse.json({ error: "Somente o apresentador pode alterar imagens das equipes." }, { status: 403 });
    assertKnownTeam(session, teamId);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_TEAM_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "A imagem da equipe pode ter no maximo 3 MB." }, { status: 413 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma imagem no campo 'file'." }, { status: 400 });
    if (file.size > MAX_TEAM_IMAGE_BYTES) return NextResponse.json({ error: "A imagem da equipe pode ter no maximo 3 MB." }, { status: 413 });
    const stored = await putTemporaryTeamImage({ sessionId: id, teamId, declaredMimeType: file.type, body: new Uint8Array(await file.arrayBuffer()) });
    return NextResponse.json({ teamId, contentType: stored.contentType }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidTeamImageError) return NextResponse.json({ error: error.message }, { status: error.status });
    return gameSessionErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; teamId: string }> }) {
  try {
    const { id, teamId } = await context.params;
    const session = await sessionAccess(id);
    if (!session.canControl) return NextResponse.json({ error: "Somente o apresentador pode alterar imagens das equipes." }, { status: 403 });
    assertKnownTeam(session, teamId);
    await deleteTemporaryTeamImage(id, teamId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvalidTeamImageError) return NextResponse.json({ error: error.message }, { status: error.status });
    return gameSessionErrorResponse(error);
  }
}
