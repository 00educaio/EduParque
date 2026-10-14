import { describe, expect, it } from "vitest";
import {
  closeSupportTicketSchema,
  createSupportMessageSchema,
  createSupportTicketSchema,
  supportStatusLabels,
  supportTicketStatusSchema,
} from "./support-ticket";

describe("regras dos chamados de suporte", () => {
  it("aceita somente as quatro categorias e normaliza os textos", () => {
    expect(createSupportTicketSchema.parse({ category: "technical", subject: "  Erro ao publicar  ", description: "  A publicação retorna um erro inesperado.  " })).toEqual({
      category: "technical",
      subject: "Erro ao publicar",
      description: "A publicação retorna um erro inesperado.",
    });
    expect(createSupportTicketSchema.safeParse({ category: "billing", subject: "Assunto", description: "Descrição suficientemente longa" }).success).toBe(false);
    expect(createSupportTicketSchema.safeParse({ category: "question", subject: "Assunto", description: "Descrição suficientemente longa", ownerId: "forged-id" }).success).toBe(false);
  });

  it("limita assunto, descrição e mensagem contra envio abusivo", () => {
    expect(createSupportTicketSchema.safeParse({ category: "question", subject: "abc", description: "curta" }).success).toBe(false);
    expect(createSupportTicketSchema.safeParse({ category: "question", subject: "a".repeat(161), description: "d".repeat(10) }).success).toBe(false);
    expect(createSupportMessageSchema.safeParse({ body: "x".repeat(4_001) }).success).toBe(false);
    expect(createSupportMessageSchema.parse({ body: "  Obrigado pela resposta.  " })).toEqual({ body: "Obrigado pela resposta." });
  });

  it("mantém exatamente os três status e só aceita encerramento administrativo", () => {
    expect(supportTicketStatusSchema.options).toEqual(["open", "answered", "closed"]);
    expect(Object.values(supportStatusLabels)).toEqual(["Aberto", "Respondido", "Encerrado"]);
    expect(closeSupportTicketSchema.safeParse({ status: "closed" }).success).toBe(true);
    expect(closeSupportTicketSchema.safeParse({ status: "open" }).success).toBe(false);
  });
});
