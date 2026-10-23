"use server";

import { redirect } from "next/navigation";
import {
  InvalidRegistrationInviteError,
  RegistrationConflictError,
  registerInvitedUser,
  registrationFormSchema,
} from "@/modules/auth/application/registration-invites";
import { signIn } from "@/modules/auth/infrastructure/auth";

type RegistrationField = "name" | "email" | "username" | "password" | "passwordConfirmation";

export type RegistrationActionState = {
  status: "idle" | "error" | "created";
  message: string | null;
  errors: Partial<Record<RegistrationField, string[]>>;
  values: { name: string; username: string };
};

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function registerAction(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const raw = {
    invite: textValue(formData, "invite"),
    name: textValue(formData, "name"),
    email: textValue(formData, "email"),
    username: textValue(formData, "username"),
    password: textValue(formData, "password"),
    passwordConfirmation: textValue(formData, "passwordConfirmation"),
  };
  const values = { name: raw.name, username: raw.username };
  const parsed = registrationFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Revise os campos destacados.",
      errors: {
        name: fields.name,
        email: fields.email,
        username: fields.username,
        password: fields.password,
        passwordConfirmation: fields.passwordConfirmation,
      },
      values,
    };
  }

  try {
    await registerInvitedUser(parsed.data);
  } catch (error) {
    if (error instanceof InvalidRegistrationInviteError) {
      return { status: "error", message: "Este convite é inválido, expirou ou já foi utilizado.", errors: {}, values };
    }
    if (error instanceof RegistrationConflictError) {
      return { status: "error", message: "Não foi possível criar a conta.", errors: { [error.field]: [error.message] }, values };
    }
    return { status: "error", message: "Não foi possível concluir o cadastro. Tente novamente mais tarde.", errors: {}, values };
  }

  let signedIn = false;
  try {
    const result = await signIn("credentials", {
      identifier: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
      redirectTo: "/my-activities",
    });
    signedIn = !new URL(String(result), "http://localhost").searchParams.has("error");
  } catch {
    signedIn = false;
  }

  if (!signedIn) {
    return {
      status: "created",
      message: "Sua conta foi criada, mas não foi possível entrar automaticamente. Entre usando seu e-mail e senha.",
      errors: {},
      values: { name: "", username: "" },
    };
  }

  redirect("/my-activities");
}
