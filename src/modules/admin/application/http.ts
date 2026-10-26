import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/policies";
import { AdminResourceConflictError, AdminResourceNotFoundError } from "./admin-service";

export function adminErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof AdminResourceNotFoundError || error instanceof AdminResourceConflictError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) return Response.json({ error: "Dados administrativos invalidos." }, { status: 400 });
  console.error(error);
  return Response.json({ error: "Nao foi possivel concluir a acao administrativa." }, { status: 500 });
}
