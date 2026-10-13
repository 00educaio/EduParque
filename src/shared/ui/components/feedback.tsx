import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/ui/lib/utils";

export function EmptyState({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={cn("rounded-card border border-dashed border-border-strong bg-surface-subtle px-6 py-12 text-center", className)}><h2 className="m-0 text-2xl font-bold text-brand-navy">{title}</h2>{description && <p className="mx-auto mt-2 max-w-xl text-foreground-muted">{description}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</div>;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-field bg-brand-navy-soft motion-reduce:animate-none", className)} aria-hidden="true" {...props} />;
}

export function Progress({ value, max = 100, label, className }: { value: number; max?: number; label: string; className?: string }) {
  const safeValue = Math.min(Math.max(value, 0), max);
  const percentage = max > 0 ? (safeValue / max) * 100 : 0;
  return <div className={cn("h-2 overflow-hidden rounded-pill bg-brand-navy-soft", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={safeValue}><span className="block h-full rounded-pill bg-brand-blue transition-[width] duration-normal motion-reduce:transition-none" style={{ width: `${percentage}%` }} /></div>;
}
