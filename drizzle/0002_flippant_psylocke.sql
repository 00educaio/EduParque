ALTER TABLE "game_sessions" ADD COLUMN "host_token_hash" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_revision_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Published revisions are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER activity_revisions_immutable
BEFORE UPDATE ON "activity_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_published_revision_update();
