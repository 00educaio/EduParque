"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/shared/ui/components";

export function CloseSupportTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function closeTicket() {
    if (!window.confirm("Encerrar este atendimento? Novas mensagens não poderão ser enviadas.")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível encerrar o atendimento.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível encerrar o atendimento.");
      setPending(false);
    }
  }

  return <div className="support-close-action"><Button variant="danger" loading={pending} loadingText="Encerrando…" onClick={() => void closeTicket()}>Encerrar atendimento</Button>{error && <Alert variant="error">{error}</Alert>}</div>;
}
