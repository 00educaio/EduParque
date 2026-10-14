import { requireUser } from "@/modules/auth/application/authorization";
import { supportErrorResponse } from "@/modules/support/application/http";
import { getUserSupportTicket } from "@/modules/support/application/support-service";
import { supportTicketIdSchema } from "@/modules/support/domain/support-ticket";

export async function GET(_request: Request, context: RouteContext<"/api/support-tickets/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await getUserSupportTicket(supportTicketIdSchema.parse(id), user.id));
  } catch (error) { return supportErrorResponse(error); }
}
