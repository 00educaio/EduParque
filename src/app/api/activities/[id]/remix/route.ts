import { requireUser } from "@/modules/auth/application/authorization";
import { remixActivity } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function POST(_request: Request, context: RouteContext<"/api/activities/[id]/remix">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await remixActivity(id, user.id), { status: 201 }); }
  catch (error) { return activityErrorResponse(error); }
}
