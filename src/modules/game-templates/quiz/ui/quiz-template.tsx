"use client";

import { useState } from "react";
import { isQuizAnswerCorrect, quizAnswers, quizQuestions } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

interface QuizResult { selectedIds: string[]; correct: boolean }

function savedResults(value: unknown) {
  const record = configRecord(value);
  const results = configRecord(record.quizResults);
  return Object.fromEntries(Object.entries(results).flatMap(([id, result]) => {
    const parsed = configRecord(result);
    return typeof parsed.correct === "boolean" ? [[id, { selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds.filter((item): item is string => typeof item === "string") : [], correct: parsed.correct } satisfies QuizResult]] : [];
  }));
}

export function QuizTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base);
  const template = configRecord(config.template);
  const questions = quizQuestions(content, base.shuffle === true, sessionId);
  const questionIndex = mode === "session" ? state?.currentItemIndex ?? 0 : 0;
  const question = questions[Math.min(questionIndex, Math.max(questions.length - 1, 0))];
  const persisted = savedResults(state?.template.state);
  const [previewResults, setPreviewResults] = useState<Record<string, QuizResult>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const results = mode === "session" ? persisted : previewResults;

  if (!question) return <p className="template-empty">Adicione perguntas para jogar o Quiz.</p>;

  const currentQuestion = question;
  const answers = quizAnswers(currentQuestion, base.shuffle === true, sessionId);
  const selected = selections[currentQuestion.id] ?? results[currentQuestion.id]?.selectedIds ?? [];
  const result = results[currentQuestion.id];
  const hasMultipleCorrect = currentQuestion.answers.filter((answer) => answer.isCorrect).length > 1;
  const allowMultiple = template.allowMultiple !== false;
  const usesMultipleSelection = allowMultiple && hasMultipleCorrect;
  const locked = Boolean(result) || disabled;

  function toggle(answerId: string) {
    if (locked) return;
    setSelections((current) => {
      const values = current[currentQuestion.id] ?? [];
      const next = usesMultipleSelection ? (values.includes(answerId) ? values.filter((id) => id !== answerId) : [...values, answerId]) : [answerId];
      return { ...current, [currentQuestion.id]: next };
    });
  }

  async function check() {
    if (!selected.length || locked) return;
    const correct = isQuizAnswerCorrect(currentQuestion, selected, allowMultiple);
    const nextResults = { ...results, [currentQuestion.id]: { selectedIds: selected, correct } };
    if (mode === "preview") { setPreviewResults(nextResults); return; }
    if (!send || !state) return;
    await send({
      type: "updateTemplateState",
      state: { ...state.template.state, quizResults: nextResults },
      award: correct ? { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints } : undefined,
    });
  }

  return <section className="template-game quiz-template" aria-label="Quiz">
    <header className="template-game__header"><span className="eyebrow">Pergunta {questionIndex + 1} de {questions.length}</span>{usesMultipleSelection && <span className="template-chip">Selecione todas as corretas</span>}</header>
    <ContentMedia media={currentQuestion.media} />
    <h2>{currentQuestion.prompt}</h2>
    <div className="quiz-answers">{answers.map((answer, index) => {
      const isSelected = selected.includes(answer.id);
      const showCorrect = Boolean(result) || Boolean(state?.revealed);
      const status = showCorrect && answer.isCorrect ? "is-correct" : result && isSelected && !answer.isCorrect ? "is-wrong" : "";
      return <button key={answer.id} className={`${isSelected ? "is-selected" : ""} ${status}`} disabled={locked} aria-pressed={isSelected} onClick={() => toggle(answer.id)}><span>{String.fromCharCode(65 + index)}</span>{answer.text}</button>;
    })}</div>
    {result && <div className={`template-feedback ${result.correct ? "is-success" : "is-error"}`} role="status"><strong>{result.correct ? "Resposta correta!" : "Ainda não."}</strong>{result.correct ? ` +${state?.scoring.defaultPoints ?? 100} pontos sugeridos.` : " Use Revelar resposta para conferir."}</div>}
    {(result || state?.revealed) && template.revealExplanation !== false && currentQuestion.explanation && <p className="quiz-explanation"><strong>Explicação:</strong> {currentQuestion.explanation}</p>}
    {!result && <button className="button template-primary-action" disabled={!selected.length || disabled} onClick={() => void check()}>Verificar resposta</button>}
  </section>;
}
