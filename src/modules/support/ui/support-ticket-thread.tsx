import { Headphones, UserRound } from "lucide-react";

type ThreadMessage = {
  id: string;
  authorKind: "teacher" | "admin";
  authorName: string | null;
  body: string;
  createdAt: Date;
};

const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export function SupportTicketThread({ messages }: { messages: ThreadMessage[] }) {
  return (
    <ol className="support-thread" aria-label="Histórico da solicitação">
      {messages.map((message, index) => (
        <li className={`support-message support-message--${message.authorKind}`} key={message.id}>
          <div className="support-message__icon">{message.authorKind === "admin" ? <Headphones aria-hidden="true" /> : <UserRound aria-hidden="true" />}</div>
          <article>
            <header>
              <strong>{message.authorKind === "admin" ? "Equipe EduParque" : message.authorName || "Professor"}</strong>
              {index === 0 && <span>Solicitação original</span>}
              <time dateTime={message.createdAt.toISOString()}>{formatter.format(message.createdAt)}</time>
            </header>
            <p>{message.body}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
