import Link from "next/link";
import { auth, signOut } from "@/modules/auth/infrastructure/auth";
import { getMessages } from "@/shared/i18n/config";
import { Button } from "@/shared/ui/components/button";
import { AppHeader, type AppHeaderLink } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";
import { CreateActivityButton } from "@/modules/activities/ui/create-activity-button";

export default async function HomePage() {
  const [session, messages] = await Promise.all([auth(), getMessages("pt-BR")]);
  const headerLinks: AppHeaderLink[] = [{ href: "/library", label: "Biblioteca" }];
  if (session) headerLinks.push({ href: "/my-activities", label: "Minhas atividades" });
  if (session?.user.role === "ADMIN") headerLinks.push({ href: "/admin/users", label: "Admin" });

  const identity = session?.user.email ?? session?.user.name ?? "Professor";

  return (
    <AppShell className="home-shell" header={<AppHeader links={headerLinks} />}>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__content">
          <span className="home-hero__eyebrow">Parque Biblioteca · Rede Areté</span>
          <h1 id="home-title">{messages["home.title"]}</h1>
          <p className="home-hero__lead">
            Crie, adapte e apresente experiências educacionais que transformam conteúdo em participação.
          </p>

          <div className="home-hero__actions" aria-label="Ações principais">
            {session ? (
              <>
                <CreateActivityButton />
                <Button asChild variant="secondary" size="lg">
                  <Link href="/my-activities">Ver minhas atividades</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="home-hero__outline-action">
                  <Link href="/library">Explorar biblioteca</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/login">Entrar para criar</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="home-hero__outline-action">
                  <Link href="/library">Explorar biblioteca</Link>
                </Button>
              </>
            )}
          </div>

          <div className="home-hero__session">
            <span className="home-hero__session-dot" aria-hidden="true" />
            <span>{session ? `${messages["auth.signedIn"]} ${identity}` : messages["auth.anonymous"]}</span>
            {session && (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="home-hero__sign-out" type="submit">Sair</button>
              </form>
            )}
          </div>
        </div>

        <div className="home-hero__art" aria-hidden="true">
          <span className="home-art__star home-art__star--large" />
          <span className="home-art__star home-art__star--small" />
          <span className="home-art__circle" />
          <span className="home-art__arc" />
          <span className="home-art__tile home-art__tile--yellow" />
          <span className="home-art__tile home-art__tile--green" />
          <span className="home-art__tile home-art__tile--navy" />
          <span className="home-art__path" />
          <span className="home-art__dot home-art__dot--one" />
          <span className="home-art__dot home-art__dot--two" />
          <span className="home-art__dot home-art__dot--three" />
        </div>
      </section>
    </AppShell>
  );
}
