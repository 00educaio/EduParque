"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Textarea } from "@/shared/ui/components";

export function SupportReplyForm({ endpoint, admin = false }: { endpoint: string; admin?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: form.get("body") }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar a resposta.");
      formElement.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a resposta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="support-reply-form" onSubmit={(event) => void submit(event)}>
      {error && <Alert variant="error">{error}</Alert>}
      <Field id={admin ? "admin-support-reply" : "support-reply"} label={admin ? "Resposta da administração" : "Nova mensagem"} required>
        <Textarea name="body" rows={5} minLength={2} maxLength={4_000} required />
      </Field>
      <Button type="submit" loading={pending} loadingText="Enviando…">{admin ? "Enviar resposta" : "Enviar mensagem"}</Button>
    </form>
  );
}
