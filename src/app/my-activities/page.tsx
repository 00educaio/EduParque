import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDashed, Clock3, PencilLine, Radio } from "lucide-react";
import { auth } from "@/modules/auth/infrastructure/auth";
import { listOwnedActivities } from "@/modules/activities/application/activity-service";
import { ActivityCard } from "@/modules/activities/ui/activity-card";
import { CreateActivityButton } from "@/modules/activities/ui/create-activity-button";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";
import { EmptyState } from "@/shared/ui/components/feedback";

export const dynamic = "force-dynamic";

export default async function MyActivitiesPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const items = await listOwnedActivities(session.user.id);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <AppShell className="catalog-page" header={<AppHeader links={[{ href: "/library", label: "Biblioteca" }]} actions={<CreateActivityButton />} />}>
      <section className="workspace-hero" aria-labelledby="my-activities-title">
        <div>
          <span className="catalog-hero__eyebrow"><PencilLine aria-hidden="true" /> Espaço do educador</span>
          <h1 id="my-activities-title">Minhas atividades</h1>
          <p>Retome um rascunho, acompanhe o que já foi publicado ou comece uma nova experiência.</p>
        </div>
        <div className="workspace-hero__action"><CreateActivityButton /></div>
      </section>

      <section className="catalog-results" aria-labelledby="my-activities-list-title">
        <header className="catalog-results__header">
          <div>
            <span className="eyebrow">Sua coleção</span>
            <h2 id="my-activities-list-title">Continue de onde parou</h2>
          </div>
          <p>{items.length} {items.length === 1 ? "atividade" : "atividades"}</p>
        </header>
        <div className="catalog-grid catalog-grid--owned">
          {items.map((item) => {
            const published = Boolean(item.currentPublishedRevision);
            return (
              <ActivityCard
                key={item.id}
                href={`/editor/${item.id}`}
                title={item.title}
                description={item.description}
                tags={item.tags}
                accent={published ? "green" : "yellow"}
                className={published ? "is-published" : "is-draft"}
                eyebrow={<span className={`activity-status activity-status--${published ? "published" : "draft"}`}>{published ? <Radio aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}{published ? "Publicada" : "Rascunho"}</span>}
                metadata={<><Clock3 aria-hidden="true" /><span>Atualizada em {formatter.format(item.updatedAt)}</span>{published && <span className="catalog-card__revision">Revisão {item.currentPublishedRevision} disponível ao público</span>}</>}
                actions={<Link className="button button--secondary catalog-card__editor" href={`/editor/${item.id}`}><PencilLine aria-hidden="true" /> Abrir editor</Link>}
              />
            );
          })}
          {!items.length && (
            <EmptyState className="catalog-empty" title="Sua primeira atividade começa aqui" description="Crie uma experiência, adicione o conteúdo e escolha como apresentar para a turma." action={<CreateActivityButton />} />
          )}
        </div>
      </section>
    </AppShell>
  );
}
