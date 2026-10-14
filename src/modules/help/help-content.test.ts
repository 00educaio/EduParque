import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { gameHelpEntries, helpGuides } from "./help-content";

describe("conteúdo da ajuda", () => {
  it("documenta somente os seis jogos registrados e usa quatro tópicos por jogo", () => {
    expect(gameHelpEntries.map((entry) => entry.key)).toEqual([
      "quiz",
      "matching",
      "wheel",
      "group-sort",
      "unscramble",
      "team-grid",
    ]);
    expect(gameHelpEntries.every((entry) => entry.topics.length === 4)).toBe(true);
  });

  it("aponta os guias apenas para páginas reais", () => {
    const hrefs = helpGuides.flatMap((guide) => guide.steps.flatMap((step) => step.href ? [step.href] : []));
    for (const href of hrefs) {
      const pathname = href.split("#")[0]!;
      expect(existsSync(resolve(process.cwd(), `src/app${pathname}/page.tsx`)), href).toBe(true);
    }
  });
});
