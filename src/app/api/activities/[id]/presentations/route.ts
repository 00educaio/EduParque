import { requireUser } from "@/modules/auth/application/authorization";
import { savePresentation } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function POST(request: Request, context: RouteContext<"/api/activities/[id]/presentations">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await savePresentation(id, user.id, await request.json()), { status: 201 }); }
  catch (error) { return activityErrorResponse(error); }
}
