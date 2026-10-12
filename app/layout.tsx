import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces, DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/lib/language-context";
import type { Lang } from "@/lib/translations";
import { WorkLimitBanner } from "@/components/work-limit-banner";
import { BuddyCheckinShell } from "@/components/buddy-checkin-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Capyflow",
  description: "A gamified thesis companion app",
  icons: { icon: "/capyflow.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLang = cookies().get("lang")?.value;
  const initialLang: Lang = cookieLang === "de" ? "de" : "en";

  return (
    <html lang={initialLang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${dmSans.variable} antialiased`}
      >
        <LanguageProvider initialLang={initialLang}>
          <TooltipProvider>
            {children}
            <WorkLimitBanner />
            <BuddyCheckinShell />
          </TooltipProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
