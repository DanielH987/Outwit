# Outwit — Deployment Plan

**Status:** Implemented and fully deployed. Client on Vercel, WebSocket server on **Northflank** (migrated from Render 2026-09-16). This document is the handoff spec; any agent should be able to resume without prior chat context.

> **Next phase:** identity & accounts (named guests, invite links, persistent device identity; later Supabase accounts). See [`docs/ACCOUNTS.md`](ACCOUNTS.md).

## Handoff Summary (read first)

- **Live frontend:** `https://outwit-one.vercel.app` (Vercel project `outwit`, CLI-linked at `.vercel/project.json`). Auto-deploys on push to `main`.
- **Live server:** `https://http--outwit-server--clnlhfn4kk5l.code.run` (Northflank project `outwit`, service `outwit-server`, free **Developer Sandbox** plan `nf-compute-20` = 0.2 vCPU / 512 MB, region `us-central`, container port 3001, WS path `/ws`, health `/`). **Always-on — no sleeping and no cold start**, unlike Render.
- **Env wiring:** `VITE_WS_URL=wss://http--outwit-server--clnlhfn4kk5l.code.run` on Vercel (production, build-time); Northflank injects its own `PORT`; runtime env has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OUTWIT_FORFEIT_SECONDS=60`.
- **Fallback host:** the Render service (`srv-dajpo9m7bikc73d1ge8g`, `outwit-server.onrender.com`) is **left configured**. Its free bandwidth resets on the 1st of each month; switching back is one `VITE_WS_URL` change plus a Vercel redeploy.
- **Remaining work:** optional M6 (custom domain, auto-deploy wiring is done; room persistence; time controls).

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
| `VITE_WS_URL` | Vercel, production | `wss://http--outwit-server--clnlhfn4kk5l.code.run` | Baked in at build time; **no** trailing `/ws` (client appends it). Requires redeploy to take effect. |
| `VITE_SUPABASE_URL` | Vercel, production | `https://hqgamvpcowjjgxkchtzu.supabase.co` | Client auth + match history (Phase C). Baked in at build time. |
| `VITE_SUPABASE_ANON_KEY` | Vercel, production | anon JWT | Public by design (ships in the bundle). Never use the service-role key here. |
| `SUPABASE_URL` | Northflank | `https://hqgamvpcowjjgxkchtzu.supabase.co` | Enables JWT verification + match recording. |
| `SUPABASE_SERVICE_ROLE_KEY` | Northflank | service-role JWT | **Secret.** Server-only; grants write access to `matches`. |
| `OUTWIT_FORFEIT_SECONDS` | Northflank | `60` | Disconnect-forfeit grace period. Code default is 30s; Northflank sets 60. |
| `OUTWIT_ROOM_TTL_SECONDS` | either host (optional) | `1800` | How long an abandoned room (no connected clients) is kept for reconnects before GC. Defaults to 1800 (30 min). |
| `OUTWIT_PORT` / `PORT` | local only | e.g. `3001` | Optional local port override. Both hosts inject `PORT`; the server reads `PORT` first. |

## Bandwidth Budget (measured 2026-09-15)

Render's free Hobby workspace includes **5 GB of outbound bandwidth per month** (cut from 100 GB in April 2026); above that it suspends services unless a card is attached ($0.15/GB). Outwit's server was suspended on 2026-09-15 after using **10.2 GB in ~2 days**. Measured breakdown (Render metrics API, hourly, plus local benchmarks):

| Activity | Measured cost | 5 GB buys | Notes |
| --- | --- | --- | --- |
| **One game** (full game, two players) | **~80 KB** | ~65,000 games | Server→client `game-state` averages 2.3 KB; ~1 KB/move across both clients. Gameplay is effectively free. |
| Heartbeat | 28 bytes / 3 s / player | ~0.8 MB/day connected | App-level JSON `ping`/`pong`. |
| **One deploy** | **0 MB outbound** | unlimited | Deploys are **inbound** (git clone + `npm ci`); Render bills only outbound. Verified: 24 deploys on 2026-09-15 produced **0.38 MB** total outbound. |
| **Infinite join/broadcast loop** (bug, fixed) | **74 MB/s per tab** | 5 GB in ~70 s | The server OOM era bug: `join-room` → broadcast → re-render → `join-room`. ~424k round-trips in 5 s in a local reproduction. 7.3 GB landed in the two hours it was live. |

