import { describe, expect, it } from "vitest";
import { activityDraftInputSchema, activityRevisionSnapshotSchema } from "./activity-schemas";
import { defaultSystemTheme } from "@/modules/themes/domain/theme-values";
import { getGameTemplate } from "@/modules/game-templates";

describe("ActivityRevisionSnapshot", () => {
  it("e uma copia independente do draft mutavel", () => {
    const content = [{ type: "item-list" as const, id: "lista", items: [{ id: "1", text: "Original" }] }];
    const presentationId = crypto.randomUUID();
    const snapshot = activityRevisionSnapshotSchema.parse({
      activityId: crypto.randomUUID(), slug: "teste-123", title: "Teste", description: null, tags: [], visibility: "public",
      content, defaultPresentationId: presentationId,
      presentations: [{ id: presentationId, name: "Roleta", templateKey: "wheel", gameConfig: getGameTemplate("wheel").defaultConfig, themeOverride: {}, isDefault: true }],
      resolvedTheme: defaultSystemTheme, publishedAt: new Date().toISOString(),
    });
    content[0]!.items[0]!.text = "Draft alterado";
    expect(snapshot.content[0]).toMatchObject({ type: "item-list", items: [{ text: "Original" }] });
  });

  it("exige apresentacao padrao e ao menos uma apresentacao", () => {
    expect(activityRevisionSnapshotSchema.safeParse({}).success).toBe(false);
  });

  it("serializa e recarrega pares visuais sem perder mídia ou identificadores", () => {
    const presentationId = crypto.randomUUID();
    const image = (filename: string) => ({ assetId: crypto.randomUUID(), kind: "image" as const, filename });
    const input = {
      title: "Pares visuais", description: null, tags: [], visibility: "private" as const, defaultPresentationId: presentationId,
      content: [{ type: "pair" as const, id: "pairs", pairs: [
        { id: "visual", left: "", right: "", leftMedia: image("left.png"), rightMedia: image("right.png") },
        { id: "mixed", left: "Texto", right: "", rightMedia: image("mixed.png") },
      ] }],
    };
    const reloaded = activityDraftInputSchema.parse(JSON.parse(JSON.stringify(activityDraftInputSchema.parse(input))));
    expect(reloaded.content[0]).toEqual(input.content[0]);
  });
});
