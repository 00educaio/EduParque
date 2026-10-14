// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportReplyForm } from "./support-reply-form";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("SupportReplyForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    navigation.refresh.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function submitWith(response: Response) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    act(() => root.render(createElement(SupportReplyForm, { endpoint: "/api/support-tickets/id/messages" })));
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
    act(() => { valueSetter.call(textarea, "Minha resposta"); textarea.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { container.querySelector<HTMLFormElement>("form")!.requestSubmit(); });
  }

  it("exibe erro de gravação sem limpar o texto", async () => {
    await submitWith(new Response(JSON.stringify({ error: "Falha de gravação simulada." }), { status: 500, headers: { "Content-Type": "application/json" } }));
    expect(container.textContent).toContain("Falha de gravação simulada.");
    expect(container.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("Minha resposta");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("limpa e atualiza o histórico após sucesso", async () => {
    await submitWith(new Response(JSON.stringify({ id: crypto.randomUUID() }), { status: 201, headers: { "Content-Type": "application/json" } }));
    expect(container.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});
