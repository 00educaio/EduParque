import { describe, expect, it } from "vitest";
import type { ActivityContent } from "@/shared/domain/content-blocks";
import { availableWheelItems, categorizedItems, deterministicShuffle, groupSortCategories, isQuizAnswerCorrect, isSequenceCorrect, matchingPairs, quizQuestions, sequenceUnitMode, sequenceUnits, teamGridCards, unscrambleSequences, wheelItems } from "./gameplay";

const content: ActivityContent = [
  { type: "prompt-answer", id: "quiz", items: [
    { id: "q1", prompt: "Selecione A e C", answers: [{ id: "a", text: "A", isCorrect: true }, { id: "b", text: "B", isCorrect: false }, { id: "c", text: "C", isCorrect: true }] },
    { id: "q2", prompt: "Selecione D", answers: [{ id: "d", text: "D", isCorrect: true }] },
  ] },
  { type: "pair", id: "pairs", pairs: [{ id: "p1", left: "Brasil", right: "Brasília" }, { id: "p2", left: "França", right: "Paris" }] },
  { type: "item-list", id: "wheel", items: [{ id: "w1", text: "Um" }, { id: "w2", text: "Dois" }] },
  { type: "categorized-item", id: "groups", categories: [
    { id: "mammals", name: "Mamíferos", media: { assetId: "80da19ec-babe-4ff6-858a-6d21d73264c9", kind: "image", filename: "mamiferos.webp" }, items: [{ id: "dog", text: "Cachorro" }] },
    { id: "birds", name: "Aves", items: [{ id: "macaw", text: "Arara" }] },
  ] },
  { type: "sequence", id: "sequences", sequences: [
    { id: "s1", prompt: "Processo das plantas", tokens: ["foto", "síntese"], splitMode: "word" },
    { id: "s2", tokens: ["s", "o", "l"], splitMode: "character" },
  ] },
];

describe("gameplay dos templates", () => {
  it("embaralha de forma determinística sem alterar a coleção original", () => {
    const source = [1, 2, 3, 4, 5];
    expect(deterministicShuffle(source, "sessao")).toEqual(deterministicShuffle(source, "sessao"));
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });

  it("preserva as instâncias e correspondências das cartas ao embaralhar", () => {
    const cards = [
      { key: "a:left", pairId: "a" }, { key: "a:right", pairId: "a" },
      { key: "b:left", pairId: "b" }, { key: "b:right", pairId: "b" },
    ];
    const shuffled = deterministicShuffle(cards, "sessao:memory");
    expect(new Set(shuffled.map((card) => card.key))).toEqual(new Set(cards.map((card) => card.key)));
    expect(shuffled.every((card) => cards.includes(card))).toBe(true);
    expect(Object.fromEntries(shuffled.map((card) => [card.key, card.pairId]))).toEqual(Object.fromEntries(cards.map((card) => [card.key, card.pairId])));
  });

  it("avalia exatamente uma ou várias respostas corretas", () => {
    const question = quizQuestions(content, false, "s")[0]!;
    expect(isQuizAnswerCorrect(question, ["c", "a"])).toBe(true);
    expect(isQuizAnswerCorrect(question, ["a"])).toBe(false);
    expect(isQuizAnswerCorrect(question, ["a", "b", "c"])).toBe(false);
  });

  it("extrai apenas o conteúdo semântico suportado por cada jogo", () => {
    expect(quizQuestions(content, false, "s")).toHaveLength(2);
    expect(matchingPairs(content, false, "s")).toHaveLength(2);
    expect(wheelItems(content, false, "s")).toHaveLength(2);
  });

  it("aplica repetição e remoção da roleta", () => {
    const items = wheelItems(content, false, "s");
    expect(availableWheelItems(items, ["w1"], [], false).map((item) => item.id)).toEqual(["w2"]);
    expect(availableWheelItems(items, ["w1"], [], true)).toHaveLength(2);
    expect(availableWheelItems(items, [], ["w2"], true).map((item) => item.id)).toEqual(["w1"]);
  });

  it("extrai itens categorizados com a resposta e categorias sem duplicar a engine", () => {
    expect(groupSortCategories(content)).toEqual([
      { id: "mammals", name: "Mamíferos", media: { assetId: "80da19ec-babe-4ff6-858a-6d21d73264c9", kind: "image", filename: "mamiferos.webp" } },
      { id: "birds", name: "Aves", media: undefined },
    ]);
    expect(categorizedItems(content, false, "s")).toMatchObject([
      { id: "dog", categoryId: "mammals", categoryName: "Mamíferos" },
      { id: "macaw", categoryId: "birds", categoryName: "Aves" },
    ]);
  });

  it("resolve e avalia sequências por tokens ou caracteres", () => {
    const [words, characters] = unscrambleSequences(content, false, "s");
    expect(sequenceUnits(words!, "token")).toEqual(["foto", "síntese"]);
    expect(sequenceUnits(words!, "character")).toEqual(Array.from("fotosíntese"));
    expect(sequenceUnits(characters!, "character")).toEqual(["s", "o", "l"]);
    expect(isSequenceCorrect(["s", "o", "l"], ["s", "o", "l"])).toBe(true);
    expect(isSequenceCorrect(["s", "o", "l"], ["s", "l", "o"])).toBe(false);
  });

  it("prioriza a unidade configurada por sequência e mantém fallbacks legados", () => {
    expect(sequenceUnitMode({ unitMode: "character" }, "token")).toBe("character");
    expect(sequenceUnitMode({ unitMode: "token", splitMode: "character" }, "character")).toBe("token");
    expect(sequenceUnitMode({ splitMode: "character" }, "token")).toBe("character");
    expect(sequenceUnitMode({}, "character")).toBe("character");
  });

  it("modela cards extensíveis, mas gera somente perguntas no Team Grid do MVP", () => {
    const cards = teamGridCards(content, false, "s");
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => ({ number: card.number, type: card.type }))).toEqual([{ number: 1, type: "question" }, { number: 2, type: "question" }]);
  });
});
