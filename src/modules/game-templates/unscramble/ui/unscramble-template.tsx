"use client";

import { useEffect, useRef, useState } from "react";
import { deterministicShuffle, isSequenceCorrect, sequenceUnitMode, sequenceUnits, unscrambleSequences } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

interface SequenceResult { answer: string[]; correct: boolean }

export const UNSCRAMBLE_ERROR_TURN_DELAY_MS = 3_000;

function readResults(value: unknown) {
  const runtime = configRecord(value); const raw = configRecord(runtime.unscrambleResults);
  return Object.fromEntries(Object.entries(raw).flatMap(([id, value]) => {
    const result = configRecord(value);
    return typeof result.correct === "boolean" && Array.isArray(result.answer) ? [[id, { correct: result.correct, answer: result.answer.filter((unit): unit is string => typeof unit === "string") } satisfies SequenceResult]] : [];
  }));
}

function readSelections(value: unknown) {
  const runtime = configRecord(value); const raw = configRecord(runtime.unscrambleSelections);
  return Object.fromEntries(Object.entries(raw).flatMap(([id, value]) => Array.isArray(value) ? [[id, value.filter((key): key is string => typeof key === "string")]] : []));
}

export function UnscrambleTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base); const template = configRecord(config.template);
  const sequences = unscrambleSequences(content, base.shuffle === true, sessionId);
  const index = mode === "session" ? state?.currentItemIndex ?? 0 : 0;
  const sequence = sequences[Math.min(index, Math.max(sequences.length - 1, 0))];
  const legacyTokenMode = template.tokenMode === "character" ? "character" as const : "token" as const;
  const verificationMode = template.verificationMode === "progressive" ? "progressive" as const : "on-finish" as const;
  const allowPassTurn = template.allowPassTurn === true;
  const tokenMode = sequence ? sequenceUnitMode(sequence, legacyTokenMode) : legacyTokenMode;
  const expected = sequence ? sequenceUnits(sequence, tokenMode) : [];
  const shuffled = sequence ? deterministicShuffle(expected.map((value, unitIndex) => ({ key: `${sequence.id}:${unitIndex}`, value })), `${sessionId}:${sequence.id}:units`) : [];
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string[]>>({});
  const [previewResults, setPreviewResults] = useState<Record<string, SequenceResult>>({});
  const [previewReveal, setPreviewReveal] = useState(false);
  const [transitioningTurn, setTransitioningTurn] = useState(false);
  const [attemptIncorrect, setAttemptIncorrect] = useState(false);
  const turnDelayRef = useRef<number | null>(null);
  const sessionRuntime = configRecord(state?.template.state);
  const attemptVersion = typeof sessionRuntime.unscrambleAttempt === "number" ? sessionRuntime.unscrambleAttempt : 0;
  const persistedSelections = readSelections(state?.template.state);
  const persistedResults = readResults(state?.template.state);
  const results = mode === "session" ? persistedResults : previewResults;

  useEffect(() => () => {
    if (turnDelayRef.current !== null) window.clearTimeout(turnDelayRef.current);
  }, []);

  if (!sequence) return <p className="template-empty">Adicione palavras ou frases para desembaralhar.</p>;
  const sequenceId = sequence.id;
  const attemptId = `${sequenceId}:${attemptVersion}`;
  const availableKeys = new Set(shuffled.map((unit) => unit.key));
  const selected = (selectedKeys[attemptId] ?? persistedSelections[sequenceId] ?? []).filter((key) => availableKeys.has(key));
  const answer = selected.map((key) => shuffled.find((unit) => unit.key === key)!.value);
  const result = results[sequenceId];
  const revealed = Boolean(state?.revealed) || previewReveal;
  const locked = Boolean(result) || revealed || disabled || transitioningTurn;

  function toggle(key: string) {
    if (locked) return;
    const removing = selected.includes(key);
    const nextSelected = removing ? selected.filter((item) => item !== key) : [...selected, key];
    setAttemptIncorrect(false);
    setSelectedKeys((current) => ({ ...current, [attemptId]: nextSelected }));
    if (verificationMode === "progressive" && !removing) {
      const nextAnswer = nextSelected.map((selectedKey) => shuffled.find((unit) => unit.key === selectedKey)!.value);
      const positionedIndex = nextAnswer.length - 1;
      if (expected[positionedIndex] !== nextAnswer[positionedIndex]) {
        setAttemptIncorrect(true);
        if (mode === "session") void endTurn(true, nextSelected);
        return;
      }
      if (nextAnswer.length === expected.length) void submit(nextAnswer, true);
    }
  }

  async function endTurn(afterError = false, selection = selected) {
    if (mode !== "session" || !send || !state || transitioningTurn) return;
    setTransitioningTurn(true);
    if (afterError) await new Promise<void>((resolve) => {
      turnDelayRef.current = window.setTimeout(() => { turnDelayRef.current = null; resolve(); }, UNSCRAMBLE_ERROR_TURN_DELAY_MS);
    });
    await send({
      type: "updateTemplateState",
      state: {
        ...state.template.state,
        unscrambleAttempt: attemptVersion + 1,
        unscrambleSelections: { ...persistedSelections, [sequenceId]: selection },
      },
      advanceTurn: true,
      expectedSequence: state.sequence,
    });
    setAttemptIncorrect(false);
    setTransitioningTurn(false);
  }

  async function submit(submittedAnswer: string[], correct: boolean) {
    const nextResults = { ...results, [sequenceId]: { answer: submittedAnswer, correct } };
    if (mode === "preview") { setPreviewResults(nextResults); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, unscrambleResults: nextResults }, award: correct ? { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints } : undefined });
  }

  async function check() {
    if (answer.length !== expected.length || locked) return;
    const correct = isSequenceCorrect(expected, answer);
    if (mode === "session" && !correct) {
      setAttemptIncorrect(true);
      await endTurn(true);
      return;
    }
    await submit(answer, correct);
  }

  async function reveal() {
    if (mode === "preview") { setPreviewReveal(true); return; }
    await send?.({ type: "reveal" });
  }

  return <section className="template-game unscramble-template" aria-label="Desembaralhar">
    <header className="template-game__header"><span className="eyebrow">{tokenMode === "character" ? "Ordene as letras" : "Ordene os segmentos"}</span><span className="template-chip">{index + 1} / {sequences.length}</span></header>
    <ContentMedia media={sequence.media} />{sequence.prompt && <h2>{sequence.prompt}</h2>}
    <div className="unscramble-answer" aria-label="Sua resposta">{(revealed ? expected : answer).map((unit, unitIndex) => { const showPositionResult = !revealed && (verificationMode === "progressive" || Boolean(result) || attemptIncorrect); const positionCorrect = expected[unitIndex] === unit; return <button key={`${unit}-${unitIndex}`} className={showPositionResult ? positionCorrect ? "is-correct" : "is-incorrect" : undefined} aria-label={showPositionResult ? `${unit === " " ? "espaço" : unit}: ${positionCorrect ? "posição correta" : "posição incorreta"}` : undefined} disabled={revealed || locked} onClick={() => !revealed && toggle(selected[unitIndex]!)}>{unit === " " ? "espaço" : unit}</button>; })}{!revealed && !answer.length && <span>Selecione as peças na ordem correta</span>}</div>
    {!revealed && <div className="unscramble-pieces">{shuffled.map((unit) => <button key={unit.key} disabled={locked || selected.includes(unit.key)} onClick={() => toggle(unit.key)}>{unit.value === " " ? "espaço" : unit.value}</button>)}</div>}
    {result && <p className={`template-feedback ${result.correct ? "is-success" : "is-error"}`} role="status">{result.correct ? "Sequência correta!" : "A ordem ainda não está correta."}</p>}
    {attemptIncorrect && <p className="template-feedback is-error" role="status">Resposta incorreta. A próxima equipe joga em 3 segundos…</p>}
    {revealed && <p className="template-feedback is-success" role="status"><strong>Resposta revelada:</strong> {expected.join(tokenMode === "character" ? "" : " ")}</p>}
    <div className="inline-actions">{verificationMode === "on-finish" && <button className="button template-primary-action" disabled={locked || answer.length !== expected.length} onClick={() => void check()}>Verificar ordem</button>}{mode === "session" && allowPassTurn && <button className="button button--secondary" disabled={locked} onClick={() => void endTurn()}>Passar a vez</button>}<button className="button button--secondary" disabled={disabled || revealed || transitioningTurn} onClick={() => void reveal()}>Revelar resposta</button></div>
  </section>;
}
