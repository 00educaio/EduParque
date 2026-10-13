import { describe, expect, it } from "vitest";
import { memoryGridLayout } from "./memory-grid-layout";

describe("memoryGridLayout", () => {
  it.each([4, 8, 12, 16, 20])("gera um layout válido e compacto para %i cartas", (cardCount) => {
    const layout = memoryGridLayout(cardCount, 800, 420);
    expect(layout.columns).toBeGreaterThanOrEqual(2);
    expect(layout.columns).toBeLessThanOrEqual(cardCount);
    expect(layout.rows).toBe(Math.ceil(cardCount / layout.columns));
    expect(layout.gridWidth).toBeLessThanOrEqual(800);
    expect(layout.cardHeight).toBeGreaterThanOrEqual(76);
    expect(layout.cardHeight).toBeLessThanOrEqual(140);
    const lastRowCards = cardCount % layout.columns || layout.columns;
    expect(lastRowCards).toBeGreaterThanOrEqual(Math.ceil(layout.columns / 2));
    if (cardCount >= 8) expect(layout.columns).toBeGreaterThan(2);
  });

  it("usa mais colunas quando a altura disponível diminui", () => {
    const tall = memoryGridLayout(20, 800, 700);
    const short = memoryGridLayout(20, 800, 280);
    expect(short.columns).toBeGreaterThanOrEqual(tall.columns);
  });

  it("limita as colunas para manter cartas legíveis no mobile", () => {
    const layout = memoryGridLayout(20, 300, 420);
    expect(layout.columns).toBeLessThanOrEqual(4);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(68);
  });

  it.each([
    { width: 300, height: 240 },
    { width: 390, height: 300 },
    { width: 800, height: 420 },
  ])("mantém todas as cartas visíveis em $width x $height", ({ width, height }) => {
    for (const cardCount of [4, 8, 12, 16, 20]) {
      const layout = memoryGridLayout(cardCount, width, height);
      expect(layout.gridWidth).toBeLessThanOrEqual(width);
      expect(layout.gridHeight).toBeLessThanOrEqual(layout.availableHeight);
      expect(layout.cardHeight).toBeGreaterThanOrEqual(36);
    }
  });
});
