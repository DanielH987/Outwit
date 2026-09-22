-- Add moves column to matches for game replay.
-- Stores the full move list as JSONB so past games can be replayed
-- from the profile page. Each entry is { chipId, from: {x,y}, to: {x,y} }.
alter table public.matches
  add column if not exists moves jsonb not null default '[]'::jsonb;