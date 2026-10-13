"use client";

import Image from "next/image";
import { useState } from "react";

export function TeamAvatar({ sessionId, teamId, teamName, color, hasImage, className = "" }: { sessionId: string; teamId: string; teamName: string; color: string; hasImage: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`team-avatar ${className}`.trim()} style={{ "--team-color": color } as React.CSSProperties} aria-hidden="true">
      {hasImage && !failed
        ? <Image src={`/api/game-sessions/${sessionId}/team-images/${teamId}`} alt="" fill sizes="72px" unoptimized onError={() => setFailed(true)} />
        : <span>{teamName.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?"}</span>}
    </span>
  );
}
