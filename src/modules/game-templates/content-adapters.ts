import type { ContentBlock, ContentBlockType } from "@/shared/domain/content-blocks";

export interface ContentAdapter {
  sourceType: ContentBlockType;
  targetType: ContentBlockType;
  canConvert(block: ContentBlock): boolean;
  convert(block: ContentBlock): ContentBlock;
}

const pairToPromptAnswer: ContentAdapter = {
  sourceType: "pair",
  targetType: "prompt-answer",
  canConvert: (block) => block.type === "pair" && block.pairs.length >= 2 && block.pairs.every((pair) => pair.left.trim() && pair.right.trim()),
  convert(block) {
    if (block.type !== "pair") throw new Error("Conteudo incompativel com o adapter.");
    return {
      type: "prompt-answer",
      id: `${block.id}-quiz`,
      items: block.pairs.map((pair) => ({
        id: pair.id,
        prompt: pair.left,
        answers: block.pairs.map((candidate) => ({ id: `${pair.id}-${candidate.id}`, text: candidate.right, isCorrect: candidate.id === pair.id })),
      })),
    };
  },
};

const pairToItemList: ContentAdapter = {
  sourceType: "pair",
  targetType: "item-list",
  canConvert: (block) => block.type === "pair" && block.pairs.every((pair) => pair.left.trim()),
  convert(block) {
    if (block.type !== "pair") throw new Error("Conteudo incompativel com o adapter.");
    return { type: "item-list", id: `${block.id}-list`, items: block.pairs.map((pair) => ({ id: pair.id, text: pair.left, answer: pair.right, media: pair.leftMedia ?? pair.media })) };
  },
};

export class ContentAdapterRegistry {
  constructor(private readonly adapters: readonly ContentAdapter[]) {}

  find(sourceType: ContentBlockType, targetType: ContentBlockType) {
    return this.adapters.find((adapter) => adapter.sourceType === sourceType && adapter.targetType === targetType);
  }

  convert(block: ContentBlock, targetType: ContentBlockType): ContentBlock {
    if (block.type === targetType) return structuredClone(block);
    const adapter = this.find(block.type, targetType);
    if (!adapter?.canConvert(block)) throw new Error(`Conversao segura indisponivel: ${block.type} -> ${targetType}`);
    return adapter.convert(block);
  }
}

export const contentAdapterRegistry = new ContentAdapterRegistry([pairToPromptAnswer, pairToItemList]);
