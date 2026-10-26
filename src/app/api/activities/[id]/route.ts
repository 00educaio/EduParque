import { requireUser } from "@/modules/auth/application/authorization";
import { deleteActivity, getOwnedActivity, saveActivityEditor, updateDraft } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function GET(_request: Request, context: RouteContext<"/api/activities/[id]">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await getOwnedActivity(id, user.id)); }
  catch (error) { return activityErrorResponse(error); }
}

export async function PATCH(request: Request, context: RouteContext<"/api/activities/[id]">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await updateDraft(id, user.id, await request.json())); }
  catch (error) { return activityErrorResponse(error); }
}

export async function PUT(request: Request, context: RouteContext<"/api/activities/[id]">) {
  try { const user = await requireUser(); const { id } = await context.params; return Response.json(await saveActivityEditor(id, user.id, await request.json())); }
  catch (error) { return activityErrorResponse(error); }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/activities/[id]">) {
  try { const user = await requireUser(); const { id } = await context.params; await deleteActivity(id, user.id); return new Response(null, { status: 204 }); }
  catch (error) { return activityErrorResponse(error); }
}
