import { redirect } from "next/navigation";
import { auth } from "@/modules/auth/infrastructure/auth";
import { getOwnedActivity, toEditorDraft } from "@/modules/activities/application/activity-service";
import { ActivityEditor } from "@/modules/activities/ui/activity-editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const { id } = await params;
  const activity = await getOwnedActivity(id, session.user.id);
  return <ActivityEditor activityId={id} activitySlug={activity.slug} initialDraft={toEditorDraft(activity)} initialPresentations={activity.presentations} initialPublished={activity.currentPublishedRevision !== null} allowAdvanced={process.env.NODE_ENV !== "production"} />;
}
