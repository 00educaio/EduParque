import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/modules/auth/application/authorization";
import { beginMediaUpload, DirectUploadUnavailableError, listOwnedMedia, uploadMedia } from "@/modules/media/application/media-service";
import { InvalidMediaError, MAX_MEDIA_BYTES } from "@/modules/media/domain/media-validation";
import { getEnv } from "@/shared/infrastructure/config/env";

const beginUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  byteSize: z.number().int().positive(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listOwnedMedia(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel listar a biblioteca de midia." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (request.headers.get("content-type")?.startsWith("application/json")) {
      const input = beginUploadSchema.parse(await request.json());
      const prepared = await beginMediaUpload({ ownerId: user.id, filename: input.filename, declaredMimeType: input.mimeType, byteSize: input.byteSize });
      return NextResponse.json({
        id: prepared.asset.id,
        kind: prepared.asset.kind,
        filename: prepared.asset.filename,
        uploadUrl: prepared.uploadUrl,
        uploadHeaders: prepared.uploadHeaders,
        expiresAt: prepared.expiresAt.toISOString(),
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json({ error: "Uploads na Vercel exigem o fluxo S3 direto pre-assinado." }, { status: 503 });
    }
    if (getEnv().STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Em S3, use o fluxo de upload direto pre-assinado." }, { status: 415 });
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_MEDIA_BYTES + 64 * 1024) return NextResponse.json({ error: "O upload excede o limite maximo de 25 MiB." }, { status: 413 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo no campo 'file'." }, { status: 400 });
    if (file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "O upload excede o limite maximo de 25 MiB." }, { status: 413 });

    const asset = await uploadMedia({
      ownerId: user.id,
      filename: file.name,
      declaredMimeType: file.type,
      body: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({ ...asset, url: `/api/media/${asset.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Metadados de upload invalidos.", issues: error.issues }, { status: 400 });
    if (error instanceof UnauthorizedError || error instanceof InvalidMediaError || error instanceof DirectUploadUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel salvar a midia." }, { status: 500 });
  }
}
