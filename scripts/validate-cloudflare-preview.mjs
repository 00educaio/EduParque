import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "playwright";
import postgres from "postgres";

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error("Informe a URL do Preview.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada.");

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: true });
const suffix = randomUUID();
const username = `preview-${suffix.slice(0, 20)}`;
const email = `${username}@test.local`;
const password = `Preview-${randomBytes(18).toString("base64url")}!`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const oneSampleWav = Buffer.alloc(45);
oneSampleWav.write("RIFF", 0);
oneSampleWav.writeUInt32LE(37, 4);
oneSampleWav.write("WAVEfmt ", 8);
oneSampleWav.writeUInt32LE(16, 16);
oneSampleWav.writeUInt16LE(1, 20);
oneSampleWav.writeUInt16LE(1, 22);
oneSampleWav.writeUInt32LE(8000, 24);
oneSampleWav.writeUInt32LE(8000, 28);
oneSampleWav.writeUInt16LE(1, 32);
oneSampleWav.writeUInt16LE(8, 34);
oneSampleWav.write("data", 36);
oneSampleWav.writeUInt32LE(1, 40);
oneSampleWav[44] = 128;

let browser;
let userId;
let activityId;
let sessionId;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(response, expectedStatus, label) {
  const body = await response.text();
  if (response.status() !== expectedStatus) {
    throw new Error(`${label}: HTTP ${response.status()} - ${body.slice(0, 500)}`);
  }
  return body ? JSON.parse(body) : undefined;
}