**Conclusion:** the suspension was caused by the loop bug, not by deploying or playing. Deploys are free (outbound-wise); gameplay is trivially cheap. The only meaningful risk is another runaway broadcast loop, which the `useCallback` stability work and the join-dedupe in `src/services/websocket.ts` prevent.

## CI/CD Pipeline

### Current state

| Piece | Trigger | What happens | Cost/limit |
| --- | --- | --- | --- |
| **Frontend (Vercel)** | **Git push to `main`** (auto-deploy, connected 2026-09-16) — or manual `npx vercel@latest --prod --yes` | Vercel builds `npm run build` itself, uploads `dist/`, aliases `outwit-one.vercel.app`. PRs get preview URLs. | Hobby: 100 deploys/day, 1 concurrent build, 100 MB CLI upload cap. Deploy bandwidth is Vercel's, not Render's. |
| **Backend (Render)** | Git push to `main`, **filtered** to server-relevant paths (see below) | Render clones the repo, runs `npm ci && npm run build:server`, then `npm run start:server`. | No deploy-count limit; outbound bytes only. ~1.5 min per build. |
| **Database (Supabase)** | `supabase db push` / `config push` (manual, rare) | Applies migrations / auth config to the hosted project. | Free tier. |

Both deploy paths are independent — a frontend deploy does **not** trigger a Render build, and a Render build does not touch Vercel. A single `git push` fans out to both, each with its own filter.

### Pain points (resolved 2026-09-16)

