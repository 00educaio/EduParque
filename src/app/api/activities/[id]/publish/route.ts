import { requireUser } from "@/modules/auth/application/authorization";
import { publishActivity, unpublishActivity } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function POST(_request: Request, context: RouteContext<"/api/activities/[id]/publish">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await publishActivity(id, user.id), { status: 201 }); }
  catch (error) { return activityErrorResponse(error); }
}
export async function DELETE(_request: Request, context: RouteContext<"/api/activities/[id]/publish">) {
  try { const user = await requireUser(); const { id } = await context.params; await unpublishActivity(id, user.id); return new Response(null, { status: 204 }); }
  catch (error) { return activityErrorResponse(error); }
}
