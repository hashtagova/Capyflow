-- Add default pomodoro duration preference to users
alter table public.users
  add column default_pomodoro_minutes integer not null default 25;
