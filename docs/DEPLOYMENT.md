# Outwit — Deployment Plan

**Status:** Implemented through M5 (scripted smoke). M1–M4 complete and pushed; M5's automated checks pass; remaining M5 items are interactive human checks; M6 optional. This document is the handoff spec for the deployment phase; any agent should be able to resume from the current milestone without prior chat context.

> **Next phase:** identity & accounts (named guests, invite links, persistent device identity; later Supabase accounts). See [`docs/ACCOUNTS.md`](ACCOUNTS.md).

## Handoff Summary (read first)

- **Live frontend:** `https://outwit-one.vercel.app` (Vercel project `outwit`, CLI-linked at `.vercel/project.json`).
- **Live server:** `https://outwit-server.onrender.com` (Render service `outwit-server`, id `srv-dajpo9m7bikc73d1ge8g`, free plan, Oregon, `ws` path `/ws`, health `/`). Free tier sleeps after ~15 min idle.
- **Env wiring:** `VITE_WS_URL=wss://outwit-server.onrender.com` on Vercel (production); server on Render reads `PORT=10000`.
- **Remaining work:** M5 interactive human checks (two-browser game, reconnect, forfeit-on-disconnect) and optional M6 (auto-deploy via Render GitHub App, custom domain, keep-alive, persistence).

**How to resume:** find the first unchecked milestone below; implement; verify with that milestone's checks; update checkbox; commit with a milestone message. Work on `main`.

**Goal:** Outwit fully deployed and playable online:

1. Static client on Vercel (already live).
2. WebSocket server (`server/index.ts`) on Render.
3. Client pointed at the Render server via `VITE_WS_URL`.
4. SPA deep links working in production.

## How to Resume

1. Read this file top to bottom.
2. Find the first unchecked milestone below.
3. Implement it, run its **Verify** steps, then update the checkbox to `[x]` and commit.
4. Continue until M5 is complete. M6 is optional.

Work on `main`; commit per milestone with a clear message.

## Locked Decisions

Decisions already made with the user. Do not revisit without asking:

- **Server host:** Render, **free** plan.
- **Runtime:** bundled `server/dist/index.js` (esbuild) started with plain `node`; `tsx` is dev-only. `server/index.ts` keeps the test-friendly export (`startServer`), and a thin `server/start.ts` entry is used for production bundling. Chosen because the tsx runtime crashed under Render's free RAM (~512 MB) — see the incident note below.
- **Rooms:** in-memory only for now; losing rooms on restart/sleep is accepted.
- **Frontend URL:** keep `https://outwit-one.vercel.app`.
- **Deploys:** manual via CLIs for now (auto-deploy-on-push is M6, optional).
- **Auth:** client-side only (Zustand persist to `localStorage`); the server trusts the client-supplied `userId` and username. No server auth in this phase.

## Architecture

```
Browser ── HTTPS ──▶ Vercel (static Vite build, SPA rewrites)
   └──── WSS ──────▶ Render web service (server/index.ts, path /ws, in-memory rooms)
                       └── validates moves with shared src/engine/
```

- Vercel serves only static files; it cannot hold long-lived WebSockets.
- The server is authoritative: every move is validated by `src/engine/`; clients render broadcasts.
- Protocol types are shared in `src/types/index.ts`; the backend protocol lives in `server/index.ts` (JSON over WebSocket at `/ws`).

## Environment Variables

| Variable | Where | Value | Notes |
| --- | --- | --- | --- |
| `VITE_WS_URL` | Vercel, production | `wss://outwit-server.onrender.com` | Baked in at build time; **no** trailing `/ws` (client appends it). Requires redeploy to take effect. |
| `VITE_SUPABASE_URL` | Vercel, production | `https://hqgamvpcowjjgxkchtzu.supabase.co` | Client auth + match history (Phase C). Baked in at build time. |
| `VITE_SUPABASE_ANON_KEY` | Vercel, production | anon JWT | Public by design (ships in the bundle). Never use the service-role key here. |
| `SUPABASE_URL` | Render | `https://hqgamvpcowjjgxkchtzu.supabase.co` | Enables JWT verification + match recording; optional (server runs guest-only without it). |
| `SUPABASE_SERVICE_ROLE_KEY` | Render | service-role JWT | **Secret.** Server-only; grants write access to `matches`. Set via the Render API — `render services update` cannot set env vars. |
| `OUTWIT_FORFEIT_SECONDS` | Render (optional) | unset → code default `30` | Disconnect-forfeit grace period. Not set on Render; the code default (30s) applies. chess.com scales this with the clock (10% of base time, 30s–3m); Outwit has no clock pressure, so it uses their 30s minimum. |
| `OUTWIT_ROOM_TTL_SECONDS` | Render (optional) | `1800` | How long an abandoned room (no connected clients) is kept for reconnects before GC. Defaults to 1800 (30 min). |
| `OUTWIT_PORT` | local only | e.g. `3001` | Optional local port override. On Render, the server must use the platform-provided `PORT`. |

