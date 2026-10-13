import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";

type ActivityCardProps = {
  href: string;
  title: string;
  description?: string | null;
  eyebrow?: ReactNode;
  tags?: string[];
  metadata: ReactNode;
  actions: ReactNode;
  accent?: "blue" | "yellow" | "green" | "navy";
  className?: string;
};

export function ActivityCard({
  href,
  title,
  description,
  eyebrow,
  tags = [],
  metadata,
  actions,
  accent = "blue",
  className = "",
}: ActivityCardProps) {
  return (
    <article className={`catalog-card catalog-card--${accent} ${className}`.trim()}>
      <div className="catalog-card__accent" aria-hidden="true" />
      <div className="catalog-card__body">
        <div className="catalog-card__topline">
          {eyebrow && <div className="catalog-card__eyebrow">{eyebrow}</div>}
          {tags.length > 0 && (
            <ul className="catalog-card__tags" aria-label="Tags da atividade">
              {tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}
              {tags.length > 3 && <li aria-label={`Mais ${tags.length - 3} tags`}>+{tags.length - 3}</li>}
            </ul>
          )}
        </div>
        <h2 className="catalog-card__title"><Link href={href as Route}>{title}</Link></h2>
        <p className={`catalog-card__description ${description ? "" : "is-empty"}`.trim()}>
          {description || "Esta atividade ainda não tem descrição."}
        </p>
        <div className="catalog-card__metadata">{metadata}</div>
      </div>
      <footer className="catalog-card__footer">{actions}</footer>
    </article>
  );
}
