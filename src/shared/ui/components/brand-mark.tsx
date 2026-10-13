import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/shared/ui/lib/utils";

export function BrandMark({ href, className }: { href?: Route; className?: string }) {
  const content = (
    <>
      <svg className="brand-mark__symbol" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M4 20C4 11.2 11.2 4 20 4v16H4Z" fill="var(--brand-blue)" />
        <path d="M20 4c8.8 0 16 7.2 16 16H20V4Z" fill="var(--brand-green)" />
        <path d="M4 22h16v14H8a4 4 0 0 1-4-4V22Z" fill="var(--brand-yellow)" />
        <path d="M22 22h14v10a4 4 0 0 1-4 4H22V22Z" fill="var(--brand-navy)" />
      </svg>
      <span className="brand-mark__word">EduParque</span>
    </>
  );

  if (href) return <Link className={cn("brand-mark", className)} href={href} aria-label="EduParque — início">{content}</Link>;
  return <span className={cn("brand-mark", className)}>{content}</span>;
}
