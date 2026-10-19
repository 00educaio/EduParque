import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "@/modules/auth/application/password-authentication";
import { getEnv } from "@/shared/infrastructure/config/env";
import { getDatabase } from "@/shared/infrastructure/database/client";
import { accounts, sessions, users, verificationTokens } from "@/shared/infrastructure/database/schema";

const env = getEnv();
const secureCookies = env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDatabase().db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  trustHost: env.AUTH_TRUST_HOST,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "E-mail ou usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        return authenticateCredentials(credentials);
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: `${secureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "USER";
        token.authVersion = user.authVersion ?? 0;
        return token;
      }

      if (!token.sub || typeof token.authVersion !== "number") return null;
      const currentUser = await getDatabase().db.query.users.findFirst({
        columns: { authVersion: true, lockedUntil: true },
        where: eq(users.id, token.sub),
      });
      if (!currentUser || currentUser.authVersion !== token.authVersion || (currentUser.lockedUntil !== null && currentUser.lockedUntil.getTime() > Date.now())) return null;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      return session;
    },
  },
}));
