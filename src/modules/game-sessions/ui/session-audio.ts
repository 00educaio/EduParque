"use client";

type SessionSound = "tick" | "complete" | "bomb" | "success" | "error" | "move";

let sharedContext: AudioContext | null = null;

function audioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  sharedContext ??= new window.AudioContext();
  return sharedContext;
}

export async function unlockSessionAudio() {
  const context = audioContext();
  if (context?.state === "suspended") await context.resume();
}

function tone(context: AudioContext, frequency: number, duration: number, volume: number, offset = 0, type: OscillatorType = "sine") {
  const start = context.currentTime + offset;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function explosion(context: AudioContext) {
  const duration = 0.8;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(90, context.currentTime + duration);
  gain.gain.setValueAtTime(0.42, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
  tone(context, 90, 0.7, 0.35, 0, "sawtooth");
}

export function playSessionSound(sound: SessionSound) {
  const context = audioContext();
  if (!context || context.state !== "running") return;
  if (sound === "bomb") { explosion(context); return; }
  if (sound === "tick") { tone(context, 760, 0.09, 0.2, 0, "square"); return; }
  if (sound === "complete") { tone(context, 520, 0.18, 0.22); tone(context, 390, 0.28, 0.22); return; }
  if (sound === "success") { tone(context, 520, 0.12, 0.18); tone(context, 780, 0.22, 0.2); return; }
  if (sound === "error") { tone(context, 220, 0.18, 0.2, 0, "sawtooth"); return; }
  tone(context, 440, 0.08, 0.12);
}
