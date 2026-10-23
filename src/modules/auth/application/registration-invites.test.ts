import { describe, expect, it } from "vitest";
import { parseRegistrationInviteToken, registrationFormSchema } from "./registration-invites";

const validToken = "3f50f589-6f58-4c9c-9361-76b1a79df96f.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

describe("cadastro por convite", () => {
  it("interpreta apenas tokens no formato UUID.segredo-base64url", () => {
    expect(parseRegistrationInviteToken(validToken)).toEqual({
      id: "3f50f589-6f58-4c9c-9361-76b1a79df96f",
      secret: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
    expect(parseRegistrationInviteToken("invalido")).toBeNull();
    expect(parseRegistrationInviteToken(`${validToken}extra`)).toBeNull();
  });

  it("normaliza e valida os dados públicos do professor", () => {
    const parsed = registrationFormSchema.parse({
      invite: validToken,
      name: "  Maria da Silva  ",
      email: "  MARIA@EXAMPLE.COM ",
      username: "  PROFESSORA.MARIA ",
      password: "uma senha segura 123",
      passwordConfirmation: "uma senha segura 123",
    });
    expect(parsed).toMatchObject({
      name: "Maria da Silva",
      email: "maria@example.com",
      username: "professora.maria",
    });
  });

  it("recusa nome, usuário, senha e confirmação inválidos", () => {
    const parsed = registrationFormSchema.safeParse({
      invite: validToken,
      name: "M",
      email: "invalido",
      username: "Nome com espaços",
      password: "curta",
      passwordConfirmation: "diferente",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.flatten().fieldErrors).toMatchObject({
      name: expect.any(Array),
      email: expect.any(Array),
      username: expect.any(Array),
      password: expect.any(Array),
      passwordConfirmation: expect.any(Array),
    });
  });

  it("limita a senha aos 72 bytes aceitos pelo bcrypt", () => {
    const password = "á".repeat(37);
    const parsed = registrationFormSchema.safeParse({
      invite: validToken,
      name: "Maria",
      email: "maria@example.com",
      username: "maria",
      password,
      passwordConfirmation: password,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.password?.[0]).toContain("72 bytes");
  });
});
