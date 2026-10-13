import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/shared/infrastructure/database/client";
import { accounts, sessions, users, verificationTokens } from "@/shared/infrastructure/database/schema";
import { getEnv } from "@/shared/infrastructure/config/env";

const env = getEnv();
const developmentAuthEnabled = env.DEV_AUTH_ENABLED && env.NODE_ENV !== "production";
const developmentCredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(100),
});

export const enabledAuthProviders = {
  development: developmentAuthEnabled,
  google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  magicLink: Boolean(env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD && env.EMAIL_FROM),
} as const;

const providers = [
  ...(enabledAuthProviders.development
    ? [
        Credentials({
          id: "dev",
          name: "Acesso local",
          credentials: {
            name: { label: "Nome", type: "text" },
            email: { label: "E-mail", type: "email" },
          },
          async authorize(credentials) {
            const parsed = developmentCredentialsSchema.safeParse(credentials);
            if (!parsed.success) return null;
            const [user] = await db
              .insert(users)
              .values({ name: parsed.data.name, email: parsed.data.email.toLowerCase(), emailVerified: new Date() })
              .onConflictDoUpdate({ target: users.email, set: { name: parsed.data.name, updatedAt: new Date() } })
              .returning();
            return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
          },
        }),
      ]
    : []),
  ...(enabledAuthProviders.google && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })]
    : []),
  ...(enabledAuthProviders.magicLink && env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD && env.EMAIL_FROM
    ? [
        Nodemailer({
          server: {
            host: env.EMAIL_SERVER_HOST,
            port: env.EMAIL_SERVER_PORT,
            auth: { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD },
          },
          from: env.EMAIL_FROM,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  providers,
  session: { strategy: enabledAuthProviders.development ? "jwt" : "database" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "USER";
      }
      return token;
    },
    session({ session, user, token }) {
      session.user.id = user?.id ?? token.sub ?? "";
      session.user.role = user?.role ?? (token.role === "ADMIN" ? "ADMIN" : "USER");
      return session;
    },
  },
});
