import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { getAvailableRegistrationInvite } from "@/modules/auth/application/registration-invites";
import { auth } from "@/modules/auth/infrastructure/auth";
import { Alert, BrandMark, Button, Card, CardContent, CardHeader } from "@/shared/ui/components";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user.id) redirect("/my-activities");

  const inviteParam = (await searchParams).invite;
  const inviteToken = typeof inviteParam === "string" ? inviteParam : "";
  const invite = await getAvailableRegistrationInvite(inviteToken);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-5 py-10 sm:px-6">
      <BrandMark href="/" className="self-center" />
      <Card>
        <CardHeader>
          <span className="eyebrow">Cadastro por convite</span>
          <h1 className="m-0 text-3xl font-bold text-brand-navy">Crie sua conta no EduParque</h1>
          <p className="m-0 text-foreground-muted">Prepare, adapte e conduza atividades com suas turmas.</p>
        </CardHeader>
        <CardContent>
          {invite ? (
            <RegisterForm email={invite.email} invite={inviteToken} />
          ) : (
            <div className="space-y-4">
              <Alert variant="error">Este convite é inválido, expirou ou já foi utilizado.</Alert>
              <p className="text-sm text-foreground-muted">Peça um novo link de cadastro ao responsável pelo EduParque.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/login">Voltar para o login</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="m-0 text-center text-sm text-foreground-muted">
        Já tem uma conta? <Link className="font-bold text-brand-blue-strong" href="/login">Entrar</Link>
      </p>
    </main>
  );
}
