import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/application/policies";
import {
  SupportRateLimitError,
  SupportTicketClosedError,
  SupportTicketNotFoundError,
} from "./support-service";
import { supportErrorResponse } from "./http";

describe("respostas HTTP do SAC", () => {
  it.each([
    [new UnauthorizedError(), 401],
    [new ForbiddenError(), 403],
    [new SupportTicketNotFoundError(), 404],
    [new SupportTicketClosedError(), 409],
    [new SupportRateLimitError("Limite atingido."), 429],
  ])("preserva o status seguro de erros conhecidos", async (error, expectedStatus) => {
    const response = supportErrorResponse(error);
    expect(response.status).toBe(expectedStatus);
    await expect(response.json()).resolves.toMatchObject({ error: error.message });
  });

  it("trata JSON malformado e validação como requisições inválidas", () => {
    expect(supportErrorResponse(new SyntaxError("JSON inválido")).status).toBe(400);

    let validationError: unknown;
    try {
      z.object({ subject: z.string().min(4) }).parse({ subject: "x" });
    } catch (error) {
      validationError = error;
    }
    expect(supportErrorResponse(validationError).status).toBe(400);
  });

  it("não expõe detalhes de falhas internas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = supportErrorResponse(new Error("senha-do-banco"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Não foi possível concluir a operação de atendimento." });
  });
});
