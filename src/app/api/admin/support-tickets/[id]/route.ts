import { requireAdmin } from "@/modules/auth/application/authorization";
import { supportErrorResponse } from "@/modules/support/application/http";
import { closeSupportTicket, getAdminSupportTicket } from "@/modules/support/application/support-service";
import { closeSupportTicketSchema, supportTicketIdSchema } from "@/modules/support/domain/support-ticket";

export async function GET(_request: Request, context: RouteContext<"/api/admin/support-tickets/[id]">) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    return Response.json(await getAdminSupportTicket(supportTicketIdSchema.parse(id)));
  } catch (error) { return supportErrorResponse(error); }
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/support-tickets/[id]">) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    closeSupportTicketSchema.parse(await request.json());
    return Response.json(await closeSupportTicket(supportTicketIdSchema.parse(id)));
  } catch (error) { return supportErrorResponse(error); }
}
