import { describe, expect, it } from "vitest";
import { beginNextMemoryTurn, MEMORY_MISMATCH_DELAY_MS, resolveMemoryCheck, restoreMemoryTurnState, selectMemoryCard } from "./memory-turn";

const cards = [
  { key: "a:left", pairId: "a", side: "left" as const },
  { key: "a:right", pairId: "a", side: "right" as const },
  { key: "b:left", pairId: "b", side: "left" as const },
  { key: "b:right", pairId: "b", side: "right" as const },
];
const now = new Date("2026-10-13T12:00:00.000Z");

function initial() {
  return restoreMemoryTurnState({}, cards);
}

describe("memory turn state machine", () => {
  it("mantém o par correto aberto, marca o par e inicia a transição", () => {
    const first = selectMemoryCard(initial(), "a:left", cards);
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    const checking = selectMemoryCard(first.state, "a:right", cards);
    expect(checking).toMatchObject({ accepted: true, outcome: "checking", state: { phase: "CHECKING_MATCH", openCardIds: ["a:left", "a:right"] } });
    if (!checking.accepted) return;
    const match = resolveMemoryCheck(checking.state, cards, now);
    expect(match).toMatchObject({ outcome: "match", state: { phase: "TURN_TRANSITION", matchedIds: ["a"], openCardIds: [] } });
    expect(beginNextMemoryTurn(match.state).phase).toBe("WAITING_FIRST_CARD");
  });

  it("mantém duas cartas incorretas abertas por cinco segundos e depois limpa a tentativa", () => {
    const first = selectMemoryCard(initial(), "a:left", cards);
    if (!first.accepted) throw new Error("primeira carta deveria ser aceita");
    const checking = selectMemoryCard(first.state, "b:left", cards);
    if (!checking.accepted) throw new Error("segunda carta deveria ser aceita");
    const mismatch = resolveMemoryCheck(checking.state, cards, now);
    expect(mismatch).toMatchObject({ outcome: "mismatch", state: { phase: "SHOWING_MISMATCH", openCardIds: ["a:left", "b:left"] } });
    expect(Date.parse(mismatch.state.mismatchDeadlineAt!) - now.getTime()).toBe(MEMORY_MISMATCH_DELAY_MS);
    expect(beginNextMemoryTurn(mismatch.state)).toMatchObject({ phase: "WAITING_FIRST_CARD", openCardIds: [], mismatchDeadlineAt: null });
  });

  it("ignora uma terceira carta enquanto a tentativa está sendo resolvida", () => {
    const showingMismatch = restoreMemoryTurnState({
      memoryPhase: "SHOWING_MISMATCH",
      memoryOpenCardIds: ["a:left", "b:left"],
      memoryMismatchDeadlineAt: "2026-10-13T12:00:05.000Z",
    }, cards);
    expect(selectMemoryCard(showingMismatch, "b:right", cards).accepted).toBe(false);
    expect(showingMismatch.openCardIds).toHaveLength(2);
  });

  it("ignora cartas já concluídas e não permite fechar a primeira carta", () => {
    const state = restoreMemoryTurnState({ matchedIds: ["a"] }, cards);
    expect(selectMemoryCard(state, "a:left", cards).accepted).toBe(false);
    const first = selectMemoryCard(state, "b:left", cards);
    if (!first.accepted) throw new Error("primeira carta deveria ser aceita");
    expect(selectMemoryCard(first.state, "b:left", cards).accepted).toBe(false);
    expect(first.state.openCardIds).toEqual(["b:left"]);
  });

  it("finaliza ao encontrar o último par sem criar outro turno", () => {
    const state = restoreMemoryTurnState({ matchedIds: ["a"] }, cards);
    const first = selectMemoryCard(state, "b:left", cards);
    if (!first.accepted) throw new Error("primeira carta deveria ser aceita");
    const checking = selectMemoryCard(first.state, "b:right", cards);
    if (!checking.accepted) throw new Error("segunda carta deveria ser aceita");
    const lastMatch = resolveMemoryCheck(checking.state, cards, now);
    expect(lastMatch).toMatchObject({ outcome: "match", state: { phase: "GAME_FINISHED", matchedIds: ["a", "b"] } });
  });

  it("nunca mantém mais de duas cartas abertas após cliques rápidos", () => {
    const first = selectMemoryCard(initial(), "a:left", cards);
    if (!first.accepted) throw new Error("primeira carta deveria ser aceita");
    const second = selectMemoryCard(first.state, "b:left", cards);
    if (!second.accepted) throw new Error("segunda carta deveria ser aceita");
    const third = selectMemoryCard(second.state, "b:right", cards);
    expect(third.accepted).toBe(false);
    expect(third.state.openCardIds).toHaveLength(2);
  });
});
