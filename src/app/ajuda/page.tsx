import Link from "next/link";
import { BookOpenCheck, Gamepad2, GraduationCap, MessagesSquare } from "lucide-react";
import { auth } from "@/modules/auth/infrastructure/auth";
import { gameHelpEntries, helpGuides } from "@/modules/help/help-content";
import { GuidePanel } from "@/modules/help/guide-panel";
import { AppHeader, type AppHeaderLink } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";
import { Button } from "@/shared/ui/components/button";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const session = await auth();
  const links: AppHeaderLink[] = [{ href: "/library", label: "Biblioteca" }];
  links.push(session ? { href: "/my-activities", label: "Minhas atividades" } : { href: "/login", label: "Entrar" });

  return (
    <AppShell className="help-page" header={<AppHeader links={links} />}>
      <header className="help-hero">
        <span className="help-hero__icon"><GraduationCap aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">Ajuda do EduParque</span>
          <h1>O próximo passo, sem complicação</h1>
          <p>Escolha um guia para acompanhar as telas reais ou consulte as regras rápidas de cada jogo.</p>
        </div>
      </header>

      <aside className="help-support-link" aria-label="Atendimento ao professor">
        <div><strong>Ainda precisa de ajuda?</strong><p>Envie uma dúvida, sugestão ou relato técnico para a equipe EduParque.</p></div>
        <Button asChild><Link href="/sac"><MessagesSquare aria-hidden="true" /> Falar com o suporte</Link></Button>
      </aside>

      <section className="help-guides" aria-labelledby="help-guides-title">
        <div className="help-section-heading">
          <BookOpenCheck aria-hidden="true" />
          <div><span className="eyebrow">Aprenda fazendo</span><h2 id="help-guides-title">Guias passo a passo</h2></div>
        </div>
        <p className="help-section-intro">Você decide quando avançar. Os guias apenas orientam e abrem telas; eles nunca salvam, iniciam ou publicam por você.</p>
        <div className="help-guide-grid">
          {helpGuides.map((guide) => <GuidePanel key={guide.id} guide={guide} />)}
        </div>
      </section>

      <section id="como-funcionam-os-jogos" className="help-games" aria-labelledby="help-games-title">
        <div className="help-section-heading">
          <Gamepad2 aria-hidden="true" />
          <div><span className="eyebrow">Consulta rápida</span><h2 id="help-games-title">Como funcionam os jogos?</h2></div>
        </div>
        <p className="help-section-intro">As ações de placar, timer, avanço e finalização continuam sob controle de quem apresenta a sessão.</p>
        <div className="help-games__grid">
          {gameHelpEntries.map((game) => (
            <article id={`jogo-${game.key}`} className="game-help-card" key={game.key}>
              <h3>{game.name}</h3>
              <dl>{game.topics.map((topic) => <div key={topic.label}><dt>{topic.label}</dt><dd>{topic.text}</dd></div>)}</dl>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
