"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/shared/ui/components/button";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="identifier">E-mail ou usuário</label>
        <input autoCapitalize="none" autoComplete="username" className="w-full rounded-md border border-slate-300 px-3 py-2" id="identifier" maxLength={254} name="identifier" required spellCheck={false} type="text" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="password">Senha</label>
        <input autoComplete="current-password" className="w-full rounded-md border border-slate-300 px-3 py-2" id="password" name="password" required type="password" />
      </div>
      {state.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}
