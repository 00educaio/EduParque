import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Use uma cor hexadecimal com seis digitos.");
const optionalHttpsUrlSchema = z.string().max(2_000).url().refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.");

export const themeValuesSchema = z.object({
  primaryColor: colorSchema.default("#047857"),
  secondaryColor: colorSchema.default("#0f172a"),
  surfaceColor: colorSchema.default("#ffffff"),
  textColor: colorSchema.default("#0f172a"),
  gradient: z.enum(["sunset", "ocean", "forest"]).nullable().default(null),
  backgroundImage: optionalHttpsUrlSchema.nullable().default(null),
  fontFamily: z.enum(["sans", "serif", "rounded"]).default("sans"),
  fontScale: z.number().min(0.8).max(1.4).default(1),
  borderRadius: z.number().int().min(0).max(32).default(16),
  cardStyle: z.enum(["flat", "bordered", "elevated"]).default("elevated"),
  buttonStyle: z.enum(["solid", "outline", "soft"]).default("solid"),
  animationIntensity: z.enum(["none", "low", "full"]).default("low"),
  sounds: z.boolean().default(true),
});

export const activityThemeOverrideSchema = themeValuesSchema.partial();
export type ThemeValues = z.infer<typeof themeValuesSchema>;
export type ActivityThemeOverride = z.infer<typeof activityThemeOverrideSchema>;

export const defaultSystemTheme: ThemeValues = themeValuesSchema.parse({});

export function resolveTheme(base: unknown, override: unknown): ThemeValues {
  const parsedBase = themeValuesSchema.parse(base);
  const parsedOverride = activityThemeOverrideSchema.parse(override);
  return themeValuesSchema.parse({ ...parsedBase, ...parsedOverride });
}
