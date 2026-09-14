# Outwit — Deployment Plan

**Status:** Planned, not yet implemented. This document is the handoff spec for the deployment phase; any agent should be able to resume from the current milestone without prior chat context.

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
- **Runtime:** `tsx` in production (no server bundling). Reason: `server/index.ts` imports extensionless paths from `../src/engine`, which native Node ESM rejects; `tsx` handles this with zero build step.
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
| `VITE_WS_URL` | Vercel, production | `wss://<render-service>.onrender.com` | Baked in at build time; **no** trailing `/ws` (client appends it). Requires redeploy to take effect. |
| `OUTWIT_FORFEIT_SECONDS` | Render | `60` | Disconnect-forfeit grace period. Defaults to 60 if unset. |
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
| Server fails in production | `npm run server:ci` (`node server/index.ts`) raises an ESM resolution error on Node 24; `ws` and `tsx` are in `devDependencies` |
| Server ignores host `PORT` | `server/index.ts:79` reads only `OUTWIT_PORT ?? 3001` |
| Raw WS server, no HTTP response | `server/index.ts:356` `new WebSocketServer({ port, path: '/ws' })` → PaaS health checks may fail |
| Local online default likely wrong | `src/services/websocket.ts:11` defaults to TLS `wss://localhost:3001` + `/ws`, while `README.md` documents `ws://localhost:3001/ws` |
| Server tests | `src/__tests__/server.test.ts` (port 3456), `serverHardening.test.ts` (3457), `serverForfeit.test.ts` (3458) call `startServer(PORT)` and `wss.close()` |
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

### M3 — Deploy Server to Render

- [ ] `render workspace set "My Workspace"` (or by workspace id from `render workspaces list`).
- [ ] Create the web service. Preferred (CLI, non-interactive):

  ```bash
  render services create \
    --name outwit-server \
    --type web_service \
    --repo https://github.com/DanielH987/Outwit \
    --branch main \
    --runtime node \
    --plan free \
    --region oregon \
    --build-command "npm ci" \
    --start-command "npm run start:server" \
    --health-check-path / \
    --env-var OUTWIT_FORFEIT_SECONDS=60 \
    --output json --confirm
  ```

  Notes:
  - Region: pick the closest to the user; `oregon` is a reasonable default.
  - If `services create` fails because Render needs repo access, fall back to the Render dashboard: **New > Web Service**, connect `DanielH987/Outwit` (installing the Render GitHub App if prompted), set the same build/start commands, plan `free`, region, env var, and health check path. Then continue with the CLI for deploys/logs.
  - Public repo: the Render GitHub App may still be required for auto-deploy (M6); initial creation via dashboard covers it.

- [ ] Capture the service ID and URL:

  ```bash
  render services --output json
  ```

  The service URL is `https://<name>.onrender.com`.

- [ ] Trigger and watch a deploy if creation did not auto-deploy:

  ```bash
  render deploys create <service-id> --wait
  ```

- [ ] Verify the server is live (Render's first build takes a few minutes):

  ```bash
  curl -i https://<service>.onrender.com/          # 200 ok
  npx wscat -c wss://<service>.onrender.com/ws     # prints connected, then JSON heartbeats of your own messages
  ```

  `wscat` is optional; any WS client works. First connection after idle may take 30-60 s on the free plan (cold start).

**Verify:** HTTP 200 from `/`, successful WSS handshake on `/ws`, and `render logs -r <service-id> --limit 50` shows the startup line and no crashes.

### M4 — Wire Vercel to the Server

- [ ] Link the local repo to the existing project (creates `.vercel/`):

  ```bash
  npx vercel@latest link --yes --project outwit
  ```

- [ ] Add the production env var (no trailing slash; client appends `/ws`):

  ```bash
  printf 'wss://<service>.onrender.com' | npx vercel@latest env add VITE_WS_URL production
  ```

- [ ] Redeploy production (Vite env vars are build-time; an env change alone does not rebuild):

  ```bash
  npx vercel@latest --prod
  ```

- [ ] Confirm the deployed bundle points at Render, not localhost. Find the bundle hash from the live HTML, then:

  ```bash
  curl -s https://outwit-one.vercel.app/ | grep -o '/assets/[^"]*\.js'
  curl -s https://outwit-one.vercel.app/assets/<hash>.js | grep -o 'wss://[a-z0-9.-]*' | sort -u
  ```

  Expected: the Render hostname. No `wss://localhost`.

### M5 — End-to-End Verification

- [ ] Local gates: `npm test` (65), `npm run lint`, `npm run build`.
- [ ] Deep links: `curl -I https://outwit-one.vercel.app/game/local` → 200; open `/lobby` and `/profile/<name>` directly in a browser.
- [ ] Local play works from the deployed site (`/game/local`).
- [ ] Online play: on two devices/browsers, open the same `/game/<room>`; confirm seats (white/black), moves, chat, draw offer, and resign.
- [ ] Reconnect: refresh one client mid-game; it re-binds the same seat (same `localStorage` `userId`).
- [ ] Forfeit: close one client; the other sees the disconnect and wins after ~60 s (`OUTWIT_FORFEIT_SECONDS=60`).
- [ ] Browser devtools network tab shows a WSS connection to the Render host; no console errors.
- [ ] Refresh a deep link while the PWA service worker is active; if a stale bundle is suspected, hard refresh once (`registerType: 'autoUpdate'` is configured).

**Verify:** all boxes above checked; report the live room URL and any failures.

### M6 — Optional Polish

- [ ] Auto-deploy: install the Render GitHub App for `DanielH987/Outwit` and enable auto-deploy on the service, so pushes to `main` redeploy the server. (Vercel can also be connected to the repo for client auto-deploys.)
- [ ] Custom domain (if desired), configured in Vercel and optionally Render.
- [ ] Keep-alive ping or paid instance to reduce Render free-tier cold starts.
- [ ] Future: persistent rooms/history (Redis/Postgres), server auth, clock/time-control messages.

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
| Render restart | `render restart <service-id>` |

## Risks and Troubleshooting

- **Render free tier sleeps** after ~15 idle minutes: 30-60 s cold start and rooms are lost. Live games keep it awake.
- **In-memory rooms** vanish on deploy/restart; accepted for the prototype.
- **Service worker staleness** after a frontend redeploy: `autoUpdate` is on, but a hard refresh may be needed once.
- **`vercel env add` needs a redeploy** to affect the bundle (build-time variable).
- **WSS handshake fails while `curl /` succeeds:** confirm the path is exactly `/ws` on both ends and that `VITE_WS_URL` has no trailing slash/`/ws` duplication. The client normalizes trailing slashes but not a missing `wss://` scheme.
- **`node server/index.ts` fails with `ERR_MODULE_NOT_FOUND`:** expected on Node 24 due to extensionless engine imports; use `tsx` (`npm run start:server`) or add a bundling step (not chosen).
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
