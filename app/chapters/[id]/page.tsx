export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { LinkButton } from "@/components/link-button";
import { QuestList } from "./QuestList";
import type { Quest, MicroTask } from "./QuestItem";
import { ChapterDeadline } from "@/components/chapter-deadline";
import { QUEST_SUGGESTIONS, type QuestSuggestion } from "@/lib/quest-suggestions";

export default async function ChapterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: chapter }, { data: userProfile }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, title, status, progress_pct, deadline")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("users")
      .select("project_type")
      .eq("id", user.id)
      .single(),
  ]);

  const projectType = userProfile?.project_type ?? "written_thesis";
  const suggestionPool: QuestSuggestion[] = QUEST_SUGGESTIONS[projectType] ?? QUEST_SUGGESTIONS.written_thesis;
  const dayOffset = new Date().getDate() % (suggestionPool.length - 2);
  const initialSuggestions = suggestionPool.slice(dayOffset, dayOffset + 3);
  if (!chapter) notFound();

  const { data: quests } = await supabase
    .from("quests")
    .select("id, title, difficulty, xp_reward, status, order_index, notes, priority")
    .eq("chapter_id", params.id)
    .eq("user_id", user.id)
    .order("priority", { ascending: false })
    .order("order_index", { ascending: true });

  const questIds = (quests ?? []).map((q) => q.id);
  const { data: microTaskRows } = questIds.length > 0
    ? await supabase
        .from("micro_tasks")
        .select("id, quest_id, title, completed, order_index")
        .eq("user_id", user.id)
        .in("quest_id", questIds)
        .order("order_index", { ascending: true })
    : { data: [] as (MicroTask & { quest_id: string })[] };

  const mtByQuest = (microTaskRows ?? []).reduce<Record<string, MicroTask[]>>((acc, mt) => {
    const { quest_id, ...rest } = mt as MicroTask & { quest_id: string };
    (acc[quest_id] ??= []).push(rest);
    return acc;
  }, {});

  const initialQuests: Quest[] = (quests ?? []).map((q) => ({
    ...(q as Omit<Quest, "micro_tasks">),
    micro_tasks: mtByQuest[q.id] ?? [],
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/quest-map" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <LinkButton
          href="/quest-map"
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
        >
          ← Quest Map
        </LinkButton>

        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">{chapter.title}</h2>
          <div className="text-right shrink-0">
            <ChapterDeadline
              chapterId={chapter.id}
              initialDeadline={(chapter as { deadline?: string | null }).deadline ?? null}
            />
          </div>
        </div>

        <QuestList
          chapterId={chapter.id}
          initialQuests={initialQuests}
          initialProgressPct={chapter.progress_pct}
          initialStatus={chapter.status}
          projectType={projectType}
          initialSuggestions={initialSuggestions}
        />
      </main>
    </div>
  );
}
