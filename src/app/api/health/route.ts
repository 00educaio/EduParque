import { sql } from "@/shared/infrastructure/database/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`select 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unhealthy" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
