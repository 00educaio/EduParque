CREATE TABLE "storage_objects" (
	"key" text PRIMARY KEY NOT NULL,
	"content" "bytea" NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "storage_objects_expires_idx" ON "storage_objects" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_storage_key_storage_objects_key_fk" FOREIGN KEY ("storage_key") REFERENCES "public"."storage_objects"("key") ON DELETE cascade ON UPDATE no action NOT VALID;
