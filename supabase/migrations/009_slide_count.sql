ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS slide_count integer;
