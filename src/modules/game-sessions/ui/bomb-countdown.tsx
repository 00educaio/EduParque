"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

type CountdownPhase = "normal" | "warning" | "critical" | "finished";

export type BombCountdownProps = {
  expiresAt: string | number | Date;
  duration?: number;
  onComplete?: () => void;
  className?: string;
  initialRemainingSeconds?: number;
  running?: boolean;
  finished?: boolean;
  onSecondChange?: (remainingSeconds: number) => void;
};

const FUSE_PATH = "M 280 160 C 280 126, 319 142, 335 113 S 379 65, 430 78";
const FUSE_APPROXIMATE_LENGTH = 188;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function toEpochMilliseconds(value: string | number | Date) {
  const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getRemainingMilliseconds(expiresAt: string | number | Date, now = Date.now()) {
  return Math.max(0, toEpochMilliseconds(expiresAt) - now);
}

export function getRemainingSeconds(expiresAt: string | number | Date, now = Date.now()) {
  return Math.ceil(getRemainingMilliseconds(expiresAt, now) / 1_000);
}

export function getCountdownProgress(remainingMilliseconds: number, durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return clamp(remainingMilliseconds / (durationSeconds * 1_000), 0, 1);
}

export function getCountdownPhase(progress: number, remainingMilliseconds: number): CountdownPhase {
  if (remainingMilliseconds <= 0) return "finished";
  if (progress <= 0.1) return "critical";
  if (progress <= 0.2) return "warning";
  return "normal";
}

export function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${minuteText}:${secondText}` : `${minuteText}:${secondText}`;
}

function initialSeconds(duration: number | undefined, supplied: number | undefined) {
  return Math.max(0, Math.ceil(supplied ?? duration ?? 0));
}

function initialProgress(duration: number | undefined, supplied: number | undefined) {
  const total = duration ?? supplied ?? 1;
  return clamp((supplied ?? total) / Math.max(1, total), 0, 1);
}

function DynamiteBundle({ gradientId, panelGradientId }: { gradientId: string; panelGradientId: string }) {
  const sticks = [76, 143, 210, 277, 344, 411];

  return (
    <g className="bomb-countdown__rig">
      <ellipse cx="280" cy="303" rx="220" ry="17" fill="#160c0b" opacity=".2" />
      {sticks.map((x, index) => (
        <g key={x}>
          <rect x={x} y="151" width="73" height="143" rx="35" fill={`url(#${gradientId})`} />
          <rect x={x + 9} y="163" width="10" height="117" rx="5" fill="#ff7a69" opacity={index % 2 === 0 ? ".42" : ".27"} />
          <ellipse cx={x + 36.5} cy="160" rx="27" ry="8" fill="#ff7567" opacity=".34" />
          <ellipse cx={x + 36.5} cy="284" rx="26" ry="7" fill="#711b1d" opacity=".28" />
        </g>
      ))}

      <path d="M74 178 C170 188 388 188 486 178 L488 199 C384 210 174 210 72 199 Z" fill="#25252a" />
      <path d="M72 256 C180 246 379 246 488 256 L486 278 C380 268 181 268 74 278 Z" fill="#202126" />
      <path d="M86 181 C182 190 382 190 474 182" fill="none" stroke="#56565e" strokeWidth="4" opacity=".55" />
      <path d="M85 261 C187 253 378 253 475 261" fill="none" stroke="#505158" strokeWidth="4" opacity=".46" />

      <g className="bomb-countdown__display">
        <rect x="151" y="193" width="258" height="72" rx="14" fill="#14151a" stroke="#08090b" strokeWidth="6" />
        <rect x="160" y="202" width="240" height="54" rx="8" fill={`url(#${panelGradientId})`} stroke="#42434a" strokeWidth="2" />
        <circle cx="169" cy="211" r="3" fill="#73747b" />
        <circle cx="391" cy="211" r="3" fill="#73747b" />
        <circle cx="169" cy="247" r="3" fill="#73747b" />
        <circle cx="391" cy="247" r="3" fill="#73747b" />
      </g>
    </g>
  );
}

function Explosion() {
  const rays = Array.from({ length: 10 }, (_, index) => index * 36);
  return (
    <g className="bomb-countdown__explosion" aria-hidden="true">
      <circle className="bomb-countdown__flash" cx="280" cy="220" r="28" />
      {rays.map((rotation) => (
        <path key={rotation} className="bomb-countdown__ray" d="M280 185 L272 139 L288 139 Z" transform={`rotate(${rotation} 280 220)`} />
      ))}
      <circle className="bomb-countdown__burst bomb-countdown__burst--one" cx="228" cy="174" r="7" />
      <circle className="bomb-countdown__burst bomb-countdown__burst--two" cx="349" cy="184" r="5" />
      <rect className="bomb-countdown__fragment bomb-countdown__fragment--one" x="213" y="250" width="13" height="7" rx="2" />
      <rect className="bomb-countdown__fragment bomb-countdown__fragment--two" x="346" y="258" width="10" height="6" rx="2" />
    </g>
  );
}

