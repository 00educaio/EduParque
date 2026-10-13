"use client";

import type { SessionCommand, SessionState } from "@/modules/game-sessions/domain/session";

export function MockTemplate({ state, disabled, send }: { state: SessionState; disabled: boolean; send: (command: SessionCommand) => Promise<SessionState | undefined> }) {
  const completed = typeof state.template.state.completed === "number" ? state.template.state.completed : 0;
  const activeTeam = state.teams[state.activeTeamIndex]!;
  return <section className="mock-template" aria-label="Template de validação do motor"><span className="eyebrow">Mock template · {state.template.sourceTemplateKey}</span><h2>Etapa {state.currentItemIndex + 1}</h2><p>Este módulo provisório valida o motor sem assumir mecânicas de Quiz, Matching ou qualquer outro jogo real.</p><div className="mock-template__state"><span>Estado opaco do template</span><strong>{completed} ações registradas</strong></div><div className="inline-actions"><button className="button" disabled={disabled} onClick={() => send({ type: "awardPoints", teamId: activeTeam.id, suggestedPoints: state.scoring.defaultPoints })}>Acerto automático (+{state.scoring.defaultPoints})</button><button className="button button--secondary" disabled={disabled} onClick={() => send({ type: "updateTemplateState", state: { ...state.template.state, completed: completed + 1 } })}>Registrar ação mock</button></div></section>;
}
