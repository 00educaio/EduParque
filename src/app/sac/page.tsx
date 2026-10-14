import Link from "next/link";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/application/authorization";
import { listUserSupportTickets } from "@/modules/support/application/support-service";
import { supportCategoryLabels } from "@/modules/support/domain/support-ticket";
import { SupportStatusBadge } from "@/modules/support/ui/support-status-badge";
import { AppHeader, AppShell, Button, EmptyState, PageHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export default async function SupportPage() {
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const tickets = await listUserSupportTickets(user.id);

  return (
    <AppShell className="support-page" header={<AppHeader links={[{ href: "/library", label: "Biblioteca" }, { href: "/my-activities", label: "Minhas atividades" }]} />}>
      <PageHeader
        eyebrow="Atendimento ao professor"
        title="Minhas solicitações"
        description="Envie uma dúvida, sugestão ou relato técnico e acompanhe as respostas da equipe EduParque."
        actions={<Button asChild size="lg"><Link href="/sac/nova"><MessageSquarePlus aria-hidden="true" /> Nova solicitação</Link></Button>}
      />

      {tickets.length ? (
        <div className="support-ticket-list">
          {tickets.map((ticket) => (
            <Link className="support-ticket-card" href={`/sac/${ticket.id}`} key={ticket.id}>
              <div className="support-ticket-card__main">
                <span>{supportCategoryLabels[ticket.category]}</span>
                <h2>{ticket.subject}</h2>
                <time dateTime={ticket.createdAt.toISOString()}>Criada em {formatter.format(ticket.createdAt)}</time>
              </div>
              <SupportStatusBadge status={ticket.status} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Você ainda não enviou solicitações"
          description="Quando precisar falar com a equipe EduParque, abra um chamado por aqui."
          action={<Button asChild><Link href="/sac/nova"><MessagesSquare aria-hidden="true" /> Criar primeira solicitação</Link></Button>}
        />
      )}
    </AppShell>
  );
}
