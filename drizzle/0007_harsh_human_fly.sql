CREATE TABLE "registration_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "registration_invites_token_hash_unique" ON "registration_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "registration_invites_email_idx" ON "registration_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "registration_invites_expires_idx" ON "registration_invites" USING btree ("expires_at");