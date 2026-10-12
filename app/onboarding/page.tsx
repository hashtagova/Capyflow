"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { StepWelcome } from "./_steps/StepWelcome";
import { StepThesis } from "./_steps/StepThesis";
import { StepProjectType } from "./_steps/StepProjectType";
import { StepMetric } from "./_steps/StepMetric";
import { StepDeadline } from "./_steps/StepDeadline";
import { StepChapters } from "./_steps/StepChapters";
import { StepPomodoro } from "./_steps/StepPomodoro";
import { StepBuddyCheckin } from "./_steps/StepBuddyCheckin";
import { completeOnboarding } from "./actions";
import { useTranslations } from "@/lib/language-context";

interface FormData {
  thesisTitle: string;
  deadline: string;
  chapters: string[];
  pomodoroMinutes: number;
  projectType: string;
  measurementUnit: string;
}

const TOTAL_STEPS = 8; // 0 = welcome (no progress shown), steps 1–7 are tracked

// ─── DEV ONLY — remove before production ─────────────────────────────────────
const DEV_PROJECT_TYPES = [
  { id: "written_thesis", emoji: "📄", label: "Written Thesis",  unit: "words"    },
  { id: "research_paper", emoji: "📊", label: "Research Paper",  unit: "words"    },
  { id: "design_project", emoji: "🎨", label: "Design Project",  unit: "slides"   },
  { id: "software",       emoji: "💻", label: "Software",        unit: "features" },
  { id: "creative",       emoji: "🎬", label: "Creative",        unit: "scenes"   },
  { id: "presentation",   emoji: "📋", label: "Presentation",    unit: "slides"   },
  { id: "mixed",          emoji: "🔬", label: "Mixed/Other",     unit: "both"     },
] as const;
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    thesisTitle: "",
    deadline: "",
    chapters: [],
    pomodoroMinutes: 25,
    projectType: "written_thesis",
    measurementUnit: "words",
  });
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const progressPct = step === 0 ? 0 : Math.round((step / (TOTAL_STEPS - 1)) * 100);

  function handleFinish(pomodoroMinutes: number) {
    setFormData((prev) => ({ ...prev, pomodoroMinutes }));
    setStep(7);
  }

  function handleBuddyCheckin(buddyCheckinEnabled: boolean) {
    const payload = { ...formData, buddyCheckinEnabled };
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding(payload);
      if (result?.error) {
        console.error("[onboarding] completeOnboarding error:", result.error);
        setError(result.error);
        if (result.error.toLowerCase().includes("session")) {
          setTimeout(() => router.push("/login"), 2000);
        }
      }
    });
  }

  return (
    <>
    {/* ─── DEV ONLY — remove before production ─────────────────────────────── */}
    {process.env.NODE_ENV !== "production" && (
      <div
        className="fixed top-4 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52"
        style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
      >
        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Onboarding</span>

        <span className="text-[9px] font-semibold text-orange-500 uppercase tracking-wider block pt-0.5">Project type</span>
        {DEV_PROJECT_TYPES.map(({ id, emoji, label, unit }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFormData((f) => ({ ...f, projectType: id, measurementUnit: unit }))}
            className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              formData.projectType === id
                ? "bg-orange-400 text-white"
                : "bg-orange-200 hover:bg-orange-300 text-orange-900"
            }`}
          >
            {emoji} {label}
          </button>
        ))}

        <div className="border-t border-orange-300 !mt-2.5" />

        <span className="text-[9px] font-semibold text-orange-500 uppercase tracking-wider block !mt-2.5">Jump to step</span>
        {([
          [0, "0 · Welcome"],
          [1, "1 · Project Type"],
          [2, "2 · Title"],
          [3, "3 · Measurement Unit"],
          [4, "4 · Deadline"],
          [5, "5 · Structure"],
          [6, "6 · Focus Duration"],
          [7, "7 · Buddy Check-In"],
        ] as [number, string][]).map(([s, label]) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              if (s === 5) setFormData((f) => ({ ...f, chapters: [] }));
              setStep(s);
            }}
            className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              step === s
                ? "bg-orange-400 text-white"
                : "bg-orange-200 hover:bg-orange-300 text-orange-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    )}
    {/* ─────────────────────────────────────────────────────────────────────── */}
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        {step > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground text-right">
              {t.stepOf(step, TOTAL_STEPS - 1)}
            </p>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}

        <div className="bg-card border rounded-xl p-8 shadow-sm">
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}

          {step === 1 && (
            <StepProjectType
              onNext={(projectType, measurementUnit) => {
                setFormData((prev) => ({ ...prev, projectType, measurementUnit }));
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <StepThesis
              value={formData.thesisTitle}
              projectType={formData.projectType}
              onNext={(thesisTitle) => {
                setFormData((prev) => ({ ...prev, thesisTitle }));
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <StepMetric
              defaultUnit={formData.measurementUnit}
              onNext={(measurementUnit) => {
                setFormData((prev) => ({ ...prev, measurementUnit }));
                setStep(4);
              }}
            />
          )}

          {step === 4 && (
            <StepDeadline
              value={formData.deadline}
              projectType={formData.projectType}
              onNext={(deadline) => {
                setFormData((prev) => ({ ...prev, deadline }));
                setStep(5);
              }}
            />
          )}

          {step === 5 && (
            <StepChapters
              value={formData.chapters}
              projectType={formData.projectType}
              onNext={(chapters) => {
                setFormData((prev) => ({ ...prev, chapters }));
                setStep(6);
              }}
            />
          )}

          {step === 6 && (
            <StepPomodoro
              value={formData.pomodoroMinutes}
              onNext={handleFinish}
              loading={false}
            />
          )}

          {step === 7 && (
            <StepBuddyCheckin
              onNext={handleBuddyCheckin}
              loading={isPending}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        {step > 1 && step < 7 && !isPending && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="text-sm text-muted-foreground hover:text-foreground mx-auto block transition-colors"
          >
            ← {t.back}
          </button>
        )}
      </div>
    </main>
    </>
  );
}