export function BombCountdown({
  expiresAt,
  duration,
  onComplete,
  className = "",
  initialRemainingSeconds,
  running = true,
  finished = false,
  onSecondChange,
}: BombCountdownProps) {
  const expiryMilliseconds = toEpochMilliseconds(expiresAt);
  const startingSeconds = initialSeconds(duration, initialRemainingSeconds);
  const startingProgress = initialProgress(duration, initialRemainingSeconds);
  const [displaySeconds, setDisplaySeconds] = useState(startingSeconds);
  const [phase, setPhase] = useState<CountdownPhase>(finished ? "finished" : getCountdownPhase(startingProgress, startingSeconds * 1_000));
  const fuseRef = useRef<SVGPathElement>(null);
  const fuseShadowRef = useRef<SVGPathElement>(null);
  const flameRef = useRef<SVGGElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onSecondChangeRef = useRef(onSecondChange);
  const generatedId = useId().replaceAll(":", "");
  const gradientId = `${generatedId}-dynamite`;
  const panelGradientId = `${generatedId}-panel`;
  const glowId = `${generatedId}-glow`;
  const flameGlowId = `${generatedId}-flame-glow`;

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onSecondChangeRef.current = onSecondChange; }, [onSecondChange]);

  useEffect(() => {
    completedRef.current = false;
    let animationFrame = 0;
    let previousSecond = Number.NaN;
    let previousPhase: CountdownPhase | undefined;
    const fallbackDuration = Math.max(1, (expiryMilliseconds - Date.now()) / 1_000);
    const totalDuration = duration && duration > 0 ? duration : fallbackDuration;

    function updateFuse(progress: number) {
      const fuse = fuseRef.current;
      const fuseShadow = fuseShadowRef.current;
      const flame = flameRef.current;
      if (!fuse || !flame || typeof fuse.getTotalLength !== "function" || typeof fuse.getPointAtLength !== "function") return;
      const length = fuse.getTotalLength();
      const visibleLength = length * progress;
      const offset = length - visibleLength;
      fuse.style.strokeDasharray = `${length} ${length}`;
      fuse.style.strokeDashoffset = `${offset}`;
      if (fuseShadow) {
        fuseShadow.style.strokeDasharray = `${length} ${length}`;
        fuseShadow.style.strokeDashoffset = `${offset}`;
      }
      const point = fuse.getPointAtLength(visibleLength);
      const nearbyPoint = fuse.getPointAtLength(clamp(visibleLength - 1, 0, length));
      const angle = Math.atan2(point.y - nearbyPoint.y, point.x - nearbyPoint.x) * (180 / Math.PI);
      flame.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle - 90})`);
    }

    function commit(remainingMilliseconds: number, progress: number) {
      const nextSecond = Math.ceil(remainingMilliseconds / 1_000);
      const nextPhase = finished ? "finished" : getCountdownPhase(progress, remainingMilliseconds);
      updateFuse(progress);
      if (nextSecond !== previousSecond) {
        previousSecond = nextSecond;
        setDisplaySeconds(nextSecond);
        onSecondChangeRef.current?.(nextSecond);
      }
      if (nextPhase !== previousPhase) {
        previousPhase = nextPhase;
        setPhase(nextPhase);
      }
    }

    if (!running) {
      const seconds = Math.max(0, Math.ceil(initialRemainingSeconds ?? 0));
      const progress = getCountdownProgress(seconds * 1_000, totalDuration);
      commit(seconds * 1_000, progress);
      return;
    }

    function tick() {
      const remainingMilliseconds = Math.max(0, expiryMilliseconds - Date.now());
      const progress = getCountdownProgress(remainingMilliseconds, totalDuration);
      commit(remainingMilliseconds, progress);
      if (remainingMilliseconds <= 0) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    }

    tick();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, expiryMilliseconds, finished, initialRemainingSeconds, running]);

  const initialFuseStyle = { strokeDasharray: `${FUSE_APPROXIMATE_LENGTH} ${FUSE_APPROXIMATE_LENGTH}`, strokeDashoffset: FUSE_APPROXIMATE_LENGTH * (1 - startingProgress) } as CSSProperties;
  const accessibleLabel = displaySeconds === 1 ? "1 segundo restante" : `${displaySeconds} segundos restantes`;

  return (
    <div
      className={`bomb-countdown ${className}`.trim()}
      data-state={phase}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={accessibleLabel}
    >
      <svg className="bomb-countdown__art" viewBox="0 0 560 330" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8d2024" />
            <stop offset=".28" stopColor="#d73b3d" />
            <stop offset=".62" stopColor="#bd292e" />
            <stop offset="1" stopColor="#74181e" />
          </linearGradient>
          <linearGradient id={panelGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#202329" />
            <stop offset="1" stopColor="#08090c" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={flameGlowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path ref={fuseShadowRef} className="bomb-countdown__fuse-shadow" d={FUSE_PATH} style={initialFuseStyle} />
        <path ref={fuseRef} className="bomb-countdown__fuse" d={FUSE_PATH} style={initialFuseStyle} />
        <g ref={flameRef} className="bomb-countdown__flame-point" transform="translate(430 78) rotate(-90)">
          <g className="bomb-countdown__flame-motion" filter={`url(#${flameGlowId})`}>
            <path className="bomb-countdown__flame-outer" d="M0 7 C-13 -4 -7 -19 1 -31 C3 -20 13 -17 11 -6 C17 -14 21 -6 18 2 C15 12 5 16 0 7 Z" />
            <path className="bomb-countdown__flame-inner" d="M1 7 C-5 1 -2 -9 4 -16 C4 -9 11 -6 8 1 C7 6 4 9 1 7 Z" />
          </g>
          <g className="bomb-countdown__sparks">
            <circle cx="-14" cy="-19" r="2.5" />
            <circle cx="15" cy="-25" r="2" />
            <rect x="-3" y="-40" width="4" height="4" rx="1" transform="rotate(35 -1 -38)" />
            <circle cx="21" cy="-8" r="1.8" />
          </g>
        </g>

        <DynamiteBundle gradientId={gradientId} panelGradientId={panelGradientId} />
        <text x="280" y="241" className="bomb-countdown__time" filter={`url(#${glowId})`} textAnchor="middle">{formatCountdown(displaySeconds)}</text>
        <Explosion />
      </svg>
    </div>
  );
}
