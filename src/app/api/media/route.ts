import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/modules/auth/application/authorization";
import { uploadMedia } from "@/modules/media/application/media-service";
import { InvalidMediaError } from "@/modules/media/domain/media-validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 26 * 1024 * 1024) return NextResponse.json({ error: "O upload excede o limite de 25 MB." }, { status: 413 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo no campo 'file'." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "O upload excede o limite de 25 MB." }, { status: 413 });

    const asset = await uploadMedia({
      ownerId: user.id,
      filename: file.name,
      declaredMimeType: file.type,
      body: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({ ...asset, url: `/api/media/${asset.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof InvalidMediaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel salvar a midia." }, { status: 500 });
  }
}
