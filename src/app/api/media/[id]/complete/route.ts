import { NextResponse } from "next/server";
import { requireUser, ForbiddenError, UnauthorizedError } from "@/modules/auth/application/authorization";
import { finalizeMediaUpload } from "@/modules/media/application/media-service";
import { InvalidMediaError } from "@/modules/media/domain/media-validation";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const asset = await finalizeMediaUpload(id, user.id);
    return NextResponse.json({ id: asset.id, kind: asset.kind, filename: asset.filename, url: `/api/media/${asset.id}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof InvalidMediaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel confirmar a midia." }, { status: 500 });
  }
}
