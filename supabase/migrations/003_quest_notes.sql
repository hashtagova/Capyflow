-- Add notes column to quests
alter table public.quests add column if not exists notes text;
