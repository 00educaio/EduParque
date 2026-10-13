import Link from "next/link";
import { BookOpen, Layers3, Search } from "lucide-react";
import { auth } from "@/modules/auth/infrastructure/auth";
import { listPublicActivities } from "@/modules/activities/application/activity-service";
import { ActivityCard } from "@/modules/activities/ui/activity-card";
import { LibraryActions } from "@/modules/activities/ui/library-actions";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";
import { EmptyState } from "@/shared/ui/components/feedback";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const [params, session] = await Promise.all([searchParams, auth()]);
  const query = typeof params.q === "string" ? params.q : "";
  const results = await listPublicActivities(query, session?.user.id);
  const accents = ["blue", "yellow", "green", "navy"] as const;

  return (
    <AppShell className="catalog-page" header={<AppHeader links={[{ href: "/my-activities", label: "Minhas atividades" }, session ? { href: "/my-activities", label: "Criar" } : { href: "/login", label: "Entrar" }]} />}>
      <section className="catalog-hero catalog-hero--library" aria-labelledby="library-title">
        <div className="catalog-hero__copy">
          <span className="catalog-hero__eyebrow"><BookOpen aria-hidden="true" /> Biblioteca pública</span>
          <h1 id="library-title">Atividades para transformar a sala</h1>
          <p>Descubra experiências criadas por educadores, adapte ideias e encontre novos jeitos de aprender em conjunto.</p>
        </div>
        <div className="catalog-hero__shape" aria-hidden="true"><span /><span /><span /></div>
        <form className="catalog-search" role="search">
          <label htmlFor="library-search">Busque por título, descrição ou tag</label>
          <div className="catalog-search__control">
            <Search aria-hidden="true" />
            <input id="library-search" name="q" defaultValue={query} placeholder="Ex.: ciências, memória, leitura…" />
            <button className="button" type="submit">Buscar</button>
          </div>
        </form>
      </section>

      <section className="catalog-results" aria-labelledby="library-results-title">
        <header className="catalog-results__header">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2 id="library-results-title">{query ? `Resultados para “${query}”` : "Explore as atividades"}</h2>
          </div>
          <p aria-live="polite">{results.length} {results.length === 1 ? "atividade encontrada" : "atividades encontradas"}</p>
        </header>
        <div className="catalog-grid">
          {results.map((item, index) => {
            const defaultPresentation = item.snapshot.presentations.find((presentation) => presentation.id === item.snapshot.defaultPresentationId) ?? item.snapshot.presentations[0];
            return (
              <ActivityCard
                key={item.id}
                href={`/activity/${item.slug}`}
                title={item.snapshot.title}
                description={item.snapshot.description}
                tags={item.snapshot.tags}
                accent={accents[index % accents.length]}
                metadata={<><Layers3 aria-hidden="true" /><span>{item.snapshot.presentations.length} {item.snapshot.presentations.length === 1 ? "apresentação" : "apresentações"}{defaultPresentation ? ` · ${defaultPresentation.name}` : ""}</span></>}
                actions={<><Link className="catalog-card__open" href={`/activity/${item.slug}`}>Ver atividade <span aria-hidden="true">↗</span></Link><LibraryActions activityId={item.id} initialFavorite={item.isFavorite} authenticated={Boolean(session)} /></>}
              />
            );
          })}
          {!results.length && (
            <EmptyState
              className="catalog-empty"
              title={query ? "Nenhuma atividade combina com essa busca" : "A biblioteca ainda está vazia"}
              description={query ? "Revise o termo ou tente buscar por outro título, descrição ou tag." : "Quando atividades públicas forem compartilhadas, elas aparecerão aqui."}
              action={query ? <Link className="button button--secondary" href="/library">Limpar busca</Link> : undefined}
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}
