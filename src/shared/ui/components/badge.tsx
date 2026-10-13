import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/lib/utils";

const badgeVariants = cva("inline-flex min-h-6 items-center rounded-pill px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      neutral: "bg-brand-navy-soft text-brand-navy",
      info: "bg-brand-blue-soft text-brand-blue-strong",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      error: "bg-danger-soft text-danger",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
