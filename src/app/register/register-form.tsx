"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegistrationActionState } from "./actions";
import { Alert, Button, Field, Input } from "@/shared/ui/components";

const initialState: RegistrationActionState = {
  status: "idle",
  message: null,
  errors: {},
  values: { name: "", username: "" },
};

export function RegisterForm({ invite, email }: { invite: string; email: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  if (state.status === "created") {
    return (
      <div className="space-y-4">
        <Alert variant="success">{state.message}</Alert>
        <Button asChild className="w-full"><Link href="/login">Ir para o login</Link></Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input name="invite" type="hidden" value={invite} />
      <Field id="register-name" label="Nome" required error={state.errors.name?.[0]}>
        <Input
          autoComplete="name"
          defaultValue={state.values.name}
          maxLength={100}
          name="name"
          placeholder="Como você quer ser chamado"
          required
        />
      </Field>
      <Field id="register-email" label="E-mail do convite" required error={state.errors.email?.[0]}>
        <Input autoComplete="email" name="email" readOnly required type="email" value={email} />
      </Field>
      <Field
        id="register-username"
        label="Nome de usuário"
        hint="De 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado."
        required
        error={state.errors.username?.[0]}
      >
        <Input
          autoCapitalize="none"
          autoComplete="username"
          defaultValue={state.values.username}
          maxLength={32}
          name="username"
          placeholder="professor.maria"
          required
          spellCheck={false}
        />
      </Field>
      <Field
        id="register-password"
        label="Senha"
        hint="Use pelo menos 14 caracteres."
        required
        error={state.errors.password?.[0]}
      >
        <Input autoComplete="new-password" name="password" required type="password" />
      </Field>
      <Field id="register-password-confirmation" label="Repita a senha" required error={state.errors.passwordConfirmation?.[0]}>
        <Input autoComplete="new-password" name="passwordConfirmation" required type="password" />
      </Field>

      {state.message && <Alert variant="error">{state.message}</Alert>}
      <Button className="w-full" loading={pending} loadingText="Criando conta…" size="lg" type="submit">
        Criar minha conta
      </Button>
    </form>
  );
}
