import type { ElementType, ReactNode } from "react";
import { cn } from "@/shared/ui/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, compact = false, as: Heading = "h1", className }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  as?: ElementType;
  className?: string;
}) {
  return (
    <header className={cn("ds-page-header", compact && "ds-page-header--compact", className)}>
      <div className="ds-page-header__content">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("ds-section-header", className)}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}