## Verified Current State (as of 2026-09-14)

Evidence gathered before planning; re-verify if stale.

| Finding | Evidence |
| --- | --- |
| Frontend deployed, assets load | `curl https://outwit-one.vercel.app/` → 200; `/assets/index-BRD8GT2H.js` → 200 |
| Deep links 404 (no SPA rewrite) | `curl .../game/local` → 404, `curl .../lobby` → 404; no `vercel.json` |
| Production bundle dials localhost | `grep wss://localhost dist/assets/*.js` matches; `VITE_WS_URL` unset (`npx vercel@latest env ls --project outwit` → none) |
| Vercel project | name `outwit`, latest prod `https://outwit-one.vercel.app`, Node 24.x, alias `outwit-one.vercel.app` |
| Deploys are CLI-only | `vercel inspect` has no GitHub commit metadata; no `.vercel/` locally |
| Server OOM crash loop (fixed 2026-09-14) | Render free tier ran `tsx server/index.ts`; `tsx` keeps TS sources + esbuild in memory and OOMed after ~100 s (`FATAL ERROR: Ineffective mark-compacts near heap limit … JavaScript heap out of memory`). Render restarted every ~1–2 min. **Fix:** bundle with esbuild (`npm run build:server` → `server/dist/index.js`, runtime `node server/dist/index.js`); Render build command is now `npm ci && npm run build:server`. Post-fix: stable — heap ~11 MB, no restarts. Diagnostic aid: `server/start.ts` logs `[outwit-server] starting/exiting/…` on signals/crashes and `/stats` (HTTP) reports rooms/players/moves/heap. |
| Client-driven server OOM (fixed 2026-09-14) | Even after bundling, one connected browser drove the heap from ~10 MB to 200+ MB in ~60 s (`heap=` climbing in `/stats`), then the service restarted (WebSocket handshakes returned 502). Cause: `useWebSocketActions` returned new function references each render and `send` was re-bound each render; `OnlineGameView`'s `useEffect([…, joinRoom, leaveRoom])` re-ran on every store update, producing an infinite `join-room` → broadcast → store update → render → `join-room` loop. **Fix:** `useCallback`/`useMemo` all actions and the context `send`, so effect deps are stable. |
| Online play dead (fixed 2026-09-14) | After the loop fix, joins were silent: messages sent before the socket opened were dropped (`OnlineGameView` calls `joinRoom` on mount, before `onopen`; the previous render loop had masked this by re-sending). Also, nothing ever set `authStore.userId`, so browsers joined with `userId: null` (seat collisions), and `GamePage` matched seats against the server's per-connection `connectionId` instead of the client identity. **Fix:** `WebSocketService` queues messages while connecting and flushes on open; `authStore` now generates and persists a guest `userId` (with a versioned migrate for old `null` values); `GamePage` matches `me` by `userId`; `WebSocketService.setActiveRoom` re-sends `join-room` once after every reconnect (seat re-bind), deduping queued joins. |
| Room accumulation (fixed 2026-09-14) | Abandoned rooms were never dropped (a room survived as long as a disconnected seat existed), so `/stats` showed growing `rooms`. **Fix:** `sweepAbandonedRooms` runs every 60 s and drops rooms with no connected clients after `OUTWIT_ROOM_TTL_SECONDS` (default 1800). |
| Frozen board / stuck turns (fixed 2026-09-14) | Symptom: after a reconnect/refresh, one player's board stopped receiving updates while their opponent's did. Cause: `removeClientFromRoom` unconditionally deleted the seat binding; a late `close` from the **replaced** socket detached the **new** socket from `room.players`, so it received no broadcasts (and could still send phantom moves). **Fix:** `removeClientFromRoom` only unbinds when the closing socket is still the current binding; `handleMessage` ignores actions from replaced sockets (`'This session was replaced by a newer connection.'`); spectator seats also bind in `room.spectators` instead of `room.players`. Regression test: "a late close from a replaced socket does not detach the new connection". |
| Two tabs stole each other's seat (fixed 2026-09-14) | Identity was persisted in `localStorage`, so two tabs in the same browser shared one `userId` and the second tab replaced the first (one tab showed both as the same player; the other never updated). **Fix:** `authStore` persists to `sessionStorage` (per-tab), so two tabs are two players and a refresh keeps the seat. |
| Server ignores host `PORT` (fixed) | Now `Number(process.env.PORT ?? process.env.OUTWIT_PORT ?? 3001)` |
| Raw WS server, no HTTP response (fixed) | Now `node:http` server returns `200 ok` on `/` + JSON stats on `/stats`; WS at `/ws` via `{ server, path: '/ws' }`, binds `0.0.0.0` |
| Local online default (fixed) | `src/services/websocket.ts` now defaults to `ws://localhost:3001` and strips trailing `/`; appends `/ws` once |
| Server tests (fixed) | All three server test files use `server.close()` (new `RunningServer { wss, httpServer, close }` return) |
| Server tests | `src/__tests__/server.test.ts` (3456), `serverHardening.test.ts` (3457), `serverForfeit.test.ts` (3458) |
| Quality gates green | 65 tests pass; `npm run lint` has 1 intentional warning; `npm run build` clean |
| CLI access | `npx vercel@latest` authed as `danielh987`; `render` (v2.28.0) authed as `hootinid@gmail.com` |
| Render workspace | `My Workspace` exists but is not set; run `render workspace set` first |
| Repo | public `https://github.com/DanielH987/Outwit.git`, default branch `main` |

