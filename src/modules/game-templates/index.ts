import { z } from "zod";
import type { ContentBlockType } from "@/shared/domain/content-blocks";

export const baseGameConfigSchema = z.object({
  teams: z.number().int().min(1).max(8).default(1),
  scoring: z.object({ correct: z.number().int().min(0).max(10_000).default(100) }).default({ correct: 100 }),
  timer: z.object({ enabled: z.boolean().default(false), seconds: z.number().int().min(5).max(600).default(30) }).default({ enabled: false, seconds: 30 }),
  shuffle: z.boolean().default(false),
  sound: z.boolean().default(true),
});

export interface GameTemplateDefinition<T extends z.ZodType = z.ZodType> {
  key: string;
  name: string;
  supportedContentTypes: readonly ContentBlockType[];
  configSchema: T;
  defaultConfig: z.infer<T>;
}

function defineTemplate<T extends z.ZodType>(definition: GameTemplateDefinition<T>) {
  return definition;
}

const definitions = [
  defineTemplate({
    key: "quiz", name: "Quiz", supportedContentTypes: ["prompt-answer"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ allowMultiple: z.boolean().default(true), revealExplanation: z.boolean().default(true) }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({}), template: { allowMultiple: true, revealExplanation: true } },
  }),
  defineTemplate({
    key: "matching", name: "Combinar", supportedContentTypes: ["pair"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ mode: z.enum(["connect", "memory"]).default("connect") }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({}), template: { mode: "connect" as const } },
  }),
  defineTemplate({
    key: "wheel", name: "Roleta", supportedContentTypes: ["item-list"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ removeAfterSpin: z.boolean().default(false), allowRepeat: z.boolean().default(true), timerAfterSpin: z.boolean().default(false) }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({}), template: { removeAfterSpin: false, allowRepeat: true, timerAfterSpin: false } },
  }),
  defineTemplate({
    key: "group-sort", name: "Separar grupos", supportedContentTypes: ["categorized-item"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ mode: z.enum(["board", "one-by-one"]).default("board") }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({}), template: { mode: "board" as const } },
  }),
  defineTemplate({
    key: "unscramble", name: "Desembaralhar", supportedContentTypes: ["sequence"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ tokenMode: z.enum(["character", "token", "word"]).default("token").transform((mode) => mode === "word" ? "token" as const : mode) }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({}), template: { tokenMode: "token" as const } },
  }),
  defineTemplate({
    key: "team-grid", name: "Grade de equipes", supportedContentTypes: ["prompt-answer"],
    configSchema: z.object({ base: baseGameConfigSchema, template: z.object({ gridColumns: z.number().int().min(2).max(8).default(4), bombTimer: z.boolean().default(false) }) }),
    defaultConfig: { base: baseGameConfigSchema.parse({ teams: 2 }), template: { gridColumns: 4, bombTimer: false } },
  }),
] as const;

export const templateRegistry = new Map<string, GameTemplateDefinition>(definitions.map((item) => [item.key, item]));
export const gameTemplates = [...definitions];

export function getGameTemplate(key: string): GameTemplateDefinition {
  const template = templateRegistry.get(key);
  if (!template) throw new Error(`Template desconhecido: ${key}`);
  return template;
}

export function parseGameConfig(templateKey: string, value: unknown): Record<string, unknown> {
  return getGameTemplate(templateKey).configSchema.parse(value) as Record<string, unknown>;
}
