import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import { assertUser } from "@/modules/auth/application/policies";
import { ForbiddenError } from "@/modules/auth/application/authorization";
import { GameSessionNotFoundError, getGameSession, sessionControllerCookieName } from "@/modules/game-sessions/application/game-session-service";
import { GameSessionShell } from "@/modules/game-sessions/ui/game-session-shell";
import { resolveTheme } from "@/modules/themes/domain/theme-values";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: PageProps<"/session/[id]">) {
  const { id } = await params;
  const authSession = await auth();
  const user = authSession?.user ? assertUser(authSession.user) : undefined;
  let session;
  const controllerToken = (await cookies()).get(sessionControllerCookieName(id))?.value;
  try { session = await getGameSession(id, user, controllerToken); }
  catch (error) { if (error instanceof GameSessionNotFoundError || error instanceof ForbiddenError) notFound(); throw error; }
  const theme = resolveTheme(session.snapshot.resolvedTheme, session.presentation.themeOverride);
  return <GameSessionShell sessionId={session.id} title={session.snapshot.title} initialState={session.state} canControl={session.canControl} content={session.snapshot.content} config={session.presentation.gameConfig} theme={theme} />;
}
