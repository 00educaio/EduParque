import { notFound } from "next/navigation";
import { auth } from "@/modules/auth/infrastructure/auth";
import { ActivityNotFoundError, getPublicActivityBySlug, isActivityFavorite } from "@/modules/activities/application/activity-service";
import { PublicActivity } from "@/modules/activities/ui/public-activity";
import { AppHeader } from "@/shared/ui/components/app-header";
import { AppShell } from "@/shared/ui/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: PageProps<"/activity/[slug]">) {
  const { slug } = await params;
  const session = await auth();
  let loaded;
  try {
    loaded = await getPublicActivityBySlug(slug, session?.user.id);
  } catch (error) { if (error instanceof ActivityNotFoundError) notFound(); throw error; }
  const initialFavorite = await isActivityFavorite(loaded.activity.id, session?.user.id);
  return <AppShell className="activity-page" header={<AppHeader links={[{ href: "/library", label: "← Biblioteca" }]} />}><PublicActivity snapshot={loaded.snapshot} activityId={loaded.activity.id} authenticated={Boolean(session)} initialFavorite={initialFavorite} /></AppShell>;
}
