ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS project_delivered_at timestamptz;
