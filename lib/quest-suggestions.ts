export interface QuestSuggestion {
  title: string;
  difficulty: "easy" | "medium" | "hard";
}

export const QUEST_SUGGESTIONS: Record<string, QuestSuggestion[]> = {
  written_thesis: [
    { title: "Write a rough outline for the introduction", difficulty: "easy" },
    { title: "Draft the literature review structure", difficulty: "medium" },
    { title: "Write 500 words on the methodology", difficulty: "medium" },
    { title: "Summarise 3 key sources", difficulty: "easy" },
    { title: "Write the abstract (first draft)", difficulty: "hard" },
    { title: "Create a list of all references so far", difficulty: "easy" },
    { title: "Write the conclusion's first paragraph", difficulty: "medium" },
    { title: "Review and revise the introduction", difficulty: "medium" },
    { title: "Fill in a gap identified in the literature", difficulty: "hard" },
    { title: "Write the discussion section outline", difficulty: "medium" },
  ],
  research_paper: [
    { title: "Define the research question clearly", difficulty: "medium" },
    { title: "Write the abstract draft", difficulty: "hard" },
    { title: "Summarise 5 related papers", difficulty: "medium" },
    { title: "Outline the methodology section", difficulty: "medium" },
    { title: "Write the results section outline", difficulty: "easy" },
    { title: "Create figures or tables for key data", difficulty: "medium" },
    { title: "Write the limitations paragraph", difficulty: "easy" },
    { title: "Draft the introduction's first section", difficulty: "medium" },
    { title: "Review citations for completeness", difficulty: "easy" },
    { title: "Write the discussion comparing your results", difficulty: "hard" },
  ],
  software: [
    { title: "Set up the project repository", difficulty: "easy" },
    { title: "Write a README with setup instructions", difficulty: "easy" },
    { title: "Implement the core data model", difficulty: "hard" },
    { title: "Write unit tests for the main module", difficulty: "medium" },
    { title: "Set up CI/CD pipeline", difficulty: "medium" },
    { title: "Build the authentication flow", difficulty: "hard" },
    { title: "Implement error handling and logging", difficulty: "medium" },
    { title: "Write API documentation", difficulty: "medium" },
    { title: "Refactor the largest function", difficulty: "medium" },
    { title: "Add input validation across forms", difficulty: "easy" },
  ],
  presentation: [
    { title: "Define the key message in one sentence", difficulty: "easy" },
    { title: "Create the opening slide", difficulty: "easy" },
    { title: "Draft the agenda / table of contents", difficulty: "easy" },
    { title: "Write speaker notes for 3 slides", difficulty: "medium" },
    { title: "Create a visual for the main argument", difficulty: "medium" },
    { title: "Build the summary / conclusion slide", difficulty: "medium" },
    { title: "Rehearse the first 2 minutes aloud", difficulty: "easy" },
    { title: "Get feedback on one section", difficulty: "easy" },
    { title: "Simplify the most text-heavy slide", difficulty: "medium" },
    { title: "Prepare answers to likely questions", difficulty: "hard" },
  ],
  design_project: [
    { title: "Create a mood board for the project", difficulty: "easy" },
    { title: "Sketch 3 rough concepts", difficulty: "medium" },
    { title: "Define the colour palette", difficulty: "easy" },
    { title: "Build the first wireframe", difficulty: "medium" },
    { title: "Get feedback on the initial concept", difficulty: "easy" },
    { title: "Design the main hero section", difficulty: "hard" },
    { title: "Create a style guide document", difficulty: "medium" },
    { title: "Iterate based on feedback", difficulty: "medium" },
    { title: "Prepare the presentation of the final design", difficulty: "medium" },
    { title: "Write a short rationale for design decisions", difficulty: "easy" },
  ],
  creative: [
    { title: "Write a character profile for the protagonist", difficulty: "easy" },
    { title: "Draft the opening scene", difficulty: "medium" },
    { title: "Outline the three-act structure", difficulty: "medium" },
    { title: "Write 500 words on a key scene", difficulty: "medium" },
    { title: "Create a world-building reference sheet", difficulty: "easy" },
    { title: "Write the climax scene (rough draft)", difficulty: "hard" },
    { title: "Revise the first chapter", difficulty: "medium" },
    { title: "Write dialogue for one key conversation", difficulty: "medium" },
    { title: "Define the central theme in one sentence", difficulty: "easy" },
    { title: "Write the ending (first draft)", difficulty: "hard" },
  ],
  mixed: [
    { title: "Break the project into 3 major phases", difficulty: "easy" },
    { title: "Define the deliverable for this week", difficulty: "easy" },
    { title: "Complete the hardest task on your list", difficulty: "hard" },
    { title: "Write a progress update for yourself", difficulty: "easy" },
    { title: "Review what's left and reprioritise", difficulty: "medium" },
    { title: "Work on the part you've been avoiding", difficulty: "hard" },
    { title: "Finish one half-done task", difficulty: "medium" },
    { title: "Set up a clear structure for the next section", difficulty: "medium" },
    { title: "Do a focused 25-min session on a stuck task", difficulty: "medium" },
    { title: "Write down 3 next actions", difficulty: "easy" },
  ],
};

export function getSuggestions(projectType: string, count = 3): QuestSuggestion[] {
  const pool = QUEST_SUGGESTIONS[projectType] ?? QUEST_SUGGESTIONS.written_thesis;
  // Shuffle deterministically enough for SSR by just slicing — caller can shuffle client-side
  return pool.slice(0, count);
}
