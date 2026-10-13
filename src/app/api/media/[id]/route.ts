import { NextResponse } from "next/server";
import { ForbiddenError } from "@/modules/auth/application/authorization";
import { assertUser } from "@/modules/auth/application/policies";
import { auth } from "@/modules/auth/infrastructure/auth";
import { getReadableMedia } from "@/modules/media/application/media-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user ? assertUser(session.user) : undefined;
    const { id } = await context.params;
    const { asset, object } = await getReadableMedia(id, user?.id);
    const body = new Uint8Array(object.body).buffer;
    return new Response(body, {
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.contentLength ?? object.body.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
        "Cache-Control": user ? "private, max-age=3600" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel carregar a midia." }, { status: 500 });
  }
}
