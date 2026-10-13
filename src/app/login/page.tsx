import { redirect } from "next/navigation";
import { auth, enabledAuthProviders, signIn } from "@/modules/auth/infrastructure/auth";
import { Button } from "@/shared/ui/components/button";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold">Entrar no EduParque</h1>
        <p className="mt-2 text-slate-600">Use um dos provedores configurados no ambiente.</p>
      </div>
      {enabledAuthProviders.development && (
        <form
          action={async (formData) => {
            "use server";
            await signIn("dev", {
              name: String(formData.get("name")),
              email: String(formData.get("email")),
              redirectTo: "/",
            });
          }}
          className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <p className="text-sm font-semibold text-emerald-900">Acesso local de desenvolvimento</p>
          <label className="block text-sm font-medium" htmlFor="dev-name">Nome</label>
          <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2" id="dev-name" name="name" type="text" defaultValue="Professor local" minLength={2} required />
          <label className="block text-sm font-medium" htmlFor="dev-email">E-mail</label>
          <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2" id="dev-email" name="email" type="email" defaultValue="professor@eduparque.local" required />
          <Button className="w-full" type="submit">Entrar localmente</Button>
          <small className="block text-emerald-800">Disponível somente fora de produção.</small>
        </form>
      )}
      {enabledAuthProviders.google && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button className="w-full" type="submit">Continuar com Google</Button>
        </form>
      )}
      {enabledAuthProviders.magicLink && (
        <form
          action={async (formData) => {
            "use server";
            await signIn("nodemailer", { email: String(formData.get("email")), redirectTo: "/" });
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium" htmlFor="email">E-mail</label>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" id="email" name="email" type="email" required />
          <Button className="w-full" variant="outline" type="submit">Receber link de acesso</Button>
        </form>
      )}
      {!enabledAuthProviders.development && !enabledAuthProviders.google && !enabledAuthProviders.magicLink && (
        <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Nenhum provedor de acesso foi configurado. Consulte o arquivo .env.example.
        </p>
      )}
    </main>
  );
}
