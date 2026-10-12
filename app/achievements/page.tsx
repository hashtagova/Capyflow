export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { ACHIEVEMENTS, getAchievementText } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { getServerTranslations, getServerLang } from "@/lib/server-lang";

export default async function AchievementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: unlocked }, { data: profile }] = await Promise.all([
    supabase
      .from("achievements")
      .select("achievement_key, unlocked_at")
      .eq("user_id", user.id),
    supabase
      .from("users")
      .select("project_type")
      .eq("id", user.id)
      .single(),
  ]);

  const unlockedMap = new Map(
    (unlocked ?? []).map((a) => [a.achievement_key, a.unlocked_at as string])
  );
  const unlockedCount = unlockedMap.size;
  const t = getServerTranslations();
  const lang = getServerLang();

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/achievements" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">{t.achievementsTitle}</h1>
          <span className="text-sm text-muted-foreground">
            {unlockedCount} / {ACHIEVEMENTS.length} {t.unlocked.toLowerCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlockedAt = unlockedMap.get(a.key);
            const isUnlocked = !!unlockedAt;

            return (
              <div
                key={a.key}
                className={cn(
                  "rounded-xl border bg-card shadow-sm p-4 flex flex-col items-center gap-2 text-center transition-all",
                  isUnlocked
                    ? "border-primary/20 shadow-md"
                    : "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "text-3xl leading-none",
                    !isUnlocked && "grayscale blur-[2px]"
                  )}
                >
                  {a.icon}
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold leading-snug">{getAchievementText(a, profile?.project_type, lang).title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {isUnlocked ? getAchievementText(a, profile?.project_type, lang).desc : t.locked}
                  </p>
                  {isUnlocked && (
                    <p className="text-[10px] text-muted-foreground/60 pt-0.5">
                      {new Date(unlockedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
