import { describe, expect, it } from "vitest";
import {
  activityContentSchema,
  categorizedItemBlockSchema,
  contentBlockSchema,
  itemListBlockSchema,
  pairBlockSchema,
  promptAnswerBlockSchema,
  sequenceBlockSchema,
  editableActivityContentSchema,
} from "./content-blocks";

describe("ContentBlocks", () => {
  it("valida PromptAnswerBlock com uma resposta correta", () => {
    expect(
      promptAnswerBlockSchema.safeParse({
        type: "prompt-answer",
        id: "questions",
        items: [{ id: "q1", prompt: "2 + 2?", answers: [{ id: "a1", text: "4", isCorrect: true }] }],
      }).success,
    ).toBe(true);
  });

  it("rejeita pergunta sem resposta correta", () => {
    const result = promptAnswerBlockSchema.safeParse({
      type: "prompt-answer",
      id: "questions",
      items: [{ id: "q1", prompt: "2 + 2?", answers: [{ id: "a1", text: "5", isCorrect: false }] }],
    });
    expect(result.success).toBe(false);
  });

  it.each([
    [pairBlockSchema, { type: "pair", id: "pairs", pairs: [{ id: "p1", left: "A", right: "1" }, { id: "p2", left: "B", right: "2" }] }],
    [itemListBlockSchema, { type: "item-list", id: "list", items: [{ id: "i1", text: "Item" }] }],
    [categorizedItemBlockSchema, { type: "categorized-item", id: "sort", categories: [{ id: "c1", name: "A", items: [{ id: "i1", text: "1" }] }, { id: "c2", name: "B", items: [{ id: "i2", text: "2" }] }] }],
    [sequenceBlockSchema, { type: "sequence", id: "sequence", sequences: [{ id: "s1", tokens: ["Edu", "Parque"] }] }],
  ])("valida cada estrutura semantica", (schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it("usa o discriminador para rejeitar tipos desconhecidos", () => {
    expect(contentBlockSchema.safeParse({ type: "video", id: "x" }).success).toBe(false);
  });

  it("aceita uma Activity com blocos heterogeneos", () => {
    expect(
      activityContentSchema.safeParse([
        { type: "item-list", id: "list", items: [{ id: "i1", text: "Sol" }] },
        { type: "sequence", id: "seq", sequences: [{ id: "s1", tokens: ["Sis", "tema"] }] },
      ]).success,
    ).toBe(true);
  });

  it("aceita configuração de unidade individual em cada sequência", () => {
    expect(sequenceBlockSchema.safeParse({
      type: "sequence",
      id: "seq",
      sequences: [
        { id: "chars", tokens: ["Edu", "Parque"], unitMode: "character" },
        { id: "segments", tokens: ["Edu", "Parque"], unitMode: "token" },
      ],
    }).success).toBe(true);
    expect(sequenceBlockSchema.safeParse({ type: "sequence", id: "word", sequences: [{ id: "chars", tokens: ["EduParque"], unitMode: "character" }] }).success).toBe(true);
    expect(sequenceBlockSchema.safeParse({ type: "sequence", id: "word", sequences: [{ id: "segments", tokens: ["EduParque"], unitMode: "token" }] }).success).toBe(false);
  });

  it("permite rascunho incompleto sem afrouxar a validacao de publicacao", () => {
    const draft = [{ type: "prompt-answer", id: "questions", items: [{ id: "q1", prompt: "", answers: [{ id: "a1", text: "", isCorrect: false }] }] }];
    expect(editableActivityContentSchema.safeParse(draft).success).toBe(true);
    expect(activityContentSchema.safeParse(draft).success).toBe(false);
  });

  it("aceita referencia validada de imagem ou audio", () => {
    expect(itemListBlockSchema.safeParse({ type: "item-list", id: "list", items: [{ id: "i1", text: "Som", media: { assetId: crypto.randomUUID(), kind: "audio", filename: "som.ogg" } }] }).success).toBe(true);
  });

  it("aceita pares formados somente por imagens ou por conteúdo misto", () => {
    const image = (filename: string) => ({ assetId: crypto.randomUUID(), kind: "image" as const, filename });
    expect(pairBlockSchema.safeParse({
      type: "pair",
      id: "visual-pairs",
      pairs: [
        { id: "p1", left: "", right: "", leftMedia: image("animal.webp"), rightMedia: image("habitat.webp") },
        { id: "p2", left: "Planta", right: "", rightMedia: image("folha.webp") },
      ],
    }).success).toBe(true);
  });

  it("mantém compatibilidade com a mídia legada do lado esquerdo", () => {
    expect(pairBlockSchema.safeParse({
      type: "pair",
      id: "legacy-pairs",
      pairs: [
        { id: "p1", left: "", right: "Animal", media: { assetId: crypto.randomUUID(), kind: "image", filename: "animal.png" } },
        { id: "p2", left: "Planta", right: "Folha" },
      ],
    }).success).toBe(true);
  });

  it("rejeita um lado do par sem texto nem mídia ao publicar", () => {
    expect(pairBlockSchema.safeParse({
      type: "pair",
      id: "incomplete-pairs",
      pairs: [{ id: "p1", left: "", right: "Resposta" }, { id: "p2", left: "Item", right: "" }],
    }).success).toBe(false);
  });
});
