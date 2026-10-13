import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/ui/lib/utils";

const controlClass = "min-h-11 w-full rounded-field border border-border-strong bg-surface px-3 py-2 text-foreground shadow-field transition-colors duration-fast placeholder:text-foreground-muted focus:border-brand-blue focus:outline-none focus:ring-3 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, "resize-y", className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(controlClass, "cursor-pointer", className)} {...props} />;
});

export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(function Checkbox({ className, ...props }, ref) {
  return <span className="relative inline-grid size-5 shrink-0 place-items-center"><input ref={ref} type="checkbox" className={cn("peer size-5 appearance-none rounded-[5px] border border-border-strong bg-surface transition-colors checked:border-brand-blue checked:bg-brand-blue focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/25 disabled:opacity-50", className)} {...props} /><Check className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" aria-hidden="true" /></span>;
});

export function Field({ id, label, hint, error, required, children, className }: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  className?: string;
}) {
  const descriptionId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  return <div className={cn("flex flex-col gap-1.5", className)}><label className="text-sm font-bold text-foreground-secondary" htmlFor={id}>{label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}</label>{React.cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}{hint && <p id={descriptionId} className="m-0 text-xs text-foreground-muted">{hint}</p>}{error && <p id={errorId} className="m-0 text-xs font-semibold text-danger">{error}</p>}</div>;
}
