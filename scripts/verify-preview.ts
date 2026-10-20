const MAX_REQUEST_MS = 30_000;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Defina ${name}.`);
  return value;
}

function boundedNumber(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} deve estar entre ${minimum} e ${maximum}.`);
  }
  return value;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const baseUrl = new URL(required("PREVIEW_BASE_URL"));
if (baseUrl.protocol !== "https:" && process.env.ALLOW_HTTP_PREVIEW !== "true") {
  throw new Error("PREVIEW_BASE_URL deve usar HTTPS.");
}

const paths = (process.env.PREVIEW_PROBE_PATHS ?? "/api/health")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);
if (!paths.length || paths.some((path) => !path.startsWith("/"))) {
  throw new Error("PREVIEW_PROBE_PATHS deve conter caminhos absolutos separados por virgula.");
}

const headers = new Headers({ Accept: "application/json" });
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers.set("x-vercel-protection-bypass", process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
}
if (process.env.PREVIEW_COOKIE) headers.set("Cookie", process.env.PREVIEW_COOKIE);

type Sample = { path: string; status: number; durationMs: number; at: string };

async function probe(path: string): Promise<Sample> {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, baseUrl), {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(MAX_REQUEST_MS),
  });
  const durationMs = Math.round(performance.now() - startedAt);
  if (!response.ok) throw new Error(`${path} respondeu HTTP ${response.status}.`);
  if (path === "/api/health") {
    const body = await response.json() as { status?: string };
    if (body.status !== "ok") throw new Error(`/api/health respondeu status ${String(body.status)}.`);
  } else {
    await response.arrayBuffer();
  }
  return { path, status: response.status, durationMs, at: new Date().toISOString() };
}

async function probeAll() {
  const samples = [] as Sample[];
  for (const path of paths) samples.push(await probe(path));
  console.info(JSON.stringify(samples));
  return samples;
}

async function main() {
  const coldStart = process.argv.includes("--cold-start");
  const soak = process.argv.includes("--soak");
  if (coldStart && soak) throw new Error("Use --cold-start e --soak em execucoes separadas.");

  if (coldStart) {
    const idleSeconds = boundedNumber("COLD_START_IDLE_SECONDS", 360, 300, 1_800);
    console.info(`Aguardando ${idleSeconds}s sem requisicoes antes da medicao de retomada...`);
    await sleep(idleSeconds * 1_000);
    await probeAll();
    return;
  }

  if (soak) {
    const durationMinutes = boundedNumber("SOAK_DURATION_MINUTES", 50, 1, 180);
    const intervalSeconds = boundedNumber("SOAK_INTERVAL_SECONDS", 30, 5, 300);
    const deadline = Date.now() + durationMinutes * 60_000;
    const samples = [] as Sample[];
    while (Date.now() < deadline) {
      samples.push(...await probeAll());
      const remaining = deadline - Date.now();
      if (remaining > 0) await sleep(Math.min(intervalSeconds * 1_000, remaining));
    }
    const maximumMs = samples.reduce((maximum, sample) => Math.max(maximum, sample.durationMs), 0);
    console.info(JSON.stringify({ result: "ok", samples: samples.length, durationMinutes, maximumMs }));
    return;
  }

  await probeAll();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha na verificacao do Preview.");
  process.exitCode = 1;
});
