"use client";

import { Clock3, Play, Users, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { configRecord } from "@/modules/game-templates/ui/template-runtime";
import { Button, Checkbox, Field, Input, Select } from "@/shared/ui/components";
import { unlockSessionAudio } from "./session-audio";

const colors = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#c2410c", "#4338ca"];

export function StartSessionPanel({ activityId, presentationId, templateKey, gameConfig }: { activityId: string; presentationId: string; templateKey: string; gameConfig: Record<string, unknown>; authenticated?: boolean }) {
  const router = useRouter();
  const base = configRecord(gameConfig.base);
  const timerConfig = configRecord(base.timer);
  const templateConfig = configRecord(gameConfig.template);
  const teamGridBomb = templateKey === "team-grid" && templateConfig.bombTimer === true;
  const configuredTimer = timerConfig.enabled === true || (templateKey === "wheel" && templateConfig.timerAfterSpin === true) || teamGridBomb;
  const [open, setOpen] = useState(false);
  const [teamCount, setTeamCount] = useState(typeof base.teams === "number" ? base.teams : 2);
  const [teamNames, setTeamNames] = useState(() => Array.from({ length: 8 }, (_, index) => `Equipe ${index + 1}`));
  const [timerMode, setTimerMode] = useState<"off" | "item" | "question" | "game">(configuredTimer ? (["quiz", "team-grid"].includes(templateKey) ? "question" : "item") : "off");
  const [duration, setDuration] = useState(typeof timerConfig.seconds === "number" ? timerConfig.seconds : 30);
  const [bomb, setBomb] = useState(teamGridBomb);
  const [sound, setSound] = useState(base.sound !== false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setPending(true); setError("");
    await unlockSessionAudio();
    const teams = Array.from({ length: teamCount }, (_, index) => ({ name: teamNames[index]!.trim() || `Equipe ${index + 1}`, color: colors[index]! }));
    const response = await fetch("/api/game-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId, presentationId, teams, timer: { mode: timerMode, variant: bomb ? "bomb" : "standard", durationSeconds: duration, soundEnabled: sound } }) });
    if (response.ok) { const result = await response.json() as { id: string }; router.push(`/session/${result.id}`); return; }
    const result = await response.json().catch(() => ({})) as { error?: string }; setError(result.error ?? "Não foi possível criar a sessão."); setPending(false);
  }

  if (!open) return <section className="session-setup session-setup--closed" id="start-session">
    <div className="session-setup__summary">
      <div><Users aria-hidden="true" /><span><strong>{teamCount} {teamCount === 1 ? "equipe" : "equipes"}</strong><small>Nomes personalizáveis</small></span></div>
      <div><Clock3 aria-hidden="true" /><span><strong>{configuredTimer ? `${duration} segundos` : "Sem timer"}</strong><small>Você pode ajustar</small></span></div>
      <div><Volume2 aria-hidden="true" /><span><strong>{sound ? "Sons ligados" : "Sons desligados"}</strong><small>Controle da sessão</small></span></div>
    </div>
    <p>Defina as equipes e os recursos da partida antes de abrir a tela da sessão.</p>
    <Button size="lg" className="session-setup__open" onClick={() => setOpen(true)}><Play aria-hidden="true" /> Iniciar sessão</Button>
  </section>;

  return <section className="session-setup" id="start-session">
    <header className="session-setup__header"><span className="eyebrow">Configuração da sessão</span><h3>Como a turma vai jogar?</h3><p>Ajuste os recursos desta partida. A atividade publicada não será alterada.</p></header>
    <div className="session-setup__grid">
      <Field id="session-team-count" label="Quantidade de equipes"><Select value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</Select></Field>
      <Field id="session-timer-mode" label="Timer"><Select value={timerMode} onChange={(event) => setTimerMode(event.target.value as typeof timerMode)}><option value="off">Desativado</option><option value="item">Por item</option><option value="question">Por questão</option><option value="game">Partida inteira</option></Select></Field>
      {timerMode !== "off" && <Field id="session-duration" label="Duração em segundos"><Input type="number" min={5} max={3600} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></Field>}
    </div>
    <div className="session-setup__toggles">
      {timerMode !== "off" && <label><Checkbox checked={bomb} onChange={(event) => setBomb(event.target.checked)} /><span><strong>Timer-bomba</strong><small>Use uma contagem regressiva mais expressiva.</small></span></label>}
      <label><Checkbox checked={sound} onChange={(event) => setSound(event.target.checked)} /><span><strong>Sons da sessão</strong><small>Ative efeitos sonoros durante a partida.</small></span></label>
    </div>
    <fieldset className="team-name-fields"><legend>Nomes das equipes</legend>{teamNames.slice(0, teamCount).map((name, index) => <Field id={`session-team-${index}`} label={`Equipe ${index + 1}`} key={index}><Input maxLength={40} value={name} onChange={(event) => setTeamNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></Field>)}</fieldset>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="session-setup__actions"><Button size="lg" loading={pending} loadingText="Preparando…" onClick={() => void create()}>Criar sessão</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
  </section>;
}
