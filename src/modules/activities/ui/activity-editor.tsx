"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, CircleAlert, ExternalLink, Gamepad2, Layers3, LoaderCircle, Palette, Plus, Save, Settings2, Sparkles, Trash2 } from "lucide-react";
import type { ActivityDraftInput } from "@/modules/activities/domain/activity-schemas";
import { activityContentSchema } from "@/shared/domain/content-blocks";
import { defaultSystemTheme, resolveTheme } from "@/modules/themes/domain/theme-values";
import { gameTemplates, getGameTemplate } from "@/modules/game-templates";
import { GameRenderer } from "@/modules/game-templates/ui/game-renderer";
import { BrandMark } from "@/shared/ui/components/brand-mark";
import { ContentVisualEditor } from "./content-visual-editor";

type SaveState = "Nao salvo" | "Salvando" | "Salvo" | "Erro";
type Tab = "content" | "game" | "appearance";
type EditorPresentation = { id: string; name: string; templateKey: string; gameConfig: Record<string, unknown>; themeOverride: Record<string, unknown>; isDefault: boolean };

function GameConfigEditor({ templateKey, value, onChange }: { templateKey: string; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const base = typeof value.base === "object" && value.base ? value.base as Record<string, unknown> : {};
  const template = typeof value.template === "object" && value.template ? value.template as Record<string, unknown> : {};
  const scoring = typeof base.scoring === "object" && base.scoring ? base.scoring as Record<string, unknown> : {};
  const timer = typeof base.timer === "object" && base.timer ? base.timer as Record<string, unknown> : {};
  const updateBase = (key: string, next: unknown) => onChange({ ...value, base: { ...base, [key]: next } });
  const updateTemplate = (key: string, next: unknown) => onChange({ ...value, template: { ...template, [key]: next } });

  return <section className="game-config-fields">
    <header className="editor-group-heading">
      <span className="editor-group-heading__icon"><Settings2 aria-hidden="true" /></span>
      <div><h3>Regras da partida</h3><p>Defina o ritmo, as equipes e a pontuação desta apresentação.</p></div>
    </header>
    <div className="game-config-grid">
      <label>Equipes<input type="number" min={1} max={8} value={Number(base.teams ?? 1)} onChange={(event) => updateBase("teams", Number(event.target.value))} /></label>
      <label>Pontos por acerto<input type="number" min={0} max={10000} step={10} value={Number(scoring.correct ?? 100)} onChange={(event) => updateBase("scoring", { ...scoring, correct: Number(event.target.value) })} /></label>
      <label className="check"><input type="checkbox" checked={Boolean(base.shuffle)} onChange={(event) => updateBase("shuffle", event.target.checked)} /> Embaralhar itens</label>
      <label className="check"><input type="checkbox" checked={Boolean(base.sound)} onChange={(event) => updateBase("sound", event.target.checked)} /> Sons</label>
      <label className="check"><input type="checkbox" checked={Boolean(timer.enabled)} onChange={(event) => updateBase("timer", { ...timer, enabled: event.target.checked })} /> Usar timer</label>
      {Boolean(timer.enabled) && <label>Segundos<input type="number" min={5} max={600} value={Number(timer.seconds ?? 30)} onChange={(event) => updateBase("timer", { ...timer, seconds: Number(event.target.value) })} /></label>}
    </div>
    {templateKey === "quiz" && <div className="game-config-grid"><label className="check"><input type="checkbox" checked={template.allowMultiple !== false} onChange={(event) => updateTemplate("allowMultiple", event.target.checked)} /> Permitir múltiplas respostas</label><label className="check"><input type="checkbox" checked={template.revealExplanation !== false} onChange={(event) => updateTemplate("revealExplanation", event.target.checked)} /> Mostrar explicação</label></div>}
    {templateKey === "matching" && <label>Modo de combinação<select value={String(template.mode ?? "connect")} onChange={(event) => updateTemplate("mode", event.target.value)}><option value="connect">Conectar pares</option><option value="memory">Jogo da memória</option></select></label>}
    {templateKey === "wheel" && <div className="game-config-grid"><label className="check"><input type="checkbox" checked={Boolean(template.removeAfterSpin)} onChange={(event) => updateTemplate("removeAfterSpin", event.target.checked)} /> Remover depois de sortear</label><label className="check"><input type="checkbox" checked={template.allowRepeat !== false} onChange={(event) => updateTemplate("allowRepeat", event.target.checked)} /> Permitir repetição</label><label className="check"><input type="checkbox" checked={Boolean(template.timerAfterSpin)} onChange={(event) => updateTemplate("timerAfterSpin", event.target.checked)} /> Reiniciar timer após giro</label></div>}
    {templateKey === "group-sort" && <label>Modo de separação<select value={String(template.mode ?? "board")} onChange={(event) => updateTemplate("mode", event.target.value)}><option value="board">Board (arrastar e soltar)</option><option value="one-by-one">Um por vez</option></select></label>}
    {templateKey === "unscramble" && <label>Unidades para ordenar<select value={String(template.tokenMode === "word" ? "token" : template.tokenMode ?? "token")} onChange={(event) => updateTemplate("tokenMode", event.target.value)}><option value="token">Palavras ou segmentos</option><option value="character">Caracteres</option></select></label>}
    {templateKey === "team-grid" && <div className="game-config-grid"><label>Colunas da grade<input type="number" min={2} max={8} value={Number(template.gridColumns ?? 4)} onChange={(event) => updateTemplate("gridColumns", Number(event.target.value))} /></label><label className="check"><input type="checkbox" checked={Boolean(template.bombTimer)} onChange={(event) => updateTemplate("bombTimer", event.target.checked)} /> Usar timer-bomba</label></div>}
  </section>;
}

export function ActivityEditor({ activityId, activitySlug, initialDraft, initialPresentations, initialPublished, allowAdvanced }: {
  activityId: string; activitySlug: string; initialDraft: ActivityDraftInput; initialPresentations: EditorPresentation[]; initialPublished: boolean; allowAdvanced: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [tagsInput, setTagsInput] = useState(initialDraft.tags.join(", "));
  const [presentations, setPresentations] = useState(initialPresentations);
  const [activeId, setActiveId] = useState(initialDraft.defaultPresentationId ?? initialPresentations[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>(initialDraft.content.length ? "content" : "game");
  const [saveState, setSaveState] = useState<SaveState>("Salvo");
  const [published, setPublished] = useState(initialPublished);
  const [actionError, setActionError] = useState("");
  const initialized = useRef(false);
  const active = presentations.find((item) => item.id === activeId) ?? presentations[0];
  const resolvedTheme = useMemo(() => resolveTheme(defaultSystemTheme, active?.themeOverride ?? {}), [active?.themeOverride]);
  const publishableContent = useMemo(() => activityContentSchema.safeParse(draft.content), [draft.content]);

  async function saveNow(nextDraft = draft, nextPresentations = presentations) {
    setSaveState("Salvando");
    try {
      const draftResponse = await fetch(`/api/activities/${activityId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextDraft) });
      const presentationResponses = await Promise.all(nextPresentations.map((item) => fetch(`/api/activities/${activityId}/presentations/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) })));
      if (!draftResponse.ok || presentationResponses.some((response) => !response.ok)) throw new Error();
      setSaveState("Salvo");
      return true;
    } catch { setSaveState("Erro"); return false; }
  }

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    setSaveState("Nao salvo");
    const timer = window.setTimeout(() => { void saveNow(); }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, presentations]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateActive(patch: Partial<EditorPresentation>) {
    setPresentations((items) => items.map((item) => item.id === activeId ? { ...item, ...patch } : item));
  }

  async function addPresentation() {
    const definition = getGameTemplate("quiz");
    const response = await fetch(`/api/activities/${activityId}/presentations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `Apresentação ${presentations.length + 1}`, templateKey: definition.key, gameConfig: definition.defaultConfig, themeOverride: {}, isDefault: false }) });
    if (response.ok) { const created = await response.json() as EditorPresentation; setPresentations((items) => [...items, created]); setActiveId(created.id); }
  }

  async function removeActive() {
    if (!active || presentations.length <= 1) return;
    const response = await fetch(`/api/activities/${activityId}/presentations/${active.id}`, { method: "DELETE" });
    if (response.ok) { const remaining = presentations.filter((item) => item.id !== active.id); setPresentations(remaining); setActiveId(remaining[0]!.id); }
  }

  function makeDefault() {
    if (!active) return;
    setPresentations((items) => items.map((item) => ({ ...item, isDefault: item.id === active.id })));
    setDraft((current) => ({ ...current, defaultPresentationId: active.id }));
  }

  async function publish() {
    setActionError("");
    if (!publishableContent.success) { setActionError("Revise os campos destacados: há conteúdo incompleto antes da publicação."); setTab("content"); return; }
    if (!(await saveNow())) { setActionError("Não foi possível salvar o conteúdo antes de publicar."); return; }
    const response = await fetch(`/api/activities/${activityId}/publish`, { method: "POST" });
    if (response.ok) { setPublished(true); router.refresh(); }
    else { const body = await response.json().catch(() => ({})) as { error?: string }; setActionError(body.error ?? "Não foi possível publicar."); }
  }

  async function unpublish() { if ((await fetch(`/api/activities/${activityId}/publish`, { method: "DELETE" })).ok) setPublished(false); }
  async function removeActivity() { if (!window.confirm("Excluir esta atividade?")) return; if ((await fetch(`/api/activities/${activityId}`, { method: "DELETE" })).ok) router.push("/library"); }

  const saveStateClass = saveState.replace(" ", "-").toLowerCase();

  return <div className="editor-shell">
    <header className="editor-topbar">
      <div className="editor-topbar__identity">
        <BrandMark href="/" />
        <span className="editor-topbar__divider" aria-hidden="true" />
        <div className="editor-topbar__activity"><span>Editando atividade</span><strong>{draft.title || "Atividade sem título"}</strong></div>
      </div>
      <div className="editor-topbar__actions">
        <span className={`save-state save-state--${saveStateClass}`} role="status" aria-live="polite">
          {saveState === "Salvo" ? <Check aria-hidden="true" /> : saveState === "Salvando" ? <LoaderCircle aria-hidden="true" /> : saveState === "Erro" ? <CircleAlert aria-hidden="true" /> : <Save aria-hidden="true" />}{saveState}
        </span>
        <button className="button button--ghost editor-save-button" type="button" onClick={() => void saveNow()}><Save aria-hidden="true" /> Salvar agora</button>
        {published && <Link className="button button--secondary editor-view-button" href={`/activity/${activitySlug}`}><ExternalLink aria-hidden="true" /> Ver atividade</Link>}
        {published && <button className="button button--ghost" type="button" onClick={unpublish}>Despublicar</button>}
        <button className="button editor-publish-button" type="button" onClick={publish}>{published ? "Publicar alterações" : "Publicar"}</button>
        <button className="button button--danger editor-delete-button" type="button" onClick={removeActivity}><Trash2 aria-hidden="true" /> Excluir</button>
      </div>
    </header>

    {actionError && <p className="alert editor-alert" role="alert">{actionError}</p>}

    <div className="editor-workspace">
      <nav className="editor-steps" aria-label="Etapas do editor">
        <button id="editor-tab-game" type="button" aria-label="JOGO" aria-current={tab === "game" ? "step" : undefined} className={tab === "game" ? "is-active" : ""} onClick={() => setTab("game")}>
          <span className="editor-steps__number">01</span><span className="editor-steps__icon"><Gamepad2 aria-hidden="true" /></span><span><strong>Jogo</strong><small>Dinâmica e regras</small></span>
        </button>
        <span className="editor-steps__line" aria-hidden="true" />
        <button id="editor-tab-content" type="button" aria-label="CONTEÚDO" aria-current={tab === "content" ? "step" : undefined} className={tab === "content" ? "is-active" : ""} onClick={() => setTab("content")}>
          <span className="editor-steps__number">02</span><span className="editor-steps__icon"><Layers3 aria-hidden="true" /></span><span><strong>Conteúdo</strong><small>Atividade e perguntas</small></span>
        </button>
        <span className="editor-steps__line" aria-hidden="true" />
        <button id="editor-tab-appearance" type="button" aria-label="APARÊNCIA" aria-current={tab === "appearance" ? "step" : undefined} className={tab === "appearance" ? "is-active" : ""} onClick={() => setTab("appearance")}>
          <span className="editor-steps__number">03</span><span className="editor-steps__icon"><Palette aria-hidden="true" /></span><span><strong>Aparência</strong><small>Cores e estilo</small></span>
        </button>
        <a className="editor-preview-jump" href="#activity-preview">Ver prévia <ChevronRight aria-hidden="true" /></a>
      </nav>

      <div className="editor-grid">
        <main className="editor-panel">
          {tab === "content" && <section id="editor-panel-content" aria-labelledby="editor-tab-content" className="form-stack">
            <div className="editor-step-intro"><span className="eyebrow">Etapa 2 · Conteúdo</span><h1>Construa a experiência</h1><p>Organize as informações da atividade e tudo o que os alunos vão explorar durante o jogo.</p></div>
            <section className="activity-basics">
              <header className="editor-group-heading"><span className="editor-group-heading__icon"><Sparkles aria-hidden="true" /></span><div><h2>Informações da atividade</h2><p>Esses dados ajudam a identificar e encontrar seu conteúdo.</p></div></header>
              <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label>Descrição<textarea rows={3} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value || null })} /></label>
              <div className="activity-basics__row"><label>Tags, separadas por vírgula<input value={tagsInput} onChange={(event) => { const value = event.target.value; setTagsInput(value); setDraft((current) => ({ ...current, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) })); }} /></label><label>Visibilidade<select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as ActivityDraftInput["visibility"] })}><option value="private">Privada</option><option value="unlisted">Não listada</option><option value="public">Pública</option></select></label></div>
            </section>
            <ContentVisualEditor content={draft.content} activeTemplateKey={active?.templateKey ?? "quiz"} allowAdvanced={allowAdvanced} onChange={(content) => setDraft((current) => ({ ...current, content }))} />
          </section>}

          {tab === "game" && active && <section id="editor-panel-game" aria-labelledby="editor-tab-game" className="form-stack">
            <div className="editor-step-intro"><span className="eyebrow">Etapa 1 · Jogo</span><h1>Como você quer jogar?</h1><p>Escolha a dinâmica e ajuste as regras. O conteúdo compatível aparece na próxima etapa.</p></div>
            <label className="game-choice"><span className="game-choice__label"><Gamepad2 aria-hidden="true" /> Tipo de jogo</span><select value={active.templateKey} onChange={(event) => { const definition = getGameTemplate(event.target.value); updateActive({ templateKey: definition.key, name: definition.name, gameConfig: definition.defaultConfig as Record<string, unknown> }); }}>{gameTemplates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select><small>Compatível com: {getGameTemplate(active.templateKey).supportedContentTypes.map((type) => ({ "prompt-answer": "perguntas", pair: "pares", "item-list": "listas", "categorized-item": "categorias", sequence: "palavras ou frases" })[type]).join(" e ")}.</small></label>
            <section className="presentation-settings">
              <header className="editor-group-heading"><span className="editor-group-heading__icon"><Layers3 aria-hidden="true" /></span><div><h2>Apresentação</h2><p>Crie variações do mesmo conteúdo para diferentes dinâmicas.</p></div></header>
              <div className="presentation-row"><label>Apresentação<select value={activeId} onChange={(event) => setActiveId(event.target.value)}>{presentations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="text-button" type="button" onClick={addPresentation}><Plus aria-hidden="true" /> Nova</button><button className="text-button text-button--danger" type="button" onClick={removeActive} disabled={presentations.length <= 1}><Trash2 aria-hidden="true" /> Remover</button></div>
              <label>Nome da apresentação<input value={active.name} onChange={(event) => updateActive({ name: event.target.value })} /></label>
              <button className="button button--secondary presentation-default-button" type="button" onClick={makeDefault} disabled={active.isDefault}>{active.isDefault ? <><Check aria-hidden="true" /> Apresentação padrão</> : "Definir como padrão"}</button>
            </section>
            <GameConfigEditor templateKey={active.templateKey} value={active.gameConfig} onChange={(gameConfig) => updateActive({ gameConfig })} />
            <button className="button editor-next-step" type="button" onClick={() => setTab("content")}>Continuar para conteúdo <ChevronRight aria-hidden="true" /></button>
          </section>}

          {tab === "appearance" && active && <section id="editor-panel-appearance" aria-labelledby="editor-tab-appearance" className="form-stack">
            <div className="editor-step-intro"><span className="eyebrow">Etapa 3 · Aparência</span><h1>Dê identidade ao jogo</h1><p>Personalize cores, tipografia e movimento enquanto acompanha cada ajuste na prévia.</p></div>
            <div className="appearance-grid">
              <section className="appearance-group appearance-group--colors"><header className="editor-group-heading"><span className="editor-group-heading__icon"><Palette aria-hidden="true" /></span><div><h2>Paleta</h2><p>Cores da experiência.</p></div></header><div className="appearance-group__fields"><label>Cor principal<input type="color" value={String(active.themeOverride.primaryColor ?? defaultSystemTheme.primaryColor)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, primaryColor: event.target.value } })} /></label><label>Cor secundária<input type="color" value={String(active.themeOverride.secondaryColor ?? defaultSystemTheme.secondaryColor)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, secondaryColor: event.target.value } })} /></label><label>Cor dos cards<input type="color" value={String(active.themeOverride.surfaceColor ?? defaultSystemTheme.surfaceColor)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, surfaceColor: event.target.value } })} /></label><label>Cor do texto<input type="color" value={String(active.themeOverride.textColor ?? defaultSystemTheme.textColor)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, textColor: event.target.value } })} /></label></div></section>
              <section className="appearance-group"><header className="editor-group-heading"><span className="editor-group-heading__icon"><Sparkles aria-hidden="true" /></span><div><h2>Plano de fundo</h2><p>Clima visual da apresentação.</p></div></header><div className="appearance-group__fields"><label>Gradiente<select value={String(active.themeOverride.gradient ?? "")} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, gradient: event.target.value || null } })}><option value="">Sem gradiente</option><option value="sunset">Pôr do sol</option><option value="ocean">Oceano</option><option value="forest">Floresta</option></select></label><label className="appearance-wide-field">Imagem de fundo (URL)<input type="url" value={String(active.themeOverride.backgroundImage ?? "")} placeholder="https://…" onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, backgroundImage: event.target.value || null } })} /></label></div></section>
              <section className="appearance-group appearance-group--wide"><header className="editor-group-heading"><span className="editor-group-heading__icon"><Settings2 aria-hidden="true" /></span><div><h2>Forma e movimento</h2><p>Ajuste a leitura e o acabamento da interface.</p></div></header><div className="appearance-group__fields"><label>Arredondamento<input type="range" min={0} max={32} value={Number(active.themeOverride.borderRadius ?? defaultSystemTheme.borderRadius)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, borderRadius: Number(event.target.value) } })} /></label><label>Fonte<select value={String(active.themeOverride.fontFamily ?? defaultSystemTheme.fontFamily)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, fontFamily: event.target.value } })}><option value="sans">Sem serifa</option><option value="serif">Serifada</option><option value="rounded">Arredondada</option></select></label><label>Escala da fonte<input type="range" min={0.8} max={1.4} step={0.1} value={Number(active.themeOverride.fontScale ?? defaultSystemTheme.fontScale)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, fontScale: Number(event.target.value) } })} /></label><label>Cards<select value={String(active.themeOverride.cardStyle ?? defaultSystemTheme.cardStyle)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, cardStyle: event.target.value } })}><option value="flat">Plano</option><option value="bordered">Com borda</option><option value="elevated">Elevado</option></select></label><label>Botões<select value={String(active.themeOverride.buttonStyle ?? defaultSystemTheme.buttonStyle)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, buttonStyle: event.target.value } })}><option value="solid">Sólido</option><option value="outline">Contorno</option><option value="soft">Suave</option></select></label><label>Animação<select value={String(active.themeOverride.animationIntensity ?? defaultSystemTheme.animationIntensity)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, animationIntensity: event.target.value } })}><option value="none">Nenhuma</option><option value="low">Suave</option><option value="full">Completa</option></select></label><label className="check"><input type="checkbox" checked={Boolean(active.themeOverride.sounds ?? defaultSystemTheme.sounds)} onChange={(event) => updateActive({ themeOverride: { ...active.themeOverride, sounds: event.target.checked } })} /> Sons</label></div></section>
            </div>
          </section>}
        </main>

        <aside id="activity-preview" className="preview-panel" aria-label="Prévia da atividade">
          <div className="preview-heading"><div><span className="preview-heading__eyebrow">Prévia ao vivo</span><h2>{active?.name ?? "Apresentação"}</h2></div><span className="preview-live"><i aria-hidden="true" /> Sincronizada</span></div>
          <div className="preview-stage">
            <div className="preview-stage__chrome"><span><i /><i /><i /></span><small>Mesma experiência da sessão</small></div>
            {active && <GameRenderer mode="preview" templateKey={active.templateKey} content={publishableContent.success ? publishableContent.data : []} config={active.gameConfig} theme={resolvedTheme} />}
          </div>
          {!publishableContent.success && draft.content.length > 0 && <p className="preview-hint">Continue preenchendo. A prévia completa aparece quando os campos obrigatórios estiverem prontos.</p>}
          <p className="preview-caption">As alterações aparecem aqui enquanto são salvas automaticamente.</p>
        </aside>
      </div>
    </div>
  </div>;
}
