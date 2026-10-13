import type { SessionCommand, SessionState } from "@/modules/game-sessions/domain/session";
import type { ActivityContent } from "@/shared/domain/content-blocks";

export interface TemplateRuntimeProps {
  mode: "preview" | "session";
  content: ActivityContent;
  config: Record<string, unknown>;
  sessionId: string;
  state?: SessionState;
  disabled?: boolean;
  send?: (command: SessionCommand) => Promise<SessionState | undefined>;
}

export function configRecord(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
