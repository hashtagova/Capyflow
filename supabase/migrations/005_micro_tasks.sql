-- ── micro_tasks ───────────────────────────────────────────────
create table public.micro_tasks (
  id          uuid        primary key default gen_random_uuid(),
  quest_id    uuid        not null references public.quests (id) on delete cascade,
  user_id     uuid        not null references public.users (id) on delete cascade,
  title       text        not null,
  completed   boolean     not null default false,
  order_index integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.micro_tasks enable row level security;

create policy "micro_tasks: own rows" on public.micro_tasks
  for all using (auth.uid() = user_id);

create index micro_tasks_quest_id_idx on public.micro_tasks (quest_id);
