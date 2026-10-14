import { requireUser } from "@/modules/auth/application/authorization";
import { createSupportTicket, listUserSupportTickets } from "@/modules/support/application/support-service";
import { supportErrorResponse } from "@/modules/support/application/http";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listUserSupportTickets(user.id));
  } catch (error) { return supportErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    return Response.json(await createSupportTicket(user.id, await request.json()), { status: 201 });
  } catch (error) { return supportErrorResponse(error); }
}
