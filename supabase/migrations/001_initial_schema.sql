-- ============================================================
-- Capyflow – Initial Schema
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
create type chapter_status as enum ('not_started', 'in_progress', 'done');
create type quest_status    as enum ('todo', 'in_progress', 'done', 'skipped');
create type quest_difficulty as enum ('easy', 'medium', 'hard');

-- ── 1. users ─────────────────────────────────────────────────
create table public.users (
  id                uuid        primary key references auth.users (id) on delete cascade,
  email             text        not null,
  display_name      text,
  thesis_title      text,
  thesis_deadline   date,
  xp                integer     not null default 0,
  level             integer     not null default 1,
  current_streak    integer     not null default 0,
  longest_streak    integer     not null default 0,
  rest_day_used     boolean     not null default false,
  capy_mood         text        not null default 'happy',
  created_at        timestamptz not null default now()
);

-- ── 2. chapters ──────────────────────────────────────────────
create table public.chapters (
  id           uuid           primary key default gen_random_uuid(),
  user_id      uuid           not null references public.users (id) on delete cascade,
  title        text           not null,
  order_index  integer        not null default 0,
  status       chapter_status not null default 'not_started',
  progress_pct integer        not null default 0 check (progress_pct between 0 and 100),
  created_at   timestamptz    not null default now()
);

-- ── 3. quests ────────────────────────────────────────────────
create table public.quests (
  id               uuid            primary key default gen_random_uuid(),
  chapter_id       uuid            not null references public.chapters (id) on delete cascade,
  user_id          uuid            not null references public.users (id) on delete cascade,
  title            text            not null,
  xp_reward        integer         not null default 10,
  difficulty       quest_difficulty not null default 'medium',
  status           quest_status    not null default 'todo',
  completed_at     timestamptz,
  is_ai_generated  boolean         not null default false,
  order_index      integer         not null default 0,
  created_at       timestamptz     not null default now()
);

-- ── 4. pomodoro_sessions ─────────────────────────────────────
create table public.pomodoro_sessions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users (id) on delete cascade,
  quest_id          uuid        references public.quests (id) on delete set null,
  started_at        timestamptz not null default now(),
  duration_minutes  integer     not null default 25,
  completed         boolean     not null default false,
  word_count        integer
);

-- ── 5. daily_logs ────────────────────────────────────────────
create table public.daily_logs (
  id                uuid    primary key default gen_random_uuid(),
  user_id           uuid    not null references public.users (id) on delete cascade,
  date              date    not null,
  total_pomodoros   integer not null default 0,
  total_minutes     integer not null default 0,
  total_words       integer not null default 0,
  quests_completed  integer not null default 0,
  streak_maintained boolean not null default false,
  unique (user_id, date)
);

-- ── 6. achievements ──────────────────────────────────────────
create table public.achievements (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users (id) on delete cascade,
  achievement_key text        not null,
  unlocked_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users             enable row level security;
alter table public.chapters          enable row level security;
alter table public.quests            enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.daily_logs        enable row level security;
alter table public.achievements      enable row level security;

-- users
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- chapters
create policy "chapters: own rows" on public.chapters
  for all using (auth.uid() = user_id);

-- quests
create policy "quests: own rows" on public.quests
  for all using (auth.uid() = user_id);

-- pomodoro_sessions
create policy "pomodoro_sessions: own rows" on public.pomodoro_sessions
  for all using (auth.uid() = user_id);

-- daily_logs
create policy "daily_logs: own rows" on public.daily_logs
  for all using (auth.uid() = user_id);

-- achievements
create policy "achievements: own rows" on public.achievements
  for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create user profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
