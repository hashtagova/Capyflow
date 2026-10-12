"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "@/lib/language-context";

export function LanguageToggle() {
  const { lang, setLang } = useTranslations();
  const router = useRouter();

  function handleToggle() {
    setLang(lang === "en" ? "de" : "en");
    // Refresh server components so they re-read the updated lang cookie
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={lang === "en" ? "Auf Deutsch wechseln" : "Switch to English"}
      className="text-[11px] font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
    >
      {lang === "en" ? "DE" : "EN"}
    </button>
  );
}
