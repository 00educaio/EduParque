"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HelpGuide } from "./help-content";

export function GuidePanel({ guide }: { guide: HelpGuide }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(false);
  const step = guide.steps[stepIndex]!;

  function openGuide() {
    setStepIndex(0);
    setOpen(true);
  }

  function closeGuide() {
    restoreFocusRef.current = true;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        launcherRef.current?.focus();
      }
      return;
    }
    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuide();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <article className={`guide-card ${open ? "is-open" : ""}`}>
      <div className="guide-card__summary" hidden={open}>
        <div>
          <span className="guide-card__eyebrow">Guia passo a passo</span>
          <h2>{guide.title}</h2>
          <p>{guide.summary}</p>
        </div>
        <button ref={launcherRef} className="button" type="button" onClick={openGuide} aria-expanded={open}>
          Abrir guia <ArrowRight aria-hidden="true" />
        </button>
      </div>
      {open && (
        <section ref={panelRef} className="guide-panel" tabIndex={-1} aria-labelledby={`guide-${guide.id}-title`}>
          <header className="guide-panel__header">
            <div>
              <span>Passo {stepIndex + 1} de {guide.steps.length}</span>
              <h2 id={`guide-${guide.id}-title`}>{guide.title}</h2>
            </div>
            <button className="guide-panel__close" type="button" onClick={closeGuide} aria-label={`Fechar guia: ${guide.title}`}>
              <X aria-hidden="true" /> <span>Fechar</span>
            </button>
          </header>

          <div className="guide-panel__step" aria-live="polite">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {step.href && (
              <Link className="button button--secondary guide-panel__link" href={step.href}>
                {step.actionLabel ?? "Ir para esta tela"} <ExternalLink aria-hidden="true" />
              </Link>
            )}
          </div>

          <footer className="guide-panel__footer">
            <button className="button button--ghost" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)}>
              <ArrowLeft aria-hidden="true" /> Voltar
            </button>
            <div className="guide-panel__progress" aria-hidden="true">
              {guide.steps.map((item, index) => <span key={item.title} className={index === stepIndex ? "is-current" : ""} />)}
            </div>
            <button className="button" type="button" disabled={stepIndex === guide.steps.length - 1} onClick={() => setStepIndex((current) => current + 1)}>
              Próximo <ArrowRight aria-hidden="true" />
            </button>
          </footer>
        </section>
      )}
    </article>
  );
}
