import { sessionStateSchema, type SessionCommand, type SessionEvent, type SessionState, type SessionTimer, type TimerConfig } from "./session";

export class InvalidSessionCommandError extends Error {
  readonly status = 409;
  constructor(message: string) { super(message); this.name = "InvalidSessionCommandError"; }
}

function secondsUntil(deadlineAt: string, now: Date) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now.getTime()) / 1_000));
}

function timerAtRest(config: TimerConfig): SessionTimer {
  return { ...config, remainingSeconds: config.durationSeconds, deadlineAt: null, running: false, exploded: false };
}

function startTimer(timer: SessionTimer, now: Date, reset = false): SessionTimer {
  if (timer.mode === "off") return { ...timer, deadlineAt: null, running: false, exploded: false };
  const remainingSeconds = reset ? timer.durationSeconds : timer.remainingSeconds;
  return { ...timer, remainingSeconds, deadlineAt: new Date(now.getTime() + remainingSeconds * 1_000).toISOString(), running: true, exploded: false };
}

function stopTimer(timer: SessionTimer, now: Date): SessionTimer {
  const remainingSeconds = timer.running && timer.deadlineAt ? secondsUntil(timer.deadlineAt, now) : timer.remainingSeconds;
  return { ...timer, remainingSeconds, deadlineAt: null, running: false };
}

function snapshotForUndo(state: SessionState, label: string, now: Date): SessionState["undoStack"][number] {
  const stoppedTimer = stopTimer(state.timer, now);
  return {
    label, teams: structuredClone(state.teams), activeTeamIndex: state.activeTeamIndex,
    currentItemIndex: state.currentItemIndex, revealed: state.revealed, status: state.status,
    timer: { ...stoppedTimer, running: state.timer.running }, templateState: structuredClone(state.template.state), finishedAt: state.finishedAt,
  };
}

function withUndo(state: SessionState, label: string, now: Date) {
  return [...state.undoStack, snapshotForUndo(state, label, now)].slice(-20);
}

function assertStatus(state: SessionState, statuses: SessionState["status"][]) {
  if (!statuses.includes(state.status)) throw new InvalidSessionCommandError(`Comando indisponivel durante o estado ${state.status}.`);
}

function makeEvent(state: SessionState, type: SessionEvent["type"], payload: Record<string, unknown>, now: Date): SessionEvent {
  return { sessionId: state.sessionId, sequence: state.sequence + 1, type, payload, occurredAt: now.toISOString() };
}

export function createInitialSessionState(input: {
  sessionId: string; teams: Array<{ name: string; color: string }>; timer: TimerConfig;
  totalItems: number; sourceTemplateKey: string; defaultPoints: number; now?: Date;
}): SessionState {
  const now = input.now ?? new Date();
  return sessionStateSchema.parse({
    version: 1, sessionId: input.sessionId, status: "created",
    teams: input.teams.map((team) => ({ ...team, id: crypto.randomUUID(), score: 0 })), activeTeamIndex: 0,
    currentItemIndex: 0, totalItems: Math.max(1, input.totalItems), revealed: false,
    scoring: { defaultPoints: input.defaultPoints }, timer: timerAtRest(input.timer),
    template: { key: input.sourceTemplateKey, sourceTemplateKey: input.sourceTemplateKey, state: {} },
    undoStack: [], sequence: 0, startedAt: null, finishedAt: null, updatedAt: now.toISOString(),
  });
}

export function restoreSessionState(value: unknown, now = new Date()): SessionState {
  const state = sessionStateSchema.parse(value);
  if (!state.timer.running || !state.timer.deadlineAt) return state;
  const remainingSeconds = secondsUntil(state.timer.deadlineAt, now);
  return sessionStateSchema.parse({
    ...state,
    timer: { ...state.timer, remainingSeconds, running: remainingSeconds > 0, deadlineAt: remainingSeconds > 0 ? state.timer.deadlineAt : null, exploded: remainingSeconds === 0 && state.timer.variant === "bomb" },
    updatedAt: remainingSeconds === state.timer.remainingSeconds ? state.updatedAt : now.toISOString(),
  });
}

