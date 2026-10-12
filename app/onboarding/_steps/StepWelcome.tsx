import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

export function StepWelcome({ onNext }: Props) {
  const { t, lang, setLang } = useTranslations();
  const router = useRouter();

  function selectLang(l: "en" | "de") {
    if (l !== lang) {
      setLang(l);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      {/* Language picker */}
      <div className="flex items-center gap-2 self-end">
        {(["en", "de"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => selectLang(l)}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-md border transition-colors",
              lang === l
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {l === "en" ? "EN" : "DE"}
          </button>
        ))}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/cappy-base.png" alt="Capy" width={120} height={120} className="object-contain select-none" style={{ mixBlendMode: "multiply" }} />
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">{t.capyIntro}</h2>
        <p className="text-muted-foreground max-w-sm leading-relaxed">
          {t.capyTagline}
        </p>
      </div>
      <Button size="lg" onClick={onNext} className="mt-2 px-8">
        {t.letsGo}
      </Button>
    </div>
  );
}
