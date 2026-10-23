import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { BCRYPT_COST } from "./password-authentication";
import { getDatabase, type DatabaseContext } from "@/shared/infrastructure/database/client";

export const REGISTRATION_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

const nameSchema = z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100, "O nome deve ter no máximo 100 caracteres.");
const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254, "O e-mail deve ter no máximo 254 caracteres.");
const usernameSchema = z.string().trim().toLowerCase().regex(
  /^[a-z0-9._-]{3,32}$/,
  "Use de 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado.",
);
const passwordSchema = z.string().min(14, "A senha deve ter pelo menos 14 caracteres.").refine(
  (password) => new TextEncoder().encode(password).byteLength <= 72,
  "A senha deve ter no máximo 72 bytes.",
);

export const registrationFormSchema = z.object({
  invite: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  passwordConfirmation: z.string().min(1, "Repita a senha."),
}).superRefine((data, context) => {
  if (data.password !== data.passwordConfirmation) {
    context.addIssue({ code: "custom", path: ["passwordConfirmation"], message: "As senhas não coincidem." });
  }
});

const inviteTokenSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/i,
);

const createInviteSchema = z.object({
  email: emailSchema,
  baseUrl: z.string().url("Informe uma URL base válida.").refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "A URL base deve usar HTTP ou HTTPS."),
});

type InviteRow = {
  id: string;
  email: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
};

type ExistingUserRow = { email: string | null; username: string | null };

export class InvalidRegistrationInviteError extends Error {
  constructor() {
    super("Convite de cadastro inválido ou expirado.");
    this.name = "InvalidRegistrationInviteError";
  }
}

export class RegistrationConflictError extends Error {
  constructor(readonly field: "email" | "username") {
    super(field === "email" ? "Já existe uma conta com este e-mail." : "Este nome de usuário já está em uso.");
    this.name = "RegistrationConflictError";
  }
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function parseRegistrationInviteToken(input: unknown) {
  const parsed = inviteTokenSchema.safeParse(input);
  if (!parsed.success) return null;
  const separator = parsed.data.indexOf(".");
  return { id: parsed.data.slice(0, separator).toLowerCase(), secret: parsed.data.slice(separator + 1) };
}

export async function createRegistrationInvite(
  input: unknown,
  database: DatabaseContext = getDatabase(),
  now: Date = new Date(),
) {
  const data = createInviteSchema.parse(input);
  const secret = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + REGISTRATION_INVITE_TTL_MS);
  const [invite] = await database.sql<{ id: string }[]>`
    INSERT INTO registration_invites (email, token_hash, expires_at, created_at)
    VALUES (${data.email}, ${hashSecret(secret)}, ${expiresAt.toISOString()}, ${now.toISOString()})
    RETURNING id
  `;
  if (!invite) throw new Error("Não foi possível criar o convite.");

  const url = new URL("/register", data.baseUrl);
  url.searchParams.set("invite", `${invite.id}.${secret}`);
  return { id: invite.id, email: data.email, expiresAt, url: url.toString() };
}

export async function revokeRegistrationInvite(
  idInput: unknown,
  database: DatabaseContext = getDatabase(),
  now: Date = new Date(),
) {
  const id = z.string().uuid().parse(idInput);
  const [invite] = await database.sql<{ id: string }[]>`
    UPDATE registration_invites
    SET revoked_at = ${now.toISOString()}
    WHERE id = ${id} AND used_at IS NULL AND revoked_at IS NULL
    RETURNING id
  `;
  return Boolean(invite);
}

export async function getAvailableRegistrationInvite(
  tokenInput: unknown,
  database: DatabaseContext = getDatabase(),
  now: Date = new Date(),
) {
  const token = parseRegistrationInviteToken(tokenInput);
  if (!token) return null;
  const [invite] = await database.sql<Pick<InviteRow, "email" | "expires_at">[]>`
    SELECT email, expires_at
    FROM registration_invites
    WHERE id = ${token.id}
      AND token_hash = ${hashSecret(token.secret)}
      AND used_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > ${now.toISOString()}
    LIMIT 1
  `;
  if (!invite) return null;
  return { email: invite.email, expiresAt: new Date(invite.expires_at) };
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
}

function postgresConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "constraint_name" in error ? String(error.constraint_name) : "";
}

export async function registerInvitedUser(
  input: unknown,
  database: DatabaseContext = getDatabase(),
  now: Date = new Date(),
) {
  const data = registrationFormSchema.parse(input);
  const token = parseRegistrationInviteToken(data.invite);
  if (!token) throw new InvalidRegistrationInviteError();

  try {
    return await database.sql.begin(async (tx) => {
      const [invite] = await tx<InviteRow[]>`
        SELECT id, email, expires_at, used_at, revoked_at
        FROM registration_invites
        WHERE id = ${token.id} AND token_hash = ${hashSecret(token.secret)}
        FOR UPDATE
      `;
      if (
        !invite || invite.used_at !== null || invite.revoked_at !== null ||
        new Date(invite.expires_at).getTime() <= now.getTime() || invite.email !== data.email
      ) {
        throw new InvalidRegistrationInviteError();
      }

      const [existing] = await tx<ExistingUserRow[]>`
        SELECT email, username
        FROM users
        WHERE lower(email) = ${data.email} OR username = ${data.username}
        LIMIT 1
      `;
      if (existing && existing.email?.toLowerCase() === data.email) throw new RegistrationConflictError("email");
      if (existing) throw new RegistrationConflictError("username");

      const [user] = await tx<{ id: string; email: string; username: string }[]>`
        INSERT INTO users (
          name, email, username, email_verified, role, password_hash,
          password_changed_at, auth_version, created_at, updated_at
        )
        VALUES (
          ${data.name}, ${data.email}, ${data.username}, ${now.toISOString()}, 'USER',
          crypt(${data.password}, gen_salt('bf', ${BCRYPT_COST})), ${now.toISOString()}, 1,
          ${now.toISOString()}, ${now.toISOString()}
        )
        RETURNING id, email, username
      `;
      if (!user) throw new Error("Não foi possível criar a conta.");

      const [consumed] = await tx<{ id: string }[]>`
        UPDATE registration_invites
        SET used_at = ${now.toISOString()}
        WHERE id = ${invite.id} AND used_at IS NULL AND revoked_at IS NULL
        RETURNING id
      `;
      if (!consumed) throw new InvalidRegistrationInviteError();
      return user;
    });
  } catch (error) {
    if (error instanceof InvalidRegistrationInviteError || error instanceof RegistrationConflictError) throw error;
    if (postgresCode(error) === "23505") {
      throw new RegistrationConflictError(postgresConstraint(error).includes("email") ? "email" : "username");
    }
    throw new Error("Não foi possível concluir o cadastro.");
  }
}
