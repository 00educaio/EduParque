"use client";

import { useState } from "react";
import { teamGridCards } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, stringList, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

type Outcome = "correct" | "incorrect";

function outcomesRecord(value: unknown) {
  const record = configRecord(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, Outcome] => entry[1] === "correct" || entry[1] === "incorrect"));
}

export function TeamGridTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base); const template = configRecord(config.template);
  const cards = teamGridCards(content, base.shuffle === true, sessionId);
  const runtime = configRecord(state?.template.state);
  const persistedUsed = stringList(runtime.teamGridUsedIds);
  const persistedOutcomes = outcomesRecord(runtime.teamGridOutcomes);
  const persistedSelected = typeof runtime.teamGridSelectedId === "string" ? runtime.teamGridSelectedId : null;
  const [previewUsed, setPreviewUsed] = useState<string[]>([]);
  const [previewOutcomes, setPreviewOutcomes] = useState<Record<string, Outcome>>({});
  const [previewSelected, setPreviewSelected] = useState<string | null>(null);
  const [previewReveal, setPreviewReveal] = useState(false);
  const usedIds = mode === "session" ? persistedUsed : previewUsed;
  const outcomes = mode === "session" ? persistedOutcomes : previewOutcomes;
  const selectedId = mode === "session" ? persistedSelected : previewSelected;
  const selected = cards.find((card) => card.id === selectedId);
  const columns = typeof template.gridColumns === "number" ? template.gridColumns : 4;
  const revealed = Boolean(state?.revealed) || previewReveal;

  if (!cards.length) return <p className="template-empty">Adicione perguntas para montar a grade.</p>;

  async function selectCard(cardId: string) {
    if (disabled || usedIds.includes(cardId)) return;
    setPreviewReveal(false);
    if (mode === "preview") { setPreviewSelected(cardId); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, teamGridSelectedId: cardId }, restartTimer: template.bombTimer === true });
  }

  async function reveal() {
    if (mode === "preview") { setPreviewReveal(true); return; }
    await send?.({ type: "reveal" });
  }

  async function judge(outcome: Outcome) {
    if (!selected || disabled) return;
    const nextUsed = [...new Set([...usedIds, selected.id])];
    const nextOutcomes = { ...outcomes, [selected.id]: outcome };
    if (mode === "preview") { setPreviewUsed(nextUsed); setPreviewOutcomes(nextOutcomes); setPreviewSelected(null); setPreviewReveal(false); return; }
    if (!send || !state) return;
    await send({
      type: "updateTemplateState",
      state: { ...state.template.state, teamGridUsedIds: nextUsed, teamGridOutcomes: nextOutcomes, teamGridSelectedId: null },
      award: outcome === "correct" ? { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints } : undefined,
      advance: true,
    });
  }

  if (selected?.type === "question") {
    const correctAnswers = selected.question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.text);
    return <section className="template-game team-grid-template" aria-label={`Card ${selected.number} da grade de equipes`}>
      <header className="template-game__header"><span className="eyebrow">Card {selected.number} · {state ? `vez de ${state.teams[state.activeTeamIndex]!.name}` : "pergunta"}</span>{template.bombTimer === true && <span className="template-chip">💣 Timer-bomba</span>}</header>
      <ContentMedia media={selected.question.media} /><h2>{selected.question.prompt}</h2>
      {revealed ? <div className="team-grid-answer"><span>Resposta</span><strong>{correctAnswers.join(" · ")}</strong>{selected.question.explanation && <p>{selected.question.explanation}</p>}</div> : <button className="button button--secondary" disabled={disabled} onClick={() => void reveal()}>Mostrar resposta</button>}
      <div className="team-grid-judge"><button className="button button--danger" disabled={disabled} onClick={() => void judge("incorrect")}>Incorreto · próximo time</button><button className="button" disabled={disabled} onClick={() => void judge("correct")}>Correto · +{state?.scoring.defaultPoints ?? 100}</button></div>
    </section>;
  }

  const complete = usedIds.length === cards.length;
  return <section className="template-game team-grid-template" aria-label="Grade de equipes">
    <header className="template-game__header"><span className="eyebrow">Escolha um card</span><span className="template-chip">{usedIds.length} / {cards.length} respondidos</span></header>
    {complete && <p className="template-feedback is-success"><strong>Todos os cards foram respondidos!</strong></p>}
    <div className="team-grid-cards" style={{ "--grid-columns": columns } as React.CSSProperties}>{cards.map((card) => <button key={card.id} className={usedIds.includes(card.id) ? `is-used is-${outcomes[card.id]}` : ""} disabled={disabled || usedIds.includes(card.id)} onClick={() => void selectCard(card.id)}><span>{card.number}</span>{usedIds.includes(card.id) && <small>{outcomes[card.id] === "correct" ? "Correto" : "Incorreto"}</small>}</button>)}</div>
  </section>;
}
