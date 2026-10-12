-- ============================================================
-- Migration 006: project_type + measurement_unit
-- ============================================================

-- Add project type and measurement unit to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS project_type     text,
  ADD COLUMN IF NOT EXISTS measurement_unit text NOT NULL DEFAULT 'words';

-- Add slide_count to pomodoro_sessions (used when measurement_unit = 'both')
ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS slide_count integer;
