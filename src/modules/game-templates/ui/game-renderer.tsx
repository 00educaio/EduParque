"use client";

import type { SessionCommand, SessionState } from "@/modules/game-sessions/domain/session";
import { getGameTemplate } from "@/modules/game-templates";
import { MatchingTemplate } from "@/modules/game-templates/matching/ui/matching-template";
import { GroupSortTemplate } from "@/modules/game-templates/group-sort/ui/group-sort-template";
import { QuizTemplate } from "@/modules/game-templates/quiz/ui/quiz-template";
import { TeamGridTemplate } from "@/modules/game-templates/team-grid/ui/team-grid-template";
import { UnscrambleTemplate } from "@/modules/game-templates/unscramble/ui/unscramble-template";
import { WheelTemplate } from "@/modules/game-templates/wheel/ui/wheel-template";
import type { ThemeValues } from "@/modules/themes/domain/theme-values";
import type { ActivityContent } from "@/shared/domain/content-blocks";

interface GameRendererProps {
  mode: "preview" | "session";
  templateKey: string;
  content: ActivityContent;
  config: Record<string, unknown>;
  theme: ThemeValues;
  sessionId?: string;
  state?: SessionState;
  disabled?: boolean;
  send?: (command: SessionCommand) => Promise<SessionState | undefined>;
}

export function GameRenderer({ mode, templateKey, content, config, theme, sessionId = "preview", state, disabled, send }: GameRendererProps) {
  const template = getGameTemplate(templateKey);
  const supported = content.filter((block) => template.supportedContentTypes.includes(block.type));
  const gradients = { sunset: "linear-gradient(135deg, #fff1df, #ffd8cb)", ocean: "linear-gradient(135deg, #e1f3ff, #dce8ff)", forest: "linear-gradient(135deg, #e0f3e5, #cce8d9)" } as const;
  const fontFamilies = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, serif", rounded: '"Trebuchet MS", Arial, sans-serif' } as const;
  const style = {
    "--game-primary": theme.primaryColor, "--game-secondary": theme.secondaryColor, "--game-surface": theme.surfaceColor, "--game-text": theme.textColor,
    "--game-radius": `${theme.borderRadius}px`, fontSize: `${theme.fontScale}rem`, fontFamily: fontFamilies[theme.fontFamily],
    backgroundImage: theme.backgroundImage ? `url(${JSON.stringify(theme.backgroundImage)})` : theme.gradient ? gradients[theme.gradient] : undefined,
    backgroundSize: "cover", backgroundPosition: "center",
  } as React.CSSProperties;
  const runtime = { mode, content: supported, config, sessionId, state, disabled, send };

  return (
    <section className={`game-renderer game-renderer--${theme.cardStyle} game-renderer--button-${theme.buttonStyle} game-renderer--animation-${theme.animationIntensity}`} style={style} data-mode={mode} aria-label={`${mode === "preview" ? "Preview" : "Sessão"} de ${template.name}`}>
      <div className="game-renderer__badge">{mode === "preview" ? "PREVIEW" : "SESSÃO"} · {template.name}</div>
      {templateKey === "quiz" && <QuizTemplate {...runtime} />}
      {templateKey === "matching" && <MatchingTemplate {...runtime} />}
      {templateKey === "wheel" && <WheelTemplate {...runtime} />}
      {templateKey === "group-sort" && <GroupSortTemplate {...runtime} />}
      {templateKey === "unscramble" && <UnscrambleTemplate {...runtime} />}
      {templateKey === "team-grid" && <TeamGridTemplate {...runtime} />}
    </section>
  );
}
