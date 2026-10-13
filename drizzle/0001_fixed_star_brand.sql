ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_presentation_id_presentations_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "state" DROP DEFAULT;