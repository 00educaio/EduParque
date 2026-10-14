import { requireUser } from "@/modules/auth/application/authorization";
import { supportErrorResponse } from "@/modules/support/application/http";
import { addTeacherSupportMessage } from "@/modules/support/application/support-service";
import { supportTicketIdSchema } from "@/modules/support/domain/support-ticket";

export async function POST(request: Request, context: RouteContext<"/api/support-tickets/[id]/messages">) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await addTeacherSupportMessage(supportTicketIdSchema.parse(id), user.id, await request.json()), { status: 201 });
  } catch (error) { return supportErrorResponse(error); }
}
