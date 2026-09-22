-- Outwit Phase C: unique usernames + country flags.
--
-- Design notes:
-- - `profiles.username` is a public unique handle for signed-in accounts —
--   the friend-search key. Guests do not get usernames (a guest seat id is
--   device-bound, so a handle tied to it would be meaningless).
-- - `matches.white_country` / `matches.black_country` persist the flag shown
--   next to a player's name when the game was played.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_]+$'));

alter table public.matches
  add column if not exists white_country text
    check (white_country is null or white_country ~ '^[A-Z]{2}$');
alter table public.matches
  add column if not exists black_country text
    check (black_country is null or black_country ~ '^[A-Z]{2}$');
