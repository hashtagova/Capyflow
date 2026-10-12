"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { translations, type Lang, type T } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

interface Props {
  children: React.ReactNode;
  initialLang?: Lang;
}

export function LanguageProvider({ children, initialLang = "en" }: Props) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // On mount, check localStorage (overrides cookie-based initial value if user changed it client-side)
  useEffect(() => {
    const saved = localStorage.getItem("capyflow_lang") as Lang | null;
    if (saved === "en" || saved === "de") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("capyflow_lang", l);
    // Also write a cookie so server components can read the preference on next navigation
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] as T }}>
      <TooltipProvider delayDuration={400}>
        {children}
      </TooltipProvider>
    </LanguageContext.Provider>
  );
}

export function useTranslations() {
  return useContext(LanguageContext);
}
