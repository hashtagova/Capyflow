export interface AchievementVariant {
  title: string;
  desc: string;
  titleDe: string;
  descDe: string;
}

export interface AchievementDef {
  key: string;
  icon: string;
  title: string;
  desc: string;
  titleDe: string;
  descDe: string;
  byProjectType?: Record<string, AchievementVariant>;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_quest",   icon: "⭐", title: "First Step",       desc: "Complete your first quest. Every dive starts somewhere.",  titleDe: "Erster Schritt",            descDe: "Erste Aufgabe abgeschlossen. Jeder Tauchgang fängt irgendwo an." },
  { key: "streak_3",      icon: "⚔️", title: "Quest Master",     desc: "10 quests done. You know how to get things done.",         titleDe: "Aufgaben-Meisterin",        descDe: "10 Aufgaben erledigt. Du weißt, wie man Dinge angeht." },
  { key: "streak_7",      icon: "💧", title: "Seven Dips",       desc: "7 dips in. The momentum is real.",                         titleDe: "Sieben Dips",               descDe: "7 Dips absolviert. Der Schwung ist real." },
  { key: "level_2",       icon: "🌊", title: "Going Deeper",     desc: "Reached Level 2. The water's getting warmer.",             titleDe: "Tiefer geht's",             descDe: "Level 2 erreicht. Das Wasser wird wärmer." },
  { key: "level_5",       icon: "🎓", title: "Almost There",     desc: "Level 5. You've dipped your way here.",                    titleDe: "Fast geschafft",            descDe: "Level 5. Du hast dich hierher gedippt." },
  { key: "pomodoro_5",    icon: "✨", title: "First Dip",        desc: "Your first dip. The beginning of the flow.",               titleDe: "Erster Dip",                descDe: "Dein erster Dip. Der Anfang des Flows." },
  { key: "pomodoro_20",   icon: "🏅", title: "Deep Day",         desc: "5 dips in one day. That's a deep dive.",                   titleDe: "Tiefer Tag",                descDe: "5 Dips an einem Tag. Das ist ein echter Tauchgang." },
  {
    key: "chapter_done",
    icon: "📖",
    title: "Chapter Closed",
    desc: "A full chapter done. Dip by dip.",
    titleDe: "Kapitel beendet",
    descDe: "Ein ganzes Kapitel geschafft. Dip für Dip.",
    byProjectType: {
      software:       { title: "Milestone Hit",    desc: "A milestone closed. Dip by dip.",        titleDe: "Meilenstein erreicht",  descDe: "Ein Meilenstein geschafft. Dip für Dip." },
      presentation:   { title: "Section Closed",   desc: "A full section done. Dip by dip.",       titleDe: "Abschnitt beendet",     descDe: "Ein ganzer Abschnitt fertig. Dip für Dip." },
      design_project: { title: "Draft Closed",     desc: "A full draft done. Dip by dip.",         titleDe: "Entwurf abgeschlossen", descDe: "Ein ganzer Entwurf fertig. Dip für Dip." },
      creative:       { title: "Scene Wrapped",    desc: "A full scene done. Dip by dip.",         titleDe: "Szene abgedreht",       descDe: "Eine ganze Szene fertig. Dip für Dip." },
      mixed:          { title: "Phase Closed",     desc: "A full phase done. Dip by dip.",         titleDe: "Phase abgeschlossen",   descDe: "Eine ganze Phase fertig. Dip für Dip." },
    },
  },
  { key: "all_chapters",    icon: "🦫", title: "Gentle Return",      desc: "Back after 3+ days. Capy saved your spot.",               titleDe: "Sanfte Rückkehr",             descDe: "Nach 3+ Tagen zurück. Capy hat deinen Platz freigehalten." },
  { key: "xp_500",          icon: "💫", title: "XP Diver",           desc: "500 XP earned. Every dip added up.",                      titleDe: "XP-Taucherin",                descDe: "500 XP gesammelt. Jeder Dip hat gezählt." },
  { key: "consistent_week", icon: "📅", title: "7 Dip Days",         desc: "Dipped on 7 different days. No rush — they all count.",   titleDe: "7 Dip-Tage",                 descDe: "An 7 verschiedenen Tagen getaucht. Kein Stress — alle zählen." },
  {
    key: "project_delivered",
    icon: "🎉",
    title: "Delivered!",
    desc: "Every chapter at 100%. You dipped your way to the finish line.",
    titleDe: "Abgegeben!",
    descDe: "Jedes Kapitel auf 100%. Du hast dich bis zur Ziellinie gedippt.",
    byProjectType: {
      software:       { title: "Shipped!",     desc: "Every milestone done. You dipped your way to the finish line.",   titleDe: "Veröffentlicht!", descDe: "Jeder Meilenstein erledigt. Du hast dich bis zur Ziellinie gedippt." },
      presentation:   { title: "Presented!",   desc: "Every section done. You dipped your way to the finish line.",     titleDe: "Präsentiert!",    descDe: "Jeder Abschnitt fertig. Du hast dich bis zur Ziellinie gedippt." },
      design_project: { title: "Submitted!",   desc: "Every draft done. You dipped your way to the finish line.",       titleDe: "Eingereicht!",    descDe: "Jeder Entwurf fertig. Du hast dich bis zur Ziellinie gedippt." },
      creative:       { title: "Released!",    desc: "Every scene wrapped. You dipped your way to the finish line.",    titleDe: "Veröffentlicht!", descDe: "Jede Szene abgedreht. Du hast dich bis zur Ziellinie gedippt." },
      mixed:          { title: "Phased!",       desc: "Every phase done. You dipped your way to the finish line.",       titleDe: "Durchgephast!",   descDe: "Jede Phase fertig. Du hast dich bis zur Ziellinie gedippt." },
    },
  },
];

export function getAchievementText(
  a: AchievementDef,
  projectType: string | null | undefined,
  lang: string
): { title: string; desc: string } {
  const variant = projectType ? a.byProjectType?.[projectType] : undefined;
  const resolved = variant ?? a;
  return {
    title: lang === "de" ? resolved.titleDe : resolved.title,
    desc:  lang === "de" ? resolved.descDe  : resolved.desc,
  };
}
