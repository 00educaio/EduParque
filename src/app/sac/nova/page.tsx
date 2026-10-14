import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/application/authorization";
import { NewSupportRequestForm } from "@/modules/support/ui/new-support-request-form";
import { AppHeader, AppShell, Button, PageHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

export default async function NewSupportTicketPage() {
  try { await requireUser(); } catch { redirect("/login"); }

  return (
    <AppShell className="support-page" header={<AppHeader links={[{ href: "/sac", label: "Minhas solicitações" }]} />}>
      <PageHeader
        compact
        eyebrow="SAC EduParque"
        title="Nova solicitação"
        description="Conte o que aconteceu com suas palavras. A equipe responderá neste mesmo histórico."
        actions={<Button asChild variant="ghost"><Link href="/sac"><ArrowLeft aria-hidden="true" /> Voltar</Link></Button>}
      />
      <section className="support-form-card" aria-label="Formulário de nova solicitação">
        <NewSupportRequestForm />
      </section>
    </AppShell>
  );
}
