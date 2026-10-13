import { requireUser } from "@/modules/auth/application/authorization";
import { removePresentation, savePresentation } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function PUT(request: Request, context: RouteContext<"/api/activities/[id]/presentations/[presentationId]">) {
  try {
    const user = await requireUser(); const { id, presentationId } = await context.params;
    return Response.json(await savePresentation(id, user.id, { ...await request.json(), id: presentationId }));
  } catch (error) { return activityErrorResponse(error); }
}
export async function DELETE(_request: Request, context: RouteContext<"/api/activities/[id]/presentations/[presentationId]">) {
  try { const user = await requireUser(); const { id, presentationId } = await context.params; await removePresentation(id, presentationId, user.id); return new Response(null, { status: 204 }); }
  catch (error) { return activityErrorResponse(error); }
}
