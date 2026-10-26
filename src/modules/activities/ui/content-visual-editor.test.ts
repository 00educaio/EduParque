// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditableActivityContent } from "@/shared/domain/content-blocks";
import { ContentVisualEditor } from "./content-visual-editor";

describe("ContentVisualEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(content: EditableActivityContent, onChange = vi.fn()) {
    act(() => root.render(createElement(ContentVisualEditor, {
      content,
      activeTemplateKey: "quiz",
      unscrambleLegacyTokenMode: "token",
      allowAdvanced: false,
      onChange,
    })));
    return onChange;
  }

  function contentTypeButton(label: string) {
    return [...container.querySelectorAll<HTMLButtonElement>(".content-type-grid button")]
      .find((button) => button.textContent?.includes(label))!;
  }

  function addBlockButton(label: string) {
    return [...container.querySelectorAll<HTMLButtonElement>(".add-block button")]
      .find((button) => button.textContent?.includes(label))!;
  }

  it("permite selecionar apenas tipos compatíveis ao criar o primeiro bloco", () => {
    const onChange = render([]);

    expect(contentTypeButton("Perguntas e respostas").disabled).toBe(false);
    expect(contentTypeButton("Pares").disabled).toBe(true);
    expect(contentTypeButton("Lista de itens").disabled).toBe(true);

    act(() => contentTypeButton("Pares").click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("permite adicionar apenas blocos compatíveis ao conteúdo existente", () => {
    const content: EditableActivityContent = [{
      type: "prompt-answer",
      id: "questions",
      items: [{
        id: "question-1",
        prompt: "Pergunta",
        answers: [{ id: "answer-1", text: "Resposta", isCorrect: true }],
      }],
    }];
    const onChange = render(content);

    expect(addBlockButton("Perguntas e respostas").disabled).toBe(false);
    expect(addBlockButton("Pares").disabled).toBe(true);

    act(() => addBlockButton("Perguntas e respostas").click());
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]![0]).toHaveLength(2);
    expect(onChange.mock.calls[0]![0][1].type).toBe("prompt-answer");
  });
});
