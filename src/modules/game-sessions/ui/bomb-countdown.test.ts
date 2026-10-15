// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BombCountdown,
  formatCountdown,
  getCountdownPhase,
  getCountdownProgress,
  getRemainingMilliseconds,
  getRemainingSeconds,
} from "./bomb-countdown";

describe("bomb countdown logic", () => {
  it.each([
    [30, "00:30"],
    [9, "00:09"],
    [0, "00:00"],
    [-4, "00:00"],
    [75, "01:15"],
    [3_600, "01:00:00"],
  ])("formata %i segundos como %s", (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });

  it("calcula o restante pelo timestamp sem permitir valor negativo", () => {
    expect(getRemainingMilliseconds(31_000, 1_000)).toBe(30_000);
    expect(getRemainingSeconds(10_000, 1_001)).toBe(9);
    expect(getRemainingMilliseconds(500, 1_000)).toBe(0);
    expect(getRemainingSeconds(500, 1_000)).toBe(0);
  });

  it("normaliza duracoes variaveis e identifica os quatro estados", () => {
    expect(getCountdownProgress(15_000, 30)).toBe(.5);
    expect(getCountdownProgress(30_000, 120)).toBe(.25);
    expect(getCountdownProgress(999_000, 30)).toBe(1);
    expect(getCountdownPhase(.7, 7_000)).toBe("normal");
    expect(getCountdownPhase(.2, 2_000)).toBe("warning");
    expect(getCountdownPhase(.1, 1_000)).toBe("critical");
    expect(getCountdownPhase(0, 0)).toBe("finished");
  });
});

describe("BombCountdown completion", () => {
  let container: HTMLDivElement;
  let root: Root;
  let now = 0;
  let nextFrameId = 0;
  let frames = new Map<number, FrameRequestCallback>();

  function runAnimationFrame() {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    now = 0;
    nextFrameId = 0;
    frames = new Map();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const frameId = ++nextFrameId;
      frames.set(frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
      frames.delete(frameId);
    });
    Object.defineProperties(window.SVGElement.prototype, {
      getTotalLength: { configurable: true, value: () => 100 },
      getPointAtLength: { configurable: true, value: (length: number) => ({ x: 280 + length, y: 160 - length / 2 }) },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("chama onComplete uma vez e libera um novo ciclo quando expiresAt muda", () => {
    const onComplete = vi.fn();

    act(() => root.render(createElement(BombCountdown, { expiresAt: 10_000, duration: 10, initialRemainingSeconds: 10, onComplete })));
    expect(container.textContent).toContain("00:10");

    now = 10_000;
    act(runAnimationFrame);
    act(runAnimationFrame);
    expect(container.textContent).toContain("00:00");
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => root.render(createElement(BombCountdown, { expiresAt: 15_000, duration: 5, initialRemainingSeconds: 5, onComplete })));
    expect(container.textContent).toContain("00:05");
    now = 15_000;
    act(runAnimationFrame);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it("termina imediatamente quando ja carrega expirado", () => {
    const onComplete = vi.fn();
    now = 20_000;
    act(() => root.render(createElement(BombCountdown, { expiresAt: 10_000, duration: 30, initialRemainingSeconds: 0, onComplete })));
    expect(container.textContent).toContain("00:00");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("atualiza React somente quando o segundo exibido muda", () => {
    const onSecondChange = vi.fn();
    act(() => root.render(createElement(BombCountdown, { expiresAt: 10_000, duration: 10, initialRemainingSeconds: 10, onSecondChange })));
    expect(onSecondChange).toHaveBeenLastCalledWith(10);

    now = 100;
    act(runAnimationFrame);
    expect(onSecondChange).toHaveBeenCalledTimes(1);

    now = 1_001;
    act(runAnimationFrame);
    expect(onSecondChange).toHaveBeenNthCalledWith(2, 9);
  });
});
