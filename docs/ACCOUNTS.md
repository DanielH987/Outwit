# Outwit — Accounts, Identity & Multiplayer Plan

**Status:** Phase A (named guests + invite links + persistent device identity) **implemented** (M6.1, M6.2, and M6.3 verification complete as of 2026-09-15; see the checklists below). Phase C (accounts) is a documented direction. This document is the handoff spec for anyone (human or agent) picking this up; it assumes no prior chat context.

**Read this with:** [`ROADMAP.md`](../ROADMAP.md) (phases and open questions), [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) (hosting, env vars, incidents), [`docs/RULES.md`](RULES.md) (game rules), [`AGENTS.md`](../AGENTS.md) (conventions).

## How to Resume

1. Read this file top to bottom.
2. Find the first unchecked milestone below (M6.1 → M6.2 → M6.3).
3. Implement it, run its **Verify** steps, mark it `[x]`, and commit on `main` with a clear message.
4. Do not start Phase C without the user's go-ahead.

## Current State (verified 2026-09-15)

| Area | Reality | Evidence |
| --- | --- | --- |
| Identity | A random `userId` (`user_xxx`) is generated per browser tab and persisted to **`sessionStorage`**. Refresh keeps it; closing the tab loses it. Nothing ever calls `setUser`. | `src/stores/authStore.ts` |
| Display names | Players appear as `user_p78g7h1eh_mu1oyoj5` in the players list and chat; there is no name UI anywhere. | `src/pages/GamePage.tsx`, `src/components/ChatPanel.tsx` |
| Profiles | `/profile/:username` ignores the URL and renders **local pass-and-play stats** from `localStorage` only. Nothing online is recorded. | `src/pages/ProfilePage.tsx`, `src/stores/statsStore.ts` |
| Online games | In-memory rooms on Render; finished games are discarded, and rooms are lost when the free tier sleeps (~15 min idle) or redeploys. | `server/index.ts`, `docs/DEPLOYMENT.md` |
| Trust | The server validates moves with `src/engine/` but **trusts the client-supplied `userId`**; anyone could claim any seat id. No auth. | `server/index.ts` (`join-room`) |
| Friend play | Works today via a shared room name/URL (`/game/<room>`; first joiner White, second Black, rest spectate), but there is no invite UX. | `src/pages/LobbyPage.tsx`, `server/index.ts` |

### Verified browser/server capabilities

- **Web Locks API works on production** (`https://outwit-one.vercel.app`, secure context): a probe showed the first tab acquires `navigator.locks.request('outwit-seat', { ifAvailable: true })` (`firstGotLock: true`) while a second tab does **not** (`secondGotLock: false`; true two-page test: `{ page1: true, page2: false }`). This is the mechanism M6.2 relies on. Older browsers without Web Locks fall back to today's per-tab behavior.
- **Supabase CLI is available and authenticated** on this machine: `supabase` v2.117.0; `supabase projects list` returns the user's projects (e.g. `pacific-connect`, org `ndzhubqcfmsndhzfgnkc`). **Do not reuse `pacific-connect` for Outwit** — create a new free project in Phase C. If `supabase` commands hang or lack auth, re-run `supabase login`.
- Deploy paths: Vercel via `npx vercel@latest --prod --yes` (CLI); Render **auto-deploys on every push to `main`** (do not assume manual deploys are needed).

## Locked Decisions (do not revisit without asking)

