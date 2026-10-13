export const MEMORY_MISMATCH_DELAY_MS = 5_000;

export type MemoryTurnPhase =
  | "SHUFFLING"
  | "WAITING_FIRST_CARD"
  | "WAITING_SECOND_CARD"
  | "CHECKING_MATCH"
  | "SHOWING_MISMATCH"
  | "TURN_TRANSITION"
  | "GAME_FINISHED";

export interface MemoryTurnCard {
  key: string;
  pairId: string;
  side: "left" | "right";
}

export interface MemoryTurnState {
  phase: MemoryTurnPhase;
  matchedIds: string[];
  openCardIds: string[];
  mismatchDeadlineAt: string | null;
}

export type MemoryTurnSelection =
  | { accepted: false; state: MemoryTurnState }
  | { accepted: true; outcome: "first" | "checking"; state: MemoryTurnState };

export type MemoryTurnCheck = {
  outcome: "match" | "mismatch";
  state: MemoryTurnState;
};

const phases = new Set<MemoryTurnPhase>([
  "SHUFFLING",
  "WAITING_FIRST_CARD",
  "WAITING_SECOND_CARD",
  "CHECKING_MATCH",
  "SHOWING_MISMATCH",
  "TURN_TRANSITION",
  "GAME_FINISHED",
]);

function uniqueValidStrings(value: unknown, valid: Set<string>) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && valid.has(item)))];
}

export function restoreMemoryTurnState(
  raw: Record<string, unknown>,
  cards: MemoryTurnCard[],
  shuffling = false,
): MemoryTurnState {
  const cardIds = new Set(cards.map((card) => card.key));
  const pairIds = new Set(cards.map((card) => card.pairId));
  const matchedIds = uniqueValidStrings(raw.matchedIds, pairIds);
  const openCardIds = uniqueValidStrings(raw.memoryOpenCardIds, cardIds)
    .filter((key) => !matchedIds.includes(cards.find((card) => card.key === key)?.pairId ?? ""))
    .slice(0, 2);
  const storedPhase = typeof raw.memoryPhase === "string" && phases.has(raw.memoryPhase as MemoryTurnPhase)
    ? raw.memoryPhase as MemoryTurnPhase
    : undefined;
  const mismatchDeadlineAt = typeof raw.memoryMismatchDeadlineAt === "string" && Number.isFinite(Date.parse(raw.memoryMismatchDeadlineAt))
    ? raw.memoryMismatchDeadlineAt
    : null;

  let phase: MemoryTurnPhase;
  if (matchedIds.length === pairIds.size && pairIds.size > 0) phase = "GAME_FINISHED";
  else if (shuffling) phase = "SHUFFLING";
  else if (storedPhase === "SHOWING_MISMATCH" && openCardIds.length === 2 && mismatchDeadlineAt) phase = storedPhase;
  else if (openCardIds.length === 1) phase = "WAITING_SECOND_CARD";
  else phase = "WAITING_FIRST_CARD";

  return { phase, matchedIds, openCardIds, mismatchDeadlineAt: phase === "SHOWING_MISMATCH" ? mismatchDeadlineAt : null };
}

export function selectMemoryCard(
  state: MemoryTurnState,
  selectedKey: string,
  cards: MemoryTurnCard[],
): MemoryTurnSelection {
  if (state.phase !== "WAITING_FIRST_CARD" && state.phase !== "WAITING_SECOND_CARD") return { accepted: false, state };
  if (state.openCardIds.includes(selectedKey)) return { accepted: false, state };
  const selected = cards.find((card) => card.key === selectedKey);
  if (!selected || state.matchedIds.includes(selected.pairId)) return { accepted: false, state };

  if (state.phase === "WAITING_FIRST_CARD") {
    return {
      accepted: true,
      outcome: "first",
      state: { ...state, phase: "WAITING_SECOND_CARD", openCardIds: [selectedKey], mismatchDeadlineAt: null },
    };
  }

  return {
    accepted: true,
    outcome: "checking",
    state: { ...state, phase: "CHECKING_MATCH", openCardIds: [state.openCardIds[0]!, selected.key], mismatchDeadlineAt: null },
  };
}

export function resolveMemoryCheck(state: MemoryTurnState, cards: MemoryTurnCard[], now: Date): MemoryTurnCheck {
  if (state.phase !== "CHECKING_MATCH" || state.openCardIds.length !== 2) {
    throw new Error("A tentativa só pode ser verificada quando duas cartas estão abertas.");
  }
  const first = cards.find((card) => card.key === state.openCardIds[0]);
  const selected = cards.find((card) => card.key === state.openCardIds[1]);
  if (!first || !selected) throw new Error("A tentativa contém uma carta inválida.");
  const isMatch = first.pairId === selected.pairId && first.side !== selected.side;
  if (isMatch) {
    const matchedIds = [...new Set([...state.matchedIds, first.pairId])];
    const allPairIds = new Set(cards.map((card) => card.pairId));
    return {
      outcome: "match",
      state: {
        phase: matchedIds.length === allPairIds.size ? "GAME_FINISHED" : "TURN_TRANSITION",
        matchedIds,
        openCardIds: [],
        mismatchDeadlineAt: null,
      },
    };
  }

  return {
    outcome: "mismatch",
    state: {
      ...state,
      phase: "SHOWING_MISMATCH",
      openCardIds: [first.key, selected.key],
      mismatchDeadlineAt: new Date(now.getTime() + MEMORY_MISMATCH_DELAY_MS).toISOString(),
    },
  };
}

export function beginNextMemoryTurn(state: MemoryTurnState): MemoryTurnState {
  if (state.phase !== "TURN_TRANSITION" && state.phase !== "SHOWING_MISMATCH") return state;
  return { ...state, phase: "WAITING_FIRST_CARD", openCardIds: [], mismatchDeadlineAt: null };
}

export function serializeMemoryTurnState(base: Record<string, unknown>, state: MemoryTurnState) {
  return {
    ...base,
    matchedIds: state.matchedIds,
    memoryPhase: state.phase,
    memoryOpenCardIds: state.openCardIds,
    memoryMismatchDeadlineAt: state.mismatchDeadlineAt,
  };
}
