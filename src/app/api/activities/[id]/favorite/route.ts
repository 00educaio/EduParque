import { requireUser } from "@/modules/auth/application/authorization";
import { setFavorite } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function PUT(request: Request, context: RouteContext<"/api/activities/[id]/favorite">) {
  try {
    const user = await requireUser(); const { id } = await context.params;
    const body = await request.json() as { enabled?: unknown };
    await setFavorite(id, user.id, body.enabled === true);
    return Response.json({ favorite: body.enabled === true });
  } catch (error) { return activityErrorResponse(error); }
}
