export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppNavWrapper as AppNav } from "@/components/app-nav-wrapper";
import { QuestMapClient } from "./QuestMapClient";
import type { ChapterWithCounts } from "./QuestMapClient";
import { getServerLang } from "@/lib/server-lang";
import { ThesisTitleBadge } from "@/components/thesis-title-badge";

export default async function QuestMapPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("thesis_title, project_delivered_at, project_type")
    .eq("id", user.id)
    .single();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("user_id", user.id)
    .order("order_index", { ascending: true, nullsFirst: false });

  // Deduplicate by title, keep lowest order_index
  const seen = new Set<string>();
  const uniqueChapters = (chapters ?? []).filter((c) => {
    if (seen.has(c.title)) return false;
    seen.add(c.title);
    return true;
  });

  // Quest counts per chapter (parallel)
  const countEntries = await Promise.all(
    uniqueChapters.map(async (chapter) => {
      const { data } = await supabase
        .from("quests")
        .select("status")
        .eq("user_id", user.id)
        .eq("chapter_id", chapter.id)
        .in("status", ["todo", "in_progress", "done"]);

      const rows = data ?? [];
      return {
        chapterId: chapter.id,
        total: rows.length,
        done: rows.filter((q) => q.status === "done").length,
      };
    })
  );

  const countMap = new Map(countEntries.map((e) => [e.chapterId, e]));

  const activeChapter =
    uniqueChapters.find((c) => c.status === "in_progress") ??
    uniqueChapters.find((c) => c.status === "not_started");

  const lang = getServerLang();

  const projectType = userProfile?.project_type ?? "written_thesis";
  const questMapTitles: Record<string, { en: string; de: string }> = {
    written_thesis: { en: "Quest Map", de: "Kapitelkarte"          },
    research_paper: { en: "Quest Map", de: "Kapitelkarte"          },
    mixed:          { en: "Quest Map", de: "Quest Map"             },
    presentation:   { en: "Quest Map", de: "Abschnittsübersicht"   },
    software:       { en: "Quest Map", de: "Meilensteinübersicht"  },
    design_project: { en: "Quest Map", de: "Phasenübersicht"       },
    creative:       { en: "Quest Map", de: "Szenenübersicht"       },
  };
  const questMapTitle = (questMapTitles[projectType] ?? questMapTitles.written_thesis)[lang === "de" ? "de" : "en"];
  const unitSubtitles: Record<string, { en: string; de: string }> = {
    written_thesis: { en: "Capy is with you on every chapter.",   de: "Capy begleitet dich durch jedes Kapitel."    },
    research_paper: { en: "Capy is with you on every chapter.",   de: "Capy begleitet dich durch jedes Kapitel."    },
    mixed:          { en: "Capy is with you on every chapter.",   de: "Capy begleitet dich durch jedes Kapitel."    },
    presentation:   { en: "Capy is with you on every section.",   de: "Capy begleitet dich durch jeden Abschnitt."  },
    software:       { en: "Capy is with you on every milestone.", de: "Capy begleitet dich durch jeden Meilenstein." },
    design_project: { en: "Capy is with you on every phase.",     de: "Capy begleitet dich durch jede Phase."       },
    creative:       { en: "Capy is with you on every scene.",     de: "Capy begleitet dich durch jede Szene."       },
  };
  const questMapSubtitle = (unitSubtitles[projectType] ?? unitSubtitles.written_thesis)[lang === "de" ? "de" : "en"];
  const chaptersWithCounts: ChapterWithCounts[] = uniqueChapters.map((c) => ({
    ...c,
    deadline: (c as { deadline?: string | null }).deadline ?? null,
    total: countMap.get(c.id)?.total ?? 0,
    done: countMap.get(c.id)?.done ?? 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav activePath="/quest-map" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{questMapTitle}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 mb-2">🦫 {questMapSubtitle}</p>
          {userProfile?.thesis_title && (
            <ThesisTitleBadge initialTitle={userProfile.thesis_title} />
          )}
        </div>

        <QuestMapClient
          initialChapters={chaptersWithCounts}
          activeChapterId={activeChapter?.id ?? null}
          isDelivered={!!userProfile?.project_delivered_at}
          projectType={projectType}
        />
      </main>
    </div>
  );
}
