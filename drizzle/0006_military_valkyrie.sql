CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_login_attempts" (
	"identifier_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_window_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_login_attempts_user_id_users_id_fk') THEN
		ALTER TABLE "auth_login_attempts" ADD CONSTRAINT "auth_login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_login_attempts_user_idx" ON "auth_login_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_login_attempts_updated_idx" ON "auth_login_attempts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format_check') THEN
		ALTER TABLE "users" ADD CONSTRAINT "users_username_format_check" CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9._-]{3,32}$');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_password_hash_format_check') THEN
		ALTER TABLE "users" ADD CONSTRAINT "users_password_hash_format_check" CHECK ("password_hash" IS NULL OR "password_hash" ~ '^\$2[abxy]\$[0-9]{2}\$');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_failed_login_attempts_check') THEN
		ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_attempts_check" CHECK ("failed_login_attempts" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_login_attempts_failed_attempts_check') THEN
		ALTER TABLE "auth_login_attempts" ADD CONSTRAINT "auth_login_attempts_failed_attempts_check" CHECK ("failed_attempts" >= 0);
	END IF;
END $$;
