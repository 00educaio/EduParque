import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { gameSessionErrorResponse } from "@/modules/game-sessions/application/http";
import {
  beginTemporaryTeamImageUpload,
  completeTemporaryTeamImageUpload,
  deleteTemporaryTeamImage,
  getTemporaryTeamImage,
  InvalidTeamImageError,
  MAX_TEAM_IMAGE_BYTES,
  putTemporaryTeamImage,
  TeamImageDirectUploadUnavailableError,
  TeamImageNotFoundError,
} from "@/modules/game-sessions/infrastructure/temporary-team-image-store";

const uploadRequestSchema = z.union([
  z.object({ uploadId: z.string().uuid() }),
  z.object({ mimeType: z.string().trim().min(1).max(100), byteSize: z.number().int().positive() }),
]);

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
    if (image.readUrl) return NextResponse.redirect(image.readUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } });
    const object = await image.storage.get(image.record.storageKey);
    return new Response(new Uint8Array(object.body).buffer, {
      headers: {
        "Content-Type": image.record.contentType,
        "Content-Length": String(image.record.byteSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof InvalidTeamImageError || error instanceof TeamImageNotFoundError) return NextResponse.json({ error: error.message }, { status: error.status });
    return gameSessionErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; teamId: string }> }) {
  try {
    const { id, teamId } = await context.params;
    const session = await sessionAccess(id);
    if (!session.canControl) return NextResponse.json({ error: "Somente o apresentador pode alterar imagens das equipes." }, { status: 403 });
    assertKnownTeam(session, teamId);
    if (request.headers.get("content-type")?.startsWith("application/json")) {
      const input = uploadRequestSchema.parse(await request.json());
      if ("uploadId" in input) {
        const stored = await completeTemporaryTeamImageUpload({ sessionId: id, teamId, uploadId: input.uploadId });
        return NextResponse.json({ teamId, contentType: stored.contentType }, { status: 201, headers: { "Cache-Control": "no-store" } });
      }
      const prepared = await beginTemporaryTeamImageUpload({ sessionId: id, teamId, declaredMimeType: input.mimeType, byteSize: input.byteSize });
      return NextResponse.json(prepared, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_TEAM_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "A imagem da equipe pode ter no maximo 5 MiB." }, { status: 413 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma imagem no campo 'file'." }, { status: 400 });
    if (file.size > MAX_TEAM_IMAGE_BYTES) return NextResponse.json({ error: "A imagem da equipe pode ter no maximo 5 MiB." }, { status: 413 });
    const stored = await putTemporaryTeamImage({ sessionId: id, teamId, declaredMimeType: file.type, body: new Uint8Array(await file.arrayBuffer()) });
    return NextResponse.json({ teamId, contentType: stored.contentType }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Metadados de upload invalidos.", issues: error.issues }, { status: 400 });
    if (error instanceof InvalidTeamImageError || error instanceof TeamImageDirectUploadUnavailableError) return NextResponse.json({ error: error.message }, { status: error.status });
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
