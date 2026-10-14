import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { isSupportTicketStatus, listAdminSupportTickets } from "@/modules/support/application/support-service";
import { supportCategoryLabels, supportStatusLabels, type SupportTicketStatus } from "@/modules/support/domain/support-ticket";
import { SupportStatusBadge } from "@/modules/support/ui/support-status-badge";
import { AppHeader, AppShell, EmptyState, PageHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminSupportTicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  try { await requireAdmin(); } catch { redirect("/"); }
  const rawStatus = (await searchParams).status;
  const status = typeof rawStatus === "string" && isSupportTicketStatus(rawStatus) ? rawStatus : undefined;
  const tickets = await listAdminSupportTickets(status);

  return (
    <AppShell className="support-page" header={<AppHeader links={[{ href: "/admin/users", label: "Usuários" }, { href: "/admin/activities", label: "Atividades" }, { href: "/my-activities", label: "Sair do admin" }]} />}>
      <PageHeader eyebrow="Administração" title="Chamados" description="Leia solicitações dos professores, responda e encerre atendimentos concluídos." />
      <form className="support-filter" aria-label="Filtrar chamados por status">
        <label htmlFor="support-status-filter">Status</label>
        <select id="support-status-filter" name="status" defaultValue={status ?? ""}>
          <option value="">Todos</option>
          {(Object.entries(supportStatusLabels) as Array<[SupportTicketStatus, string]>).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <button className="button button--secondary" type="submit">Filtrar</button>
        {status && <Link className="button button--ghost" href="/admin/tickets">Limpar</Link>}
      </form>

      {tickets.length ? (
        <div className="support-admin-list">
          {tickets.map((ticket) => (
            <article className="support-admin-row" key={ticket.id}>
              <div>
                <span>{supportCategoryLabels[ticket.category]} · Atualizado em {formatter.format(ticket.updatedAt)}</span>
                <h2><Link href={`/admin/tickets/${ticket.id}`}>{ticket.subject}</Link></h2>
                <p>{ticket.ownerName || "Professor sem nome"} · {ticket.ownerEmail || "E-mail indisponível"}</p>
              </div>
              <SupportStatusBadge status={ticket.status} />
              <Link className="button button--secondary" href={`/admin/tickets/${ticket.id}`}>Abrir chamado</Link>
            </article>
          ))}
        </div>
      ) : <EmptyState title="Nenhum chamado encontrado" description={status ? "Não há solicitações com este status." : "As novas solicitações aparecerão aqui."} />}
    </AppShell>
  );
}
