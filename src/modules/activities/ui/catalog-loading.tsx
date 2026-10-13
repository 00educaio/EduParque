import { Skeleton } from "@/shared/ui/components/feedback";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";

export function CatalogLoading({ owned = false }: { owned?: boolean }) {
  return (
    <AppShell className="catalog-page" header={<AppHeader links={owned ? [{ href: "/library", label: "Biblioteca" }] : [{ href: "/my-activities", label: "Minhas atividades" }]} />}>
      <section className={owned ? "workspace-hero catalog-loading__hero" : "catalog-hero catalog-hero--library catalog-loading__hero"} aria-label="Carregando página">
        <div className="catalog-loading__copy"><Skeleton className="h-5 w-40" /><Skeleton className="mt-5 h-16 w-full max-w-2xl" /><Skeleton className="mt-4 h-6 w-full max-w-xl" /></div>
      </section>
      <section className="catalog-results" aria-label="Carregando atividades" aria-busy="true">
        <div className="catalog-results__header"><Skeleton className="h-10 w-64" /></div>
        <div className="catalog-grid">{[0, 1, 2].map((item) => <Skeleton className="catalog-loading__card" key={item} />)}</div>
        <span className="sr-only">Carregando atividades…</span>
      </section>
    </AppShell>
  );
}
