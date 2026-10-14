import { z } from "zod";

export const supportTicketCategorySchema = z.enum(["question", "suggestion", "technical", "other"]);
export const supportTicketStatusSchema = z.enum(["open", "answered", "closed"]);
export const supportTicketIdSchema = z.string().uuid();

export const createSupportTicketSchema = z.object({
  category: supportTicketCategorySchema,
  subject: z.string().trim().min(4, "Informe um assunto com pelo menos 4 caracteres.").max(160, "O assunto pode ter no máximo 160 caracteres."),
  description: z.string().trim().min(10, "Descreva a solicitação com pelo menos 10 caracteres.").max(5_000, "A descrição pode ter no máximo 5.000 caracteres."),
}).strict();

export const createSupportMessageSchema = z.object({
  body: z.string().trim().min(2, "Escreva uma mensagem com pelo menos 2 caracteres.").max(4_000, "A mensagem pode ter no máximo 4.000 caracteres."),
}).strict();

export const closeSupportTicketSchema = z.object({ status: z.literal("closed") }).strict();

export type SupportTicketCategory = z.infer<typeof supportTicketCategorySchema>;
export type SupportTicketStatus = z.infer<typeof supportTicketStatusSchema>;

export const supportCategoryLabels: Record<SupportTicketCategory, string> = {
  question: "Dúvida",
  suggestion: "Sugestão",
  technical: "Problema técnico",
  other: "Outro",
};

export const supportStatusLabels: Record<SupportTicketStatus, string> = {
  open: "Aberto",
  answered: "Respondido",
  closed: "Encerrado",
};
