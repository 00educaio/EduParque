import "server-only";
import { z } from "zod";
import { BCRYPT_COST } from "./password-authentication";
import { getDatabase, type DatabaseContext } from "@/shared/infrastructure/database/client";

const passwordSchema = z.string().min(14, "A senha deve ter pelo menos 14 caracteres.").refine(
  (password) => new TextEncoder().encode(password).byteLength <= 72,
  "A senha deve ter no máximo 72 bytes por compatibilidade com bcrypt.",
);

const usernameSchema = z.string().trim().toLowerCase().regex(
  /^[a-z0-9._-]{3,32}$/,
  "Use de 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado.",
);

export const createCredentialUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export async function createCredentialUser(input: unknown, database: DatabaseContext = getDatabase()) {
  const data = createCredentialUserSchema.parse(input);
  const [user] = await database.sql<{ id: string; email: string; username: string }[]>`
    INSERT INTO users (
      name, email, username, email_verified, role, password_hash,
      password_changed_at, auth_version, created_at, updated_at
    )
    VALUES (
      ${data.name}, ${data.email}, ${data.username}, now(), ${data.role},
      crypt(${data.password}, gen_salt('bf', ${BCRYPT_COST})), now(), 1, now(), now()
    )
    RETURNING id, email, username
  `;
  if (!user) throw new Error("Não foi possível criar a conta.");
  return user;
}

export async function resetCredentialPassword(
  identifierInput: string,
  passwordInput: string,
  database: DatabaseContext = getDatabase(),
) {
  const identifier = z.string().trim().toLowerCase().min(3).max(254).parse(identifierInput);
  const password = passwordSchema.parse(passwordInput);

  return database.sql.begin(async (tx) => {
    const [user] = await tx<{ id: string; email: string | null; username: string | null }[]>`
      UPDATE users
      SET password_hash = crypt(${password}, gen_salt('bf', ${BCRYPT_COST})),
          password_changed_at = now(),
          auth_version = auth_version + 1,
          failed_login_attempts = 0,
          failed_login_window_started_at = NULL,
          locked_until = NULL,
          updated_at = now()
      WHERE lower(email) = ${identifier} OR username = ${identifier}
      RETURNING id, email, username
    `;
    if (!user) throw new Error("Conta não encontrada.");
    await tx`
      DELETE FROM auth_login_attempts
      WHERE user_id = ${user.id}
         OR identifier_hash IN (
           encode(digest(COALESCE(${user.email}, ''), 'sha256'), 'hex'),
           encode(digest(COALESCE(${user.username}, ''), 'sha256'), 'hex')
         )
    `;
    return user;
  });
}
