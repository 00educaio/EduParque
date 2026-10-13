import { describe, expect, it } from "vitest";
import { MEMORY_SHUFFLE_DURATION_MS, memoryShuffleRemaining } from "./memory-shuffle";

describe("memoryShuffleRemaining", () => {
  const startedAt = "2026-10-13T12:00:00.000Z";
  const startedAtMs = Date.parse(startedAt);

  it("mantém a duração padrão em sete segundos", () => {
    expect(MEMORY_SHUFFLE_DURATION_MS).toBe(7_000);
    expect(memoryShuffleRemaining(startedAt, startedAtMs)).toBe(7_000);
    expect(memoryShuffleRemaining(startedAt, startedAtMs + 2_500)).toBe(4_500);
  });

  it("não reinicia ao reconectar depois do embaralhamento", () => {
    expect(memoryShuffleRemaining(startedAt, startedAtMs + 7_001)).toBe(0);
  });

  it("encerra imediatamente quando o sistema prefere movimento reduzido", () => {
    expect(memoryShuffleRemaining(startedAt, startedAtMs, true)).toBe(0);
  });
});