## Milestones

### M1 — Frontend Production Fixes (Done)

- [x] Add `vercel.json` at the repo root with an SPA fallback:

  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

  Vercel serves real files before applying rewrites, so `/assets/*`, `/sw.js`, `/manifest.webmanifest`, and `/icon-*.png` are unaffected.

- [x] Fix `src/services/websocket.ts`:
  - Default to `ws://localhost:3001` (not `wss://localhost:3001`) for local dev.
  - Normalize `VITE_WS_URL`: strip trailing slashes, append `/ws` once (accept configs with or without `/ws`). As implemented:

    ```ts
    const raw = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
    const base = raw.replace(/\/+$/, '');
    const WS_URL = base.endsWith('/ws') ? base : `${base}/ws`;
    ```

  - `import.meta.env` types come from the new `src/vite-env.d.ts` (`/// <reference types="vite/client" />`).

- [x] Add `.vercel` to `.gitignore` (the CLI creates it on `vercel link`).

M1 implementation notes: `src/services/websocket.ts` normalizes `VITE_WS_URL` (strips trailing slashes, appends `/ws` once, defaults to `ws://localhost:3001`) and uses `import.meta.env` typed via a new `src/vite-env.d.ts` (`/// <reference types="vite/client" />`).

**Verify:**
- `npm test && npm run lint && npm run build` pass.
- `npm run server` + `npm run dev`, open `http://localhost:5173/game/local` and an online room; the browser connects to `ws://localhost:3001/ws`.
- After M4, `curl -I https://outwit-one.vercel.app/game/local` returns 200.

### M2 — Server Production-Readiness (Done)

- [x] `package.json`:
  - Move `ws` and `tsx` from `devDependencies` to `dependencies`.
  - Add `"start:server": "tsx server/index.ts"`.
  - Removed broken `"server:ci": "node server/index.ts"` (Node 24 ESM cannot resolve extensionless engine imports; `tsx` is the production runtime).

- [x] `server/index.ts`:
  - Port: `Number(process.env.PORT ?? process.env.OUTWIT_PORT ?? 3001)` so Render's injected `PORT` works; explicit `startServer(port)` argument still overrides for tests.
  - Replaced `new WebSocketServer({ port, path: '/ws' })` with a `node:http` server:
    - HTTP requests get `200 ok` (any path; works with `--health-check-path /`).
    - Attached `new WebSocketServer({ server: httpServer, path: '/ws' })`.
    - `httpServer.listen(port, '0.0.0.0')`.
  - `startServer(port)` now returns `{ wss, httpServer, close() }` (new type `RunningServer`).
  - Kept the `export function startServer` signature, the run-as-main guard, and `OUTWIT_FORFEIT_SECONDS` behavior.
  - Startup log includes the bound port/host.

- [x] Updated the three server test files to `const server = startServer(PORT)` … `server.close()`: `src/__tests__/server.test.ts`, `src/__tests__/serverHardening.test.ts`, `src/__tests__/serverForfeit.test.ts`.

