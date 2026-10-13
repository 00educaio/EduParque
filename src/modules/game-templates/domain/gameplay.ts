import type { ActivityContent, CategorizedItemBlock, ItemListBlock, PairBlock, PromptAnswerBlock, SequenceBlock } from "@/shared/domain/content-blocks";

export type QuizQuestion = PromptAnswerBlock["items"][number];
export type MatchingPair = PairBlock["pairs"][number];
export type WheelItem = ItemListBlock["items"][number];
export type CategorizedGameItem = CategorizedItemBlock["categories"][number]["items"][number] & { categoryId: string; categoryName: string };
export type UnscrambleSequence = SequenceBlock["sequences"][number];
export type GridCard =
  | { id: string; type: "question"; number: number; question: QuizQuestion }
  | { id: string; type: "effect"; number: number; effectKey: string };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function random(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const shuffled = [...items];
  const next = random(hash(seed));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(next() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}

export function quizQuestions(content: ActivityContent, shuffle: boolean, seed: string) {
  const questions = content.flatMap((block) => block.type === "prompt-answer" ? block.items : []);
  return shuffle ? deterministicShuffle(questions, `${seed}:questions`) : questions;
}

export function quizAnswers(question: QuizQuestion, shuffle: boolean, seed: string) {
  return shuffle ? deterministicShuffle(question.answers, `${seed}:${question.id}:answers`) : question.answers;
}

export function isQuizAnswerCorrect(question: QuizQuestion, selectedIds: readonly string[]) {
  const expected = question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.id).sort();
  const selected = [...new Set(selectedIds)].sort();
  return expected.length === selected.length && expected.every((id, index) => id === selected[index]);
}

export function matchingPairs(content: ActivityContent, shuffle: boolean, seed: string) {
  const pairs = content.flatMap((block) => block.type === "pair" ? block.pairs : []);
  return shuffle ? deterministicShuffle(pairs, `${seed}:pairs`) : pairs;
}

export function wheelItems(content: ActivityContent, shuffle: boolean, seed: string) {
  const items = content.flatMap((block) => block.type === "item-list" ? block.items : []);
  return shuffle ? deterministicShuffle(items, `${seed}:wheel`) : items;
}

export function availableWheelItems(items: readonly WheelItem[], drawnIds: readonly string[], removedIds: readonly string[], allowRepeat: boolean) {
  const unavailable = new Set(removedIds);
  if (!allowRepeat) for (const id of drawnIds) unavailable.add(id);
  return items.filter((item) => !unavailable.has(item.id));
}

export function categorizedItems(content: ActivityContent, shuffle: boolean, seed: string) {
  const items = content.flatMap((block) => block.type === "categorized-item"
    ? block.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryId: category.id, categoryName: category.name })))
    : []);
  return shuffle ? deterministicShuffle(items, `${seed}:categorized-items`) : items;
}

export function groupSortCategories(content: ActivityContent) {
  return content.flatMap((block) => block.type === "categorized-item" ? block.categories.map(({ id, name }) => ({ id, name })) : []);
}

export function unscrambleSequences(content: ActivityContent, shuffle: boolean, seed: string) {
  const sequences = content.flatMap((block) => block.type === "sequence" ? block.sequences : []);
  return shuffle ? deterministicShuffle(sequences, `${seed}:sequences`) : sequences;
}

export function sequenceUnits(sequence: UnscrambleSequence, mode: "character" | "token") {
  if (mode === "token") return [...sequence.tokens];
  return Array.from(sequence.tokens.join(sequence.splitMode === "character" ? "" : " ").replace(/\s/g, ""));
}

export function isSequenceCorrect(expected: readonly string[], answer: readonly string[]) {
  return expected.length === answer.length && expected.every((unit, index) => unit === answer[index]);
}

export function teamGridCards(content: ActivityContent, shuffle: boolean, seed: string): GridCard[] {
  const questions = quizQuestions(content, shuffle, `${seed}:team-grid`);
  // The union already reserves `effect` for future cards. The MVP intentionally emits questions only.
  return questions.map((question, index) => ({ id: question.id, type: "question", number: index + 1, question }));
}
