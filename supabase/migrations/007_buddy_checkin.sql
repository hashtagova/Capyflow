-- ============================================================
-- Migration 007: buddy check-in feature
-- ============================================================

-- Add buddy check-in preference to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS buddy_checkin_enabled boolean NOT NULL DEFAULT false;

-- Create buddy_checkins table
CREATE TABLE IF NOT EXISTS public.buddy_checkins (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood        text        NOT NULL CHECK (mood IN ('happy', 'neutral', 'sad')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast per-user queries
CREATE INDEX IF NOT EXISTS buddy_checkins_user_id_idx ON public.buddy_checkins(user_id);
CREATE INDEX IF NOT EXISTS buddy_checkins_created_at_idx ON public.buddy_checkins(user_id, created_at DESC);

-- RLS
ALTER TABLE public.buddy_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buddy_checkins: own rows" ON public.buddy_checkins
  FOR ALL USING (auth.uid() = user_id);