1. ~~**Render rebuilt on every push**, including docs-only commits.~~ Fixed with build filters; verified a docs-only push produced no Render build.
2. ~~**Vercel was CLI-only** — no preview deployments, no automatic deploy on push.~~ Fixed: the GitHub repo link was `sourceless`; re-linking enabled push-to-deploy and PR previews. Verified with a git-sourced production deployment.
3. **Nothing checks the other side.** A frontend change that requires a server protocol change can ship before the server does (or vice versa), briefly breaking online play. Mitigation is ordering discipline (see #4 below), not tooling.

### Recommended improvements (implemented 2026-09-16)

1. **Render build filters — DONE.** The service now has:
   - `paths`: `server/**`, `src/engine/**`, `src/types/**`, `package.json`, `package-lock.json`
   - `ignoredPaths`: `docs/**`, `**/*.md`, `src/components/**`, `src/pages/**`, `src/stores/**`, `src/hooks/**`, `src/contexts/**`, `src/services/**`, `src/utils/**`, `public/**`

   So a frontend- or docs-only push no longer rebuilds the server. Set via the Render API (a top-level `buildFilter` field — **not** nested under `serviceDetails`, which fails silently):
   ```bash
   curl -X PATCH https://api.render.com/v1/services/<id> \
     -H "Authorization: Bearer $RENDER_API_KEY" -H 'Content-Type: application/json' \
     -d '{"buildFilter":{"paths":["server/**","src/engine/**","src/types/**","package.json","package-lock.json"],"ignoredPaths":["docs/**","**/*.md","src/components/**","src/pages/**","src/stores/**","src/hooks/**","src/contexts/**","src/services/**","src/utils/**","public/**"]}}'
   ```
   **Verified:** a docs-only push produced no Render deploy (count stayed 20, latest commit unchanged).

2. **Vercel ↔ GitHub — DONE.** Push-to-deploy now works: a push to `main` creates a production deployment (`source: git` in the deployments API). The original link was **`sourceless: true`** (broken), which is why CLI deploys were the only path. Fixed by disconnecting and re-linking via the API:
   ```bash
   curl -X DELETE 'https://api.vercel.com/v9/projects/<projectId>/link?teamId=<teamId>' -H "Authorization: Bearer $VERCEL_TOKEN"
   curl -X POST   'https://api.vercel.com/v9/projects/<projectId>/link?teamId=<teamId>' \
     -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
     -d '{"type":"github","repo":"DanielH987/Outwit","productionBranch":"main"}'
   ```
   **Verified:** a push produced a git-sourced production deployment (commit `2ecee9e`, `source: git`, READY). PR previews are enabled (`gitComments.onPullRequest: true`).

3. **Batch deploys** — not a bandwidth issue (deploys cost 0 outbound) but a *build-minutes* and *focus* one: commit meaningful units, not every doc tweak.
4. **Order protocol changes** — when a change touches `src/types/index.ts` (shared wire types), deploy the **server first** (backward-compatible: old clients ignore new fields), then the client. Never remove a field in the same deploy that stops sending it.
5. **Optional: CI gates** — a GitHub Action running `npm test && npm run lint && npm run build` on PRs, since that's only checked locally now.

### Day-to-day workflow (after these changes)

```bash
# 1. Work + verify locally
npm test && npm run lint && npm run build

# 2. Commit and push — this deploys BOTH sides automatically:
#    - Vercel builds the client (every push)
#    - Render rebuilds the server only if server/engine/types/package changed
git add . && git commit -m "..." && git push

# 3. Verify
curl -s -o /dev/null -w "%{http_code}\n" https://outwit-one.vercel.app/
curl -s https://outwit-server.onrender.com/stats
```

Manual CLI deploys (`npx vercel@latest --prod --yes`) still work and are useful when you want to ship the client without a commit.

## Development Workflow: Branch → Preview → Prod

**Adopted 2026-09-22.** We use branch-based previews for both the client and
database before anything touches production. The server is tested locally.

### Why

Migrations and deploys were going straight to `main` (auto-deploy to prod)
with no safety net. The `moves` column migration landed in the production
database before anyone tested it. Branch previews catch schema and UI issues
before they affect real users.

### Workflow

```
feature branch  →  Vercel preview URL  +  Supabase dev branch
                        ↓                        ↓
                   test the UI              test migrations
                        ↓                        ↓
                   merge to main  →  prod deploy (Vercel auto)
                                     prod migration (supabase db push)
```

1. **Branch off `main`** for any non-trivial change:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Push the branch** — Vercel auto-creates a **preview deployment** with a
   unique URL (e.g. `https://outwit-git-feat-my-feature.vercel.app`). No extra
   config needed; PR previews are already enabled on the Vercel project.

3. **Create a Supabase dev branch** to test database migrations safely:
   ```bash
   npx supabase db branch create <branch-name>
   npx supabase db branch switch <branch-name>
   npx supabase db push    # applies migrations to the dev branch, not prod
   ```
   Test schema changes against the dev branch's isolated database. When ready,
   merge the branch back:
   ```bash
   npx supabase db branch switch main
   npx supabase db branch merge <branch-name>
   npx supabase db push    # applies to production
   ```

4. **Open a PR** on GitHub — Vercel posts the preview URL as a comment.
   Review the UI, run `npm test && npm run lint` locally or in CI.

5. **Merge to `main`** — Vercel auto-deploys to production
   (`https://outwit-one.vercel.app`). Apply any pending Supabase migrations
   to prod (`npx supabase db push`).

6. **Server** — tested locally (`npm run server`); no separate dev deployment.
   Northflank rebuilds on push to `main` if server-relevant files changed
   (build filters already configured).

### Notes

- **Supabase branching** runs on the same Supabase project (no extra project
  needed on the free tier). Each branch gets its own isolated database that
  shadows the main schema.
- **Vercel previews** are free (Hobby: 100 deploys/day) and get their own URL
  per branch/PR. They use the same env vars as production by default.
- **No staging environment** — at this stage, branch previews + local testing
  are sufficient. Add a dedicated staging stack when a second developer joins
  or real users are at risk.

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
| Render service suspended for billing (2026-09-16) | Symptom: online games hang on "Connecting to server..."; `curl https://outwit-server.onrender.com/` returns an HTML page reading **"This service has been suspended by its owner."**; WSS handshakes get **503**. Cause: the free Hobby workspace hit its **5 GB/month outbound bandwidth** limit (Render's metric, reduced from 100 GB in April 2026). Root cause of the usage was the infinite join/broadcast loop bug — see the Bandwidth Budget section for measurements. The static site keeps working (Vercel is unaffected), so `/game/local` still plays. **Fix requires the dashboard** — the API refuses programmatic resume (`400 only services suspended by a user can be resumed`). Either wait for the monthly reset, or add a card at https://dashboard.render.com/web/srv-dajpo9m7bikc73d1ge8g and resume (`render deploys create srv-dajpo9m7bikc73d1ge8g --wait`). |
| Server-down UX (2026-09-16) | Previously an unreachable server left the game page on "Connecting to server..." indefinitely (looking broken). Now `WebSocketService` tracks `{ status, failures }` and notifies subscribers; `ServerUnavailable` shows "Online play is unavailable" with a **Try again** (immediate reconnect) after `UNAVAILABLE_AFTER_FAILURES` (4) consecutive failures — ~9-12s, so a normal cold start doesn't trigger it. A separate **Connection lost** banner appears mid-game if the socket drops while state is loaded. Verified against the real suspended server: banner appeared at ~12s and Retry fired an attempt immediately. |
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

- [x] Auto-deploy: **Render** rebuilds on pushes touching `server/`, `src/engine/`, `src/types/`, or `package*.json` (build filters set 2026-09-16); **Vercel** auto-deploys on every push to `main` (GitHub link fixed 2026-09-16). Manual CLI deploys still work.
- [ ] Custom domain (if desired), configured in Vercel and optionally Northflank.
- [x] Keep-alive / no cold starts: replaced Render with **Northflank Developer Sandbox** (`nf-compute-20`, always-on) on 2026-09-16. See the migration note below.
- [ ] Room persistence (e.g. Upstash Redis) — rooms are still in-memory, so a restart/deploy drops live games. Separate effort; see `docs/ACCOUNTS.md` Phase C notes.
- [ ] Clock/time-control messages once a time-control rule exists.

## Server Migration: Render → Northflank (2026-09-16)

Render's free tier suspended the service after the workspace hit its **5 GB/month outbound bandwidth** limit (root cause: the infinite join/broadcast loop bug; see the Bandwidth Budget section). Rather than wait for the monthly reset with 30–60 s cold starts, the server moved to **Northflank**, whose free Developer Sandbox is **always-on**.

**What was created**

- Project `outwit` (region `us-central`), service `outwit-server`, type **combined** (build + deploy), plan `nf-compute-20` (0.2 vCPU / 512 MB).
- Build: Dockerfile at `/Dockerfile` (multi-stage: esbuild-bundles the server, runtime image has production deps only). Committed as `37096e7` with `.dockerignore`.
- Networking: container port `3001`, **public**, protocol HTTP → public URL `https://http--outwit-server--clnlhfn4kk5l.code.run` (DNS `http--outwit-server--clnlhfn4kk5l.code.run`), plus a readiness probe `GET /` every 15 s.
- Runtime env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OUTWIT_FORFEIT_SECONDS=60`.
- Vercel: `VITE_WS_URL` set to the Northflank `wss://` URL (production) and the client redeployed.

**Verified after cutover** (two real browsers against production): white/black seat assignment, display names, a move syncing to the opponent, chat delivery, resignation → correct per-perspective headlines ("You lost" / "You won"), and the match recorded in Supabase with the right names/result. Server `/stats` responded normally.

**Notes for future agents**

- The CLI is `northflank` (`npm i -g @northflank/cli`), logged in via browser; config lives at `~/.northflank/config.json`. `northflank get service` is interactive-only — read details via `northflank list services --project outwit --output json`, or hit `https://api.northflank.com/v1/projects/outwit/services/outwit-server` with the CLI token.
- The CLI **requires `--project`** for project-scoped commands, and the create body requires a `successThreshold` on readiness probes and a top-level `region`/`clusterId` when creating a project.
- Northflank requires a **payment method on file** before any resource can be created, even on the free plan (identity verification; the card is not charged for free-tier usage).
- There is **no hard spend cap** on Northflank. Controls available: the free plan's fixed allowances (2 services, `nf-compute-20`), **billing alerts** (notifications), and **billing thresholds** ($50/$100/$250/$500 — these *invoice* when reached, they do not block spending). The effective safety net is the plan: the service is pinned to the free `nf-compute-20` deployment plan, so cost stays $0 unless the plan is changed.
- To add a custom domain: Northflank → project → service → port → add domain, then point DNS at it.

**Rollback to Render** (still configured, free bandwidth resets monthly):

```bash
printf 'wss://outwit-server.onrender.com' | npx vercel@latest env add VITE_WS_URL production --force --type config
npx vercel@latest --prod --yes
```

Then resume the Render service from the dashboard (`https://dashboard.render.com/web/srv-dajpo9m7bikc73d1ge8g`) — the card/billing block there is separate from Northflank.

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
