import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/authorization";
import { ActivityNotFoundError, InvalidActivityError } from "./activity-service";

export function activityErrorResponse(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: "Dados invalidos.", issues: error.issues }, { status: 400 });
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof ActivityNotFoundError || error instanceof InvalidActivityError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Nao foi possivel concluir a operacao." }, { status: 500 });
}
