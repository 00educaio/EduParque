import Image from "next/image";
import { mediaReferenceUrl, type MediaReference } from "@/shared/domain/content-blocks";

export function ContentMedia({ media }: { media?: MediaReference }) {
  if (!media) return null;
  const source = mediaReferenceUrl(media);
  if (media.kind === "audio") return <audio className="template-media__audio" controls preload="metadata" src={source}>Seu navegador não suporta áudio.</audio>;
  return <div className="template-media__image"><Image src={source} alt={media.filename} fill sizes="(max-width: 760px) 90vw, 720px" unoptimized /></div>;
}
