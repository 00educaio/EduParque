import type { HTMLAttributes } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/lib/utils";

const alertVariants = cva("flex gap-3 rounded-field border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-brand-blue/25 bg-brand-blue-soft text-brand-navy",
      success: "border-success/25 bg-success-soft text-success",
      warning: "border-warning/25 bg-warning-soft text-warning",
      error: "border-danger/25 bg-danger-soft text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

export function Alert({ className, variant = "info", children, role, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  const Icon = icons[variant ?? "info"];
  return <div className={cn(alertVariants({ variant }), className)} role={role ?? (variant === "error" ? "alert" : "status")} {...props}><Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div>{children}</div></div>;
}
