import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  color: hexColorSchema,
  score: z.number().int().min(-1_000_000).max(1_000_000),
});

export const timerConfigSchema = z.object({
  mode: z.enum(["off", "item", "question", "game"]),
  variant: z.enum(["standard", "bomb"]),
  durationSeconds: z.number().int().min(5).max(3_600),
  soundEnabled: z.boolean(),
});

export const sessionTimerSchema = timerConfigSchema.extend({
  remainingSeconds: z.number().min(0).max(3_600),
  deadlineAt: z.string().datetime().nullable(),
  running: z.boolean(),
  exploded: z.boolean(),
});

const undoFrameSchema = z.object({
  label: z.string(),
  teams: z.array(teamSchema),
  activeTeamIndex: z.number().int().min(0),
  currentItemIndex: z.number().int().min(0),
  revealed: z.boolean(),
  status: z.enum(["created", "active", "paused", "finished"]),
  timer: sessionTimerSchema,
  templateState: z.record(z.string(), z.unknown()),
  finishedAt: z.string().datetime().nullable(),
});

export const sessionStateSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().uuid(),
  status: z.enum(["created", "active", "paused", "finished"]),
  teams: z.array(teamSchema).min(1).max(8),
  activeTeamIndex: z.number().int().min(0).max(7),
  currentItemIndex: z.number().int().min(0),
  totalItems: z.number().int().min(1),
  revealed: z.boolean(),
  scoring: z.object({ defaultPoints: z.number().int().min(0).max(10_000) }),
  timer: sessionTimerSchema,
  template: z.object({
    key: z.string().min(1),
    sourceTemplateKey: z.string().min(1),
    state: z.record(z.string(), z.unknown()),
  }),
  undoStack: z.array(undoFrameSchema).max(20),
  sequence: z.number().int().min(0),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

const pointsSchema = z.number().int().min(0).max(10_000);

export const sessionCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("startSession") }),
  z.object({ type: z.literal("next") }),
  z.object({ type: z.literal("reveal") }),
  z.object({ type: z.literal("awardPoints"), teamId: z.string().uuid(), points: pointsSchema.optional(), suggestedPoints: pointsSchema.optional() }),
  z.object({ type: z.literal("removePoints"), teamId: z.string().uuid(), points: pointsSchema }),
  z.object({ type: z.literal("renameTeam"), teamId: z.string().uuid(), name: z.string().trim().min(1).max(40) }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
  z.object({ type: z.literal("undo") }),
  z.object({ type: z.literal("finish") }),
  z.object({
    type: z.literal("updateTemplateState"),
    state: z.record(z.string(), z.unknown()),
    award: z.object({ teamId: z.string().uuid(), suggestedPoints: pointsSchema.optional() }).optional(),
    advance: z.boolean().optional(),
    advanceTurn: z.boolean().optional(),
    expectedSequence: z.number().int().min(0).optional(),
    finish: z.boolean().optional(),
    restartTimer: z.boolean().optional(),
  }),
  z.object({ type: z.literal("expireTimer") }),
]);

export const sessionEventSchema = z.object({
  sessionId: z.string().uuid(),
  sequence: z.number().int().min(0),
  type: z.enum(["sessionCreated", "sessionStarted", "itemAdvanced", "answerRevealed", "pointsAwarded", "pointsRemoved", "teamRenamed", "sessionPaused", "sessionResumed", "actionUndone", "sessionFinished", "templateStateUpdated", "timerExpired"]),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.string().datetime(),
});

export const createSessionInputSchema = z.object({
  activityId: z.string().uuid(),
  presentationId: z.string().uuid(),
  teams: z.array(z.object({ name: z.string().trim().min(1).max(40), color: hexColorSchema })).min(1).max(8),
  timer: timerConfigSchema,
});

export type Team = z.infer<typeof teamSchema>;
export type TimerConfig = z.infer<typeof timerConfigSchema>;
export type SessionTimer = z.infer<typeof sessionTimerSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type SessionCommand = z.infer<typeof sessionCommandSchema>;
export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;
