import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/policies";

const authMocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  createSupportTicket: vi.fn(),
  getUserSupportTicket: vi.fn(),
  addTeacherSupportMessage: vi.fn(),
  listAdminSupportTickets: vi.fn(),
  addAdminSupportMessage: vi.fn(),
  closeSupportTicket: vi.fn(),
}));

vi.mock("@/modules/auth/application/authorization", () => authMocks);
vi.mock("@/modules/support/application/support-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./support-service")>()),
  ...serviceMocks,
}));

import { POST as createTicket } from "@/app/api/support-tickets/route";
import { GET as getTicket } from "@/app/api/support-tickets/[id]/route";
import { POST as replyAsTeacher } from "@/app/api/support-tickets/[id]/messages/route";
import { GET as listAdminTickets } from "@/app/api/admin/support-tickets/route";
import { PATCH as closeAsAdmin } from "@/app/api/admin/support-tickets/[id]/route";
import { POST as replyAsAdmin } from "@/app/api/admin/support-tickets/[id]/messages/route";
import { SupportTicketClosedError, SupportTicketNotFoundError } from "./support-service";

const ticketId = "dd688450-484d-42e3-a735-9d84f34d42d3";
const routeContext = { params: Promise.resolve({ id: ticketId }) };

describe("rotas protegidas do SAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireUser.mockResolvedValue({ id: "teacher-id", role: "USER" });
    authMocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
  });

  it("recusa criação sem sessão antes de acessar o serviço", async () => {
    authMocks.requireUser.mockRejectedValue(new UnauthorizedError());
    const response = await createTicket(new Request("http://localhost/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "question", subject: "Assunto", description: "Descrição válida" }),
    }));

    expect(response.status).toBe(401);
    expect(serviceMocks.createSupportTicket).not.toHaveBeenCalled();
  });

  it("usa sempre a identidade da sessão ao criar", async () => {
    serviceMocks.createSupportTicket.mockResolvedValue({ id: ticketId });
    const response = await createTicket(new Request("http://localhost/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "question", subject: "Assunto", description: "Descrição válida" }),
    }));

    expect(response.status).toBe(201);
    expect(serviceMocks.createSupportTicket).toHaveBeenCalledWith("teacher-id", {
      category: "question",
      subject: "Assunto",
      description: "Descrição válida",
    });
  });

  it("responde 404 para tentativa de consultar chamado de outro professor", async () => {
    serviceMocks.getUserSupportTicket.mockRejectedValue(new SupportTicketNotFoundError());
    const response = await getTicket(new Request(`http://localhost/api/support-tickets/${ticketId}`), routeContext);

    expect(response.status).toBe(404);
    expect(serviceMocks.getUserSupportTicket).toHaveBeenCalledWith(ticketId, "teacher-id");
  });

  it("bloqueia respostas do professor depois do encerramento", async () => {
    serviceMocks.addTeacherSupportMessage.mockRejectedValue(new SupportTicketClosedError());
    const response = await replyAsTeacher(new Request(`http://localhost/api/support-tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Nova mensagem" }),
    }), routeContext);

    expect(response.status).toBe(409);
  });

  it("recusa usuário comum em toda rota administrativa", async () => {
    authMocks.requireAdmin.mockRejectedValue(new ForbiddenError());
    const response = await listAdminTickets(new Request("http://localhost/api/admin/support-tickets"));

    expect(response.status).toBe(403);
    expect(serviceMocks.listAdminSupportTickets).not.toHaveBeenCalled();
  });

  it("permite ao administrador responder e encerrar", async () => {
    serviceMocks.addAdminSupportMessage.mockResolvedValue({ id: "message-id" });
    serviceMocks.closeSupportTicket.mockResolvedValue({ id: ticketId, status: "closed" });

    const replyResponse = await replyAsAdmin(new Request(`http://localhost/api/admin/support-tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Resposta administrativa" }),
    }), routeContext);
    const closeResponse = await closeAsAdmin(new Request(`http://localhost/api/admin/support-tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    }), routeContext);

    expect(replyResponse.status).toBe(201);
    expect(serviceMocks.addAdminSupportMessage).toHaveBeenCalledWith(ticketId, "admin-id", { body: "Resposta administrativa" });
    expect(closeResponse.status).toBe(200);
    expect(serviceMocks.closeSupportTicket).toHaveBeenCalledWith(ticketId);
  });

  it("rejeita transição administrativa fora dos três status permitidos", async () => {
    const response = await closeAsAdmin(new Request(`http://localhost/api/admin/support-tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    }), routeContext);

    expect(response.status).toBe(400);
    expect(serviceMocks.closeSupportTicket).not.toHaveBeenCalled();
  });
});
