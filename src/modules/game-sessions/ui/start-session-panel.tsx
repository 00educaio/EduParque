"use client";

import Image from "next/image";
import { Clock3, ImagePlus, Play, Trash2, Users, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SessionState } from "@/modules/game-sessions/domain/session";
import { configRecord } from "@/modules/game-templates/ui/template-runtime";
import { Button, Checkbox, Field, Input, Select } from "@/shared/ui/components";
import { unlockSessionAudio } from "./session-audio";

const colors = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#c2410c", "#4338ca"];
const TEAM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_TEAM_IMAGE_BYTES = 5 * 1024 * 1024;

type SelectedTeamImage = { file: File; previewUrl: string };

async function validateTeamImage(file: File) {
  if (!TEAM_IMAGE_TYPES.has(file.type)) throw new Error("Use uma imagem PNG, JPG/JPEG ou WebP.");
  if (file.size > MAX_TEAM_IMAGE_BYTES) throw new Error("A imagem pode ter no máximo 5 MiB.");
  if (!file.size) throw new Error("A imagem está vazia.");
  if ("createImageBitmap" in window) {
    try { const bitmap = await createImageBitmap(file); bitmap.close(); }
    catch { throw new Error("O arquivo selecionado não é uma imagem válida."); }
  }
}

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
  const [teamImages, setTeamImages] = useState<Array<SelectedTeamImage | null>>(() => Array.from({ length: 8 }, () => null));
  const [teamImageErrors, setTeamImageErrors] = useState<string[]>(() => Array.from({ length: 8 }, () => ""));
  const imageUrlsRef = useRef<string[]>([]);
  const [createdSession, setCreatedSession] = useState<{ id: string; state: SessionState } | null>(null);
  const [timerMode, setTimerMode] = useState<"off" | "item" | "question" | "game">(configuredTimer ? (["quiz", "team-grid"].includes(templateKey) ? "question" : "item") : "off");
  const [duration, setDuration] = useState(typeof timerConfig.seconds === "number" ? timerConfig.seconds : 30);
  const [bomb, setBomb] = useState(teamGridBomb);
  const [sound, setSound] = useState(base.sound !== false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function selectTeamImage(index: number, file?: File) {
    if (!file) return;
    try {
      await validateTeamImage(file);
      const previewUrl = URL.createObjectURL(file);
      imageUrlsRef.current.push(previewUrl);
      setTeamImages((current) => current.map((image, itemIndex) => {
        if (itemIndex !== index) return image;
        if (image) URL.revokeObjectURL(image.previewUrl);
        return { file, previewUrl };
      }));
      setTeamImageErrors((current) => current.map((message, itemIndex) => itemIndex === index ? "" : message));
    } catch (selectionError) {
      setTeamImageErrors((current) => current.map((message, itemIndex) => itemIndex === index ? (selectionError instanceof Error ? selectionError.message : "Imagem inválida.") : message));
    }
  }

  function removeTeamImage(index: number) {
    setTeamImages((current) => current.map((image, itemIndex) => {
      if (itemIndex !== index) return image;
      if (image) URL.revokeObjectURL(image.previewUrl);
      return null;
    }));
    setTeamImageErrors((current) => current.map((message, itemIndex) => itemIndex === index ? "" : message));
  }

  async function create() {
    setPending(true); setError("");
    await unlockSessionAudio();
    let target = createdSession;
    if (!target) {
      const teams = Array.from({ length: teamCount }, (_, index) => ({ name: teamNames[index]!.trim() || `Equipe ${index + 1}`, color: colors[index]! }));
      const response = await fetch("/api/game-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId, presentationId, teams, timer: { mode: timerMode, variant: bomb ? "bomb" : "standard", durationSeconds: duration, soundEnabled: sound } }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; setError(result.error ?? "Não foi possível criar a sessão."); setPending(false); return; }
      target = await response.json() as { id: string; state: SessionState };
      setCreatedSession(target);
    }
    const uploads = teamImages.slice(0, target.state.teams.length).map(async (image, index) => {
      const endpoint = `/api/game-sessions/${target.id}/team-images/${target.state.teams[index]!.id}`;
      if (!image) {
        const response = await fetch(endpoint, { method: "DELETE" });
        if (!response.ok) throw new Error(`Não foi possível remover a imagem da equipe ${index + 1}.`);
        return;
      }
      const preparedResponse = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mimeType: image.file.type, byteSize: image.file.size }) });
      if (preparedResponse.status === 501) {
        const data = new FormData(); data.set("file", image.file);
        const localResponse = await fetch(endpoint, { method: "POST", body: data });
        if (!localResponse.ok) { const result = await localResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? `Não foi possível enviar a imagem da equipe ${index + 1}.`); }
        return;
      }
      if (!preparedResponse.ok) { const result = await preparedResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? `Não foi possível autorizar a imagem da equipe ${index + 1}.`); }
      const prepared = await preparedResponse.json() as { id: string; uploadUrl: string; uploadHeaders: Record<string, string> };
      const uploadedResponse = await fetch(prepared.uploadUrl, { method: "PUT", headers: prepared.uploadHeaders, body: image.file });
      if (!uploadedResponse.ok) throw new Error(`O bucket recusou a imagem da equipe ${index + 1}. Confira o CORS.`);
      const completedResponse = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: prepared.id }) });
      if (!completedResponse.ok) { const result = await completedResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? `Não foi possível validar a imagem da equipe ${index + 1}.`); }
    });
    try { await Promise.all(uploads); router.push(`/session/${target.id}`); }
    catch (uploadError) { setError(`${uploadError instanceof Error ? uploadError.message : "Falha ao enviar uma imagem."} A sessão foi criada; tente novamente.`); setPending(false); }
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
      <Field id="session-team-count" label="Quantidade de equipes"><Select disabled={Boolean(createdSession)} value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</Select></Field>
      <Field id="session-timer-mode" label="Timer"><Select disabled={Boolean(createdSession)} value={timerMode} onChange={(event) => setTimerMode(event.target.value as typeof timerMode)}><option value="off">Desativado</option><option value="item">Por item</option><option value="question">Por questão</option><option value="game">Partida inteira</option></Select></Field>
      {timerMode !== "off" && <Field id="session-duration" label="Duração em segundos"><Input disabled={Boolean(createdSession)} type="number" min={5} max={3600} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></Field>}
    </div>
    <div className="session-setup__toggles">
      {timerMode !== "off" && <label><Checkbox disabled={Boolean(createdSession)} checked={bomb} onChange={(event) => setBomb(event.target.checked)} /><span><strong>Timer-bomba</strong><small>Use uma contagem regressiva mais expressiva.</small></span></label>}
      <label><Checkbox disabled={Boolean(createdSession)} checked={sound} onChange={(event) => setSound(event.target.checked)} /><span><strong>Sons da sessão</strong><small>Ative efeitos sonoros durante a partida.</small></span></label>
    </div>
    <fieldset className="team-name-fields"><legend>Equipes</legend>{teamNames.slice(0, teamCount).map((name, index) => <div className="team-setup-card" key={index} style={{ "--team-color": colors[index] } as React.CSSProperties}><div className="team-setup-card__avatar">{teamImages[index] ? <Image src={teamImages[index]!.previewUrl} alt={`Prévia da equipe ${index + 1}`} fill sizes="72px" unoptimized /> : <span>{name.trim().charAt(0).toLocaleUpperCase("pt-BR") || index + 1}</span>}</div><Field id={`session-team-${index}`} label={`Equipe ${index + 1}`}><Input maxLength={40} disabled={Boolean(createdSession)} value={name} onChange={(event) => setTeamNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></Field><div className="team-setup-card__image-actions"><label className="button button--secondary" htmlFor={`session-team-image-${index}`}><ImagePlus aria-hidden="true" />{teamImages[index] ? "Substituir" : "Adicionar imagem"}<input id={`session-team-image-${index}`} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={(event) => { void selectTeamImage(index, event.target.files?.[0]); event.target.value = ""; }} /></label>{teamImages[index] && <button className="button button--ghost" type="button" disabled={pending} onClick={() => removeTeamImage(index)}><Trash2 aria-hidden="true" /> Remover</button>}</div>{teamImageErrors[index] && <p className="field-error" role="alert">{teamImageErrors[index]}</p>}</div>)}</fieldset>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="session-setup__actions"><Button size="lg" loading={pending} loadingText="Preparando…" onClick={() => void create()}>{createdSession ? "Tentar envio novamente" : "Criar sessão"}</Button><Button variant="ghost" onClick={() => setOpen(false)} disabled={Boolean(createdSession)}>Cancelar</Button></div>
  </section>;
}
