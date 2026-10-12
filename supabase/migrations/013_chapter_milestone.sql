-- Tracks whether the chapter-complete milestone has been celebrated.
-- Set the first time the chapter reaches 100%. Never cleared.
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS milestone_celebrated_at timestamptz;

-- ── Backfill for existing data ─────────────────────────────────────────────
--
-- Chapters with status = 'done' (progress_pct = 100) are marked as already
-- celebrated so the RPC milestone guard
-- (WHERE milestone_celebrated_at IS NULL) does not re-fire when a quest
-- inside a previously completed chapter is re-completed.
--
-- Timestamp: MAX(completed_at) of the chapter's quests, with a COALESCE
-- fallback to now() in case all quests in a done chapter somehow have
-- completed_at = NULL (prevents the subquery returning NULL and leaving
-- milestone_celebrated_at unset).
--
-- In-progress and not-started chapters are intentionally left NULL so their
-- first genuine completion correctly triggers the milestone.
--
UPDATE public.chapters c
   SET milestone_celebrated_at = (
     SELECT COALESCE(MAX(q.completed_at), now())
       FROM public.quests q
      WHERE q.chapter_id = c.id
   )
 WHERE c.status = 'done'
   AND c.milestone_celebrated_at IS NULL;
