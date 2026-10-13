import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: "USER" | "ADMIN";
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "USER" | "ADMIN";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: "USER" | "ADMIN";
  }
}