- [x] Fixed `README.md`: added `npm run start:server`, corrected the `VITE_WS_URL` default (`ws://localhost:3001`, client appends `/ws`).

- [ ] (Optional hardening) Add `server/tsconfig.json` and reference it from `tsconfig.json` so `npm run build` type-checks `server/`. Skipped: server is not in the current `tsc -b` references and introducing it changes the build graph; tests exercise the server through Vitest and pass. Revisit if the server grows.

**Verify:**
- `npm test` (all 65 pass), `npm run lint`, `npm run build`.
- Manual smoke: `npm run start:server`, then:
  - `curl -i http://localhost:3001/` → `200 ok`.
  - A WS client connects to `ws://localhost:3001/ws` and receives `{ "type": "connected", ... }`.
- `PORT=4010 npm run start:server` binds 4010.

### M3 — Deploy Server to Render (Done)

- [x] `render workspace set "My Workspace"` (workspace is `tea-cvf60sl2ng1s73d28feg`).
- [x] Service created via CLI (exact command below, from this plan):

  ```bash
  render services create \
    --name outwit-server \
    --type web_service \
    --repo https://github.com/DanielH987/Outwit \
    --branch main \
    --runtime node \
    --plan free \
    --region oregon \
    --build-command "npm ci && npm run build:server" \
    --start-command "npm run start:server" \
    --health-check-path / \
    --env-var OUTWIT_FORFEIT_SECONDS=30 \
    --output json --confirm
  ```

  As-deployed values: **service id `srv-dajpo9m7bikc73d1ge8g`**, **URL `https://outwit-server.onrender.com`**, plan free, region oregon, start `npm run start:server`, health check `/`. Initial deploy (`dep-dajpo9u7bikc73d1gfs0`, commit `ecae023`) built and went **live**.

  > If reproducing: if `services create` fails because Render needs repo access, create via dashboard (**New > Web Service**, connect `DanielH987/Outwit`, same build=start commands, plan free, region, env var, health check `/`), then use the CLI for deploys/logs.

- [x] Captured ID/URL from `render services --output json` (above). Deploy completed on creation; when re-triggering later use `render deploys create <service-id> --wait`.
- [x] Verified live: `curl -i https://outwit-server.onrender.com/` → 200; WebSocket to `wss://outwit-server.onrender.com/ws` immediately receives `{"type":"connected","payload":{"userId":"user-1"}}`; logs show `Outwit WebSocket server listening on 0.0.0.0:10000/ws` and `Your service is live` (Render port = 10000 via `PORT`).

**Verify (for future deployments):** HTTP 200 from `/`, successful WSS handshake on `/ws`, and `render logs -r srv-dajpo9m7bikc73d1ge8g --limit 50` shows the startup line and no crashes.

### M4 — Wire Vercel to the Server (Done)

- [x] Linked the local repo: `npx vercel@latest link --yes --project outwit` → `.vercel/project.json` (project id `prj_NqkKqMVgI3OtatkX5GPggWhxVPlV`, org `team_2rBniaFDKSyszaBpK79FSW0V`). Note: `vercel link` also created `.env.local` (with an OIDC token) and added `.env*` to `.gitignore`.
- [x] Added the env var: `printf 'wss://outwit-server.onrender.com' | npx vercel@latest env add VITE_WS_URL production` (type: Config, environment: Production).
- [x] Redeployed production: `npx vercel@latest --prod --yes` → deployment `https://outwit-cd5dbud8o-danielh987s-projects.vercel.app`, aliased to `https://outwit-one.vercel.app` (19 s).

- [x] Confirmed the deployed bundle uses Render, not localhost:

  ```bash
  curl -s https://outwit-one.vercel.app/ | grep -o '/assets/[^"]*\.js'
  curl -s https://outwit-one.vercel.app/assets/<hash>.js | grep -o 'wss://[a-z0-9.-]*' | sort -u
  ```

  Observed: `wss://outwit-server.onrender.com` only; no `wss://localhost`. Also all deep links now return 200 (`/`, `/game/local`, `/lobby`, `/profile/Alice`).

### M5 — End-to-End Verification

