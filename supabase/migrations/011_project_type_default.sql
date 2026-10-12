-- ============================================================
-- Migration 011: backfill and enforce project_type default
-- ============================================================

-- Backfill existing NULL rows
UPDATE public.users SET project_type = 'written_thesis' WHERE project_type IS NULL;

-- Set default for future rows
ALTER TABLE public.users ALTER COLUMN project_type SET DEFAULT 'written_thesis';

-- Enforce NOT NULL
ALTER TABLE public.users ALTER COLUMN project_type SET NOT NULL;
