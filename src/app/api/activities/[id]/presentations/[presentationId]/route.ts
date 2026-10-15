import { requireUser } from "@/modules/auth/application/authorization";
import { removePresentation, savePresentation } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function PUT(request: Request, context: RouteContext<"/api/activities/[id]/presentations/[presentationId]">) {
  try {
    const user = await requireUser(); const { id, presentationId } = await context.params;
    const body: unknown = await request.json();
    const input = typeof body === "object" && body !== null && !Array.isArray(body) ? body : {};
    return Response.json(await savePresentation(id, user.id, { ...input, id: presentationId }));
  } catch (error) { return activityErrorResponse(error); }
}
export async function DELETE(_request: Request, context: RouteContext<"/api/activities/[id]/presentations/[presentationId]">) {
  try { const user = await requireUser(); const { id, presentationId } = await context.params; await removePresentation(id, presentationId, user.id); return new Response(null, { status: 204 }); }
  catch (error) { return activityErrorResponse(error); }
}
