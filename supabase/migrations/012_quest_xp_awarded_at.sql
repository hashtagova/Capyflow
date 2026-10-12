-- Tracks whether XP has ever been awarded for this quest.
-- Set on first successful completion. Never cleared on reopen.
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS xp_awarded_at timestamptz;

-- ── Backfill for existing data ─────────────────────────────────────────────
--
-- COVERED: quests with status = 'done'.
--   These are unambiguously identified as previously rewarded.
--   xp_awarded_at is set to completed_at so the RPC guard
--   (xp_awarded_at IS NULL) never re-awards XP on re-completion.
--
-- NOT COVERED: quests with status = 'todo' / 'in_progress' / 'skipped'
--   where completed_at IS NULL.
--   The markQuestTodo action clears completed_at when a quest is reopened,
--   leaving no column-level trace of prior completion. Such quests are
--   indistinguishable from quests that were never completed.
--   They are left with xp_awarded_at = NULL.
--
--   Consequence: a todo quest that was completed and reopened *before* this
--   migration is applied will receive XP again on its next completion.
--   This is an unresolvable data gap for pre-migration history; it is
--   documented here rather than silently worked around.
--
--   Scope of uncertainty (a test account):
--     The seed script wipes and re-inserts all quest rows, so all seeded
--     todo quests were inserted as todo and were never completed.
--     No ambiguous todo quests exist on the test account.
--     For any real-user data accumulated outside the seed, the uncertainty
--     cannot be resolved without an external audit log.
--
--   After this migration is applied, markQuestTodo deliberately preserves
--   xp_awarded_at (never cleared on reopen), so all future reopens are safe.
--
UPDATE public.quests
   SET xp_awarded_at = completed_at
 WHERE status = 'done'
   AND completed_at IS NOT NULL
   AND xp_awarded_at IS NULL;
