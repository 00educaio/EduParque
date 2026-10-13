import { z } from "zod";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { listActivities, setActivityHidden } from "@/modules/admin/application/admin-service";
import { adminErrorResponse } from "@/modules/admin/application/http";

const changeSchema = z.object({ id: z.string().uuid(), hidden: z.boolean() });

export async function GET(request: Request) {
  try { await requireAdmin(); return Response.json(await listActivities(new URL(request.url).searchParams.get("q") ?? "")); }
  catch (error) { return adminErrorResponse(error); }
}
export async function PATCH(request: Request) {
  try { await requireAdmin(); const input = changeSchema.parse(await request.json()); return Response.json(await setActivityHidden(input.id, input.hidden)); }
  catch (error) { return adminErrorResponse(error); }
}
