import { describe, expect, it } from "vitest";
import { contentAdapterRegistry } from "./content-adapters";
import { gameTemplates, getGameTemplate, parseGameConfig } from ".";

describe("Template Registry", () => {
  it("registra os seis templates do MVP com defaults validos", () => {
    expect(gameTemplates.map((template) => template.key)).toEqual(["quiz", "matching", "wheel", "group-sort", "unscramble", "team-grid"]);
    for (const template of gameTemplates) expect(() => parseGameConfig(template.key, template.defaultConfig)).not.toThrow();
  });

  it("rejeita template desconhecido", () => expect(() => getGameTemplate("inexistente")).toThrow("Template desconhecido"));

  it("normaliza a configuração legada word do Unscramble para token", () => {
    const definition = getGameTemplate("unscramble");
    const defaults = definition.defaultConfig as Record<string, unknown>;
    const parsed = parseGameConfig("unscramble", { ...defaults, template: { tokenMode: "word" } });
    expect(parsed.template).toEqual({ tokenMode: "token" });
  });
});

describe("ContentAdapterRegistry", () => {
  const pairs = { type: "pair" as const, id: "capitais", pairs: [{ id: "br", left: "Brasil", right: "Brasilia" }, { id: "fr", left: "Franca", right: "Paris" }] };

  it("converte pares em quiz de forma deterministica e preserva uma resposta correta", () => {
    const first = contentAdapterRegistry.convert(pairs, "prompt-answer");
    const second = contentAdapterRegistry.convert(pairs, "prompt-answer");
    expect(first).toEqual(second);
    expect(first.type).toBe("prompt-answer");
    if (first.type === "prompt-answer") expect(first.items.every((item) => item.answers.filter((answer) => answer.isCorrect).length === 1)).toBe(true);
  });

  it("recusa conversao destrutiva nao registrada", () => expect(() => contentAdapterRegistry.convert(pairs, "sequence")).toThrow("Conversao segura indisponivel"));

  it("recusa converter par somente visual para um formato que exige texto", () => {
    const image = { assetId: crypto.randomUUID(), kind: "image" as const, filename: "imagem.png" };
    const visualPairs = { type: "pair" as const, id: "visual", pairs: [{ id: "1", left: "", right: "Resposta", leftMedia: image }, { id: "2", left: "Texto", right: "Outra" }] };
    expect(() => contentAdapterRegistry.convert(visualPairs, "prompt-answer")).toThrow("Conversao segura indisponivel");
    expect(() => contentAdapterRegistry.convert(visualPairs, "item-list")).toThrow("Conversao segura indisponivel");
  });
});
