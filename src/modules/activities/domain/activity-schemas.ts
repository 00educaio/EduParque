import { z } from "zod";
import { activityContentSchema, editableActivityContentSchema } from "@/shared/domain/content-blocks";
import { activityThemeOverrideSchema, themeValuesSchema } from "@/modules/themes/domain/theme-values";

export const activityVisibilitySchema = z.enum(["private", "unlisted", "public"]);

export const activityDraftInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  visibility: activityVisibilitySchema.default("private"),
  content: editableActivityContentSchema,
  defaultPresentationId: z.string().uuid().nullable().default(null),
});

export const presentationInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  templateKey: z.string().trim().min(1).max(50),
  gameConfig: z.record(z.string(), z.unknown()),
  themeOverride: activityThemeOverrideSchema.default({}),
  isDefault: z.boolean().default(false),
});

export const publishedPresentationSchema = presentationInputSchema.extend({ id: z.string().uuid() });

export const activityRevisionSnapshotSchema = z.object({
  activityId: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  visibility: activityVisibilitySchema,
  content: activityContentSchema,
  defaultPresentationId: z.string().uuid(),
  presentations: z.array(publishedPresentationSchema).min(1),
  resolvedTheme: themeValuesSchema,
  publishedAt: z.string().datetime(),
});

export type ActivityDraftInput = z.infer<typeof activityDraftInputSchema>;
export type PresentationInput = z.infer<typeof presentationInputSchema>;
export type ActivityRevisionSnapshot = z.infer<typeof activityRevisionSnapshotSchema>;
