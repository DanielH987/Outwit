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
- **Naming UI (revised 2026-09-15): set in Profile, chess.com-style.** chess.com never asks for a username in the lobby or mid-game — you get one at signup and change it in Settings → Account. Outwit mirrors that: the name is edited in a **Display name** section on the Profile page (`src/components/DisplayNameForm.tsx`). The lobby and the game panel only *show* "Playing as X" with a **Change name** link, so naming has one predictable home and a player following an invite link can still reach it in one tap.
- **Invite codes:** generated rooms use a 6-character code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `I`, `O`, `0`, `1`). Free-text room names continue to work.
- **Persistent device identity** via `localStorage` + Web Locks: the primary tab of a browser uses the device id (so closing and reopening the tab keeps your seat within a room's 30-minute TTL); extra tabs get ephemeral ids so two tabs remain two players.
- **Budget: free tier only.** Render free (sleeps when idle) + Supabase free (pauses after ~1 week of inactivity) when Phase C lands.
- **Phase C accounts:** Supabase Auth with **email magic link and Google OAuth**. WS server verifies the Supabase JWT and keys seats by the authenticated user id.
- **Display name is device-wide** (shared across tabs); the **seat id is per-tab**. This is deliberate: two tabs = two players, but the same human name.

## Phase A — Milestones

### M6.1 — Display names + invite UX (client-only) — Done

Goal: friend play feels intentional — real names, a "create game → copy link" flow.

- [x] Add `src/stores/profileStore.ts`: `displayName: string | null` (an explicit choice, or seeded from a signed-in account), `guestName: string | null` (**persisted** auto-generated `Guest ####` fallback), `setDisplayName`, `ensureGuestName`, `effectiveDisplayName`, `seedDisplayNameFromAccount`. Persisted to `localStorage` as `outwit-profile`. Kept separate from `authStore` (seat identity).
  - Bug fixed: the guest fallback used to be regenerated per page load (`let guestFallback`), so a guest's name silently changed on every refresh. It is now persisted; a new `DisplayNameForm.test.tsx` + `profileStore.test.ts` cover it.
- [x] Add `src/utils/inviteCode.ts`: `generateInviteCode()` (6 chars, `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), `normalizeInviteCode`, `isValidInviteCode`, `inviteUrl`. Unit-tested (never I/O/0/1, length/alphabet, case-normalization).
- [x] Lobby (`src/pages/LobbyPage.tsx`): **Create game** → `/game/<CODE>`, "join with code" (codes normalized; free-text room names still accepted), and a "Playing as X · Change name" line (no name input — see the revised naming-ui decision above).
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

## Phase C — Accounts (in progress)

**Supabase project (created 2026-09-15):** `outwit`, ref `hqgamvpcowjjgxkchtzu`, organization `ndzhubqcfmsndhzfgnkc`, region West US (Oregon). Dashboard: `https://supabase.com/dashboard/project/hqgamvpcowjjgxkchtzu`. The repo is linked locally (`supabase/.temp/linked-project.json`).

**Guiding rule:** anonymous play stays first-class. Accounts add persistence, trust, and history — they never gate playing a friend.

### C1 — Supabase project + schema — Done
- [x] Create the free project (Oregon, matching Render).
- [x] Migration `supabase/migrations/20260915043705_init.sql` applied (`profiles`, `matches`, RLS, new-user trigger).
- Note: `supabase/config.toml` declares only `auth.site_url` + `auth.additional_redirect_urls`; `supabase config push` leaves undeclared remote settings intact (diff first, always).

### C2 — Client auth — Done
- [x] `@supabase/supabase-js`; `src/services/supabase.ts` (null client when env vars are absent → guest-only mode).
- [x] `authStore` v2: `guestUserId` (seat fallback) vs `accountId` (seat when signed in) + `accessToken`.
- [x] `src/services/account.ts` (magic link, Google OAuth, sign-out, session subscription) and `src/contexts/AccountProvider.tsx`.
- [x] `AccountCard` on the profile page (email magic link + Continue with Google); seat stays stable on sign-in while waiting, and applies to the next room join mid-game.

### C3 — Server JWT verification — Done
- [x] `server/auth.ts`: ES256 via JWKS (cached) + HS256 fallback, expiry/audience/algorithm checks.
- [x] `join-room` accepts `token`; verified `sub` becomes the seat id; identity mismatch is rejected; guests unchanged.
- [x] Tests: `src/__tests__/auth.test.ts` (9), `src/__tests__/serverAuth.test.ts` (4, real WS + generated keypair).

### C4 — Online match recording — Done
- [x] `server/matches.ts`: service-role REST insert; disabled without env vars; never throws.
- [x] `broadcastState` records once per finished room (`room.recorded` guard); verified end-to-end against the real project (`PHASEC2`: `RecAlice` vs `RecBob`, white by resignation, 1 move).
- [x] Tests: `src/__tests__/matches.test.ts` (6).

### C5 — Profile: online history — Done
- [x] `src/services/matches.ts` reads `matches` for the current seat id (guest ids and account ids both work).
- [x] Profile renders **Online games** (win/loss vs opponent, reason, moves, date) alongside local stats and the account card.

### C6 — Verify + deploy — Done (2026-09-15)

- [x] Local: 134 tests passing, lint clean, client + server bundles build.
- [x] Local end-to-end: two browsers, names recorded to the live DB.
- [x] Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production).
- [x] Render env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (set via the Render API — `render services update` cannot set env vars on existing services).
- [x] Production (`https://outwit-one.vercel.app`, commit `3ee0da6`): two browsers played room `PRODC52GB` (ProdCarol vs ProdDave, white won by resignation) and the row landed in Supabase with correct names, result, and move count. Bundle contains the Supabase URL and no service-role key. Profile renders the account card and Online games section; a `?code=` callback URL renders the app without crashing.
- [x] **Account path verified with a real JWT** (temporary confirmed user created via the Supabase Admin API, then deleted): a valid token made the server seat the player by its `sub` (`09c1adef…`, white); an identity mismatch was rejected; guest joins were unaffected. A seeded match for the account appeared on the signed-in profile UI as "Loss vs Guest 5678 · resignation · 12 moves" with "Signed in as phasec-test@example.com". All test data cleaned up afterwards; the user's own `hootinid@gmail.com` account (created during the earlier magic-link test) is left in place.
- [x] **Google OAuth configured (2026-09-15).** GCP project `outwit-auth` (number `281761325025`); OAuth client ID in `supabase/config.toml` (public), secret pushed to Supabase via the `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` env var at `supabase config push` time — **never written to the repo**. Verified: `https://hqgamvpcowjjgxkchtzu.supabase.co/auth/v1/settings` reports `google: true`; the authorize endpoint returns a 302 to Google with the right client id + callback; and the production "Continue with Google" button opens Google's consent screen ("to continue to hqgamvpcowjjgxkchtzu.supabase.co").
  - Note: `gcloud` cannot create OAuth clients (the IAP OAuth Admin API requires a Cloud Organization this account doesn't have, and Google is retiring that API). The client was created in the Google Auth Platform console. Authorized redirect URI: `https://hqgamvpcowjjgxkchtzu.supabase.co/auth/v1/callback`; JS origins: `https://outwit-one.vercel.app`, `http://localhost:5173`, `http://localhost:4173`.
  - If the client secret is ever rotated, re-run: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=<secret> supabase config push --project-ref hqgamvpcowjjgxkchtzu --yes`.
- [ ] **Brand verification — SKIPPED (decision 2026-09-15).** Google's compliance check returned `NONCOMPLIANT` with `HOMEPAGE_URL_UNDER_VERIFIED_DOMAIN`. Root cause: **Google rejects third-party platform subdomains** (`vercel.app`, `github.io`, `web.app`, `firebaseapp.com`) for brand verification even when Search Console shows `siteOwner` — their Trust & Safety team explicitly requires "a domain under your ownership". There is a `discuss.google.dev` thread with the identical `vercel.app` error. **Decision: keep `outwit-one.vercel.app` and accept the unbranded consent screen**; functional sign-in is unaffected.
  - What was still completed and remains useful: `/privacy` + `/terms` pages (linked app-wide), the `google-site-verification` meta tag, Site Verification + Search Console ownership for `outwit-one.vercel.app`, and Google OAuth itself (works; the consent screen shows the Supabase callback domain and links the app's Privacy Policy/Terms).
  - **To get an "Outwit"-branded consent screen later:** buy a domain you own (~$10-15/yr; `outwit.gg`, `outwitgame.com` and `outwitboard.com` were available at the time of this writing), point it at Vercel, then update the OAuth authorized domain / Supabase redirect URLs / `site_url` and re-submit branding. Everything else in the app already works with any domain.
  - Scopes are `email profile` (non-sensitive): no scope declaration or sensitive-scope review is required, so the "unverified app" state is cosmetic only.
  - Note: the consent-screen config API (`clientauthconfig.googleapis.com/v1`) has no public discovery doc and could not be driven from the CLI; brand submission is console-only.
- [ ] **Manual:** request a fresh magic link in production (the earlier one expired because `site_url` was still `localhost:3000` at the time; it is now `https://outwit-one.vercel.app`).

**Known behavior / gotchas:**
- Redirect URLs are configured for production and localhost (5173 dev, 4173 preview). An earlier test email pointed at `http://localhost:3000` and expired — that was before `supabase config push` set `auth.site_url`; links now target the app.
- Magic links are single-use and expire quickly; request a fresh one rather than reusing an old email.
- Email confirmations remain enabled (hosted default): a magic-link sign-in both confirms the address and creates the session.
- Match recording requires both Render env vars; without them the server runs guest-only and games are not stored.
- **Disconnect countdown:** while a seat is absent mid-game, `game-state` carries `forfeit: { side, deadline, serverNow, graceSeconds }`. Clients count down against `deadline` using the `serverNow` offset (clock-skew safe) and clear it when the opponent returns or the game ends. Implemented in `server/index.ts` (`maybeStartForfeitTimer` / `roomStatePayload`) and `src/components/ForfeitCountdownBanner.tsx`.
- **Disconnect detection:** Render's proxy holds dead TCP connections open (~11s measured) so `close` alone is too slow to start the forfeit timer. **WebSocket ping/pong control frames do not work here** — measured in production, `ws.ping()` never reached the browser while the proxy answered pongs on the client's behalf, meaning dead clients went undetected *and* healthy ones could be wrongly terminated. Liveness therefore uses an **app-level JSON `ping`/`pong`** (`ServerMessageType`/`ClientMessageType` gained `ping`/`pong`): the server pings every 3s, any inbound message marks a socket alive, and a socket that misses a round is terminated. Production measurement: disconnect detected in **3s** (was 11s) and the forfeit fires at ~33s total with a 30s grace period. Tests: `src/__tests__/serverHeartbeat.test.ts` (raw socket that stops reading — proves silent clients are removed, healthy ones are not).

**Secrets:** never commit keys. Vercel/Render env vars only; `.env*` is gitignored. The service-role key is server-only (Render), never `VITE_`-prefixed.

**Scope note:** free-tier Supabase pauses after ~1 week of inactivity, and Render still drops in-memory rooms when it sleeps. Accounts fix identity and history; room persistence (Redis) remains separate.

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
