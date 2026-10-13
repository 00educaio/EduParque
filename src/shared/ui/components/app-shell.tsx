import type { ReactNode } from "react";
import { cn } from "@/shared/ui/lib/utils";

export function AppShell({ children, header, className }: { children: ReactNode; header?: ReactNode; className?: string }) {
  return <main className={cn("page-shell", className)}>{header}{children}</main>;
}
