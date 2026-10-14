import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/application/authorization";
import { getUserSupportTicket, SupportTicketNotFoundError } from "@/modules/support/application/support-service";
import { supportCategoryLabels, supportTicketIdSchema } from "@/modules/support/domain/support-ticket";
import { SupportReplyForm } from "@/modules/support/ui/support-reply-form";
import { SupportStatusBadge } from "@/modules/support/ui/support-status-badge";
import { SupportTicketThread } from "@/modules/support/ui/support-ticket-thread";
import { Alert, AppHeader, AppShell, Button, PageHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({ params, searchParams }: PageProps<"/sac/[id]">) {
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const parsedId = supportTicketIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  let loaded;
  try { loaded = await getUserSupportTicket(parsedId.data, user.id); }
  catch (error) { if (error instanceof SupportTicketNotFoundError) notFound(); throw error; }
  const created = (await searchParams).criado === "1";

  return (
    <AppShell className="support-page" header={<AppHeader links={[{ href: "/sac", label: "Minhas solicitações" }]} />}>
      <PageHeader
        compact
        eyebrow={supportCategoryLabels[loaded.ticket.category]}
        title={loaded.ticket.subject}
        description="Histórico completo da conversa com a equipe EduParque."
        actions={<div className="support-detail-actions"><SupportStatusBadge status={loaded.ticket.status} /><Button asChild variant="ghost"><Link href="/sac"><ArrowLeft aria-hidden="true" /> Voltar</Link></Button></div>}
      />
      {created && <Alert variant="success" className="support-confirmation">Solicitação enviada. Você pode acompanhar todas as respostas nesta página.</Alert>}
      <SupportTicketThread messages={loaded.messages} />
      {loaded.ticket.status === "closed" ? (
        <Alert className="support-closed-notice">Este atendimento foi encerrado e permanece disponível somente para consulta.</Alert>
      ) : (
        <section className="support-reply-card" aria-labelledby="support-reply-title">
          <h2 id="support-reply-title">Responder à equipe</h2>
          <SupportReplyForm endpoint={`/api/support-tickets/${loaded.ticket.id}/messages`} />
        </section>
      )}
    </AppShell>
  );
}
