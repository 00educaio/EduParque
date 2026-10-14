import { requireAdmin } from "@/modules/auth/application/authorization";
import { supportErrorResponse } from "@/modules/support/application/http";
import { listAdminSupportTickets } from "@/modules/support/application/support-service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(await listAdminSupportTickets(new URL(request.url).searchParams.get("status") ?? undefined));
  } catch (error) { return supportErrorResponse(error); }
}
