CREATE TYPE "public"."media_upload_status" AS ENUM('pending', 'ready');--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "upload_status" "media_upload_status" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "upload_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "media_assets_pending_expiry_idx" ON "media_assets" USING btree ("upload_status","upload_expires_at");