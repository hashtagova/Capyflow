"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";

export interface ExportRow {
  date: string;
  pomodoros: number;
  words: number;
  quests_completed: number;
  streak_maintained: boolean;
}

export interface CheckinRow {
  mood: string;
  note: string | null;
  created_at: string;
}

export interface SessionRow {
  started_at: string;
  duration_minutes: number;
  word_count: number;
  quest_title: string | null;
  chapter_title: string | null;
}

export interface CompletedQuestRow {
  title: string;
  completed_at: string;
  xp_reward: number;
  chapter_title: string | null;
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function getMetricColumnHeader(unit: string, isDE: boolean): string {
  if (isDE) {
    switch (unit) {
      case "words":      return "Geschriebene Wörter";
      case "hours":      return "Stunden";
      case "pages":      return "Seiten";
      case "commits":    return "Commits";
      case "iterations": return "Iterationen";
      case "slides":     return "Folien";
      case "features":   return "Features";
      case "scenes":     return "Szenen";
      default:           return unit || "Geschriebene Wörter";
    }
  } else {
    switch (unit) {
      case "words":      return "Words Written";
      case "hours":      return "Hours";
      case "pages":      return "Pages";
      case "commits":    return "Commits";
      case "iterations": return "Iterations";
      case "slides":     return "Slides";
      case "features":   return "Features";
      case "scenes":     return "Scenes";
      default:           return unit || "Words Written";
    }
  }
}

export function ExportButton({
  rows,
  checkins,
  measurementUnit,
  sessions,
  completedQuests,
}: {
  rows: ExportRow[];
  checkins?: CheckinRow[];
  userEmail?: string;
  measurementUnit?: string;
  sessions?: SessionRow[];
  completedQuests?: CompletedQuestRow[];
}) {
  const { t, lang } = useTranslations();
  const [loading, setLoading] = useState(false);
  const isDE = lang === "de";
  const locale = isDE ? "de-DE" : "en-GB";
  const metricHeader = getMetricColumnHeader(measurementUnit ?? "words", isDE);

  async function handleExport() {
    setLoading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Capyflow";

      // ── Sheet 1: Progress ─────────────────────────────────────
      const sheet1 = workbook.addWorksheet(isDE ? "Fortschritt" : "Progress");
      sheet1.columns = [
        { header: isDE ? "Datum" : "Date",                          key: "date",     width: 24 },
        { header: isDE ? "Fokus-Sitzungen" : "Focus Sessions",      key: "pomos",    width: 18 },
        { header: metricHeader,                                      key: "words",    width: 18 },
        { header: isDE ? "Abgeschlossene Aufgaben" : "Quests Done", key: "quests",   width: 22 },
        { header: isDE ? "Flow-Streak Aktiv" : "Flow Streak Active",key: "streak",   width: 20 },
      ];

      // Header style
      sheet1.getRow(1).font = { bold: true };
      sheet1.getRow(1).fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: "FFFDF3E3" },
      };

      rows.forEach((r) => {
        sheet1.addRow({
          date:   formatDate(r.date, locale),
          pomos:  r.pomodoros,
          words:  r.words,
          quests: r.quests_completed,
          streak: r.streak_maintained ? (isDE ? "Ja" : "Yes") : (isDE ? "Nein" : "No"),
        });
      });

      // Summary row
      const summaryRow = sheet1.addRow({
        date:   isDE ? "Gesamt" : "Total",
        pomos:  rows.reduce((s, r) => s + r.pomodoros, 0),
        words:  rows.reduce((s, r) => s + r.words, 0),
        quests: rows.reduce((s, r) => s + r.quests_completed, 0),
        streak: rows.filter((r) => r.streak_maintained).length,
      });
      summaryRow.font = { bold: true };

      // ── Sheet 2: Mood Log ─────────────────────────────────────
      if (checkins && checkins.length > 0) {
        const sheet2 = workbook.addWorksheet(isDE ? "Stimmungsprotokoll" : "Mood Log");
        sheet2.columns = [
          { header: isDE ? "Datum & Uhrzeit" : "Date & Time", key: "datetime", width: 26 },
          { header: isDE ? "Stimmung" : "Mood",               key: "mood",     width: 14 },
          { header: isDE ? "Notiz" : "Note",                  key: "note",     width: 55 },
        ];

        sheet2.getRow(1).font = { bold: true };
        sheet2.getRow(1).fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: "FFFDF3E3" },
        };

        const moodStr = (mood: string) => {
          if (isDE) return mood === "happy" ? "Gut" : mood === "sad" ? "Schwierig" : "Okay";
          return mood === "happy" ? "Good" : mood === "sad" ? "Rough" : "Okay";
        };

        checkins.forEach((c) => {
          const d = new Date(c.created_at);
          const dateLabel = d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
          const timeLabel = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

          const row = sheet2.addRow({
            datetime: `${dateLabel} ${timeLabel}`,
            mood:     moodStr(c.mood),
            note:     c.note ?? "",
          });

          // Wrap text + top-align for all cells in the row
          row.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: "top" };
          });
        });
      }

      // ── Sheet 3: Dips detail ─────────────────────────────────
      if (sessions && sessions.length > 0) {
        const sheet3 = workbook.addWorksheet(isDE ? "Dips" : "Dips");
        sheet3.columns = [
          { header: isDE ? "Datum" : "Date",           key: "date",     width: 24 },
          { header: isDE ? "Uhrzeit" : "Time",         key: "time",     width: 10 },
          { header: isDE ? "Dauer (Min)" : "Duration (min)", key: "duration", width: 16 },
          { header: isDE ? "Verknüpfte Aufgabe" : "Linked Quest", key: "quest",    width: 34 },
          { header: isDE ? "Kapitel" : "Chapter",      key: "chapter",  width: 28 },
          { header: metricHeader,                       key: "metric",   width: 18 },
        ];
        sheet3.getRow(1).font = { bold: true };
        sheet3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF3E3" } };

        sessions.forEach((s) => {
          const d = new Date(s.started_at);
          sheet3.addRow({
            date:     d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
            time:     d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
            duration: s.duration_minutes,
            quest:    s.quest_title ?? (isDE ? "Freie Sitzung" : "Free session"),
            chapter:  s.chapter_title ?? "—",
            metric:   s.word_count > 0 ? s.word_count : "—",
          });
        });
      }

      // ── Sheet 4: Completed quests ─────────────────────────────
      if (completedQuests && completedQuests.length > 0) {
        const sheet4 = workbook.addWorksheet(isDE ? "Aufgaben" : "Quests");
        sheet4.columns = [
          { header: isDE ? "Abgeschlossen am" : "Completed on", key: "date",    width: 26 },
          { header: isDE ? "Aufgabe" : "Quest",                 key: "title",   width: 40 },
          { header: isDE ? "Kapitel" : "Chapter",               key: "chapter", width: 28 },
          { header: "XP",                                        key: "xp",      width: 8  },
        ];
        sheet4.getRow(1).font = { bold: true };
        sheet4.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF3E3" } };

        completedQuests.forEach((q) => {
          const d = new Date(q.completed_at);
          sheet4.addRow({
            date:    d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
            title:   q.title,
            chapter: q.chapter_title ?? "—",
            xp:      q.xp_reward,
          });
        });
      }

      // ── Download ──────────────────────────────────────────────
      const today = new Date().toISOString().split("T")[0];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capyflow-export-${today}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0 || loading}>
      {loading ? "⏳" : "⬇"} {t.exportCSV}
    </Button>
  );
}
