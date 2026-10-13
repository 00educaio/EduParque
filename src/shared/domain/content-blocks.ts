import { z } from "zod";

const idSchema = z.string().trim().min(1).max(100);
const textSchema = z.string().trim().min(1).max(10_000);
const draftTextSchema = z.string().max(10_000);

export const mediaReferenceSchema = z.object({
  assetId: z.string().uuid(),
  kind: z.enum(["image", "audio"]),
  filename: z.string().trim().min(1).max(255),
});

export const contentBlockTypeSchema = z.enum([
  "prompt-answer",
  "pair",
  "item-list",
  "categorized-item",
  "sequence",
]);

export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>;

const answerSchema = z.object({
  id: idSchema,
  text: textSchema,
  isCorrect: z.boolean(),
});

const promptAnswerItemSchema = z
  .object({
    id: idSchema,
    prompt: textSchema,
    answers: z.array(answerSchema).min(1).max(20),
    explanation: z.string().trim().max(10_000).optional(),
    media: mediaReferenceSchema.optional(),
  })
  .superRefine((item, context) => {
    if (!item.answers.some((answer) => answer.isCorrect)) {
      context.addIssue({
        code: "custom",
        message: "Cada pergunta deve possuir ao menos uma resposta correta.",
        path: ["answers"],
      });
    }
  });

export const promptAnswerBlockSchema = z.object({
  type: z.literal("prompt-answer"),
  id: idSchema,
  items: z.array(promptAnswerItemSchema).min(1).max(500),
});

const pairItemSchema = z.object({
  id: idSchema,
  left: draftTextSchema,
  right: draftTextSchema,
  // `media` is kept for activities created before each side had its own media.
  media: mediaReferenceSchema.optional(),
  leftMedia: mediaReferenceSchema.optional(),
  rightMedia: mediaReferenceSchema.optional(),
}).superRefine((pair, context) => {
  if (!pair.left.trim() && !pair.leftMedia && !pair.media) {
    context.addIssue({ code: "custom", message: "Adicione texto ou mídia ao item.", path: ["left"] });
  }
  if (!pair.right.trim() && !pair.rightMedia) {
    context.addIssue({ code: "custom", message: "Adicione texto ou mídia à correspondência.", path: ["right"] });
  }
});

export const pairBlockSchema = z.object({
  type: z.literal("pair"),
  id: idSchema,
  pairs: z.array(pairItemSchema).min(2).max(200),
});

export const itemListBlockSchema = z.object({
  type: z.literal("item-list"),
  id: idSchema,
  items: z
    .array(
      z.object({
        id: idSchema,
        text: textSchema,
        prompt: z.string().trim().max(10_000).optional(),
        answer: z.string().trim().max(10_000).optional(),
        media: mediaReferenceSchema.optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const categorizedItemBlockSchema = z.object({
  type: z.literal("categorized-item"),
  id: idSchema,
  categories: z
    .array(
      z.object({
        id: idSchema,
        name: textSchema,
        items: z.array(z.object({ id: idSchema, text: textSchema, media: mediaReferenceSchema.optional() })).min(1).max(200),
      }),
    )
    .min(2)
    .max(20),
});

export const sequenceBlockSchema = z.object({
  type: z.literal("sequence"),
  id: idSchema,
  sequences: z
    .array(
      z.object({
        id: idSchema,
        prompt: z.string().trim().max(10_000).optional(),
        tokens: z.array(textSchema).min(2).max(100),
        splitMode: z.enum(["word", "character"]).optional(),
        media: mediaReferenceSchema.optional(),
      }),
    )
    .min(1)
    .max(200),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  promptAnswerBlockSchema,
  pairBlockSchema,
  itemListBlockSchema,
  categorizedItemBlockSchema,
  sequenceBlockSchema,
]);

export const activityContentSchema = z.array(contentBlockSchema).max(100);

const draftAnswerSchema = z.object({ id: idSchema, text: draftTextSchema, isCorrect: z.boolean() });
const draftPromptAnswerBlockSchema = z.object({
  type: z.literal("prompt-answer"), id: idSchema,
  items: z.array(z.object({ id: idSchema, prompt: draftTextSchema, answers: z.array(draftAnswerSchema).max(20), explanation: draftTextSchema.optional(), media: mediaReferenceSchema.optional() })).max(500),
});
const draftPairBlockSchema = z.object({
  type: z.literal("pair"), id: idSchema,
  pairs: z.array(z.object({
    id: idSchema,
    left: draftTextSchema,
    right: draftTextSchema,
    media: mediaReferenceSchema.optional(),
    leftMedia: mediaReferenceSchema.optional(),
    rightMedia: mediaReferenceSchema.optional(),
  })).max(200),
});
const draftItemListBlockSchema = z.object({
  type: z.literal("item-list"), id: idSchema,
  items: z.array(z.object({ id: idSchema, text: draftTextSchema, prompt: draftTextSchema.optional(), answer: draftTextSchema.optional(), media: mediaReferenceSchema.optional() })).max(500),
});
const draftCategorizedItemBlockSchema = z.object({
  type: z.literal("categorized-item"), id: idSchema,
  categories: z.array(z.object({ id: idSchema, name: draftTextSchema, items: z.array(z.object({ id: idSchema, text: draftTextSchema, media: mediaReferenceSchema.optional() })).max(200) })).max(20),
});
const draftSequenceBlockSchema = z.object({
  type: z.literal("sequence"), id: idSchema,
  sequences: z.array(z.object({ id: idSchema, prompt: draftTextSchema.optional(), tokens: z.array(draftTextSchema).max(100), splitMode: z.enum(["word", "character"]).optional(), media: mediaReferenceSchema.optional() })).max(200),
});

export const editableContentBlockSchema = z.discriminatedUnion("type", [draftPromptAnswerBlockSchema, draftPairBlockSchema, draftItemListBlockSchema, draftCategorizedItemBlockSchema, draftSequenceBlockSchema]);
export const editableActivityContentSchema = z.array(editableContentBlockSchema).max(100);

export type PromptAnswerBlock = z.infer<typeof promptAnswerBlockSchema>;
export type PairBlock = z.infer<typeof pairBlockSchema>;
export type ItemListBlock = z.infer<typeof itemListBlockSchema>;
export type CategorizedItemBlock = z.infer<typeof categorizedItemBlockSchema>;
export type SequenceBlock = z.infer<typeof sequenceBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ActivityContent = z.infer<typeof activityContentSchema>;
export type MediaReference = z.infer<typeof mediaReferenceSchema>;
export type EditableContentBlock = z.infer<typeof editableContentBlockSchema>;
export type EditableActivityContent = z.infer<typeof editableActivityContentSchema>;
