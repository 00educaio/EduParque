"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { deterministicShuffle, matchingPairs } from "@/modules/game-templates/domain/gameplay";
import { memoryGridLayout } from "@/modules/game-templates/matching/domain/memory-grid-layout";
import { MEMORY_SHUFFLE_SETTLE_MS, MEMORY_SHUFFLE_STEP_MS, memoryShuffleRemaining } from "@/modules/game-templates/matching/domain/memory-shuffle";
import { beginNextMemoryTurn, resolveMemoryCheck, restoreMemoryTurnState, selectMemoryCard, serializeMemoryTurnState } from "@/modules/game-templates/matching/domain/memory-turn";
import { ContentMedia } from "@/modules/game-templates/ui/content-media";
import { configRecord, stringList, type TemplateRuntimeProps } from "@/modules/game-templates/ui/template-runtime";
import type { MediaReference } from "@/shared/domain/content-blocks";

type Feedback = { correct: boolean; text: string } | null;
type MemoryCard = { key: string; pairId: string; text: string; media?: MediaReference; side: "left" | "right" };

function MemoryGrid({ cards, openIds, matchedIds, disabled, shuffling, shuffleStartedAt, shuffleSeed, onShuffleStateChange, onFlip }: {
  cards: MemoryCard[]; openIds: string[]; matchedIds: string[]; disabled: boolean;
  shuffling: boolean;
  shuffleStartedAt?: string | null; shuffleSeed: string; onShuffleStateChange: (shuffling: boolean) => void;
  onFlip: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cardElements = useRef(new Map<string, HTMLDivElement>());
  const displayCardKeys = useRef(cards.map((card) => card.key));
  const completedShuffle = useRef<string | null>(null);
  const [layout, setLayout] = useState(() => memoryGridLayout(cards.length, 640, 360));
  const [displayCards, setDisplayCards] = useState(cards);
  const shuffleKey = `${shuffleSeed}:${shuffleStartedAt ?? "preview"}:${cards.map((card) => card.key).join("|")}`;

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const renderer = grid.closest<HTMLElement>(".game-renderer");
    const update = () => {
      const gridRect = grid.getBoundingClientRect();
      const rendererRect = renderer?.getBoundingClientRect();
      let minRendererHeight = window.innerHeight * 0.7;
      if (renderer) minRendererHeight = Number.parseFloat(getComputedStyle(renderer).minHeight) || renderer.clientHeight;
      const currentRendererHeight = renderer?.clientHeight ?? minRendererHeight;
      const targetBottom = rendererRect ? rendererRect.top + Math.max(minRendererHeight, Math.min(currentRendererHeight, window.innerHeight * 0.75)) : gridRect.top + window.innerHeight * 0.6;
      const availableHeight = Math.max(180, targetBottom - gridRect.top - 20);
      setLayout(memoryGridLayout(cards.length, grid.clientWidth, availableHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    if (renderer) observer.observe(renderer);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [cards.length]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const remaining = memoryShuffleRemaining(shuffleStartedAt, Date.now(), reducedMotion);
    if (!remaining || completedShuffle.current === shuffleKey) {
      onShuffleStateChange(false);
      return;
    }

    onShuffleStateChange(true);
    let active = true;
    let step = 0;
    let finishTimer: number | undefined;
    const runningAnimations = new Set<Animation>();

    const transitionTo = (nextCards: MemoryCard[], duration: number) => {
      if (!active) return;
      const previousPositions = new Map(Array.from(cardElements.current, ([key, element]) => [key, element.getBoundingClientRect()]));
      displayCardKeys.current = nextCards.map((card) => card.key);
      flushSync(() => setDisplayCards(nextCards));
      for (const [key, element] of cardElements.current) {
        const previous = previousPositions.get(key);
        if (!previous) continue;
        const next = element.getBoundingClientRect();
        const deltaX = previous.left - next.left;
        const deltaY = previous.top - next.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;
        element.getAnimations().forEach((animation) => animation.cancel());
        const animation = element.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px) scale(.96)` }, { transform: "translate(0, 0) scale(1)" }],
          { duration, easing: "cubic-bezier(.22, .8, .28, 1)", fill: "both" },
        );
        runningAnimations.add(animation);
        animation.addEventListener("finish", () => runningAnimations.delete(animation), { once: true });
        animation.addEventListener("cancel", () => runningAnimations.delete(animation), { once: true });
      }
    };

    const showNextShuffle = () => {
      step += 1;
      let nextCards = deterministicShuffle(cards, `${shuffleSeed}:visual:${step}`);
      if (nextCards.length > 1 && nextCards.every((card, index) => card.key === displayCardKeys.current[index])) {
        nextCards = [...nextCards.slice(1), nextCards[0]!];
      }
      transitionTo(nextCards, Math.min(520, MEMORY_SHUFFLE_STEP_MS - 70));
    };

    if (remaining <= MEMORY_SHUFFLE_SETTLE_MS) {
      finishTimer = window.setTimeout(() => {
        if (!active) return;
        completedShuffle.current = shuffleKey;
        onShuffleStateChange(false);
      }, remaining);
      return () => {
        active = false;
        if (finishTimer) window.clearTimeout(finishTimer);
      };
    }

    const firstMoveTimer = window.setTimeout(showNextShuffle, 60);
    const shuffleInterval = window.setInterval(showNextShuffle, MEMORY_SHUFFLE_STEP_MS);
    const settleTimer = window.setTimeout(() => {
      window.clearInterval(shuffleInterval);
      transitionTo(cards, MEMORY_SHUFFLE_SETTLE_MS);
      finishTimer = window.setTimeout(() => {
        if (!active) return;
        completedShuffle.current = shuffleKey;
        onShuffleStateChange(false);
      }, MEMORY_SHUFFLE_SETTLE_MS);
    }, remaining - MEMORY_SHUFFLE_SETTLE_MS);

    return () => {
      active = false;
      window.clearTimeout(firstMoveTimer);
      window.clearInterval(shuffleInterval);
      window.clearTimeout(settleTimer);
      if (finishTimer) window.clearTimeout(finishTimer);
      runningAnimations.forEach((animation) => animation.cancel());
    };
  }, [cards, onShuffleStateChange, shuffleKey, shuffleSeed, shuffleStartedAt]);

  return <div ref={ref} className="memory-grid-shell" aria-busy={shuffling}><div className="memory-grid" style={{ "--memory-columns": layout.columns, "--memory-grid-width": `${layout.gridWidth}px`, "--memory-card-width": `${layout.cardWidth}px`, "--memory-card-height": `${layout.cardHeight}px`, "--memory-grid-gap": `${layout.gap}px` } as React.CSSProperties}>{displayCards.map((card) => {
    const visible = openIds.includes(card.key) || matchedIds.includes(card.pairId);
    const cardNumber = cards.findIndex((item) => item.key === card.key) + 1;
    const accessibleContent = card.text.trim() || card.media?.filename || "conteúdo visual";
    return <div className="memory-card-slot" key={card.key} ref={(element) => { if (element) cardElements.current.set(card.key, element); else cardElements.current.delete(card.key); }}><button className={`${visible ? "is-open" : ""} ${matchedIds.includes(card.pairId) ? "is-matched" : ""}`} disabled={disabled || matchedIds.includes(card.pairId)} aria-label={visible ? `Carta ${cardNumber}: ${accessibleContent}` : `Carta ${cardNumber} fechada`} onClick={() => onFlip(card.key)}>
      <span className="memory-card__number" aria-hidden="true">{cardNumber}</span>
      <span className="memory-card__face">{visible ? <><ContentMedia media={card.media} />{card.text.trim() && <span className="memory-card__label">{card.text}</span>}</> : null}</span>
    </button></div>;
  })}</div></div>;
}

export function MatchingTemplate({ mode, content, config, sessionId, state, disabled = false, send }: TemplateRuntimeProps) {
  const base = configRecord(config.base);
  const template = configRecord(config.template);
  const shuffle = base.shuffle === true;
  const pairs = useMemo(() => matchingPairs(content, shuffle, sessionId), [content, shuffle, sessionId]);
  const matchingState = configRecord(state?.template.state);
  const persistedMatched = stringList(matchingState.matchedIds);
  const [previewMatched, setPreviewMatched] = useState<string[]>([]);
  const [previewMemoryState, setPreviewMemoryState] = useState<Record<string, unknown>>({});
  const activePairIds = new Set(pairs.map((pair) => pair.id));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [shuffleLocked, setShuffleLocked] = useState(mode === "session" && Boolean(state?.startedAt));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const interactionLocked = useRef(false);
  const mismatchResolutionInFlight = useRef(false);
  const handleShuffleStateChange = useCallback((shuffling: boolean) => setShuffleLocked(shuffling), []);
  const rightPairs = useMemo(() => deterministicShuffle(pairs, `${sessionId}:right`), [pairs, sessionId]);
  const memoryCards = useMemo(() => deterministicShuffle(pairs.flatMap((pair) => [
    { key: `${pair.id}:left`, pairId: pair.id, text: pair.left, media: pair.leftMedia ?? pair.media, side: "left" as const },
    { key: `${pair.id}:right`, pairId: pair.id, text: pair.right, media: pair.rightMedia, side: "right" as const },
  ]), `${sessionId}:memory`), [pairs, sessionId]);
  const memoryStateSource = mode === "session" ? matchingState : previewMemoryState;
  const memoryTurn = restoreMemoryTurnState(memoryStateSource, memoryCards, shuffleLocked);
  const matchedIds = (template.mode === "memory"
    ? memoryTurn.matchedIds
    : mode === "session" ? persistedMatched : previewMatched).filter((id) => activePairIds.has(id));
  const visibleMemoryOpen = memoryTurn.openCardIds;

  async function recordMatch(pairId: string) {
    const nextMatched = [...new Set([...matchedIds, pairId])];
    setFeedback({ correct: true, text: "Par correto!" });
    if (mode === "preview") { setPreviewMatched(nextMatched); return; }
    if (!send || !state) return;
    await send({ type: "updateTemplateState", state: { ...state.template.state, matchedIds: nextMatched }, award: { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints }, advance: true });
  }

  async function connect(leftId: string | null, rightId: string | null) {
    if (!leftId || !rightId) return;
    if (leftId === rightId) await recordMatch(leftId);
    else setFeedback({ correct: false, text: "Esses itens não formam um par. Tente novamente." });
    setSelectedLeft(null); setSelectedRight(null);
  }

  async function flip(key: string) {
    if (disabled || shuffleLocked || interactionLocked.current) return;
    const selection = selectMemoryCard(memoryTurn, key, memoryCards);
    if (!selection.accepted) return;

    const transition = selection.outcome === "checking"
      ? resolveMemoryCheck(selection.state, memoryCards, new Date())
      : selection;
    const outcome = transition.outcome;

    interactionLocked.current = true;
    setFeedback(outcome === "match"
      ? { correct: true, text: "Par correto! Passando a vez." }
      : outcome === "mismatch"
        ? { correct: false, text: "Não combinou. As cartas serão fechadas em 5 segundos." }
        : null);

    let nextTurn = transition.state;
    if (outcome === "match" && nextTurn.phase === "TURN_TRANSITION") nextTurn = beginNextMemoryTurn(nextTurn);
    const serialized = serializeMemoryTurnState(memoryStateSource, nextTurn);

    if (mode === "preview") {
      setPreviewMemoryState(serialized);
      interactionLocked.current = outcome === "mismatch";
      return;
    }

    if (!send || !state) { interactionLocked.current = false; return; }
    const result = await send({
      type: "updateTemplateState",
      state: serialized,
      ...(outcome === "match" ? {
        award: { teamId: state.teams[state.activeTeamIndex]!.id, suggestedPoints: state.scoring.defaultPoints },
        ...(transition.state.phase === "GAME_FINISHED" ? { finish: true } : { advance: true }),
      } : {}),
    });
    if (!result || outcome !== "mismatch") interactionLocked.current = false;
  }

  useEffect(() => {
    if (memoryTurn.phase !== "SHOWING_MISMATCH" || !memoryTurn.mismatchDeadlineAt) return;
    if (mode === "session" && state?.status !== "active") return;
    interactionLocked.current = true;
    const remaining = Math.max(0, Date.parse(memoryTurn.mismatchDeadlineAt) - Date.now());
    const timer = window.setTimeout(async () => {
      if (mismatchResolutionInFlight.current) return;
      mismatchResolutionInFlight.current = true;
      const nextTurn = beginNextMemoryTurn(memoryTurn);
      const serialized = serializeMemoryTurnState(memoryStateSource, nextTurn);
      if (mode === "preview") setPreviewMemoryState(serialized);
      else if (send) await send({ type: "updateTemplateState", state: serialized, advanceTurn: true });
      mismatchResolutionInFlight.current = false;
      interactionLocked.current = false;
      setFeedback(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [memoryStateSource, memoryTurn, mode, send, state?.status]);

  if (!pairs.length) return <p className="template-empty">Adicione ao menos dois pares para jogar.</p>;
  const complete = matchedIds.length === pairs.length;

  if (template.mode === "memory") return <section className="template-game matching-template" aria-label="Jogo da memória">
    <header className="template-game__header"><span className="eyebrow">Memória</span><span className={`template-chip ${shuffleLocked ? "memory-shuffle-status" : ""}`} role="status">{shuffleLocked ? <><i aria-hidden="true"><b /><b /><b /></i> Embaralhando cartas…</> : `${matchedIds.length} / ${pairs.length} pares`}</span></header>
    <h2>Encontre as combinações</h2>
    <MemoryGrid key={memoryCards.map((card) => card.key).join("|")} cards={memoryCards} openIds={visibleMemoryOpen} matchedIds={matchedIds} disabled={disabled || shuffleLocked} shuffling={shuffleLocked} shuffleStartedAt={mode === "session" ? state?.startedAt : null} shuffleSeed={sessionId} onShuffleStateChange={handleShuffleStateChange} onFlip={(key) => void flip(key)} />
    {feedback && <p className={`template-feedback ${feedback.correct ? "is-success" : "is-error"}`} role="status">{feedback.text}</p>}
    {complete && <p className="template-feedback is-success"><strong>Todos os pares foram encontrados!</strong></p>}
  </section>;

  return <section className="template-game matching-template" aria-label="Conectar pares">
    <header className="template-game__header"><span className="eyebrow">Conectar</span><span className="template-chip">{matchedIds.length} / {pairs.length} pares</span></header>
    <h2>Selecione os itens correspondentes</h2>
    <div className="connect-grid">{pairs.flatMap((leftPair, index) => {
      const rightPair = rightPairs[index]!;
      return [
        <button key={`left-${leftPair.id}`} className={selectedLeft === leftPair.id ? "is-selected" : ""} disabled={disabled || matchedIds.includes(leftPair.id)} onClick={() => { const next = selectedLeft === leftPair.id ? null : leftPair.id; setSelectedLeft(next); setFeedback(null); void connect(next, selectedRight); }}><ContentMedia media={leftPair.leftMedia ?? leftPair.media} />{matchedIds.includes(leftPair.id) && <span aria-hidden="true">✓</span>}{leftPair.left && <span>{leftPair.left}</span>}</button>,
        <button key={`right-${rightPair.id}`} className={selectedRight === rightPair.id ? "is-selected" : ""} disabled={disabled || matchedIds.includes(rightPair.id)} onClick={() => { const next = selectedRight === rightPair.id ? null : rightPair.id; setSelectedRight(next); setFeedback(null); void connect(selectedLeft, next); }}><ContentMedia media={rightPair.rightMedia} />{matchedIds.includes(rightPair.id) && <span aria-hidden="true">✓</span>}{rightPair.right && <span>{rightPair.right}</span>}</button>,
      ];
    })}</div>
    {feedback && <p className={`template-feedback ${feedback.correct ? "is-success" : "is-error"}`} role="status">{feedback.text}</p>}
    {complete && <p className="template-feedback is-success"><strong>Todos os pares foram conectados!</strong></p>}
  </section>;
}
