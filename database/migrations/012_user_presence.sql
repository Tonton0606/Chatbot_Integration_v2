create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  is_online boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists "Users can read user presence" on public.user_presence;
create policy "Users can read user presence"
  on public.user_presence
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own presence" on public.user_presence;
create policy "Users can insert own presence"
  on public.user_presence
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own presence" on public.user_presence;
create policy "Users can update own presence"
  on public.user_presence
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_presence_last_seen_at_idx
  on public.user_presence (last_seen_at desc);
