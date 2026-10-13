import { describe, expect, it } from "vitest";
import { createInitialSessionState, InvalidSessionCommandError, reduceSession, restoreSessionState } from "./session-reducer";

const start = new Date("2026-10-05T12:00:00.000Z");

function initial(overrides: Partial<Parameters<typeof createInitialSessionState>[0]> = {}) {
  return createInitialSessionState({
    sessionId: crypto.randomUUID(),
    teams: [{ name: "Verde", color: "#008844" }, { name: "Azul", color: "#0044aa" }],
    timer: { mode: "question", variant: "standard", durationSeconds: 30, soundEnabled: true },
    totalItems: 4, sourceTemplateKey: "quiz", defaultPoints: 100, now: start,
    ...overrides,
  });
}

describe("sessionReducer", () => {
  it("inicia, revela, avanca turno e pausa preservando o tempo", () => {
    const started = reduceSession(initial(), { type: "startSession" }, start).state;
    expect(started.status).toBe("active");
    expect(started.timer.running).toBe(true);
    const revealed = reduceSession(started, { type: "reveal" }, new Date(start.getTime() + 2_000)).state;
    expect(revealed.revealed).toBe(true);
    const advanced = reduceSession(revealed, { type: "next" }, new Date(start.getTime() + 3_000)).state;
    expect(advanced).toMatchObject({ currentItemIndex: 1, activeTeamIndex: 1, revealed: false });
    expect(advanced.timer.remainingSeconds).toBe(30);
    const paused = reduceSession(advanced, { type: "pause" }, new Date(start.getTime() + 8_000)).state;
    expect(paused.status).toBe("paused");
    expect(paused.timer.running).toBe(false);
    expect(paused.timer.remainingSeconds).toBe(25);
    const resumed = reduceSession(paused, { type: "resume" }, new Date(start.getTime() + 10_000)).state;
    expect(resumed.timer.deadlineAt).toBe("2026-10-05T12:00:35.000Z");
  });

  it("aplica pontos sugeridos, ajuste manual e undo da ultima acao relevante", () => {
    const started = reduceSession(initial(), { type: "startSession" }, start).state;
    const teamId = started.teams[0]!.id;
    const awarded = reduceSession(started, { type: "awardPoints", teamId, suggestedPoints: 250 }, start).state;
    expect(awarded.teams[0]!.score).toBe(250);
    const removed = reduceSession(awarded, { type: "removePoints", teamId, points: 50 }, start).state;
    expect(removed.teams[0]!.score).toBe(200);
    const undone = reduceSession(removed, { type: "undo" }, start);
    expect(undone.state.teams[0]!.score).toBe(250);
    expect(undone.event).toMatchObject({ type: "actionUndone", payload: { action: "Remover pontos" } });
  });

  it("desfaz progresso, reveal e estado opaco do template", () => {
    let state = reduceSession(initial(), { type: "startSession" }, start).state;
    state = reduceSession(state, { type: "updateTemplateState", state: { completed: 1, card: "a" } }, start).state;
    expect(state.template.state).toEqual({ completed: 1, card: "a" });
    state = reduceSession(state, { type: "next" }, start).state;
    state = reduceSession(state, { type: "reveal" }, start).state;
    state = reduceSession(state, { type: "undo" }, start).state;
    expect(state.revealed).toBe(false);
    state = reduceSession(state, { type: "undo" }, start).state;
    expect(state.currentItemIndex).toBe(0);
    state = reduceSession(state, { type: "undo" }, start).state;
    expect(state.template.state).toEqual({});
  });

  it("persiste estado, pontua e avança uma ação de template em um único undo", () => {
    let state = reduceSession(initial(), { type: "startSession" }, start).state;
    const teamId = state.teams[0]!.id;
    state = reduceSession(state, { type: "updateTemplateState", state: { matchedIds: ["p1"] }, award: { teamId, suggestedPoints: 150 }, advance: true }, start).state;
    expect(state.template.state).toEqual({ matchedIds: ["p1"] });
    expect(state.teams[0]!.score).toBe(150);
    expect(state).toMatchObject({ currentItemIndex: 1, activeTeamIndex: 1 });
    expect(state.undoStack).toHaveLength(1);
    state = reduceSession(state, { type: "undo" }, start).state;
    expect(state.template.state).toEqual({});
    expect(state.teams[0]!.score).toBe(0);
    expect(state.currentItemIndex).toBe(0);
  });

  it("pontua e finaliza uma ação de template sem trocar a equipe ativa", () => {
    let state = reduceSession(initial(), { type: "startSession" }, start).state;
    const teamId = state.teams[0]!.id;
    state = reduceSession(state, {
      type: "updateTemplateState",
      state: { matchedIds: ["ultimo"], memoryPhase: "GAME_FINISHED" },
      award: { teamId, suggestedPoints: 150 },
      finish: true,
    }, start).state;
    expect(state).toMatchObject({ status: "finished", activeTeamIndex: 0, finishedAt: start.toISOString() });
    expect(state.teams[0]!.score).toBe(150);
    expect(state.timer.running).toBe(false);
  });

  it("alterna somente o turno após um erro e mantém uma equipe única ativa", () => {
    let state = reduceSession(initial(), { type: "startSession" }, start).state;
    state = reduceSession(state, { type: "updateTemplateState", state: { memoryPhase: "WAITING_FIRST_CARD" }, advanceTurn: true }, start).state;
    expect(state).toMatchObject({ activeTeamIndex: 1, currentItemIndex: 0 });
    expect(state.teams.map((team) => team.score)).toEqual([0, 0]);

    let solo = reduceSession(initial({ teams: [{ name: "Solo", color: "#008844" }] }), { type: "startSession" }, start).state;
    solo = reduceSession(solo, { type: "updateTemplateState", state: { memoryPhase: "WAITING_FIRST_CARD" }, advanceTurn: true }, start).state;
    expect(solo.activeTeamIndex).toBe(0);
  });

  it("alterna equipes circularmente sem concluir a pergunta ou alterar pontos", () => {
    let state = reduceSession(initial({ teams: [{ name: "A", color: "#008844" }, { name: "B", color: "#0044aa" }, { name: "C", color: "#aa4400" }] }), { type: "startSession" }, start).state;
    const scores = state.teams.map((team) => team.score);
    for (const expectedTeamIndex of [1, 2, 0]) {
      state = reduceSession(state, { type: "updateTemplateState", state: {}, advanceTurn: true, expectedSequence: state.sequence }, start).state;
      expect(state).toMatchObject({ activeTeamIndex: expectedTeamIndex, currentItemIndex: 0 });
      expect(state.teams.map((team) => team.score)).toEqual(scores);
    }
  });

  it("rejeita uma segunda passagem baseada na mesma tentativa", () => {
    const state = reduceSession(initial(), { type: "startSession" }, start).state;
    const command = { type: "updateTemplateState" as const, state: {}, advanceTurn: true, expectedSequence: state.sequence };
    const advanced = reduceSession(state, command, start).state;
    expect(advanced.activeTeamIndex).toBe(1);
    expect(() => reduceSession(advanced, command, start)).toThrow("A tentativa já foi encerrada por outra ação.");
  });

  it("restaura timer-bomba expirado sem depender de ticks persistidos", () => {
    const state = reduceSession(initial({ timer: { mode: "game", variant: "bomb", durationSeconds: 5, soundEnabled: false } }), { type: "startSession" }, start).state;
    const restored = restoreSessionState(state, new Date(start.getTime() + 5_500));
    expect(restored.timer).toMatchObject({ remainingSeconds: 0, running: false, exploded: true, soundEnabled: false });
    const expired = reduceSession(state, { type: "expireTimer" }, new Date(start.getTime() + 5_500));
    expect(expired.event.type).toBe("timerExpired");
    expect(expired.state.revealed).toBe(true);
  });

  it("permite renomear uma equipe e desfazer a alteracao", () => {
    const started = reduceSession(initial(), { type: "startSession" }, start).state;
    const renamed = reduceSession(started, { type: "renameTeam", teamId: started.teams[0]!.id, name: "Feras" }, start).state;
    expect(renamed.teams[0]!.name).toBe("Feras");
    expect(reduceSession(renamed, { type: "undo" }, start).state.teams[0]!.name).toBe("Verde");
  });

  it("revela a resposta quando o timer padrao termina", () => {
    const state = reduceSession(initial({ timer: { mode: "question", variant: "standard", durationSeconds: 5, soundEnabled: true } }), { type: "startSession" }, start).state;
    const expired = reduceSession(state, { type: "expireTimer" }, new Date(start.getTime() + 5_500));
    expect(expired.state).toMatchObject({ revealed: true, timer: { running: false, remainingSeconds: 0, exploded: false } });
  });

  it("finaliza e permite desfazer a finalizacao", () => {
    const started = reduceSession(initial(), { type: "startSession" }, start).state;
    const finished = reduceSession(started, { type: "finish" }, start).state;
    expect(finished.status).toBe("finished");
    const restored = reduceSession(finished, { type: "undo" }, start).state;
    expect(restored.status).toBe("active");
  });

  it("rejeita equipes acima do limite e comandos invalidos para o estado", () => {
    expect(() => initial({ teams: Array.from({ length: 9 }, (_, index) => ({ name: `Equipe ${index}`, color: "#112233" })) })).toThrow();
    expect(() => reduceSession(initial(), { type: "next" }, start)).toThrow(InvalidSessionCommandError);
  });
});
