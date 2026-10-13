import { z } from "zod";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { listUsers, removeUser, setUserRole } from "@/modules/admin/application/admin-service";
import { adminErrorResponse } from "@/modules/admin/application/http";

const changeSchema = z.object({ id: z.string().uuid(), role: z.enum(["USER", "ADMIN"]) });
const removeSchema = z.object({ id: z.string().uuid() });

export async function GET(request: Request) {
  try { await requireAdmin(); return Response.json(await listUsers(new URL(request.url).searchParams.get("q") ?? "")); }
  catch (error) { return adminErrorResponse(error); }
}
export async function PATCH(request: Request) {
  try { const actor = await requireAdmin(); const input = changeSchema.parse(await request.json()); return Response.json(await setUserRole(input.id, input.role, actor.id)); }
  catch (error) { return adminErrorResponse(error); }
}
export async function DELETE(request: Request) {
  try { const actor = await requireAdmin(); const input = removeSchema.parse(await request.json()); await removeUser(input.id, actor.id); return new Response(null, { status: 204 }); }
  catch (error) { return adminErrorResponse(error); }
}
