-- Add last_active timestamp to users table.
-- Updated on every dashboard load so sleeping state clears on return.
alter table public.users
  add column if not exists last_active timestamptz;
