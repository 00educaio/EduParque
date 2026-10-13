"use client";

import { useState } from "react";
import { deterministicShuffle, isSequenceCorrect, sequenceUnits, unscrambleSequences } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

interface SequenceResult { answer: string[]; correct: boolean }

function readResults(value: unknown) {
  const runtime = configRecord(value); const raw = configRecord(runtime.unscrambleResults);
  return Object.fromEntries(Object.entries(raw).flatMap(([id, value]) => {
    const result = configRecord(value);
    return typeof result.correct === "boolean" && Array.isArray(result.answer) ? [[id, { correct: result.correct, answer: result.answer.filter((unit): unit is string => typeof unit === "string") } satisfies SequenceResult]] : [];
  }));
}

export function UnscrambleTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base); const template = configRecord(config.template);
  const sequences = unscrambleSequences(content, base.shuffle === true, sessionId);
  const index = mode === "session" ? state?.currentItemIndex ?? 0 : 0;
  const sequence = sequences[Math.min(index, Math.max(sequences.length - 1, 0))];
  const tokenMode = template.tokenMode === "character" ? "character" as const : "token" as const;
  const expected = sequence ? sequenceUnits(sequence, tokenMode) : [];
  const shuffled = sequence ? deterministicShuffle(expected.map((value, unitIndex) => ({ key: `${sequence.id}:${unitIndex}`, value })), `${sessionId}:${sequence.id}:units`) : [];
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string[]>>({});
  const [previewResults, setPreviewResults] = useState<Record<string, SequenceResult>>({});
  const [previewReveal, setPreviewReveal] = useState(false);
  const persistedResults = readResults(state?.template.state);
  const results = mode === "session" ? persistedResults : previewResults;

  if (!sequence) return <p className="template-empty">Adicione palavras ou frases para desembaralhar.</p>;
  const sequenceId = sequence.id;
  const selected = selectedKeys[sequenceId] ?? [];
  const answer = selected.map((key) => shuffled.find((unit) => unit.key === key)!.value);
  const result = results[sequenceId];
  const revealed = Boolean(state?.revealed) || previewReveal;
  const locked = Boolean(result) || revealed || disabled;

  function toggle(key: string) {
    if (locked) return;
    setSelectedKeys((current) => ({ ...current, [sequenceId]: current[sequenceId]?.includes(key) ? current[sequenceId]!.filter((item) => item !== key) : [...(current[sequenceId] ?? []), key] }));
  }

  async function check() {
    if (answer.length !== expected.length || locked) return;
    const correct = isSequenceCorrect(expected, answer);
    const nextResults = { ...results, [sequenceId]: { answer, correct } };
    if (mode === "preview") { setPreviewResults(nextResults); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, unscrambleResults: nextResults }, award: correct ? { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints } : undefined });
  }

  async function reveal() {
    if (mode === "preview") { setPreviewReveal(true); return; }
    await send?.({ type: "reveal" });
  }

  return <section className="template-game unscramble-template" aria-label="Desembaralhar">
    <header className="template-game__header"><span className="eyebrow">{tokenMode === "character" ? "Ordene as letras" : "Ordene os segmentos"}</span><span className="template-chip">{index + 1} / {sequences.length}</span></header>
    <ContentMedia media={sequence.media} />{sequence.prompt && <h2>{sequence.prompt}</h2>}
    <div className="unscramble-answer" aria-label="Sua resposta">{(revealed ? expected : answer).map((unit, unitIndex) => <button key={`${unit}-${unitIndex}`} disabled={revealed || locked} onClick={() => !revealed && toggle(selected[unitIndex]!)}>{unit === " " ? "espaço" : unit}</button>)}{!revealed && !answer.length && <span>Selecione as peças na ordem correta</span>}</div>
    {!revealed && <div className="unscramble-pieces">{shuffled.map((unit) => <button key={unit.key} disabled={locked || selected.includes(unit.key)} onClick={() => toggle(unit.key)}>{unit.value === " " ? "espaço" : unit.value}</button>)}</div>}
    {result && <p className={`template-feedback ${result.correct ? "is-success" : "is-error"}`} role="status">{result.correct ? "Sequência correta!" : "A ordem ainda não está correta."}</p>}
    {revealed && <p className="template-feedback is-success" role="status"><strong>Resposta revelada:</strong> {expected.join(tokenMode === "character" ? "" : " ")}</p>}
    <div className="inline-actions"><button className="button template-primary-action" disabled={locked || answer.length !== expected.length} onClick={() => void check()}>Verificar ordem</button><button className="button button--secondary" disabled={disabled || revealed} onClick={() => void reveal()}>Revelar resposta</button></div>
  </section>;
}
