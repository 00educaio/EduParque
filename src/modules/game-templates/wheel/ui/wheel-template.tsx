"use client";

import { useEffect, useState } from "react";
import { availableWheelItems, wheelItems } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, stringList, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface WheelRuntimeState { drawnIds: string[]; removedIds: string[]; currentId: string | null; spins: number }

function readWheelState(value: unknown): WheelRuntimeState {
  const state = configRecord(value);
  return { drawnIds: stringList(state.drawnIds), removedIds: stringList(state.removedIds), currentId: typeof state.currentId === "string" ? state.currentId : null, spins: typeof state.spins === "number" ? state.spins : 0 };
}

export function WheelTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base);
  const template = configRecord(config.template);
  const items = wheelItems(content, base.shuffle === true, sessionId);
  const persisted = readWheelState(state?.template.state);
  const [previewState, setPreviewState] = useState<WheelRuntimeState>({ drawnIds: [], removedIds: [], currentId: null, spins: 0 });
  const wheelState = mode === "session" ? persisted : previewState;
  const reducedMotion = useReducedMotion();
  const available = availableWheelItems(items, wheelState.drawnIds, wheelState.removedIds, template.allowRepeat !== false);
  const current = items.find((item) => item.id === wheelState.currentId);
  const palette = ["#0f766e", "#f59e0b", "#7c3aed", "#e11d48", "#2563eb", "#65a30d", "#ea580c", "#0891b2"];
  const segments = items.length ? items.map((_, index) => `${palette[index % palette.length]} ${(index / items.length) * 100}% ${((index + 1) / items.length) * 100}%`).join(",") : "#dbe5dd 0 100%";
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === wheelState.currentId));
  const selectedAngle = items.length ? 360 - ((currentIndex + 0.5) * (360 / items.length)) : 0;
  const rotation = reducedMotion ? selectedAngle : wheelState.spins * 720 + selectedAngle;

  async function spin() {
    if (!available.length || disabled) return;
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
    const selected = available[bytes[0]! % available.length]!;
    const drawnIds = [...wheelState.drawnIds, selected.id];
    const removedIds = template.removeAfterSpin === true ? [...new Set([...wheelState.removedIds, selected.id])] : wheelState.removedIds;
    const next = { drawnIds, removedIds, currentId: selected.id, spins: wheelState.spins + 1 };
    if (mode === "preview") { setPreviewState(next); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, ...next }, restartTimer: template.timerAfterSpin === true });
  }

  if (!items.length) return <p className="template-empty">Adicione itens para girar a roleta.</p>;

  return <section className="template-game wheel-template" aria-label="Roleta aleatória">
    <header className="template-game__header"><span className="eyebrow">Roleta</span><span className="template-chip">{available.length} disponíveis</span></header>
    <div className="wheel-layout"><div className="wheel-wrap"><i className="wheel-pointer" /><div className={`wheel ${reducedMotion ? "is-reduced" : ""}`} style={{ background: `conic-gradient(${segments})`, transform: `rotate(${rotation}deg)` }} aria-hidden="true" /><div className="wheel-hub">★</div></div><div className="wheel-result" aria-live="polite">{current ? <><span>Item sorteado</span><ContentMedia media={current.media} /><h2>{current.text}</h2>{current.prompt && <p>{current.prompt}</p>}{current.answer && (state?.revealed || mode === "preview") && <strong>{current.answer}</strong>}</> : <><span>Pronto para girar</span><h2>Quem será escolhido?</h2></>}</div></div>
    <button className="button template-primary-action" disabled={disabled || !available.length} onClick={() => void spin()}>{available.length ? (wheelState.spins ? "Girar novamente" : "Girar roleta") : "Todos os itens foram sorteados"}</button>
  </section>;
}
