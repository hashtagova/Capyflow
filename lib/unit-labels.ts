/**
 * Central source of truth for the structural-unit terminology.
 * Use this instead of local CHAPTER_UNIT maps scattered across components.
 *
 * Returns { singular, plural, singularCap, pluralCap } for the unit word
 * that matches the user's project_type and language.
 *
 * DB column names ("chapters" table, "chapter_id" etc.) are intentionally
 * NOT changed — this is display-layer only.
 */

export interface UnitLabels {
  singular: string;
  plural: string;
  singularCap: string;
  pluralCap: string;
}

const EN: Record<string, UnitLabels> = {
  written_thesis: { singular: "chapter",   plural: "chapters",   singularCap: "Chapter",   pluralCap: "Chapters"   },
  research_paper: { singular: "chapter",   plural: "chapters",   singularCap: "Chapter",   pluralCap: "Chapters"   },
  software:       { singular: "milestone", plural: "milestones", singularCap: "Milestone", pluralCap: "Milestones" },
  presentation:   { singular: "section",   plural: "sections",   singularCap: "Section",   pluralCap: "Sections"   },
  design_project: { singular: "stage",     plural: "stages",     singularCap: "Stage",     pluralCap: "Stages"     },
  creative:       { singular: "scene",     plural: "scenes",     singularCap: "Scene",     pluralCap: "Scenes"     },
  mixed:          { singular: "phase",     plural: "phases",     singularCap: "Phase",     pluralCap: "Phases"     },
};

const DE: Record<string, UnitLabels> = {
  written_thesis: { singular: "Kapitel",     plural: "Kapitel",      singularCap: "Kapitel",     pluralCap: "Kapitel"      },
  research_paper: { singular: "Kapitel",     plural: "Kapitel",      singularCap: "Kapitel",     pluralCap: "Kapitel"      },
  software:       { singular: "Meilenstein", plural: "Meilensteine", singularCap: "Meilenstein", pluralCap: "Meilensteine" },
  presentation:   { singular: "Abschnitt",   plural: "Abschnitte",   singularCap: "Abschnitt",   pluralCap: "Abschnitte"   },
  design_project: { singular: "Phase",       plural: "Phasen",       singularCap: "Phase",       pluralCap: "Phasen"       },
  creative:       { singular: "Szene",       plural: "Szenen",       singularCap: "Szene",       pluralCap: "Szenen"       },
  mixed:          { singular: "Phase",       plural: "Phasen",       singularCap: "Phase",       pluralCap: "Phasen"       },
};

export function getUnitLabels(projectType: string, lang: string): UnitLabels {
  const map = lang === "de" ? DE : EN;
  return map[projectType] ?? map.written_thesis;
}
