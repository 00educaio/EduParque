const DESKTOP_GRID_GAP = 10;
const COMPACT_GRID_GAP = 6;
const MIN_CARD_WIDTH = 40;
const MAX_CARD_WIDTH = 220;
const MIN_CARD_HEIGHT = 36;
const MAX_CARD_HEIGHT = 140;

export interface MemoryGridLayout {
  columns: number;
  rows: number;
  gridWidth: number;
  gridHeight: number;
  cardWidth: number;
  cardHeight: number;
  availableHeight: number;
  gap: number;
}

/** Chooses a compact grid from both the card count and the measured play area. */
export function memoryGridLayout(cardCount: number, width: number, availableHeight: number): MemoryGridLayout {
  const safeAvailableHeight = Math.max(MIN_CARD_HEIGHT, Math.floor(availableHeight));
  const gap = width < 420 ? COMPACT_GRID_GAP : DESKTOP_GRID_GAP;
  if (cardCount <= 0 || width <= 0) return {
    columns: 1, rows: 0, gridWidth: MIN_CARD_WIDTH, gridHeight: 0,
    cardWidth: MIN_CARD_WIDTH, cardHeight: MIN_CARD_HEIGHT, availableHeight: safeAvailableHeight, gap,
  };

  const maxColumns = Math.max(1, Math.min(cardCount, Math.floor((width + gap) / (MIN_CARD_WIDTH + gap))));
  const minColumns = cardCount >= 4 && maxColumns >= 2 ? 2 : 1;
  const targetRatio = width / safeAvailableHeight;
  let best = {
    columns: minColumns, rows: Math.ceil(cardCount / minColumns), gridWidth: Math.min(MAX_CARD_WIDTH, width),
    gridHeight: MIN_CARD_HEIGHT, cardWidth: Math.min(MAX_CARD_WIDTH, width), cardHeight: MIN_CARD_HEIGHT,
    score: Number.POSITIVE_INFINITY,
  };

  for (let columns = minColumns; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(cardCount / columns);
    const rawWidth = (width - gap * (columns - 1)) / columns;
    const cardWidth = Math.min(MAX_CARD_WIDTH, rawWidth);
    const heightPerRow = (safeAvailableHeight - gap * (rows - 1)) / rows;
    const cardHeight = Math.floor(Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, cardWidth * 0.72, heightPerRow)));
    const renderedWidth = cardWidth * Math.min(columns, cardCount) + gap * (Math.min(columns, cardCount) - 1);
    const renderedHeight = cardHeight * rows + gap * (rows - 1);
    const overflow = Math.max(0, renderedHeight - safeAvailableHeight) / safeAvailableHeight;
    const aspectPenalty = Math.abs(renderedWidth / renderedHeight - targetRatio);
    const emptySlots = rows * columns - cardCount;
    const lastRowCards = cardCount % columns || columns;
    const raggedRowPenalty = lastRowCards === columns ? 0 : (1 - lastRowCards / columns) * 1.2 + emptySlots * 0.08;
    const sparseLastRowPenalty = lastRowCards < Math.ceil(columns / 2) ? 0.8 : 0;
    const tallDesktopPenalty = width >= 600 && rows > columns ? (rows - columns) * 0.25 : 0;
    const compactCardPenalty = Math.max(0, 76 - cardHeight) / 76 * 0.45;
    const score = overflow * 1_000 + aspectPenalty + raggedRowPenalty + sparseLastRowPenalty + tallDesktopPenalty + compactCardPenalty;

    if (score < best.score) {
      const roundedCardWidth = Math.floor(cardWidth);
      best = {
        columns, rows, gridWidth: roundedCardWidth * columns + gap * (columns - 1),
        gridHeight: cardHeight * rows + gap * (rows - 1), cardWidth: roundedCardWidth, cardHeight, score,
      };
    }
  }

  return {
    columns: best.columns, rows: best.rows, gridWidth: best.gridWidth, gridHeight: best.gridHeight,
    cardWidth: best.cardWidth, cardHeight: best.cardHeight, availableHeight: safeAvailableHeight, gap,
  };
}