- **No authentication in Phase A.** Playing a friend does not need accounts; accounts solve *persistence, trust, and ratings*, which are Phase C.
- **Named guests.** Players get a display name; seats remain anonymous ids. Name length 2–20 chars after trim; empty falls back to a generated `Guest ####`.
- **Naming UI:** set/edit in the lobby **and** in the game side panel (so a player who lands on an invite link can still enter a name).
- **Invite codes:** generated rooms use a 6-character code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `I`, `O`, `0`, `1`). Free-text room names continue to work.
- **Persistent device identity** via `localStorage` + Web Locks: the primary tab of a browser uses the device id (so closing and reopening the tab keeps your seat within a room's 30-minute TTL); extra tabs get ephemeral ids so two tabs remain two players.
- **Budget: free tier only.** Render free (sleeps when idle) + Supabase free (pauses after ~1 week of inactivity) when Phase C lands.
- **Phase C accounts:** Supabase Auth with **email magic link and Google OAuth**. WS server verifies the Supabase JWT and keys seats by the authenticated user id.
- **Display name is device-wide** (shared across tabs); the **seat id is per-tab**. This is deliberate: two tabs = two players, but the same human name.

## Phase A — Milestones

### M6.1 — Display names + invite UX (client-only) — Done

Goal: friend play feels intentional — real names, a "create game → copy link" flow.

- [x] Add `src/stores/profileStore.ts`: `displayName: string | null`, `setDisplayName(name)` (trim, 2–20 chars), persisted to `localStorage` as `outwit-profile`. Kept separate from `authStore` (seat identity). Exported from `src/stores/index.ts` (plus `effectiveDisplayName()` with a per-tab stable `Guest ####` fallback).
- [x] Add `src/utils/inviteCode.ts`: `generateInviteCode()` (6 chars, `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), `normalizeInviteCode`, `isValidInviteCode`, `inviteUrl`. Unit-tested (never I/O/0/1, length/alphabet, case-normalization).
- [x] Lobby (`src/pages/LobbyPage.tsx`): "Your name" field, **Create game** → `/game/<CODE>`, "join with code" (codes normalized; free-text room names still accepted), inline validation error.
- [x] Game panel (`src/pages/GamePage.tsx`): name editor with **Save**; **Waiting for opponent** card (`src/components/WaitingForOpponent.tsx`) with room code, read-only invite link, **Copy** (`navigator.clipboard` + selectable fallback), and **Share…** when the Web Share API exists.
- [x] Display name flows through the protocol: `useWebSocketActions` sends `effectiveDisplayName()` as `username` on `join-room` and `send-chat`; players list and chat show it.
- [x] Tests: `inviteCode.test.ts`, `profileStore.test.ts`, `WaitingForOpponent.test.tsx`, updated `LobbyProfile.test.tsx`.

### M6.2 — Persistent device identity (client-only) — Done

Goal: closing and reopening the tab keeps your seat (within the room TTL), while two tabs stay two players.

- [x] Add `src/services/identity.ts`: `localStorage['outwit-device-id']` (adopting the existing per-tab id on first run as a migration), `resolveIdentity()` using `navigator.locks.request('outwit-seat', { ifAvailable: true })` held for the tab's lifetime (first tab → device id; extra tabs → ephemeral id; no Web Locks → per-tab fallback; lock failure → ephemeral fallback). Releases on `pagehide`.
- [x] `src/stores/authStore.ts`: `setUserId(id)` added.
- [x] Add `src/contexts/IdentityProvider.tsx`: resolves identity once at startup, stores it via `setUserId`, and **gates render** until known — so every `join-room` carries the final seat id (no rejoin race, no duplicate joins).
- [x] Tests: `identity.test.ts` (device id reuse, migration, first-tab ownership, second-tab isolation, no-locks fallback, lock-failure fallback).

### M6.3 — Docs + end-to-end verification — Done (2026-09-15)

- [x] `ROADMAP.md` open question 3 resolved; `AGENTS.md` and `docs/DEPLOYMENT.md` updated.
- [x] Automated gates: 115 tests passing, lint 0 errors (2 intentional react-refresh warnings for provider+hook files), production build green.
- [x] Browser verification (local production build + local server, Playwright):
  - Lobby: set "Alice", **Create game** → `/game/JWSJSC`; waiting card showed the code and full invite link.
  - Second browser joined via the invite link, set "Bob" → seats white/black; both names visible; waiting card disappeared.
  - Identity: `localStorage['outwit-device-id']` set and matches the session `userId`.
  - Tab close/reopen (same context): same seat retained (white) with the same `userId`.
  - Two tabs in one context: distinct user ids and seats (white + black).
- Production verification and deploy: recorded after deployment (see the commit message / below).

Deployed verification (fill in per deploy):

- Commit: `0a6a104` (deployed to Vercel + Render auto-deploy, 2026-09-15)
- Production (`https://outwit-one.vercel.app`): created room `JSXTRW` from the lobby after setting "ProdAlice"; waiting card showed the code and full invite link. A second browser joined by link, set "ProdBob", and became Black; both names visible; waiting card disappeared. Closed/reopened the first tab → still White. Server `/stats`: `{rooms:1, players:2, moves:0, heapMB:10}` — stable.

## Phase C — Accounts (direction, not scheduled)

Only start when the user asks. Sketched scope:

- Create a **new free Supabase project** (do not reuse `pacific-connect`); enable **email magic link** + **Google OAuth**.
- Client: Supabase JS SDK; sign-in UI; migrate the anonymous guest identity to the account on first login (link the existing `userId` if the account is new).
- Server (`server/index.ts`): verify the Supabase JWT on `join-room` (public key/JWKS, cached); key seats by the authenticated `sub`; reject impersonation attempts. Keep anonymous play working when no token is present (guests remain first-class).
- Data: `users` (id, display name, created_at) and `matches` (players, result, reason, move count, timestamps). Profile reads online history plus the local pass-and-play stats it already shows.
- Ratings: only after matches are server-verified; choose a system (Elo or Glicko-2) at that time.
- Caveats to plan around: Supabase free projects **pause after ~1 week of inactivity**; Render free still sleeps and drops in-memory rooms — persistent match history depends on the database, not the room store. Room persistence (e.g. Upstash Redis) is a **separate** effort that fixes rooms dying on sleep; it is not part of accounts.

## Out of Scope (Phase A)

- Online match history / database writes.
- Ratings, friend lists, direct invites, rematch.
- Server-side auth or JWT verification.
- Room persistence (Redis) and always-on hosting.
- Time controls / clocks (separate open question in `ROADMAP.md`).

## Risks & Notes

- Identity resolution is async (Web Locks) while `authStore` is synchronously initialized; the optimistic boot + rejoin path handles this. Watch for duplicate joins — the service's queued-join dedupe is the guard.
- Two tabs sharing a device id would break seat separation if the lock logic regresses; the M6.2 tests cover this explicitly.
- Lobby copy asserts in tests may need updating; update them intentionally rather than deleting.
- The server needs **no changes** for Phase A. If a future step requires them, update `src/types/index.ts` and `server/index.ts` together (see `AGENTS.md`).
