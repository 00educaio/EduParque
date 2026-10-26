"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Flag,
  Layers3,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trophy,
  Users,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionCommand, SessionState } from "@/modules/game-sessions/domain/session";
import { GameRenderer } from "@/modules/game-templates/ui/game-renderer";
import type { ThemeValues } from "@/modules/themes/domain/theme-values";
import type { ActivityContent } from "@/shared/domain/content-blocks";
import { BrandMark } from "@/shared/ui/components";
import { SessionGameHelp } from "@/modules/help/session-game-help";
import { SessionTimer } from "./session-timer";
import { playSessionSound, unlockSessionAudio } from "./session-audio";
import { TeamAvatar } from "./team-avatar";

function TeamNameEditor({ teamId, name, disabled, rename }: { teamId: string; name: string; disabled: boolean; rename: (teamId: string, name: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (!editing) {
    return (
      <div className="team-score__name">
        <h2 title={name}>{name}</h2>
        <button
          type="button"
          className="team-score__rename"
          disabled={disabled}
          onClick={() => { setValue(name); setEditing(true); }}
          aria-label={`Renomear ${name}`}
        >
          <Pencil aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form
      className="team-score__name-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextName = value.trim();
        if (nextName && await rename(teamId, nextName)) setEditing(false);
      }}
    >
      <input autoFocus maxLength={40} value={value} onChange={(event) => setValue(event.target.value)} aria-label="Nome da equipe" />
      <button type="submit" disabled={disabled || !value.trim()}>Salvar</button>
      <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
    </form>
  );
}

function SessionLobby({ sessionId, title, state, teamImageTeamIds, canControl, pending, start }: { sessionId: string; title: string; state: SessionState; teamImageTeamIds: ReadonlySet<string>; canControl: boolean; pending: boolean; start: () => Promise<void> }) {
  return (
    <main className="session-shell session-lobby">
      <div className="session-lobby__shape session-lobby__shape--circle" aria-hidden="true" />
      <div className="session-lobby__shape session-lobby__shape--arc" aria-hidden="true" />
      <div className="session-lobby__shape session-lobby__shape--star" aria-hidden="true" />

      <header className="session-lobby__topbar">
        <BrandMark />
        <div className="session-lobby__topbar-actions">
          {canControl && <SessionGameHelp templateKey={state.template.sourceTemplateKey} />}
          <Link className="session-lobby__back" href="/library"><ArrowLeft aria-hidden="true" /> Voltar à biblioteca</Link>
        </div>
      </header>

      <section className="session-lobby__content" aria-labelledby="session-lobby-title">
        <div className="session-lobby__intro">
          <span className="session-kicker"><span aria-hidden="true" /> Sessão preparada</span>
          <h1 id="session-lobby-title">{title}</h1>
          <p>Tudo pronto para começar. Confira as equipes e abra a atividade para a turma.</p>

          <dl className="session-lobby__summary">
            <div><dt><Users aria-hidden="true" /> Equipes</dt><dd>{state.teams.length}</dd></div>
            <div><dt><Layers3 aria-hidden="true" /> Etapas</dt><dd>{state.totalItems}</dd></div>
          </dl>

          {canControl ? (
            <button className="session-lobby__start" disabled={pending} onClick={() => void start()}>
              <Play aria-hidden="true" fill="currentColor" />
              {pending ? "Iniciando…" : "Iniciar sessão"}
            </button>
          ) : (
            <div className="session-lobby__waiting" role="status">
              <span className="session-lobby__pulse" aria-hidden="true" />
              <span><strong>Aguardando o apresentador</strong>Esta tela começa automaticamente quando a sessão for iniciada.</span>
            </div>
          )}
        </div>

        <aside className="session-lobby__teams" aria-label="Equipes da sessão">
          <div className="session-lobby__teams-heading">
            <span>Participantes</span>
            <strong>{state.teams.length === 1 ? "1 equipe pronta" : `${state.teams.length} equipes prontas`}</strong>
          </div>
          <ol>
            {state.teams.map((team, index) => (
              <li key={team.id} style={{ "--team-color": team.color } as React.CSSProperties}>
                <span className="session-lobby__team-number">{String(index + 1).padStart(2, "0")}</span>
                <TeamAvatar className="session-lobby__team-avatar" sessionId={sessionId} teamId={team.id} teamName={team.name} color={team.color} hasImage={teamImageTeamIds.has(team.id)} />
                <strong>{team.name}</strong>
                {index === 0 && <small>Começa</small>}
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}

export function GameSessionShell({ sessionId, title, initialState, initialTeamImageTeamIds, canControl, content, config, theme }: { sessionId: string; title: string; initialState: SessionState; initialTeamImageTeamIds: string[]; canControl: boolean; content: ActivityContent; config: Record<string, unknown>; theme: ThemeValues }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [teamImageTeamIds, setTeamImageTeamIds] = useState(() => new Set(initialTeamImageTeamIds));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const pollEtag = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/game-sessions/${sessionId}`, {
      headers: pollEtag.current ? { "If-None-Match": pollEtag.current } : undefined,
      cache: "no-store",
    });
    if (response.status === 304) return;
    if (response.ok) {
      pollEtag.current = response.headers.get("ETag");
      const result = await response.json() as { state: SessionState; teamImageTeamIds: string[] };
      setState(result.state);
      setTeamImageTeamIds(new Set(result.teamImageTeamIds));
    }
  }, [sessionId]);

  useEffect(() => {
    if (canControl || state.status === "finished") return;
    let cancelled = false;
    let timer: number | undefined;
    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => void poll(), document.hidden ? 15_000 : 2_500);
    };
    const poll = async () => { await refresh(); schedule(); };
    const visibilityChanged = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (document.hidden) schedule();
      else void poll();
    };
    schedule();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [canControl, refresh, state.status]);

  const send = useCallback(async (command: SessionCommand) => {
    if (!canControl) return undefined;
    setPending(true);
    setError("");
    const response = await fetch(`/api/game-sessions/${sessionId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...command, expectedSequence: state.sequence }),
    });
    if (response.ok) {
      const result = await response.json() as { state: SessionState };
      setState(result.state);
      setPending(false);
      if (state.timer.soundEnabled) {
        if (command.type === "awardPoints" || (command.type === "updateTemplateState" && command.award)) playSessionSound("success");
        else if (command.type === "removePoints") playSessionSound("error");
        else if (command.type === "next" || command.type === "reveal") playSessionSound("move");
      }
      return result.state;
    }
    const result = await response.json().catch(() => ({})) as { error?: string };
    setError(result.error ?? "Comando não executado.");
    if (response.status === 409) await refresh();
    setPending(false);
    return undefined;
  }, [canControl, refresh, sessionId, state.sequence, state.timer.soundEnabled]);

  const renameTeam = useCallback(async (teamId: string, name: string) => Boolean(await send({ type: "renameTeam", teamId, name })), [send]);
  const syncExpiredTimer = useCallback(() => void refresh(), [refresh]);
  const disabled = pending || !canControl || state.status !== "active";
  const memoryPhase = typeof state.template.state.memoryPhase === "string" ? state.template.state.memoryPhase : null;
  const memoryAttemptInProgress = memoryPhase === "WAITING_SECOND_CARD"
    || memoryPhase === "CHECKING_MATCH"
    || memoryPhase === "SHOWING_MISMATCH"
    || memoryPhase === "TURN_TRANSITION";
  const progress = ((state.currentItemIndex + 1) / state.totalItems) * 100;
  const activeTeam = state.teams[state.activeTeamIndex]!;
  const ranking = useMemo(() => [...state.teams].sort((a, b) => b.score - a.score), [state.teams]);

  if (state.status === "created") {
    return (
      <SessionLobby
        sessionId={sessionId}
        title={title}
        state={state}
        teamImageTeamIds={teamImageTeamIds}
        canControl={canControl}
        pending={pending}
        start={async () => { await unlockSessionAudio(); await send({ type: "startSession" }); }}
      />
    );
  }

  const statusLabel = state.status === "finished" ? "Sessão finalizada" : state.status === "paused" ? "Sessão pausada" : "Sessão ativa";

  return (
    <main className={`session-shell session-live session-live--${state.status}`}>
      <header className="session-header">
        <div className="session-header__identity">
          <span className={`session-status session-status--${state.status}`}><span aria-hidden="true" />{statusLabel}</span>
          <h1 title={title}>{title}</h1>
          {!canControl && <span className="session-viewer-badge"><Eye aria-hidden="true" /> Modo espectador</span>}
        </div>
        <div className="session-header__meta">
          <div><span>Progresso da atividade</span><strong>Etapa {state.currentItemIndex + 1} de {state.totalItems}</strong></div>
          <div className="session-progress" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={1} aria-valuemax={state.totalItems} aria-valuenow={state.currentItemIndex + 1}><i style={{ width: `${progress}%` }} /></div>
          {state.timer.soundEnabled && canControl && (
            <button className="session-sound-test" type="button" onClick={async () => { await unlockSessionAudio(); playSessionSound("tick"); }}>
              <Volume2 aria-hidden="true" /> Testar som
            </button>
          )}
          {canControl && <SessionGameHelp templateKey={state.template.sourceTemplateKey} />}
        </div>
      </header>

      {error && <p className="session-alert" role="alert"><X aria-hidden="true" />{error}</p>}

      <section className={`scoreboard ${state.teams.length > 4 ? "scoreboard--dense" : ""}`} aria-label="Placar">
        {state.teams.map((team, index) => {
          const isActive = index === state.activeTeamIndex && state.status !== "finished";
          return (
            <article key={team.id} className={`team-score ${isActive ? "team-score--active" : ""}`} style={{ "--team-color": team.color } as React.CSSProperties}>
              <span className="team-score__status">{isActive ? "Vez da equipe" : "Equipe"}</span>
              <div className="team-score__body">
                <div className="team-score__identity"><TeamAvatar sessionId={sessionId} teamId={team.id} teamName={team.name} color={team.color} hasImage={teamImageTeamIds.has(team.id)} />{canControl && state.status !== "finished" ? <TeamNameEditor teamId={team.id} name={team.name} disabled={pending} rename={renameTeam} /> : <h2 title={team.name}>{team.name}</h2>}</div>
                <span className="team-score__points"><strong aria-label={`${team.score} pontos`}>{team.score}</strong><small>pts</small></span>
              </div>
              {canControl && state.status !== "finished" && (
                <div className="team-score__controls" aria-label={`Ajustar pontos de ${team.name}`}>
                  <button disabled={pending} aria-label={`Remover pontos de ${team.name}`} onClick={() => send({ type: "removePoints", teamId: team.id, points: state.scoring.defaultPoints })}>−</button>
                  <button disabled={pending} aria-label={`Adicionar pontos a ${team.name}`} onClick={() => send({ type: "awardPoints", teamId: team.id, points: state.scoring.defaultPoints })}>+</button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {state.status === "finished" ? (
        <section className="session-finished" aria-labelledby="session-result-title">
          <div className="session-finished__hero">
            <span className="session-finished__icon"><Trophy aria-hidden="true" /></span>
            <span className="session-kicker">Resultado final</span>
            <h2 id="session-result-title">{ranking[0]!.name}</h2>
            <p>lidera a sessão com <strong>{ranking[0]!.score} pontos</strong></p>
          </div>
          <ol className="session-ranking" aria-label="Classificação final">
            {ranking.map((team, index) => (
              <li key={team.id} style={{ "--team-color": team.color } as React.CSSProperties}>
                <span>{index + 1}º</span><TeamAvatar sessionId={sessionId} teamId={team.id} teamName={team.name} color={team.color} hasImage={teamImageTeamIds.has(team.id)} /><strong>{team.name}</strong><b>{team.score} pts</b>
              </li>
            ))}
          </ol>
          <div className="session-finished__actions">
            {canControl && <button className="button button--secondary" disabled={pending || !state.undoStack.length} onClick={() => send({ type: "undo" })}><RotateCcw aria-hidden="true" /> Desfazer finalização</button>}
            <button className="button" type="button" onClick={async () => { if (canControl) await fetch(`/api/game-sessions/${sessionId}/team-images`, { method: "DELETE" }); router.push("/library"); }}>Encerrar sessão <ArrowRight aria-hidden="true" /></button>
          </div>
        </section>
      ) : (
        <>
          <div className={`session-stage ${state.timer.variant === "bomb" && state.timer.mode !== "off" ? "session-stage--bomb" : ""}`}>
            <div className="session-game-stage">
              {state.status === "paused" && (
                <div className="session-paused-banner" role="status"><Pause aria-hidden="true" fill="currentColor" /><span><strong>Atividade pausada</strong>O conteúdo está bloqueado até a sessão continuar.</span></div>
              )}
              <GameRenderer mode="session" templateKey={state.template.sourceTemplateKey} content={content} config={config} theme={theme} sessionId={sessionId} state={state} disabled={disabled} send={send} />
            </div>
            <aside className="session-side-panel" aria-label="Estado da rodada">
              <div className="session-turn-card" style={{ "--team-color": activeTeam.color } as React.CSSProperties}>
                <TeamAvatar className="session-turn-card__avatar" sessionId={sessionId} teamId={activeTeam.id} teamName={activeTeam.name} color={activeTeam.color} hasImage={teamImageTeamIds.has(activeTeam.id)} />
                <span>Agora é a vez de</span>
                <strong>{activeTeam.name}</strong>
                <small>{activeTeam.score} pontos no placar</small>
              </div>
              <SessionTimer timer={state.timer} onExpire={syncExpiredTimer} />
              <dl className="session-facts">
                <div><dt><Layers3 aria-hidden="true" /> Etapa</dt><dd>{state.currentItemIndex + 1} / {state.totalItems}</dd></div>
                <div><dt><CheckCircle2 aria-hidden="true" /> Resposta</dt><dd>{state.revealed ? "Revelada" : "Oculta"}</dd></div>
              </dl>
            </aside>
          </div>

          {canControl ? (
            <footer className="session-controls" aria-label="Controles da sessão">
              <div className="session-controls__group session-controls__group--history">
                <button className="button button--ghost" disabled={pending || memoryAttemptInProgress || !state.undoStack.length} onClick={() => send({ type: "undo" })}><RotateCcw aria-hidden="true" /> Desfazer</button>
                {state.status === "paused" ? (
                  <button className="button button--secondary" disabled={pending} onClick={() => send({ type: "resume" })}><Play aria-hidden="true" fill="currentColor" /> Retomar</button>
                ) : (
                  <button className="button button--secondary" disabled={pending} onClick={() => send({ type: "pause" })}><Pause aria-hidden="true" fill="currentColor" /> Pausar</button>
                )}
              </div>
              <div className="session-controls__group session-controls__group--progression">
                <button className="button button--secondary" disabled={disabled || memoryAttemptInProgress || state.revealed} onClick={() => send({ type: "reveal" })}><Eye aria-hidden="true" /> {state.revealed ? "Resposta revelada" : "Revelar resposta"}</button>
                <button className="button session-controls__next" disabled={disabled || memoryAttemptInProgress} onClick={() => send({ type: "next" })}>Próxima etapa <ArrowRight aria-hidden="true" /></button>
                <button className="button button--danger" disabled={pending} onClick={() => send({ type: "finish" })}><Flag aria-hidden="true" /> Finalizar</button>
              </div>
            </footer>
          ) : (
            <footer className="session-spectator-note" role="status"><Eye aria-hidden="true" /><span><strong>Você está acompanhando como espectador</strong>As ações e o placar são atualizados pelo apresentador.</span></footer>
          )}
        </>
      )}
    </main>
  );
}
