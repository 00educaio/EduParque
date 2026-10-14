"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog } from "@/shared/ui/components/dialog";
import { getGameHelp } from "./help-content";

export function SessionGameHelp({ templateKey, className }: { templateKey: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const help = getGameHelp(templateKey);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button ref={triggerRef} className={`button button--ghost session-help-trigger ${className ?? ""}`} type="button" onClick={() => changeOpen(true)} aria-haspopup="dialog">
        <CircleHelp aria-hidden="true" /> Como jogar?
      </button>
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        title={help ? `Como jogar: ${help.name}` : "Como jogar?"}
        description="Consulta rápida. A partida continua exatamente como está."
        cancelLabel="Fechar"
      >
        {help ? (
          <dl className="session-game-help">
            {help.topics.map((topic) => <div key={topic.label}><dt>{topic.label}</dt><dd>{topic.text}</dd></div>)}
          </dl>
        ) : (
          <p className="session-game-help__fallback">Não foi possível identificar este jogo. Consulte a lista completa de instruções.</p>
        )}
        <Link className="session-game-help__more" href={`/ajuda#jogo-${help?.key ?? "quiz"}`}>Ver instruções na página de ajuda</Link>
      </Dialog>
    </>
  );
}
