export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton, type ExportRow } from "./ExportButton";
import { getServerTranslations, getServerLang } from "@/lib/server-lang";
import { LogEntries } from "./LogEntries";
import { WeeklyMetricChart } from "./WeeklyMetricChart";
import { ActiveDaysList } from "./ActiveDaysList";
import { DipDistributionList } from "./DipDistributionList";
import { HotSpringMomentum } from "./HotSpringMomentum";
import { getUnitLabels } from "@/lib/unit-labels";

// ── Date helpers ─────────────────────────────────────────────
/** Format a Date as "YYYY-MM-DD" in the browser/server's local timezone. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


// ── Tiny sub-components (server-renderable) ───────────────────
function StatCard({
  icon, label, value, sub,
}: {
  icon: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-xl border-l-4 border-l-primary bg-card border border-border shadow-sm p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{icon} {label}</p>
      <p className="font-display text-xl font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ScoreBar({
  label, value, weight, hint,
}: {
  label: string; value: number; weight: string; hint: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {label}{" "}
          <span className="text-[10px]">({weight})</span>
        </span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = getServerTranslations();

  // Parallel data fetch
  const [profileRes, logsRes, pomosRes, chaptersRes, questsRes, checkinsRes, detailSessionsRes, completedQuestsRes] = await Promise.all([
    supabase
      .from("users")
      .select("thesis_title, current_streak, streak_days, longest_streak, measurement_unit, project_type")
      .eq("id", user.id)
      .single(),
    supabase
      .from("daily_logs")
      .select("date, total_pomodoros, total_minutes, quests_completed, streak_maintained")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("pomodoro_sessions")
      .select("quest_id, duration_minutes, word_count, started_at")
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase
      .from("chapters")
      .select("id, title, progress_pct")
      .eq("user_id", user.id),
    supabase
      .from("quests")
      .select("id, chapter_id")
      .eq("user_id", user.id),
    supabase
      .from("buddy_checkins")
      .select("id, mood, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pomodoro_sessions")
      .select("started_at, duration_minutes, word_count, quests(title, chapters(title))")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("started_at", { ascending: false }),
    supabase
      .from("quests")
      .select("title, completed_at, xp_reward, chapters(title)")
      .eq("user_id", user.id)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  if (!profileRes.data?.thesis_title) redirect("/onboarding");

  const profile         = profileRes.data!;
  const logs            = logsRes.data  ?? [];
  const pomos           = pomosRes.data  ?? [];
  const chapters        = chaptersRes.data ?? [];
  const quests          = questsRes.data ?? [];
  const checkins        = checkinsRes.data ?? [];
  const detailSessions  = detailSessionsRes.data ?? [];
  const completedQuests = completedQuestsRes.data ?? [];

  const measurementUnit = profile.measurement_unit ?? "words";

  // ── Summary stats ──────────────────────────────────────────
  const totalPomodoros = pomos.length;
  const totalMinutes   = pomos.reduce((s, p) => s + p.duration_minutes, 0);
  const totalWords     = pomos.reduce((s, p) => s + (p.word_count ?? 0), 0);
  const activeDays     = logs.filter((l) => l.streak_maintained).length;

  const bestDayLog = logs.reduce<typeof logs[0] | null>(
    (best, l) => l.total_pomodoros > (best?.total_pomodoros ?? 0) ? l : best,
    null
  );
  const avgPomodoros =
    activeDays > 0 ? (totalPomodoros / activeDays).toFixed(1) : "0";

  const focusHours = Math.floor(totalMinutes / 60);
  const focusMins  = totalMinutes % 60;

  // ── Health score ───────────────────────────────────────────
  const todayUTCForScore  = new Date(new Date().toISOString().split("T")[0] + "T00:00:00Z");
  const currentYearMonth  = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const daysElapsedThisMonth = todayUTCForScore.getUTCDate();
  const activeDaysThisMonth  = logs.filter(
    (l) => l.streak_maintained && l.date.startsWith(currentYearMonth)
  ).length;
  const consistencyScore = Math.min(
    100,
    Math.round((activeDaysThisMonth / daysElapsedThisMonth) * 100)
  );
  const overallProgress =
    chapters.length > 0
      ? Math.round(chapters.reduce((s, c) => s + c.progress_pct, 0) / chapters.length)
      : 0;
  const sevenAgoStr = new Date(Date.now() - 6 * 86_400_000).toISOString().split("T")[0];
  const recentActiveDays = logs.filter(
    (l) => l.streak_maintained && l.date >= sevenAgoStr
  ).length;
  const recentActivityScore = Math.round((recentActiveDays / 7) * 100);
  const composite   = Math.round(consistencyScore * 0.35 + overallProgress * 0.5 + recentActivityScore * 0.15);

  // ── Active days list — last 30 days, most recent first ───────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const thirtyAgoStr = localDateStr(thirtyDaysAgo);

  const activeDaysList = logs
    .filter((l) => l.date >= thirtyAgoStr && (l.total_pomodoros > 0 || l.quests_completed > 0))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  // ── Weekly words-per-day chart ─────────────────────────────
  // Key sessions by local date so a session started at 11pm local
  // doesn't land on tomorrow's UTC date.
  const wordsByDate = new Map<string, number>();
  for (const p of pomos) {
    if (p.word_count) {
      const ds = localDateStr(new Date(p.started_at));
      wordsByDate.set(ds, (wordsByDate.get(ds) ?? 0) + p.word_count);
    }
  }

  const now    = new Date();
  const dow    = now.getDay();
  const monOff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + monOff);
  monday.setHours(0, 0, 0, 0);

  const lang = getServerLang();

  // ── Metric label + icon by measurement unit ─────────────────
  const metricMeta: Record<string, { icon: string; label: string }> = {
    words:      { icon: "✍️",  label: t.wordsWritten },
    pages:      { icon: "📄",  label: lang === "de" ? "Geschriebene Seiten"  : "Pages Written" },
    slides:     { icon: "📋", label: lang === "de" ? "Erstellte Folien"     : "Slides Created" },
    commits:    { icon: "💻",  label: lang === "de" ? "Commits"              : "Commits" },
    features:   { icon: "⚙️", label: lang === "de" ? "Features"             : "Features Built" },
    scenes:     { icon: "🎬",  label: lang === "de" ? "Szenen"               : "Scenes Written" },
    hours:      { icon: "⏱️", label: lang === "de" ? "Stunden"              : "Hours Logged" },
    iterations: { icon: "🔄",  label: lang === "de" ? "Iterationen"          : "Iterations" },
  };
  const metric = metricMeta[measurementUnit] ?? metricMeta.words;

  const metricChartHints: Record<string, string> = {
    words:      lang === "de" ? "Wörter, die du geschrieben hast — nach jeder Sitzung im Dip-Timer eintragen" : "Words you've written — log them in the Dip timer after each session",
    pages:      lang === "de" ? "Seiten, die du geschrieben hast — nach jeder Sitzung im Dip-Timer eintragen" : "Pages you've written — log them in the Dip timer after each session",
    slides:     lang === "de" ? "Folien, die du erstellt hast — nach jeder Sitzung im Dip-Timer eintragen"    : "Slides you've created — log them in the Dip timer after each session",
    commits:    lang === "de" ? "Commits diese Woche — im Dip-Timer erfassen"                                 : "Commits this week — log them in the Dip timer",
    features:   lang === "de" ? "Features, die du gebaut hast — im Dip-Timer erfassen"                       : "Features you've built — log them in the Dip timer",
    scenes:     lang === "de" ? "Szenen, die du geschrieben hast — im Dip-Timer erfassen"                    : "Scenes you've written — log them in the Dip timer",
    hours:      lang === "de" ? "Stunden, die du protokolliert hast — im Dip-Timer erfassen"                 : "Hours logged per session — track them in the Dip timer",
    iterations: lang === "de" ? "Iterationen diese Woche — im Dip-Timer erfassen"                            : "Iterations this week — log them in the Dip timer",
  };
  const metricChartHint = metricChartHints[measurementUnit] ?? metricChartHints.words;

  // ── Project-type-aware unit labels ────────────────────────
  const projectType = profile.project_type ?? "written_thesis";
  const unitLabels = getUnitLabels(projectType, lang === "de" ? "de" : "en");
  const avgUnitCompletion = lang === "de"
    ? `durchschnittlicher ${unitLabels.singular}-Fortschritt`
    : `average ${unitLabels.singular} completion`;
  const momentumDescAdapted = lang === "de"
    ? `Wert 0–100 = Ø ${unitLabels.singular}-Fortschritt × 50% + Konsistenz diesen Monat × 35% + aktive Tage diese Woche × 15%`
    : `Score 0–100 = avg ${unitLabels.singular} progress × 50% + consistency this month × 35% + active days this week × 15%`;
  const noFocusSessionsAdapted = lang === "de"
    ? `Noch keine Fokussitzungen mit ${unitLabels.pluralCap} verknüpft.`
    : `No focus sessions linked to ${unitLabels.plural} yet.`;

  const noMetricThisWeek = lang === "de"
    ? `Noch keine ${metric.label} diese Woche — nach jeder Sitzung im Dip-Timer eintragen.`
    : `No ${metric.label.toLowerCase()} logged this week — track them in the Dip timer after each session.`;

  const DAY_LABELS = lang === "de"
    ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

  // Build 8 weeks of data (0 = current, 7 = oldest)
  const allWeeks = Array.from({ length: 8 }, (_, weekIdx) => {
    const mon = new Date(monday);
    mon.setDate(monday.getDate() - weekIdx * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { month: "short", day: "numeric" });
    return {
      label: `${fmt(mon)} – ${fmt(sun)}`,
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return { label: DAY_LABELS[i], value: wordsByDate.get(localDateStr(d)) ?? 0 };
      }),
    };
  });

  // ── Pomodoro distribution by chapter ──────────────────────
  const questToChapter = new Map(quests.map((q) => [q.id, q.chapter_id]));
  const pomosByChapter = new Map<string, number>();
  let freeSessions = 0;
  for (const p of pomos) {
    if (p.quest_id) {
      const cid = questToChapter.get(p.quest_id);
      if (cid) pomosByChapter.set(cid, (pomosByChapter.get(cid) ?? 0) + 1);
      else freeSessions++;
    } else {
      freeSessions++;
    }
  }
  const chapterPomos = [
    ...chapters.map((c) => ({ title: c.title, count: pomosByChapter.get(c.id) ?? 0 })),
    ...(freeSessions > 0 ? [{ title: t.freeSessions, count: freeSessions }] : []),
  ].sort((a, b) => b.count - a.count);
  const maxChapterPomos = Math.max(...chapterPomos.map((c) => c.count), 1);

  // ── Export rows ────────────────────────────────────────────
  const exportRows: ExportRow[] = logs.map((l) => ({
    date:              l.date,
    pomodoros:         l.total_pomodoros,
    words:             wordsByDate.get(l.date) ?? 0,
    quests_completed:  l.quests_completed,
    streak_maintained: l.streak_maintained,
  }));

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/analytics" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">{t.statsTitle}</h1>
          <ExportButton
            rows={exportRows}
            checkins={checkins}
            measurementUnit={measurementUnit}
            sessions={detailSessions.map((s) => ({
              started_at: s.started_at,
              duration_minutes: s.duration_minutes,
              word_count: s.word_count ?? 0,
              quest_title: (s.quests as unknown as { title: string; chapters: { title: string } | null } | null)?.title ?? null,
              chapter_title: (s.quests as unknown as { title: string; chapters: { title: string } | null } | null)?.chapters?.title ?? null,
            }))}
            completedQuests={completedQuests.map((q) => ({
              title: q.title,
              completed_at: q.completed_at!,
              xp_reward: q.xp_reward,
              chapter_title: (q.chapters as unknown as { title: string } | null)?.title ?? null,
            }))}
          />
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon="💧" label={t.totalPomodoros} value={totalPomodoros} sub={t.dipCardSub} />
          <StatCard icon="⏱️" label={t.totalFocusTime} value={`${focusHours}h ${focusMins}m`} />
          <StatCard
            icon={metric.icon} label={metric.label}
            value={totalWords > 0 ? totalWords.toLocaleString() : "—"}
            sub={totalWords === 0 ? t.trackInTimer : undefined}
          />
          <StatCard
            icon="🏆" label={t.bestDay}
            value={bestDayLog ? `${bestDayLog.total_pomodoros} 💧` : "—"}
            sub={bestDayLog?.date}
          />
          <StatCard
            icon="🔥" label={t.streak}
            value={`${profile.streak_days ?? profile.current_streak ?? 0} / ${profile.longest_streak ?? 0}`}
            sub={t.currentBest}
          />
          <StatCard
            icon="📈" label={t.avgActiveDay}
            value={`${avgPomodoros} 💧`}
            sub={t.activeDaysSub(activeDays)}
          />
        </div>

        {/* ── Momentum score ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t.yourMomentum}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground/70">{momentumDescAdapted}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score + hot spring side by side */}
            <HotSpringMomentum composite={composite} hasActivity={activeDays > 0} />
            <div className="space-y-2.5">
              <ScoreBar
                label={t.consistency} value={consistencyScore} weight="35%"
                hint={t.activeDaysThisMonth(activeDaysThisMonth)}
              />
              <ScoreBar
                label={t.progress} value={overallProgress} weight="50%"
                hint={avgUnitCompletion}
              />
              <ScoreBar
                label={t.recentActivity} value={recentActivityScore} weight="15%"
                hint={t.ofDaysActive(recentActiveDays)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Active days list ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.yourActiveDays}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeDaysList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">
                {t.noActivityYet}
              </p>
            ) : (
              <ActiveDaysList
                entries={activeDaysList.map((l) => ({
                  date: l.date,
                  label: new Date(l.date + "T12:00:00").toLocaleDateString(
                    lang === "de" ? "de-DE" : "en-GB",
                    { weekday: "long", month: "long", day: "numeric" }
                  ),
                  pomodoros: l.total_pomodoros,
                  quests: l.quests_completed,
                  pomodoroText: t.pomodoroSessionsSub(l.total_pomodoros),
                  questText: t.questsDoneSub(l.quests_completed),
                }))}
                showMoreLabel={lang === "de" ? "Mehr anzeigen" : "Show more"}
                showLessLabel={lang === "de" ? "Weniger anzeigen" : "Show less"}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Weekly metric chart ── */}
        <WeeklyMetricChart
          weeks={allWeeks}
          metricIcon={metric.icon}
          metricLabel={metric.label}
          hint={metricChartHint}
          noMetricText={noMetricThisWeek}
          thisWeekLabel={lang === "de" ? "Diese Woche" : "This Week"}
          prevWeekLabel={lang === "de" ? "Letzte Woche" : "Last Week"}
        />

        {/* ── Focus by chapter ── */}
        {chapterPomos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t.pomodoroDistribution}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chapterPomos.every((c) => c.count === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {noFocusSessionsAdapted}
                </p>
              ) : (
                <DipDistributionList
                  items={chapterPomos
                    .filter((c) => c.count > 0)
                    .map((c) => ({ title: c.title, count: c.count, pct: Math.round((c.count / maxChapterPomos) * 100) }))}
                  showMoreLabel={lang === "de" ? "Mehr anzeigen" : "Show more"}
                  showLessLabel={lang === "de" ? "Weniger anzeigen" : "Show less"}
                />
              )}
            </CardContent>
          </Card>
        )}
        {/* ── The Log ── */}
        {checkins.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  📓 {t.theLog}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground/70">{t.theLogSubtitle}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <LogEntries entries={checkins} lang={lang} />
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