- [x] Local gates: `npm test` (65), `npm run lint` (1 intentional WebSocketProvider warning), `npm run build` — green as of commit `646f40c`.
- [x] Deep links return 200: `/`, `/game/local`, `/lobby`, `/profile/Alice` (verified with `curl -I`/`curl -s -w`).
- [x] Live server reachable: `curl -i https://outwit-server.onrender.com/` → 200; WSS handshake returns `connected`.
- [x] Deployed bundle points at Render (no localhost); see M4.
- [x] **Scripted online smoke (agent):** two simulated WebSocket clients joined a fresh room on production: A white / B black, chat round-trip, illegal move rejected (`Illegal move.`), A resigns → B sees `{"status":"finished","winner":"black","reason":"resignation"}`. Script: `outwit-smoke.mjs` (temp, deleted after run). **PASS.**
- [ ] **Interactive (human):** two devices/browsers, same `/game/<room>` — seats, moves, chat, draw offer/accept, resign all sync.
- [ ] **Interactive (human):** refresh one client mid-game → same seat re-binds (same `localStorage` `userId`).
- [ ] **Interactive (human):** close one client → opponent wins after ~30 s (`OUTWIT_FORFEIT_SECONDS=30`).
- [ ] Browser devtools network tab shows WSS to `outwit-server.onrender.com`; no console errors.
- [ ] PWA install/refresh behaves (hard refresh once if stale; `registerType: 'autoUpdate'`).

**Verify:** all boxes above checked; report the live room URL and any failures.

### M6 — Optional Polish

- [x] Auto-deploy: Render auto-deploys on every push to `main` (enabled by default on the service). Vercel remains CLI-driven (`npx vercel@latest --prod --yes`) unless the repo is connected to the Vercel project.
- [ ] Custom domain (if desired), configured in Vercel and optionally Render.
- [ ] Keep-alive ping or paid instance to reduce Render free-tier cold starts (a paid instance would also stop rooms being dropped when the service sleeps).
- [ ] Room persistence (e.g. Upstash Redis) — separate effort; see `docs/ACCOUNTS.md` Phase C notes.
- [ ] Clock/time-control messages once a time-control rule exists.

## CLI Reference

Both CLIs are already authenticated on this machine; verify with:

```bash
npx vercel@latest whoami
render whoami
render workspace current
```

Useful commands:

| Task | Command |
| --- | --- |
| Vercel deploy prod | `npx vercel@latest --prod` |
| Vercel list deployments | `npx vercel@latest list --yes` |
| Vercel inspect | `npx vercel@latest inspect <url-or-id>` |
| Vercel env add | `printf '<value>' \| npx vercel@latest env add <KEY> production` |
| Render list services | `render services --output json` |
| Render deploy | `render deploys create <service-id> --wait` |
| Render logs | `render logs -r <service-id> --limit 100` |
| Supabase projects | `supabase projects list` (CLI v2.117.0 installed and authenticated; used only in Phase C) |
| Render restart | `render restart <service-id>` |

## Risks and Troubleshooting

- **Render free tier sleeps** after ~15 idle minutes: 30-60 s cold start and rooms are lost. Live games keep it awake.
- **In-memory rooms** vanish on deploy/restart; accepted for the prototype.
- **Service worker staleness** after a frontend redeploy: `autoUpdate` is on, but a hard refresh may be needed once.
- **`vercel env add` needs a redeploy** to affect the bundle (build-time variable).
- **WSS handshake fails while `curl /` succeeds:** confirm the path is exactly `/ws` on both ends and that `VITE_WS_URL` has no trailing slash/`/ws` duplication. The client normalizes trailing slashes but not a missing `wss://` scheme.
- **`server/dist/` is gitignored** and built on Render via `npm run build:server`; the start command is `npm run start:server` (= `node server/dist/index.js`).
- **`node server/index.ts` fails with `ERR_MODULE_NOT_FOUND`:** expected on Node 24 due to extensionless engine imports; use the bundle (`build:server` + `start:server`). `tsx server/index.ts` still works for local dev.
- **Render CLI cannot create the service:** create it in the dashboard, then use the CLI for deploys/logs.
- **CORS:** WebSockets are not subject to browser CORS the same way as fetch; no CORS config is needed for the handshake. Do not add CORS middleware preemptively.

## Rollback

- Frontend: redeploy a previous Vercel deployment from the dashboard, or `git revert` + `npx vercel@latest --prod`.
- Server: `render deploys list <service-id>`, then roll back to the last known-good deploy in the dashboard (or `git revert` + `render deploys create`).
- Unset `VITE_WS_URL` and redeploy to return the client to the localhost default (only sensible for local testing).

## Out of Scope (This Phase)

- Server-side auth and persistent accounts.
- Matchmaking.
- Room persistence/history (database).
- Time controls/clocks (no time-control rule exists yet).
- AI opponent.
