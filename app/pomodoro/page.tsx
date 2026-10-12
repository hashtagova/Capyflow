export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { PomodoroTimer } from "./PomodoroTimer";
import { CliffhangerCard } from "@/components/cliffhanger-card";
import { getServerTranslations } from "@/lib/server-lang";

export default async function PomodoroPage({
  searchParams,
}: {
  searchParams: { questId?: string; chapterId?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // User preferences
  const { data: profile } = await supabase
    .from("users")
    .select("default_pomodoro_minutes, thesis_title, measurement_unit, project_type")
    .eq("id", user.id)
    .single();

  if (!profile?.thesis_title) redirect("/onboarding");
  const t = getServerTranslations();

  // Active quests (todo or in_progress) with chapter names
  const { data: quests } = await supabase
    .from("quests")
    .select("id, title, chapter_id, chapters(title)")
    .eq("user_id", user.id)
    .in("status", ["todo", "in_progress"])
    .order("created_at", { ascending: false });

  const activeQuests = (quests ?? []).map((q) => ({
    id: q.id,
    title: q.title,
    chapter_id: q.chapter_id as string | null,
    chapter_title: (q.chapters as unknown as { title: string } | null)?.title ?? "Uncategorised",
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/pomodoro" />

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-semibold">{t.timerTitle}</h1>
          <p className="text-xs text-muted-foreground/60 mt-2">{t.timerSubtitle}</p>
        </div>

        <CliffhangerCard userId={user.id} />

        <PomodoroTimer
          defaultDuration={profile.default_pomodoro_minutes ?? 25}
          activeQuests={activeQuests}
          initialQuestId={
            searchParams.questId ??
            (searchParams.chapterId
              ? activeQuests.find((q) => q.chapter_id === searchParams.chapterId)?.id
              : undefined)
          }
          userId={user.id}
          measurementUnit={profile.measurement_unit ?? "words"}
          projectType={profile.project_type ?? undefined}
        />
      </main>
    </div>
  );
}
