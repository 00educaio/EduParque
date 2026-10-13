"use client";

import { useState } from "react";
import { categorizedItems, groupSortCategories } from "@/modules/game-templates/domain/gameplay";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";

function stringRecord(value: unknown) {
  const record = configRecord(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function GroupSortTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base);
  const template = configRecord(config.template);
  const items = categorizedItems(content, base.shuffle === true, sessionId);
  const categories = groupSortCategories(content);
  const runtime = configRecord(state?.template.state);
  const persistedAssignments = stringRecord(runtime.groupSortAssignments);
  const persistedResults = stringRecord(runtime.groupSortResults);
  const [previewAssignments, setPreviewAssignments] = useState<Record<string, string>>({});
  const [previewResults, setPreviewResults] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const assignments = mode === "session" ? persistedAssignments : previewAssignments;
  const results = mode === "session" ? persistedResults : previewResults;

  if (!items.length || categories.length < 2) return <p className="template-empty">Adicione ao menos duas categorias com itens para jogar.</p>;

  async function saveAssignments(next: Record<string, string>) {
    setSelectedItemId(null); setFeedback(null);
    if (mode === "preview") { setPreviewAssignments(next); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, groupSortAssignments: next, groupSortChecked: false } });
  }

  function assign(itemId: string, categoryId: string) {
    if (disabled) return;
    void saveAssignments({ ...assignments, [itemId]: categoryId });
  }

  async function checkBoard() {
    if (Object.keys(assignments).length !== items.length || disabled) return;
    const correct = items.every((item) => assignments[item.id] === item.categoryId);
    setFeedback({ correct, text: correct ? "Tudo certo! Cada item está em seu grupo." : "Alguns itens estão no grupo errado. Ajuste e tente novamente." });
    if (mode === "preview") return;
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, groupSortAssignments: assignments, groupSortChecked: true }, award: correct ? { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints } : undefined });
  }

  async function chooseCategory(categoryId: string) {
    const index = mode === "session" ? state?.currentItemIndex ?? 0 : previewIndex;
    const item = items[Math.min(index, items.length - 1)]!;
    const correct = categoryId === item.categoryId;
    setFeedback({ correct, text: correct ? `Correto! ${item.text} pertence a ${item.categoryName}.` : `Ainda não. ${item.text} pertence a outro grupo.` });
    if (!correct) return;
    const nextResults = { ...results, [item.id]: categoryId };
    if (mode === "preview") { setPreviewResults(nextResults); setPreviewIndex((current) => Math.min(current + 1, items.length - 1)); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, groupSortResults: nextResults }, award: { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints }, advance: true });
  }

  if (template.mode === "one-by-one") {
    const index = mode === "session" ? state?.currentItemIndex ?? 0 : previewIndex;
    const item = items[Math.min(index, items.length - 1)]!;
    const complete = Object.keys(results).length === items.length;
    return <section className="template-game group-sort-template" aria-label="Separar grupos um por vez">
      <header className="template-game__header"><span className="eyebrow">Um por vez · item {Math.min(index + 1, items.length)} de {items.length}</span><span className="template-chip">{Object.keys(results).length} corretos</span></header>
      {complete ? <div className="template-feedback is-success"><strong>Todos os itens foram classificados!</strong></div> : <><ContentMedia media={item.media} /><h2>{item.text}</h2><p>Em qual grupo este item entra?</p><div className="group-sort-choices">{categories.map((category) => <button key={category.id} disabled={disabled} onClick={() => void chooseCategory(category.id)}>{category.name}</button>)}</div></>}
      {feedback && <p className={`template-feedback ${feedback.correct ? "is-success" : "is-error"}`} role="status">{feedback.text}</p>}
    </section>;
  }

  const unassigned = items.filter((item) => !assignments[item.id]);
  return <section className="template-game group-sort-template" aria-label="Board para separar grupos">
    <header className="template-game__header"><span className="eyebrow">Board · arraste e solte</span><span className="template-chip">{items.length - unassigned.length} / {items.length} posicionados</span></header>
    <p>Arraste os itens para os grupos ou selecione um item e depois um grupo.</p>
    <div className="group-sort-bank" aria-label="Itens sem grupo">{unassigned.map((item) => <button key={item.id} draggable={!disabled} className={selectedItemId === item.id ? "is-selected" : ""} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}><ContentMedia media={item.media} />{item.text}</button>)}</div>
    <div className="group-sort-board">{categories.map((category) => <section key={category.id} className="group-sort-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => assign(event.dataTransfer.getData("text/plain"), category.id)}><button className="group-sort-column__title" disabled={disabled || !selectedItemId} onClick={() => selectedItemId && assign(selectedItemId, category.id)}>{category.name}</button><div>{items.filter((item) => assignments[item.id] === category.id).map((item) => <button key={item.id} draggable={!disabled} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelectedItemId(item.id)}>{item.text}</button>)}</div></section>)}</div>
    {feedback && <p className={`template-feedback ${feedback.correct ? "is-success" : "is-error"}`} role="status">{feedback.text}</p>}
    <button className="button template-primary-action" disabled={disabled || unassigned.length > 0} onClick={() => void checkBoard()}>Verificar grupos</button>
  </section>;
}
