import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { ForbiddenError } from "@/modules/auth/application/policies";
import { createDatabase } from "@/shared/infrastructure/database/client";
import { getEnv } from "@/shared/infrastructure/config/env";
import { mediaAssets, storageObjects, users } from "@/shared/infrastructure/database/schema";
import { deleteOwnedMedia, getOwnedMedia, uploadMedia } from "./media-service";

const databaseDescribe = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const { db, sql } = createDatabase(getEnv().DATABASE_URL);
const onePixelPng = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
);

databaseDescribe("MediaService com PostgreSQL", () => {
  const userIds: string[] = [];
  const storageKeys: string[] = [];

  afterAll(async () => {
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    if (storageKeys.length) await db.delete(storageObjects).where(inArray(storageObjects.key, storageKeys));
    await sql.end();
  });

  it("permite que o proprietario apague o arquivo e seus metadados", async () => {
    const [owner, otherUser] = await db
      .insert(users)
      .values([{ email: `media-owner-${crypto.randomUUID()}@test.local` }, { email: `media-other-${crypto.randomUUID()}@test.local` }])
      .returning();
    userIds.push(owner!.id, otherUser!.id);

    const asset = await uploadMedia({
      ownerId: owner!.id,
      filename: "pixel.png",
      declaredMimeType: "image/png",
      body: onePixelPng,
    });
    storageKeys.push(asset.storageKey);

    await expect(getOwnedMedia(asset.id, owner!.id)).resolves.toMatchObject({ asset: { id: asset.id } });
    await expect(deleteOwnedMedia(asset.id, otherUser!.id)).rejects.toBeInstanceOf(ForbiddenError);

    await deleteOwnedMedia(asset.id, owner!.id);

    expect(await db.select().from(mediaAssets).where(eq(mediaAssets.id, asset.id))).toHaveLength(0);
    expect(await db.select().from(storageObjects).where(eq(storageObjects.key, asset.storageKey))).toHaveLength(0);
    await expect(getOwnedMedia(asset.id, owner!.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
