-- Add priority column to quests
-- 0 = normal, 1 = high, 2 = urgent
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
