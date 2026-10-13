import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { listUsers } from "@/modules/admin/application/admin-service";
import { UserAdminActions } from "@/modules/admin/ui/admin-table-actions";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  let actor; try { actor = await requireAdmin(); } catch { redirect("/"); }
  const query = String((await searchParams).q ?? ""); const items = await listUsers(query);
  return <AppShell header={<AppHeader links={[{ href: "/admin/activities", label: "Atividades" }, { href: "/my-activities", label: "Sair do admin" }]} />}><section className="hero hero--compact"><span className="eyebrow">Administração</span><h1>Usuários</h1><p>Busque contas, ajuste papéis e remova acessos.</p><form className="search-form"><label className="sr-only" htmlFor="admin-user-search">Buscar usuários</label><input id="admin-user-search" name="q" defaultValue={query} placeholder="Nome ou e-mail"/><button className="button" type="submit">Buscar</button></form></section><div className="admin-list">{items.map((item) => <article className="admin-row" key={item.id}><div><strong>{item.name || "Sem nome"}</strong><span>{item.email || "Sem e-mail"} · {item.activityCount} atividade(s)</span></div><span className="status-pill">{item.role}</span><UserAdminActions id={item.id} role={item.role} isCurrent={item.id === actor.id}/></article>)}</div></AppShell>;
}
