import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { listActivities } from "@/modules/admin/application/admin-service";
import { ActivityAdminActions } from "@/modules/admin/ui/admin-table-actions";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage({ searchParams }: PageProps<"/admin/activities">) {
  try { await requireAdmin(); } catch { redirect("/"); }
  const query = String((await searchParams).q ?? ""); const items = await listActivities(query);
  return <AppShell header={<AppHeader links={[{ href: "/admin/users", label: "Usuários" }, { href: "/my-activities", label: "Sair do admin" }]} />}><section className="hero hero--compact"><span className="eyebrow">Administração</span><h1>Atividades</h1><p>Localize conteúdo publicado ou removido e modere sua disponibilidade.</p><form className="search-form"><label className="sr-only" htmlFor="admin-activity-search">Buscar atividades</label><input id="admin-activity-search" name="q" defaultValue={query} placeholder="Título, slug ou e-mail do autor"/><button className="button" type="submit">Buscar</button></form></section><div className="admin-list">{items.map((item) => <article className="admin-row" key={item.id}><div><strong>{item.title}</strong><span>{item.ownerEmail || item.ownerName || "Autor sem identificação"} · {item.visibility} · {item.currentPublishedRevision ? `revisão ${item.currentPublishedRevision}` : "não publicada"}</span></div><span className="status-pill">{item.deletedAt ? "Oculta" : "Ativa"}</span><ActivityAdminActions id={item.id} hidden={Boolean(item.deletedAt)}/></article>)}</div></AppShell>;
}
