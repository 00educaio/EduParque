// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { helpGuides } from "./help-content";
import { GuidePanel } from "./guide-panel";

describe("GuidePanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(createElement(GuidePanel, { guide: helpGuides[0]! })));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function button(label: string) {
    return [...container.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes(label))!;
  }

  it("avança e volta somente por ação manual", () => {
    act(() => button("Abrir guia").click());
    expect(container.textContent).toContain("Passo 1 de 5");
    expect(container.textContent).toContain("Abra a Biblioteca pública");

    act(() => button("Próximo").click());
    expect(container.textContent).toContain("Passo 2 de 5");
    expect(container.textContent).toContain("Escolha uma atividade");

    act(() => button("Voltar").click());
    expect(container.textContent).toContain("Passo 1 de 5");
  });

  it("fecha com Escape e devolve o foco ao acionador", () => {
    const launcher = button("Abrir guia");
    act(() => launcher.click());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(container.textContent).not.toContain("Passo 1 de 5");
    expect(document.activeElement).toBe(launcher);
  });
});
