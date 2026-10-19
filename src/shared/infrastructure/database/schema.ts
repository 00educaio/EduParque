import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { EditableActivityContent } from "@/shared/domain/content-blocks";
import type { SessionState } from "@/modules/game-sessions/domain/session";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const activityVisibilityEnum = pgEnum("activity_visibility", ["private", "unlisted", "public"]);
export const themeKindEnum = pgEnum("theme_kind", ["system", "user"]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "audio"]);
export const mediaUploadStatusEnum = pgEnum("media_upload_status", ["pending", "ready"]);
export const sessionStatusEnum = pgEnum("session_status", ["created", "active", "paused", "finished"]);
export const supportTicketCategoryEnum = pgEnum("support_ticket_category", ["question", "suggestion", "technical", "other"]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["open", "answered", "closed"]);
export const supportAuthorKindEnum = pgEnum("support_author_kind", ["teacher", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    tags: text("tags").array().notNull().default([]),
    visibility: activityVisibilityEnum("visibility").notNull().default("private"),
    draftContent: jsonb("draft_content").$type<EditableActivityContent>().notNull().default([]),
    defaultPresentationId: uuid("default_presentation_id"),
    currentPublishedRevision: integer("current_published_revision"),
    remixedFromActivityId: uuid("remixed_from_activity_id"),
    remixedFromRevision: integer("remixed_from_revision"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("activities_slug_unique").on(table.slug),
    index("activities_owner_idx").on(table.ownerId),
    index("activities_visibility_idx").on(table.visibility),
  ],
);

export const activityRevisions = pgTable(
  "activity_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    snapshot: jsonb("revision_snapshot").$type<Record<string, unknown>>().notNull(),
    publishedById: uuid("published_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("activity_revisions_number_unique").on(table.activityId, table.revision)],
);

export const presentations = pgTable(
  "presentations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    templateKey: text("template_key").notNull(),
    gameConfig: jsonb("game_config").$type<Record<string, unknown>>().notNull().default({}),
    themeOverride: jsonb("theme_override").$type<Record<string, unknown>>().notNull().default({}),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("presentations_activity_idx").on(table.activityId)],
);

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    kind: themeKindEnum("kind").notNull(),
    name: text("name").notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("themes_owner_idx").on(table.ownerId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    uploadStatus: mediaUploadStatusEnum("upload_status").notNull().default("ready"),
    uploadExpiresAt: timestamp("upload_expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_owner_idx").on(table.ownerId),
    index("media_assets_pending_expiry_idx").on(table.uploadStatus, table.uploadExpiresAt),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.activityId] })],
);

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id").notNull().references(() => activities.id),
    revisionId: uuid("revision_id").references(() => activityRevisions.id),
    presentationId: uuid("presentation_id").notNull(),
    hostUserId: uuid("host_user_id").references(() => users.id, { onDelete: "set null" }),
    hostTokenHash: text("host_token_hash"),
    status: sessionStatusEnum("status").notNull().default("created"),
    state: jsonb("state").$type<SessionState>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("game_sessions_activity_idx").on(table.activityId)],
);

export const sessionEvents = pgTable(
  "session_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("session_events_sequence_unique").on(table.sessionId, table.sequence)],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    category: supportTicketCategoryEnum("category").notNull(),
    subject: text("subject").notNull(),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("support_tickets_owner_idx").on(table.ownerId),
    index("support_tickets_status_idx").on(table.status),
    index("support_tickets_updated_idx").on(table.updatedAt),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "restrict" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    authorKind: supportAuthorKindEnum("author_kind").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_messages_ticket_created_idx").on(table.ticketId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ActivityRevision = typeof activityRevisions.$inferSelect;
export type Presentation = typeof presentations.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type SessionEvent = typeof sessionEvents.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
