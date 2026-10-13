import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/authorization";
import { GameSessionNotFoundError, InvalidSessionCommandError } from "./game-session-service";

export function gameSessionErrorResponse(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: "Dados da sessao invalidos.", issues: error.issues }, { status: 400 });
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof GameSessionNotFoundError || error instanceof InvalidSessionCommandError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Nao foi possivel processar a sessao." }, { status: 500 });
}