export function reduceSession(rawState: SessionState, command: SessionCommand, now = new Date()): { state: SessionState; event: SessionEvent } {
  const state = restoreSessionState(rawState, now);
  let next: SessionState;
  let event: SessionEvent;

  switch (command.type) {
    case "startSession": {
      assertStatus(state, ["created"]);
      next = { ...state, status: "active", startedAt: now.toISOString(), timer: startTimer(state.timer, now, true) };
      event = makeEvent(state, "sessionStarted", {}, now); break;
    }
    case "next": {
      assertStatus(state, ["active"]);
      const shouldResetTimer = state.timer.mode === "item" || state.timer.mode === "question";
      next = { ...state, undoStack: withUndo(state, "Avançar", now), currentItemIndex: Math.min(state.currentItemIndex + 1, state.totalItems - 1), activeTeamIndex: (state.activeTeamIndex + 1) % state.teams.length, revealed: false, timer: shouldResetTimer ? startTimer(state.timer, now, true) : state.timer };
      event = makeEvent(state, "itemAdvanced", { itemIndex: next.currentItemIndex, activeTeamIndex: next.activeTeamIndex }, now); break;
    }
    case "reveal": {
      assertStatus(state, ["active"]);
      next = { ...state, undoStack: withUndo(state, "Revelar", now), revealed: true };
      event = makeEvent(state, "answerRevealed", { itemIndex: state.currentItemIndex }, now); break;
    }
    case "awardPoints": {
      assertStatus(state, ["active", "paused"]);
      const points = command.points ?? command.suggestedPoints ?? state.scoring.defaultPoints;
      if (points <= 0) throw new InvalidSessionCommandError("A pontuacao deve ser positiva.");
      if (!state.teams.some((team) => team.id === command.teamId)) throw new InvalidSessionCommandError("Equipe nao encontrada.");
      next = { ...state, undoStack: withUndo(state, "Adicionar pontos", now), teams: state.teams.map((team) => team.id === command.teamId ? { ...team, score: Math.min(1_000_000, team.score + points) } : team) };
      event = makeEvent(state, "pointsAwarded", { teamId: command.teamId, points, suggested: command.points === undefined && command.suggestedPoints !== undefined }, now); break;
    }
    case "removePoints": {
      assertStatus(state, ["active", "paused"]);
      if (!state.teams.some((team) => team.id === command.teamId)) throw new InvalidSessionCommandError("Equipe nao encontrada.");
      next = { ...state, undoStack: withUndo(state, "Remover pontos", now), teams: state.teams.map((team) => team.id === command.teamId ? { ...team, score: Math.max(-1_000_000, team.score - command.points) } : team) };
      event = makeEvent(state, "pointsRemoved", { teamId: command.teamId, points: command.points }, now); break;
    }
    case "renameTeam": {
      assertStatus(state, ["created", "active", "paused"]);
      if (!state.teams.some((team) => team.id === command.teamId)) throw new InvalidSessionCommandError("Equipe nao encontrada.");
      next = { ...state, undoStack: withUndo(state, "Renomear equipe", now), teams: state.teams.map((team) => team.id === command.teamId ? { ...team, name: command.name.trim() } : team) };
      event = makeEvent(state, "teamRenamed", { teamId: command.teamId, name: command.name.trim() }, now); break;
    }
    case "pause": {
      assertStatus(state, ["active"]);
      next = { ...state, status: "paused", timer: stopTimer(state.timer, now) };
      event = makeEvent(state, "sessionPaused", {}, now); break;
    }
    case "resume": {
      assertStatus(state, ["paused"]);
      next = { ...state, status: "active", timer: startTimer(state.timer, now) };
      event = makeEvent(state, "sessionResumed", {}, now); break;
    }
    case "undo": {
      assertStatus(state, ["active", "paused", "finished"]);
      const frame = state.undoStack.at(-1);
      if (!frame) throw new InvalidSessionCommandError("Nao ha acao para desfazer.");
      const restoredTimer = frame.timer.running ? startTimer(frame.timer, now) : frame.timer;
      next = { ...state, teams: frame.teams, activeTeamIndex: frame.activeTeamIndex, currentItemIndex: frame.currentItemIndex, revealed: frame.revealed, status: frame.status, timer: restoredTimer, template: { ...state.template, state: frame.templateState }, finishedAt: frame.finishedAt, undoStack: state.undoStack.slice(0, -1) };
      event = makeEvent(state, "actionUndone", { action: frame.label }, now); break;
    }
    case "finish": {
      assertStatus(state, ["active", "paused"]);
      next = { ...state, undoStack: withUndo(state, "Finalizar", now), status: "finished", timer: stopTimer(state.timer, now), finishedAt: now.toISOString() };
      event = makeEvent(state, "sessionFinished", {}, now); break;
    }
    case "updateTemplateState": {
      assertStatus(state, ["active"]);
      if ((command.advance || command.advanceTurn) && command.finish) throw new InvalidSessionCommandError("A sessão não pode avançar e finalizar na mesma ação.");
      const awardedTeam = command.award ? state.teams.find((team) => team.id === command.award!.teamId) : undefined;
      if (command.award && !awardedTeam) throw new InvalidSessionCommandError("Equipe nao encontrada.");
      const points = command.award?.suggestedPoints ?? state.scoring.defaultPoints;
      const finishing = command.finish === true;
      const advancingTurn = command.advance === true || command.advanceTurn === true;
      const shouldResetTimer = command.restartTimer || (advancingTurn && (state.timer.mode === "item" || state.timer.mode === "question"));
      next = {
        ...state,
        undoStack: withUndo(state, "Ação do jogo", now),
        teams: command.award ? state.teams.map((team) => team.id === command.award!.teamId ? { ...team, score: Math.min(1_000_000, team.score + points) } : team) : state.teams,
        currentItemIndex: command.advance ? Math.min(state.currentItemIndex + 1, state.totalItems - 1) : state.currentItemIndex,
        activeTeamIndex: advancingTurn ? (state.activeTeamIndex + 1) % state.teams.length : state.activeTeamIndex,
        revealed: advancingTurn ? false : state.revealed,
        status: finishing ? "finished" : state.status,
        timer: finishing ? stopTimer(state.timer, now) : shouldResetTimer ? startTimer(state.timer, now, true) : state.timer,
        template: { ...state.template, state: structuredClone(command.state) },
        finishedAt: finishing ? now.toISOString() : state.finishedAt,
      };
      event = makeEvent(state, "templateStateUpdated", {
        awardedTeamId: command.award?.teamId,
        points: command.award ? points : undefined,
        advanced: Boolean(command.advance),
        turnAdvanced: advancingTurn,
        finished: finishing,
        timerRestarted: Boolean(command.restartTimer),
      }, now); break;
    }
    case "expireTimer": {
      assertStatus(state, ["active"]);
      if (!rawState.timer.running || state.timer.mode === "off" || state.timer.remainingSeconds > 0) throw new InvalidSessionCommandError("O timer ainda nao expirou.");
      next = { ...state, revealed: true, timer: { ...state.timer, remainingSeconds: 0, deadlineAt: null, running: false, exploded: state.timer.variant === "bomb" } };
      event = makeEvent(state, "timerExpired", { variant: state.timer.variant, answerRevealed: true }, now); break;
    }
  }

  return { state: sessionStateSchema.parse({ ...next, sequence: event.sequence, updatedAt: now.toISOString() }), event };
}
