import "server-only";
import { z } from "zod";
import { getDatabase, type DatabaseContext } from "@/shared/infrastructure/database/client";

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
export const LOGIN_LOCK_MS = 15 * 60 * 1_000;
export const BCRYPT_COST = 12;

const credentialsSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1),
});

type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  authVersion: number;
};

type AttemptRow = {
  failed_attempts: number;
  window_started_at: Date | string;
  locked_until: Date | string | null;
};

type CandidateRow = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN" | null;
  auth_version: number | null;
  failed_login_attempts: number | null;
  failed_login_window_started_at: Date | string | null;
  locked_until: Date | string | null;
  password_matches: boolean;
};

function timestamp(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function isFuture(value: Date | string | null, now: Date) {
  return value !== null && timestamp(value) > now.getTime();
}

function nextFailureState(attempts: number, startedAt: Date | string | null, now: Date) {
  const cutoff = now.getTime() - LOGIN_WINDOW_MS;
  const inCurrentWindow = startedAt !== null && timestamp(startedAt) > cutoff;
  const failedAttempts = (inCurrentWindow ? attempts : 0) + 1;
  return {
    failedAttempts,
    windowStartedAt: inCurrentWindow ? new Date(timestamp(startedAt)) : now,
    lockedUntil: failedAttempts >= LOGIN_MAX_ATTEMPTS ? new Date(now.getTime() + LOGIN_LOCK_MS) : null,
  };
}

function validBcryptInput(password: string) {
  return new TextEncoder().encode(password).byteLength <= 72;
}

export async function authenticateCredentials(
  input: unknown,
  database: DatabaseContext = getDatabase(),
  now: Date = new Date(),
): Promise<AuthenticatedUser | null> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success || !validBcryptInput(parsed.data.password)) return null;

  const { identifier, password } = parsed.data;
  try {
    return await database.sql.begin(async (tx) => {
      const nowValue = now.toISOString();
      await tx`
        INSERT INTO auth_login_attempts (identifier_hash, window_started_at, updated_at)
        VALUES (encode(digest(${identifier}, 'sha256'), 'hex'), ${nowValue}, ${nowValue})
        ON CONFLICT (identifier_hash) DO NOTHING
      `;

      const [attempt] = await tx<AttemptRow[]>`
        SELECT failed_attempts, window_started_at, locked_until
        FROM auth_login_attempts
        WHERE identifier_hash = encode(digest(${identifier}, 'sha256'), 'hex')
        FOR UPDATE
      `;

      const [candidate] = await tx<CandidateRow[]>`
        WITH candidate AS (
          SELECT id, name, email, role, password_hash, auth_version,
                 failed_login_attempts, failed_login_window_started_at, locked_until
          FROM users
          WHERE lower(email) = ${identifier} OR username = ${identifier}
          ORDER BY CASE WHEN lower(email) = ${identifier} THEN 0 ELSE 1 END
          LIMIT 1
          FOR UPDATE
        )
        SELECT candidate.id, candidate.name, candidate.email, candidate.role,
               candidate.auth_version, candidate.failed_login_attempts,
               candidate.failed_login_window_started_at, candidate.locked_until,
               COALESCE(
                 crypt(${password}, COALESCE(candidate.password_hash, gen_salt('bf', ${BCRYPT_COST})))
                   = candidate.password_hash,
                 false
               ) AS password_matches
        FROM (VALUES (1)) AS anchor(value)
        LEFT JOIN candidate ON true
      `;

      if (!attempt || !candidate) return null;

      const blocked = isFuture(attempt.locked_until, now) || isFuture(candidate.locked_until, now);
      if (!blocked && candidate.id && candidate.password_matches && candidate.role && candidate.auth_version !== null) {
        await tx`
          UPDATE users
          SET failed_login_attempts = 0,
              failed_login_window_started_at = NULL,
              locked_until = NULL,
              last_login_at = ${nowValue},
              updated_at = ${nowValue}
          WHERE id = ${candidate.id}
        `;
        await tx`
          DELETE FROM auth_login_attempts
          WHERE identifier_hash = encode(digest(${identifier}, 'sha256'), 'hex')
             OR user_id = ${candidate.id}
        `;
        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          role: candidate.role,
          authVersion: candidate.auth_version,
        };
      }

      if (blocked) return null;

      const identifierFailure = nextFailureState(attempt.failed_attempts, attempt.window_started_at, now);
      await tx`
        UPDATE auth_login_attempts
        SET user_id = ${candidate.id},
            failed_attempts = ${identifierFailure.failedAttempts},
            window_started_at = ${identifierFailure.windowStartedAt.toISOString()},
            locked_until = ${identifierFailure.lockedUntil?.toISOString() ?? null},
            updated_at = ${nowValue}
        WHERE identifier_hash = encode(digest(${identifier}, 'sha256'), 'hex')
      `;

      if (candidate.id) {
        const accountFailure = nextFailureState(
          candidate.failed_login_attempts ?? 0,
          candidate.failed_login_window_started_at,
          now,
        );
        await tx`
          UPDATE users
          SET failed_login_attempts = ${accountFailure.failedAttempts},
              failed_login_window_started_at = ${accountFailure.windowStartedAt.toISOString()},
              locked_until = ${accountFailure.lockedUntil?.toISOString() ?? null},
              updated_at = ${nowValue}
          WHERE id = ${candidate.id}
        `;
      }

      return null;
    });
  } catch {
    // O driver inclui parâmetros no erro original. Nunca o propague porque um
    // deles é a senha recebida.
    throw new Error("Não foi possível verificar as credenciais.");
  }
}
