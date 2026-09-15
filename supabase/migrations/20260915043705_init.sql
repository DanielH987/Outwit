-- Outwit Phase C: profiles and online match history.
--
-- Design notes:
-- - `matches` stores seat ids as TEXT because guests (`user_…` strings) and
--   signed-in accounts (uuid strings) both sit at the table.
-- - RLS: profiles are public-read (names are public in-game) and owner-writable.
--   Matches are public-read and service-role-only for writes; the WebSocket
--   server records them and clients cannot forge results.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row on signup; seed the display name from auth metadata
-- when the client passes one (e.g. `options.data.display_name`).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'display_name', ''), 20), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  white_id text not null,
  black_id text not null,
  white_name text,
  black_name text,
  winner text check (winner in ('white', 'black') or winner is null),
  reason text not null check (reason in (
    'base-filled', 'stalemate', 'agreement', 'repetition', 'resignation', 'forfeit'
  )),
  move_count integer not null default 0 check (move_count >= 0),
  finished_at timestamptz not null default now()
);

create index if not exists matches_white_id_idx on public.matches (white_id, finished_at desc);
create index if not exists matches_black_id_idx on public.matches (black_id, finished_at desc);

alter table public.matches enable row level security;

create policy "matches are readable by everyone"
  on public.matches for select
  using (true);

-- No insert/update/delete policies: only the service role (which bypasses RLS)
-- can write, i.e. the WebSocket server. Clients cannot forge matches.
