export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { getServerTranslations } from "@/lib/server-lang";
import { SettingsToggle } from "./SettingsToggle";
import { LanguageToggle } from "@/components/language-toggle";
import { MeasurementToggle } from "./MeasurementToggle";
import { ProjectTypeToggle } from "./ProjectTypeToggle";
import { ResetProgressButton } from "./ResetProgressButton";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("thesis_title, buddy_checkin_enabled, measurement_unit, project_type")
    .eq("id", user.id)
    .single();

  if (!profile?.thesis_title) redirect("/onboarding");

  const t = getServerTranslations();

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/settings" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t.settingsTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settingsSubtitle}</p>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm px-4 divide-y divide-border">
          {/* Buddy check-in */}
          <SettingsToggle buddyCheckinEnabled={profile.buddy_checkin_enabled ?? false} />

          {/* Measurement unit */}
          <MeasurementToggle currentUnit={profile.measurement_unit ?? "words"} />

          {/* Project type */}
          <ProjectTypeToggle currentType={profile.project_type ?? "written_thesis"} />

          {/* Reset progress */}
          <ResetProgressButton />

          {/* Language */}
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t.languageSetting}</p>
              <p className="text-xs text-muted-foreground">{t.languageSettingDesc}</p>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </main>
    </div>
  );
}