try {
  const [createdUser] = await sql`
    INSERT INTO users (
      name, email, username, email_verified, role, password_hash,
      password_changed_at, auth_version, created_at, updated_at
    )
    VALUES (
      'Validacao Preview', ${email}, ${username}, now(), 'USER',
      crypt(${password}, gen_salt('bf', 12)), now(), 1, now(), now()
    )
    RETURNING id
  `;
  userId = createdUser?.id;
  ensure(userId, "Nao foi possivel criar o usuario descartavel.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("E-mail ou usuário").fill(username);
  await page.getByLabel("Senha").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === "/"),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
  await page.goto(`${baseUrl}/my-activities`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  ensure(page.url().includes("/my-activities"), "A sessao nao persistiu apos atualizar a pagina.");

  const authCookie = (await context.cookies()).find((cookie) => cookie.name.includes("authjs.session-token"));
  ensure(authCookie?.secure && authCookie.httpOnly && authCookie.sameSite === "Lax", "Os atributos do cookie de sessao nao correspondem ao esperado.");

  const created = await json(
    await page.request.post(`${baseUrl}/api/activities`, { data: { title: "Validacao remota" } }),
    201,
    "Criar atividade",
  );
  activityId = created.id;
  const presentationId = created.presentations?.[0]?.id;
  ensure(activityId && presentationId, "A atividade nao retornou a apresentacao padrao.");

  const content = [{
    type: "prompt-answer",
    id: "questions",
    items: [
      { id: "q1", prompt: "1 + 1?", answers: [{ id: "a1", text: "2", isCorrect: true }] },
      { id: "q2", prompt: "2 + 2?", answers: [{ id: "a2", text: "4", isCorrect: true }] },
    ],
  }];
  await json(
    await page.request.patch(`${baseUrl}/api/activities/${activityId}`, {
      data: {
        title: "Validacao remota editada",
        description: "Fluxo completo no Cloudflare Preview",
        tags: ["preview", "cloudflare"],
        visibility: "public",
        defaultPresentationId: presentationId,
        content,
      },
    }),
    200,
    "Editar atividade",
  );
  const reviewed = await json(await page.request.get(`${baseUrl}/api/activities/${activityId}`), 200, "Revisar atividade");
  ensure(reviewed.title === "Validacao remota editada" && reviewed.draftContent?.length === 1, "A revisao nao refletiu a edicao.");
  await json(await page.request.post(`${baseUrl}/api/activities/${activityId}/publish`), 201, "Publicar atividade");
  ensure((await page.request.get(`${baseUrl}/activity/${reviewed.slug}`)).status() === 200, "A pagina da atividade publicada nao abriu.");
  ensure((await page.request.delete(`${baseUrl}/api/activities/${activityId}/publish`)).status() === 204, "Nao foi possivel despublicar a atividade.");
  await json(await page.request.post(`${baseUrl}/api/activities/${activityId}/publish`), 201, "Republicar atividade");

  for (const media of [
    { name: "pixel.png", mimeType: "image/png", buffer: onePixelPng },
    { name: "som.wav", mimeType: "audio/wav", buffer: oneSampleWav },
  ]) {
    const uploaded = await json(
      await page.request.post(`${baseUrl}/api/media`, { multipart: { file: media } }),
      201,
      `Enviar ${media.name}`,
    );
    const read = await page.request.get(`${baseUrl}${uploaded.url}`);
    ensure(read.status() === 200, `Nao foi possivel visualizar ${media.name}.`);
    ensure((read.headers()["content-type"] ?? "").startsWith(media.mimeType), `MIME incorreto ao ler ${media.name}.`);
    ensure(Buffer.compare(Buffer.from(await read.body()), media.buffer) === 0, `Conteudo alterado ao ler ${media.name}.`);
    ensure((await page.request.delete(`${baseUrl}${uploaded.url}`)).status() === 204, `Nao foi possivel excluir ${media.name}.`);
    ensure((await page.request.get(`${baseUrl}${uploaded.url}`)).status() === 403, `${media.name} continuou acessivel apos exclusao.`);
  }

  const game = await json(
    await page.request.post(`${baseUrl}/api/game-sessions`, {
      data: {
        activityId,
        presentationId,
        teams: [
          { name: "Verde", color: "#008844" },
          { name: "Azul", color: "#0044aa" },
        ],
        timer: { mode: "question", variant: "standard", durationSeconds: 30, soundEnabled: false },
      },
    }),
    201,
    "Criar sessao",
  );
  sessionId = game.id;
  const firstTeamId = game.state?.teams?.[0]?.id;
  ensure(sessionId && firstTeamId, "A sessao nao retornou equipe valida.");

  const teamImageUrl = `${baseUrl}/api/game-sessions/${sessionId}/team-images/${firstTeamId}`;
  await json(
    await page.request.post(teamImageUrl, { multipart: { file: { name: "equipe.png", mimeType: "image/png", buffer: onePixelPng } } }),
    201,
    "Enviar imagem da equipe",
  );
  ensure((await page.request.get(teamImageUrl)).status() === 200, "A imagem temporaria da equipe nao foi lida.");

  const started = await json(
    await page.request.post(`${baseUrl}/api/game-sessions/${sessionId}/commands`, { data: { type: "startSession" } }),
    200,
    "Iniciar sessao",
  );
  ensure(started.state?.timer?.running && started.state.timer.remainingSeconds === 30, "O cronometro nao iniciou corretamente.");
  await new Promise((resolve) => setTimeout(resolve, 1600));
  await page.goto(`${baseUrl}/session/${sessionId}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  const restored = await json(await page.request.get(`${baseUrl}/api/game-sessions/${sessionId}`), 200, "Restaurar sessao");
  ensure(restored.state.timer.running && restored.state.timer.remainingSeconds < 30 && restored.state.timer.remainingSeconds > 0, "O cronometro nao foi restaurado pelo prazo persistido.");

  const commandUrl = `${baseUrl}/api/game-sessions/${sessionId}/commands`;
  await json(await page.request.post(commandUrl, { data: { type: "awardPoints", teamId: firstTeamId, points: 100 } }), 200, "Pontuar equipe");
  await json(await page.request.post(commandUrl, { data: { type: "reveal" } }), 200, "Revelar resposta");
  await json(await page.request.post(commandUrl, { data: { type: "next" } }), 200, "Avancar item");
  const finished = await json(await page.request.post(commandUrl, { data: { type: "finish" } }), 200, "Encerrar sessao");
  ensure(finished.state?.status === "finished", "A sessao nao foi encerrada.");
  ensure((await page.request.get(teamImageUrl)).status() === 404, "A imagem temporaria nao foi eliminada ao encerrar.");
  const cleanup = await page.request.delete(`${baseUrl}/api/game-sessions/${sessionId}/team-images`);
  if (cleanup.status() !== 204) {
    throw new Error(`A limpeza idempotente de imagens falhou: HTTP ${cleanup.status()} - ${(await cleanup.text()).slice(0, 500)}`);
  }

  ensure((await page.request.delete(`${baseUrl}/api/activities/${activityId}`)).status() === 204, "Nao foi possivel excluir a atividade.");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  ensure(!(await context.cookies()).some((cookie) => cookie.name.includes("authjs.session-token")), "O cookie permaneceu apos logout.");

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "login-session-cookie-logout",
      "activity-create-edit-review-publish-unpublish-delete",
      "image-upload-read-delete",
      "audio-upload-read-delete",
      "game-session-teams-image-score-navigation-finish",
      "timer-restored-after-reload",
      "temporary-image-cleanup",
    ],
  }));
} finally {
  if (browser) await browser.close();
  if (sessionId) await sql`DELETE FROM game_sessions WHERE id = ${sessionId}`;
  if (activityId) await sql`DELETE FROM activities WHERE id = ${activityId}`;
  if (userId) {
    await sql`DELETE FROM storage_objects WHERE starts_with(key, ${`${userId}/`})`;
    await sql`DELETE FROM auth_login_attempts WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
  await sql.end();
}
