import { requireUser } from "@/modules/auth/application/authorization";
import { createActivity } from "@/modules/activities/application/activity-service";
import { activityErrorResponse } from "@/modules/activities/application/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({})) as { title?: unknown };
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : undefined;
    return Response.json(await createActivity(user.id, title), { status: 201 });
  } catch (error) { return activityErrorResponse(error); }
}
