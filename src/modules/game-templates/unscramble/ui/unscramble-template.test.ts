// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSessionState, reduceSession } from "@/modules/game-sessions/domain/session-reducer";
import type { SessionCommand, SessionState } from "@/modules/game-sessions/domain/session";
import type { ActivityContent } from "@/shared/domain/content-blocks";
import { UNSCRAMBLE_ERROR_TURN_DELAY_MS, UnscrambleTemplate } from "./unscramble-template";

const content = [{
  type: "sequence" as const,
  id: "sequences",
  sequences: [{ id: "answer", tokens: ["Edu", "Parque"], splitMode: "word" as const }],
}];

describe("UnscrambleTemplate", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  function render(verificationMode: "progressive" | "on-finish", activityContent: ActivityContent = content) {
    act(() => root.render(createElement(UnscrambleTemplate, {
      mode: "preview",
      content: activityContent,
      config: { base: {}, template: { tokenMode: "token", verificationMode } },
      sessionId: "preview",
    })));
  }

  function sessionState() {
    const initial = createInitialSessionState({
      sessionId: crypto.randomUUID(),
      teams: [{ name: "Equipe A", color: "#008844" }, { name: "Equipe B", color: "#0044aa" }],
      timer: { mode: "off", variant: "standard", durationSeconds: 30, soundEnabled: false },
      totalItems: 1,
      sourceTemplateKey: "unscramble",
      defaultPoints: 100,
    });
    return reduceSession(initial, { type: "startSession" }).state;
  }

  function renderSession({ verificationMode, tokenMode = "token", allowPassTurn = false, state, send }: { verificationMode: "progressive" | "on-finish"; tokenMode?: "character" | "token"; allowPassTurn?: boolean; state: SessionState; send: (command: SessionCommand) => Promise<SessionState | undefined> }) {
    act(() => root.render(createElement(UnscrambleTemplate, {
      mode: "session",
      content,
      config: { base: {}, template: { tokenMode, verificationMode, allowPassTurn } },
      sessionId: state.sessionId,
      state,
      send,
    })));
  }

  function piece(text: string) {
    return [...container.querySelectorAll<HTMLButtonElement>(".unscramble-pieces button")].find((button) => button.textContent === text)!;
  }

  it("verifica segmentos progressivamente sem exibir o botão Verificar", () => {
    render("progressive");
    expect(container.textContent).not.toContain("Verificar ordem");

    act(() => piece("Parque").click());
    expect(container.querySelector(".unscramble-answer button")?.classList.contains("is-incorrect")).toBe(true);

    act(() => container.querySelector<HTMLButtonElement>(".unscramble-answer button")!.click());
    act(() => piece("Edu").click());
    expect(container.querySelector(".unscramble-answer button")?.classList.contains("is-correct")).toBe(true);

    act(() => piece("Parque").click());
    expect(container.textContent).toContain("Sequência correta!");
  });

  it("oculta o feedback até a avaliação no modo ao finalizar", () => {
    render("on-finish");
    act(() => piece("Edu").click());
    act(() => piece("Parque").click());

    expect(container.querySelector(".unscramble-answer .is-correct")).toBeNull();
    const verify = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Verificar ordem")!;
    act(() => verify.click());

    expect(container.textContent).toContain("Sequência correta!");
    expect(container.querySelectorAll(".unscramble-answer .is-correct")).toHaveLength(2);
  });

  it("prioriza a configuração de unidade da própria palavra sobre o fallback global", () => {
    render("on-finish", [{
      type: "sequence",
      id: "individual",
      sequences: [{ id: "characters", tokens: ["Edu", "Parque"], splitMode: "word", unitMode: "character" }],
    }]);

    expect(piece("d")).toBeDefined();
    expect(piece("Edu")).toBeUndefined();
  });

  it("encerra o turno no primeiro segmento incorreto da verificação progressiva", async () => {
    vi.useFakeTimers();
    const state = sessionState();
    let finishRequest: (state: SessionState) => void = () => undefined;
    const send = vi.fn<(command: SessionCommand) => Promise<SessionState>>(() => new Promise<SessionState>((resolve) => { finishRequest = resolve; }));
    renderSession({ verificationMode: "progressive", state, send });

    act(() => piece("Parque").click());
    expect(container.textContent).toContain("Resposta incorreta. A próxima equipe joga em 3 segundos…");
    expect(send).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(UNSCRAMBLE_ERROR_TURN_DELAY_MS - 1));
    expect(send).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(send).toHaveBeenCalledWith({ type: "updateTemplateState", state: { unscrambleAttempt: 1, unscrambleSelections: { answer: ["answer:1"] } }, advanceTurn: true, expectedSequence: state.sequence });
    expect(container.querySelector<HTMLButtonElement>(".unscramble-pieces button:not(:disabled)")).toBeNull();

    const nextState = reduceSession(state, send.mock.calls[0]![0], new Date()).state;
    await act(async () => finishRequest(nextState));
    renderSession({ verificationMode: "progressive", state: nextState, send });
    expect(container.querySelector(".unscramble-answer button")?.textContent).toBe("Parque");
  });

  it("passa o turno após uma ordem incorreta somente ao pressionar Verificar", async () => {
    vi.useFakeTimers();
    const state = sessionState();
    const send = vi.fn<(command: SessionCommand) => Promise<SessionState>>(() => new Promise<SessionState>(() => undefined));
    renderSession({ verificationMode: "on-finish", state, send });
    act(() => piece("Parque").click());
    act(() => piece("Edu").click());
    expect(send).not.toHaveBeenCalled();

    const verify = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Verificar ordem")!;
    act(() => verify.click());
    expect(send).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(UNSCRAMBLE_ERROR_TURN_DELAY_MS));
    expect(send).toHaveBeenCalledWith({ type: "updateTemplateState", state: { unscrambleAttempt: 1, unscrambleSelections: { answer: ["answer:1", "answer:0"] } }, advanceTurn: true, expectedSequence: state.sequence });
  });

  it("aplica a troca progressiva também quando as unidades são caracteres", async () => {
    vi.useFakeTimers();
    const state = sessionState();
    const send = vi.fn<(command: SessionCommand) => Promise<SessionState>>(() => new Promise<SessionState>(() => undefined));
    renderSession({ verificationMode: "progressive", tokenMode: "character", state, send });

    act(() => piece("d").click());
    expect(container.querySelector(".unscramble-answer .is-incorrect")).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(UNSCRAMBLE_ERROR_TURN_DELAY_MS));
    expect(send).toHaveBeenCalledWith({ type: "updateTemplateState", state: { unscrambleAttempt: 1, unscrambleSelections: { answer: ["answer:1"] } }, advanceTurn: true, expectedSequence: state.sequence });
  });

  it("exibe e executa a passagem voluntária apenas quando configurada", () => {
    const state = sessionState();
    const send = vi.fn<(command: SessionCommand) => Promise<SessionState>>(() => new Promise<SessionState>(() => undefined));
    renderSession({ verificationMode: "on-finish", allowPassTurn: false, state, send });
    expect(container.textContent).not.toContain("Passar a vez");

    renderSession({ verificationMode: "on-finish", allowPassTurn: true, state, send });
    act(() => piece("Edu").click());
    const pass = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Passar a vez")!;
    act(() => pass.click());
    expect(send).toHaveBeenCalledWith({ type: "updateTemplateState", state: { unscrambleAttempt: 1, unscrambleSelections: { answer: ["answer:0"] } }, advanceTurn: true, expectedSequence: state.sequence });
    expect(pass.disabled).toBe(true);
  });
});
