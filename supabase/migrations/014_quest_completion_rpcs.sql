-- ─────────────────────────────────────────────────────────────────────────────
-- complete_quest_and_award_xp(p_quest_id uuid)
--
-- Primary quest completion RPC. Runs entirely in one transaction:
--   1. Authenticates caller via auth.uid() — no user ID parameter accepted.
--   2. Locks quest row (FOR UPDATE) to serialise concurrent completions of the
--      same quest.
--   3. Locks chapter row (FOR UPDATE, always after quest lock) to serialise
--      concurrent chapter progress writes from different quest completions.
--   4. Guards XP award with xp_awarded_at IS NULL (first completion only).
--   5. Atomically increments users.xp with database arithmetic.
--   6. Fails the entire transaction (RAISE EXCEPTION) if the user row is missing,
--      preventing a state where xp_awarded_at is set but XP was not received.
--   7. Recalculates chapter progress from committed quest state.
--   8. Claims the chapter milestone atomically with WHERE milestone_celebrated_at IS NULL.
--
-- Lock order: quest row → chapter row (consistent; prevents deadlock).
--
-- Known limitation: TypeScript recalcChapter (used by add/delete/reopen/edit)
-- is not inside this transaction. It can produce a briefly stale progress_pct
-- display if it races with this RPC. It never touches milestone_celebrated_at,
-- so the one-time milestone is always safe. revalidatePath auto-heals the display.
--
-- Returns JSON:
--   { "error": "<message>" }                         on guard failure
--   {                                                on success
--     "chapter_id":        uuid,
--     "xp_earned":         int,    -- 0 on re-completion
--     "old_xp":            int,
--     "new_xp":            int,
--     "old_level":         int,
--     "new_level":         int,
--     "xp_awarded":        bool,
--     "chapter_completed": bool    -- true only when THIS call claims the milestone
--   }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_quest_and_award_xp(p_quest_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid    := auth.uid();
  v_quest          record;
  v_chapter        record;
  v_old_xp         integer;
  v_old_level      integer;
  v_new_xp         integer;
  v_new_level      integer;
  v_done_count     integer;
  v_total_count    integer;
  v_chapter_pct    integer;
  v_chapter_status chapter_status;
  v_awarded        boolean := false;
  v_milestone_ts   timestamptz;
  v_chapter_done   boolean := false;
BEGIN

  -- ── 1. Authentication ──────────────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- ── 2. Lock quest row ──────────────────────────────────────────────────────
  SELECT id, chapter_id, xp_reward, status, xp_awarded_at
    INTO v_quest
    FROM public.quests
   WHERE id = p_quest_id AND user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Quest not found');
  END IF;

  IF v_quest.status = 'done' THEN
    RETURN json_build_object('error', 'Already completed');
  END IF;

  -- ── 3. Lock chapter row (always after quest lock — consistent order) ───────
  SELECT id, progress_pct, milestone_celebrated_at
    INTO v_chapter
    FROM public.chapters
   WHERE id = v_quest.chapter_id
     FOR UPDATE;

  -- ── 4 & 5. XP award ────────────────────────────────────────────────────────
  IF v_quest.xp_awarded_at IS NULL THEN

    -- First completion: mark quest and claim XP in one write.
    UPDATE public.quests
       SET status        = 'done',
           completed_at  = now(),
           xp_awarded_at = now()
     WHERE id = p_quest_id;

    SELECT xp, level INTO v_old_xp, v_old_level
      FROM public.users
     WHERE id = v_user_id;

    -- Atomic increment — database arithmetic prevents overwrite races.
    UPDATE public.users
       SET xp    = xp + v_quest.xp_reward,
           level = CASE
             WHEN (xp + v_quest.xp_reward) >= 1200 THEN 6
             WHEN (xp + v_quest.xp_reward) >= 800  THEN 5
             WHEN (xp + v_quest.xp_reward) >= 500  THEN 4
             WHEN (xp + v_quest.xp_reward) >= 250  THEN 3
             WHEN (xp + v_quest.xp_reward) >= 100  THEN 2
             ELSE 1
           END
     WHERE id = v_user_id
    RETURNING xp, level INTO v_new_xp, v_new_level;

    -- ── 6. Guard: fail entire transaction if user row is missing ──────────────
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found for id %', v_user_id;
    END IF;

    v_awarded := true;

  ELSE

    -- Re-completion: mark done again, no XP change.
    UPDATE public.quests
       SET status       = 'done',
           completed_at = now()
     WHERE id = p_quest_id;

    SELECT xp, level INTO v_old_xp, v_old_level
      FROM public.users
     WHERE id = v_user_id;

    v_new_xp    := v_old_xp;
    v_new_level := v_old_level;

  END IF;

  -- ── 7. Chapter progress (from committed state inside this transaction) ──────
  SELECT
    COUNT(*) FILTER (WHERE status = 'done'),
    COUNT(*)
    INTO v_done_count, v_total_count
    FROM public.quests
   WHERE chapter_id = v_quest.chapter_id;

  v_chapter_pct := CASE
    WHEN v_total_count > 0 THEN ROUND((v_done_count::numeric / v_total_count) * 100)
    ELSE 0
  END;

  v_chapter_status := CASE
    WHEN v_chapter_pct = 100 THEN 'done'::chapter_status
    WHEN v_chapter_pct > 0   THEN 'in_progress'::chapter_status
    ELSE                           'not_started'::chapter_status
  END;

  -- ── 8. Atomic milestone claim ───────────────────────────────────────────────
  IF v_chapter_pct = 100 THEN

    -- WHERE milestone_celebrated_at IS NULL is the compare-and-set guard.
    -- Only the first concurrent caller to reach this UPDATE will match.
    UPDATE public.chapters
       SET progress_pct            = v_chapter_pct,
           status                  = v_chapter_status,
           milestone_celebrated_at = now()
     WHERE id = v_quest.chapter_id
       AND milestone_celebrated_at IS NULL
    RETURNING milestone_celebrated_at INTO v_milestone_ts;

    v_chapter_done := (v_milestone_ts IS NOT NULL);

    -- If another request already claimed the milestone, still update progress.
    IF NOT v_chapter_done THEN
      UPDATE public.chapters
         SET progress_pct = v_chapter_pct,
             status       = v_chapter_status
       WHERE id = v_quest.chapter_id;
    END IF;

  ELSE

    UPDATE public.chapters
       SET progress_pct = v_chapter_pct,
           status       = v_chapter_status
     WHERE id = v_quest.chapter_id;

  END IF;

  RETURN json_build_object(
    'chapter_id',        v_quest.chapter_id,
    'xp_earned',         CASE WHEN v_awarded THEN v_quest.xp_reward ELSE 0 END,
    'old_xp',            v_old_xp,
    'new_xp',            v_new_xp,
    'old_level',         v_old_level,
    'new_level',         v_new_level,
    'xp_awarded',        v_awarded,
    'chapter_completed', v_chapter_done
  );

END;
$$;

REVOKE EXECUTE ON FUNCTION complete_quest_and_award_xp(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION complete_quest_and_award_xp(uuid) TO   authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Remove legacy award_dip_xp() if it was ever created manually or by an
-- earlier draft of this migration. IF NOT EXISTS prevents an error when it
-- was never created. After this DROP, no callable form of award_dip_xp()
-- remains in the database regardless of prior history.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.award_dip_xp();


-- ─────────────────────────────────────────────────────────────────────────────
-- save_dip_session(p_session_id, p_quest_id, p_started_at, p_duration_minutes,
--                  p_word_count, p_slide_count)
--
-- Atomically inserts a pomodoro session row AND awards 10 XP in a single
-- transaction. Replacing the former award_dip_xp() which could be called
-- directly by any authenticated user without a real session.
--
-- Security improvements over award_dip_xp():
--   - XP is only awarded when a session row is actually inserted.
--   - p_session_id is client-generated (crypto.randomUUID) and stored as the
--     row PK. ON CONFLICT (id) DO NOTHING provides idempotency: retried
--     requests with the same ID neither double-insert nor double-award XP.
--   - Inputs are validated server-side before any write.
--   - Quest ownership is verified when p_quest_id is supplied.
--
-- Returns JSON:
--   { "error": "<message>" }                              on validation failure
--   { "already_processed": true, "xp_earned": 0 }        on idempotent retry
--   {                                                     on success
--     "session_id": uuid,
--     "xp_earned":  10,
--     "xp":         int,
--     "old_level":  int,
--     "new_level":  int
--   }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_dip_session(
  p_session_id       uuid,
  p_quest_id         uuid,
  p_started_at       timestamptz,
  p_duration_minutes integer,
  p_word_count       integer,
  p_slide_count      integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid    := auth.uid();
  v_dip_xp     integer := 10;
  v_session_id uuid;
  v_old_level  integer;
  v_new_xp     integer;
  v_new_level  integer;
BEGIN

  -- ── 1. Authentication ──────────────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- ── 2. Input validation ────────────────────────────────────────────────────
  -- Upper bound is 240 (not 120) to accommodate sessions extended via the +5 min
  -- button in PomodoroTimer: a 120-minute custom session extended multiple times
  -- can legitimately exceed 120 minutes.
  IF p_duration_minutes < 1 OR p_duration_minutes > 240 THEN
    RETURN json_build_object('error', 'Duration must be between 1 and 240 minutes');
  END IF;

  IF p_started_at > now() + interval '1 minute' THEN
    RETURN json_build_object('error', 'started_at cannot be in the future');
  END IF;

  IF p_word_count IS NOT NULL AND p_word_count < 0 THEN
    RETURN json_build_object('error', 'word_count must be non-negative');
  END IF;

  IF p_slide_count IS NOT NULL AND p_slide_count < 0 THEN
    RETURN json_build_object('error', 'slide_count must be non-negative');
  END IF;

  -- ── 3. Quest ownership check ───────────────────────────────────────────────
  IF p_quest_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.quests
       WHERE id = p_quest_id AND user_id = v_user_id
    ) THEN
      RETURN json_build_object('error', 'Quest not found');
    END IF;
  END IF;

  -- ── 4. Idempotent session insert ───────────────────────────────────────────
  -- ON CONFLICT (id) DO NOTHING: if the same p_session_id arrives again
  -- (network retry), RETURNING produces no row → v_session_id stays NULL.
  INSERT INTO public.pomodoro_sessions (
    id, user_id, quest_id, started_at, duration_minutes, completed,
    word_count, slide_count
  ) VALUES (
    p_session_id, v_user_id, p_quest_id, p_started_at, p_duration_minutes, true,
    p_word_count, p_slide_count
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_session_id;

  -- ── 5. Already processed — ownership-verified idempotent response ─────────
  -- v_session_id IS NULL means ON CONFLICT fired: either a genuine retry by
  -- this user, or a different user supplying a known UUID. Check ownership so
  -- we never confirm another user's session as a successful retry.
  IF v_session_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.pomodoro_sessions
       WHERE id = p_session_id AND user_id = v_user_id
    ) THEN
      RETURN json_build_object('already_processed', true, 'xp_earned', 0);
    ELSE
      RETURN json_build_object('error', 'Session save failed');
    END IF;
  END IF;

  -- ── 6. Atomic XP award ────────────────────────────────────────────────────
  SELECT level INTO v_old_level FROM public.users WHERE id = v_user_id;

  UPDATE public.users
     SET xp    = xp + v_dip_xp,
         level = CASE
           WHEN (xp + v_dip_xp) >= 1200 THEN 6
           WHEN (xp + v_dip_xp) >= 800  THEN 5
           WHEN (xp + v_dip_xp) >= 500  THEN 4
           WHEN (xp + v_dip_xp) >= 250  THEN 3
           WHEN (xp + v_dip_xp) >= 100  THEN 2
           ELSE 1
         END
   WHERE id = v_user_id
  RETURNING xp, level INTO v_new_xp, v_new_level;

  -- Fail entire transaction if user row is missing (session was inserted but
  -- XP cannot be awarded — RAISE rolls back the insert too).
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for id %', v_user_id;
  END IF;

  RETURN json_build_object(
    'session_id', v_session_id,
    'xp_earned',  v_dip_xp,
    'xp',         v_new_xp,
    'old_level',  v_old_level,
    'new_level',  v_new_level
  );

END;
$$;

REVOKE EXECUTE ON FUNCTION save_dip_session(uuid, uuid, timestamptz, integer, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_dip_session(uuid, uuid, timestamptz, integer, integer, integer) TO   authenticated;
