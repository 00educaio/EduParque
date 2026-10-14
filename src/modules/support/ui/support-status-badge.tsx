import { Badge } from "@/shared/ui/components/badge";
import { supportStatusLabels, type SupportTicketStatus } from "@/modules/support/domain/support-ticket";

const variants = { open: "warning", answered: "info", closed: "neutral" } as const;

export function SupportStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge className="support-status-badge" variant={variants[status]}>{supportStatusLabels[status]}</Badge>;
}
