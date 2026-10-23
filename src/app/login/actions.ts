"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/modules/auth/infrastructure/auth";

export type LoginState = { error: string | null };

const GENERIC_LOGIN_ERROR = "Não foi possível entrar. Confira os dados ou tente novamente mais tarde.";

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  if (typeof identifier !== "string" || typeof password !== "string") {
    return { error: GENERIC_LOGIN_ERROR };
  }

  try {
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
      redirectTo: "/",
    });
    const resultUrl = new URL(String(result), "http://localhost");
    if (resultUrl.searchParams.has("error")) return { error: GENERIC_LOGIN_ERROR };
  } catch {
    return { error: GENERIC_LOGIN_ERROR };
  }

  redirect("/");
}
