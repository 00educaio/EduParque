import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/policies";
import { SupportRateLimitError, SupportTicketClosedError, SupportTicketNotFoundError } from "./support-service";

export function supportErrorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Os dados enviados são inválidos." }, { status: 400 });
  }

  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Dados inválidos.", issues: error.issues }, { status: 400 });
  }
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof SupportTicketNotFoundError || error instanceof SupportTicketClosedError || error instanceof SupportRateLimitError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Não foi possível concluir a operação de atendimento." }, { status: 500 });
}
