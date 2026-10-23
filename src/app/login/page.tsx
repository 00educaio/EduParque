import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { auth } from "@/modules/auth/infrastructure/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold">Entrar no EduParque</h1>
        <p className="mt-2 text-slate-600">Use seu e-mail ou nome de usuário e sua senha.</p>
      </div>
      <LoginForm />
      <p className="text-sm text-slate-600">
        O cadastro é feito somente por convite. Se você recebeu um link, abra-o para criar sua conta.
      </p>
    </main>
  );
}
