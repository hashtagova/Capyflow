export const dynamic = "force-dynamic";


import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { CapyGreeting } from "@/components/cappy-greeting";
import { getCapyMood } from "@/lib/cappy";
import { getBerlinDate } from "@/app/actions/streak";
import { ProgressRing } from "@/components/progress-ring";
import { Separator } from "@/components/ui/separator";
import { NextQuestCard, type NextQuestItem } from "@/components/next-quest-card";
import { getServerTranslations, getServerLang } from "@/lib/server-lang";
import { CliffhangerCard } from "@/components/cliffhanger-card";
import { ReturnGreeting } from "@/components/return-greeting";
import { BuddyCheckinPopup } from "@/components/buddy-checkin-popup";
import { DipTooltip } from "@/components/dip-tooltip";
import { DevProjectTypeSwitcher } from "@/components/dev-project-type-switcher";
import fs from "fs";


export default async function DashboardPage() {
  noStore();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("thesis_title, thesis_deadline, xp, level, current_streak, default_pomodoro_minutes, buddy_checkin_enabled, project_type")
    .eq("id", user.id)
    .single();

  if (!profile?.thesis_title) redirect("/onboarding");
  const t = getServerTranslations();
  const lang = getServerLang();

  // Use Vienna local date — streak.ts logs activity keyed to Vienna date,
  // so the daily_log query must use the same timezone to match correctly.
  const today = getBerlinDate(0);
  const { data: todayLog } = await supabase
    .from("daily_logs")
    .select("total_pomodoros, quests_completed")
    .eq("user_id", user!.id)
    .eq("date", today)
    .single();

  const { data: lastLog } = await supabase
    .from("daily_logs")
    .select("date")
    .eq("user_id", user!.id)
    .eq("streak_maintained", true)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, progress_pct, status")
    .eq("user_id", user!.id)
    .order("order_index", { ascending: true, nullsFirst: false });

  const overallProgress =
    chapters && chapters.length > 0
      ? Math.round(chapters.reduce((sum, c) => sum + c.progress_pct, 0) / chapters.length)
      : 0;

  const lastActivityDate = lastLog?.date ?? null;
  const activeToday =
    (todayLog?.quests_completed ?? 0) > 0 || (todayLog?.total_pomodoros ?? 0) > 0;
  const daysSinceLastActive = lastActivityDate
    ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / 86_400_000)
    : null;
  const deadlineDaysLeft = profile.thesis_deadline
    ? Math.ceil(
        (new Date(profile.thesis_deadline + "T12:00:00Z").getTime() - new Date(today + "T12:00:00Z").getTime())
        / 86_400_000
      )
    : null;
  const capyMood = getCapyMood({
    streak: profile.current_streak,
    activeToday,
    overallProgress,
    deadlineDaysLeft,
    daysSinceLastActive,
  });

  const hasWakeVideo = fs.existsSync(process.cwd() + "/public/images/cappy-waking.mp4");

  const projectType = (profile as { project_type?: string }).project_type ?? "written_thesis";
  const progressRingHints: Record<string, { en: string; de: string }> = {
    written_thesis: { en: "Progress is based on chapter completion. Each chapter counts equally, regardless of quest count.",    de: "Fortschritt basiert auf Kapitelabschluss. Jedes Kapitel zählt gleich." },
    research_paper: { en: "Progress is based on chapter completion. Each chapter counts equally, regardless of quest count.",    de: "Fortschritt basiert auf Kapitelabschluss. Jedes Kapitel zählt gleich." },
    mixed:          { en: "Progress is based on chapter completion. Each chapter counts equally, regardless of quest count.",    de: "Fortschritt basiert auf Kapitelabschluss. Jedes Kapitel zählt gleich." },
    presentation:   { en: "Progress is based on section completion. Each section counts equally, regardless of quest count.",    de: "Fortschritt basiert auf Abschnittsabschluss. Jeder Abschnitt zählt gleich." },
    software:       { en: "Progress is based on milestone completion. Each milestone counts equally, regardless of quest count.", de: "Fortschritt basiert auf Meilensteinabschluss. Jeder Meilenstein zählt gleich." },
    design_project: { en: "Progress is based on phase completion. Each phase counts equally, regardless of quest count.",        de: "Fortschritt basiert auf Phasenabschluss. Jede Phase zählt gleich." },
    creative:       { en: "Progress is based on scene completion. Each scene counts equally, regardless of quest count.",        de: "Fortschritt basiert auf Szenenabschluss. Jede Szene zählt gleich." },
  };
  const progressRingHint = (progressRingHints[projectType] ?? progressRingHints.written_thesis)[lang === "de" ? "de" : "en"];

  const { data: todoQuests } = await supabase
    .from("quests")
    .select("id, title, difficulty, xp_reward, chapter_id, priority, created_at, chapters(title)")
    .eq("user_id", user!.id)
    .eq("status", "todo")
    .order("created_at", { ascending: true })
    .limit(50);

  const nextQuests: NextQuestItem[] = (todoQuests ?? []).map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty as "easy" | "medium" | "hard",
    xp_reward: q.xp_reward,
    chapter_id: q.chapter_id,
    priority: q.priority ?? 0,
    created_at: q.created_at,
    chapter_title: Array.isArray(q.chapters)
      ? null
      : (q.chapters as unknown as { title: string } | null)?.title ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting (contains Capy image, time greeting, thesis title, deadline) */}
        <CapyGreeting
          mood={capyMood}
          streak={profile.current_streak}
          hasAnyActivity={lastActivityDate !== null}
          deadlineDaysLeft={deadlineDaysLeft}
          thesisTitle={profile.thesis_title}
          deadline={profile.thesis_deadline ?? null}
          lang={lang}
          hasWakeVideo={hasWakeVideo}
        />

<ReturnGreeting lastActiveDate={lastActivityDate} />
<CliffhangerCard userId={user!.id} />
        {/* Progress ring + stats */}
        <div className="flex items-center gap-6">
          <ProgressRing value={overallProgress} hint={progressRingHint} />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <DipTooltip text={t.streakTooltip} side="top" showArrow>
              <div><StatCard emoji="🔥" label={t.streak} value={profile.current_streak} unit={t.days} /></div>
            </DipTooltip>
            <StatCard emoji="⭐" label={t.totalXP} value={profile.xp} />
            <DipTooltip text={t.levelTooltip} side="bottom" showArrow>
              <div><StatCard emoji="🏆" label={t.level} value={profile.level} /></div>
            </DipTooltip>
            <DipTooltip text={t.dipStatTooltip} side="bottom" showArrow>
              <div><StatCard emoji="💧" label={t.pomodorosToday} value={todayLog?.total_pomodoros ?? 0} /></div>
            </DipTooltip>
          </div>
        </div>

        <Separator />

        {/* Next quest */}
        <NextQuestCard quests={nextQuests} />

      </main>

      <BuddyCheckinPopup enabled={profile.buddy_checkin_enabled ?? false} isDeadlineDay={deadlineDaysLeft === 0} />

      {process.env.NODE_ENV !== "production" && (
        <DevProjectTypeSwitcher currentType={projectType} />
      )}
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  unit,
}: {
  emoji: string;
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border-l-4 border-l-primary bg-card border border-border shadow-sm p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{emoji} {label}</p>
      <p className="font-display text-xl font-bold tabular-nums">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}
