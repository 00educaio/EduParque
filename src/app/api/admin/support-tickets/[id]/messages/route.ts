import { requireAdmin } from "@/modules/auth/application/authorization";
import { supportErrorResponse } from "@/modules/support/application/http";
import { addAdminSupportMessage } from "@/modules/support/application/support-service";
import { supportTicketIdSchema } from "@/modules/support/domain/support-ticket";

export async function POST(request: Request, context: RouteContext<"/api/admin/support-tickets/[id]/messages">) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    return Response.json(await addAdminSupportMessage(supportTicketIdSchema.parse(id), admin.id, await request.json()), { status: 201 });
  } catch (error) { return supportErrorResponse(error); }
}
