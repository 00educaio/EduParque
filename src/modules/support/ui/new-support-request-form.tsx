"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/shared/ui/components";

export function NewSupportRequestForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.get("category"), subject: form.get("subject"), description: form.get("description") }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Não foi possível enviar a solicitação.");
      router.push(`/sac/${result.id}?criado=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a solicitação.");
      setPending(false);
    }
  }

  return (
    <form className="support-form" onSubmit={(event) => void submit(event)}>
      {error && <Alert variant="error">{error}</Alert>}
      <Field id="support-category" label="Categoria" required>
        <Select name="category" defaultValue="question" required>
          <option value="question">Dúvida</option>
          <option value="suggestion">Sugestão</option>
          <option value="technical">Problema técnico</option>
          <option value="other">Outro</option>
        </Select>
      </Field>
      <Field id="support-subject" label="Assunto" hint="Resuma em uma frase o que você precisa." required>
        <Input name="subject" minLength={4} maxLength={160} autoComplete="off" required />
      </Field>
      <Field id="support-description" label="Descrição" hint="Não inclua nomes, respostas ou outros dados de alunos." required>
        <Textarea name="description" rows={8} minLength={10} maxLength={5_000} required />
      </Field>
      <div className="support-form__actions">
        <Button type="submit" size="lg" loading={pending} loadingText="Enviando…">Enviar solicitação</Button>
      </div>
    </form>
  );
}
