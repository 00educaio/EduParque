import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/shared/ui/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-button border border-transparent px-4 text-sm font-bold no-underline transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-expo focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-blue text-white hover:bg-brand-blue-strong",
        secondary: "bg-brand-yellow text-brand-ink hover:bg-brand-yellow-soft",
        outline: "border-border-strong bg-surface text-brand-navy hover:border-brand-blue hover:bg-brand-blue-soft",
        ghost: "bg-transparent text-brand-navy hover:bg-brand-navy-soft",
        danger: "border-danger/35 bg-transparent text-danger hover:bg-danger-soft",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 px-3 py-1.5 text-xs",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function Button({ children, className, variant, size, asChild = false, disabled, loading = false, loadingText, ...props }: ButtonProps) {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size, className }))} aria-busy={loading || undefined} {...props}>{children}</Slot>;
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
