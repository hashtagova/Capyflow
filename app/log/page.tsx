export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { getServerTranslations, getServerLang } from "@/lib/server-lang";

const MOOD_EMOJI: Record<string, string> = {
  happy:   "😊",
  neutral: "😐",
  sad:     "😔",
};

function formatMonth(dateStr: string, lang: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString(
    lang === "de" ? "de-DE" : "en-GB",
    { month: "long", year: "numeric" }
  );
}

function formatDateTime(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleString(
    lang === "de" ? "de-DE" : "en-GB",
    { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
  );
}

export default async function LogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = getServerTranslations();
  const lang = getServerLang();

  const { data: checkins } = await supabase
    .from("buddy_checkins")
    .select("id, mood, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const entries = checkins ?? [];

  // Group by month (YYYY-MM)
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const month = entry.created_at.slice(0, 7);
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(entry);
  }

  const moodLabel: Record<string, string> = {
    happy:   t.theLogMoodHappy,
    neutral: t.theLogMoodNeutral,
    sad:     t.theLogMoodSad,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/log" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold">{t.theLog}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">🪵 {t.theLogSubtitle}</p>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cappy-log.png"
              alt="Capy"
              width={200}
              height={200}
              className="object-contain opacity-80"
              style={{ mixBlendMode: "multiply" }}
            />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {t.theLogEmpty}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([month, monthEntries]) => (
              <div key={month}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  {formatMonth(month + "-01", lang)}
                </p>
                <div className="space-y-3">
                  {monthEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl select-none">{MOOD_EMOJI[entry.mood] ?? "🦫"}</span>
                          <span className="text-sm font-medium">{moodLabel[entry.mood] ?? entry.mood}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">
                          {formatDateTime(entry.created_at, lang)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground leading-relaxed pl-8 border-l-2 border-l-muted">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
