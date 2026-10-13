"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionTimer as SessionTimerState } from "@/modules/game-sessions/domain/session";
import { BombCountdown } from "./bomb-countdown";
import { playSessionSound } from "./session-audio";

function remainingFrom(timer: SessionTimerState, now = Date.now()) {
  if (!timer.running || !timer.deadlineAt) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((new Date(timer.deadlineAt).getTime() - now) / 1_000));
}

export function SessionTimer({ timer, onExpire }: { timer: SessionTimerState; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = remainingFrom(timer, now);
  const previousSecond = useRef(remaining);
  const expirySent = useRef(false);

  useEffect(() => {
    expirySent.current = false;
    if (!timer.running || timer.variant === "bomb") return;
    const animationFrame = window.requestAnimationFrame(() => setNow(Date.now()));
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => { window.cancelAnimationFrame(animationFrame); window.clearInterval(interval); };
  }, [timer.deadlineAt, timer.running, timer.variant]);

  useEffect(() => {
    if (remaining === previousSecond.current) return;
    previousSecond.current = remaining;
    if (timer.soundEnabled && remaining > 0 && remaining <= 5) playSessionSound("tick");
    if (remaining === 0 && timer.running && !expirySent.current) {
      expirySent.current = true;
      if (timer.soundEnabled) playSessionSound(timer.variant === "bomb" ? "bomb" : "complete");
      onExpire();
    }
  }, [onExpire, remaining, timer.running, timer.soundEnabled, timer.variant]);

  const handleBombSecond = useCallback((nextRemaining: number) => {
    if (timer.soundEnabled && nextRemaining > 0 && nextRemaining <= 5) playSessionSound("tick");
  }, [timer.soundEnabled]);

  const handleBombComplete = useCallback(() => {
    if (timer.soundEnabled) playSessionSound("bomb");
    onExpire();
  }, [onExpire, timer.soundEnabled]);

  if (timer.mode === "off") return <div className="timer timer--off"><span>Timer</span><strong>Desativado</strong></div>;
  const percent = Math.max(0, Math.min(100, (remaining / timer.durationSeconds) * 100));
  if (timer.variant === "bomb") return <BombCountdown expiresAt={timer.deadlineAt ?? 0} duration={timer.durationSeconds} initialRemainingSeconds={timer.remainingSeconds} running={timer.running && Boolean(timer.deadlineAt)} finished={timer.exploded} onSecondChange={handleBombSecond} onComplete={handleBombComplete} />;
  return <div className="timer" aria-live="polite"><span>Tempo</span><strong>{remaining}s</strong><div><i style={{ width: `${percent}%` }} /></div></div>;
}
