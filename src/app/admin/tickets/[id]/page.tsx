import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/application/authorization";
import { getAdminSupportTicket, SupportTicketNotFoundError } from "@/modules/support/application/support-service";
import { supportCategoryLabels, supportTicketIdSchema } from "@/modules/support/domain/support-ticket";
import { CloseSupportTicketButton } from "@/modules/support/ui/close-support-ticket-button";
import { SupportReplyForm } from "@/modules/support/ui/support-reply-form";
import { SupportStatusBadge } from "@/modules/support/ui/support-status-badge";
import { SupportTicketThread } from "@/modules/support/ui/support-ticket-thread";
import { Alert, AppHeader, AppShell, Button, PageHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

export default async function AdminSupportTicketPage({ params }: PageProps<"/admin/tickets/[id]">) {
  try { await requireAdmin(); } catch { redirect("/"); }
  const parsedId = supportTicketIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  let loaded;
  try { loaded = await getAdminSupportTicket(parsedId.data); }
  catch (error) { if (error instanceof SupportTicketNotFoundError) notFound(); throw error; }

  return (
    <AppShell className="support-page" header={<AppHeader links={[{ href: "/admin/tickets", label: "Chamados" }, { href: "/admin/users", label: "Usuários" }, { href: "/admin/activities", label: "Atividades" }]} />}>
      <PageHeader
        compact
        eyebrow={`${supportCategoryLabels[loaded.ticket.category]} · ${loaded.ticket.ownerName || "Professor"}`}
        title={loaded.ticket.subject}
        description={loaded.ticket.ownerEmail || "E-mail não informado"}
        actions={<div className="support-detail-actions"><SupportStatusBadge status={loaded.ticket.status} /><Button asChild variant="ghost"><Link href="/admin/tickets"><ArrowLeft aria-hidden="true" /> Voltar</Link></Button></div>}
      />
      <SupportTicketThread messages={loaded.messages} />
      {loaded.ticket.status === "closed" ? (
        <Alert className="support-closed-notice">Atendimento encerrado. O histórico permanece disponível para consulta.</Alert>
      ) : (
        <section className="support-admin-response" aria-labelledby="admin-support-response-title">
          <div className="support-reply-card">
            <h2 id="admin-support-response-title">Responder ao professor</h2>
            <SupportReplyForm admin endpoint={`/api/admin/support-tickets/${loaded.ticket.id}/messages`} />
          </div>
          <aside><h2>Concluir atendimento</h2><p>Encerre somente quando a solicitação estiver resolvida. Esta ação bloqueia novas mensagens.</p><CloseSupportTicketButton ticketId={loaded.ticket.id} /></aside>
        </section>
      )}
    </AppShell>
  );
}
