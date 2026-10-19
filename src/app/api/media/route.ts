import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/modules/auth/application/authorization";
import { uploadMedia } from "@/modules/media/application/media-service";
import { InvalidMediaError, MAX_MEDIA_BYTES } from "@/modules/media/domain/media-validation";
import { StorageQuotaExceededError } from "@/modules/media/infrastructure/postgres-storage-provider";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_MEDIA_BYTES + 64 * 1024) return NextResponse.json({ error: "O upload excede o limite de 5 MB." }, { status: 413 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo no campo 'file'." }, { status: 400 });
    if (file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "O upload excede o limite de 5 MB." }, { status: 413 });

    const asset = await uploadMedia({
      ownerId: user.id,
      filename: file.name,
      declaredMimeType: file.type,
      body: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({ ...asset, url: `/api/media/${asset.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof InvalidMediaError || error instanceof StorageQuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel salvar a midia." }, { status: 500 });
  }
}
