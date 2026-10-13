"use client";

import { Eye, Play, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActivityRevisionSnapshot } from "@/modules/activities/domain/activity-schemas";
import { resolveTheme } from "@/modules/themes/domain/theme-values";
import { GameRenderer } from "@/modules/game-templates/ui/game-renderer";
import { LibraryActions } from "./library-actions";
import { StartSessionPanel } from "@/modules/game-sessions/ui/start-session-panel";

export function PublicActivity({ snapshot, activityId, authenticated, initialFavorite }: { snapshot: ActivityRevisionSnapshot; activityId: string; authenticated: boolean; initialFavorite: boolean }) {
  const [selectedId, setSelectedId] = useState(snapshot.defaultPresentationId);
  const selected = snapshot.presentations.find((item) => item.id === selectedId) ?? snapshot.presentations[0]!;
  const theme = useMemo(() => resolveTheme(snapshot.resolvedTheme, selected.themeOverride), [snapshot.resolvedTheme, selected.themeOverride]);
  const presentationCount = snapshot.presentations.length;

  return <article className="published-activity">
    <header className="activity-hero">
      <div className="activity-hero__content">
        <span className="activity-hero__eyebrow"><Sparkles aria-hidden="true" /> Atividade publicada</span>
        <h1>{snapshot.title}</h1>
        {snapshot.description && <p>{snapshot.description}</p>}
        <div className="activity-hero__meta" aria-label="Informações da atividade">
          <span>{presentationCount} {presentationCount === 1 ? "apresentação" : "apresentações"}</span>
          <span>Pronta para visualizar e jogar</span>
        </div>
        {snapshot.tags.length > 0 && <div className="activity-hero__tags" aria-label="Tags da atividade">{snapshot.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      </div>
      <div className="activity-hero__side">
        <LibraryActions activityId={activityId} initialFavorite={initialFavorite} authenticated={authenticated} />
        <div className="activity-hero__art" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </header>

    <ol className="activity-journey" aria-label="Etapas para iniciar uma sessão">
      <li className="is-complete"><span>1</span><div><strong>Conhecer</strong><small>Veja os detalhes</small></div></li>
      <li className="is-current"><span>2</span><div><strong>Visualizar</strong><small>Experimente a atividade</small></div></li>
      <li><span>3</span><div><strong>Configurar</strong><small>Prepare as equipes</small></div></li>
      <li><span>4</span><div><strong>Iniciar</strong><small>Abra a sessão</small></div></li>
    </ol>

    <section className="activity-experience" aria-labelledby="activity-preview-title">
      <header className="activity-experience__header">
        <div>
          <span className="eyebrow">Visualize antes de jogar</span>
          <h2 id="activity-preview-title">Experimente a atividade</h2>
          <p>A prévia usa o mesmo conteúdo da sessão, sem placar ou pontuação.</p>
        </div>
        {presentationCount > 1 && <nav className="presentation-switcher" aria-label="Apresentações publicadas">{snapshot.presentations.map((item) => <button type="button" key={item.id} className={item.id === selected.id ? "is-active" : ""} aria-pressed={item.id === selected.id} onClick={() => setSelectedId(item.id)}>{item.name}</button>)}</nav>}
      </header>

      <div className="activity-experience__grid">
        <div className="activity-preview-column">
          <section className="activity-preview-notice" aria-label="Aviso do modo de prévia">
            <span className="activity-preview-notice__icon"><Eye aria-hidden="true" /></span>
            <div><strong>Modo de prévia</strong><p>Suas respostas aqui são apenas uma demonstração. A sessão real começa depois da configuração.</p></div>
            <a className="activity-preview-notice__link" href="#start-session"><SlidersHorizontal aria-hidden="true" /> Configurar</a>
          </section>
          <div className="activity-preview-stage">
            <div className="activity-preview-stage__bar"><span><span className="activity-preview-stage__dot" /> Prévia interativa</span><strong>{selected.name}</strong></div>
            <GameRenderer mode="preview" templateKey={selected.templateKey} content={snapshot.content} config={selected.gameConfig} theme={theme} />
          </div>
        </div>
        <aside className="activity-session-column" aria-label="Preparação da sessão">
          <div className="activity-session-column__heading"><Play aria-hidden="true" /><div><span>Próximo passo</span><strong>Prepare a turma</strong></div></div>
          <StartSessionPanel key={selected.id} activityId={activityId} presentationId={selected.id} templateKey={selected.templateKey} gameConfig={selected.gameConfig} authenticated={authenticated} />
        </aside>
      </div>
    </section>
  </article>;
}
