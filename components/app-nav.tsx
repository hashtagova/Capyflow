"use client";

import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import { DipTooltip } from "@/components/dip-tooltip";

interface Props {
  activePath?: string;
}

export function AppNav({ activePath }: Props) {
  const { t } = useTranslations();

  const NAV_LINKS = [
    { href: "/",             label: t.dashboard,            short: "🏠",  tooltip: undefined },
    { href: "/quest-map",    label: t.questMap,             short: "🗺️", tooltip: undefined },
    { href: "/pomodoro",     label: `💧 ${t.timer}`,        short: "💧",  tooltip: t.dipTooltip },
    { href: "/analytics",    label: `📊 ${t.stats}`,        short: "📊",  tooltip: undefined },
    { href: "/achievements", label: `🏆 ${t.achievements}`, short: "🏆",  tooltip: undefined },
    { href: "/settings",     label: `⚙️ ${t.settingsTitle}`, short: "⚙️", tooltip: undefined },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="font-display text-base font-semibold text-foreground hover:text-primary transition-colors shrink-0"
        >
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/capyflow.png"
              alt="Capy"
              className="h-12 w-12 object-contain rounded-lg"
              style={{ mixBlendMode: "multiply" }}
            />
            <span className="hidden sm:inline" style={{ fontFamily: "var(--font-display)", color: "#5C3317", fontWeight: 600, fontSize: "1.2rem" }}>
              Capyflow
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 shrink-0">
          {NAV_LINKS.map(({ href, label, short, tooltip }) => {
            const isActive = activePath === href;
            const link = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{short}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
            return tooltip ? (
              <DipTooltip key={href} text={tooltip}>{link}</DipTooltip>
            ) : link;
          })}


          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs h-7 px-2 ml-0.5 rounded-md border border-destructive/20"
            >
              <span className="hidden sm:inline">{t.signOut}</span>
              <span className="sm:hidden">↩</span>
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
