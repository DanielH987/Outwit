# Outwit

A local-playable prototype of **Outwit**, a custom strategic turn-based board game. Built as a Vite + React + TypeScript PWA with the goal of eventually supporting real-time online matches.

## What Outwit Is

Outwit is an original two-player turn-based board game. At a glance:

- **Board:** 9 columns × 10 rows, addressed as `(x, y)` with `(0, 0)` at the top-left.
- **Bases:** each player owns a 3×3 base; Player 1 is top-right, Player 2 is bottom-left.
- **Chips:** 9 per player — 8 standard chips that slide orthogonally and must travel as far as possible, plus 1 power chip that also slides diagonally and may stop mid-slide.
- **Goal:** be the first to get all 9 of your chips into your own base. Once a chip enters its base it is locked in and can never leave, though it can still move within the base.
- **Turns:** Player 1 is White and moves first, then Black; one chip per turn, no passing.
- **No captures:** chips never leave the board — they are permanent obstacles.
- **Endings:** fill your base to win; stalemate, agreement, and threefold repetition are draws; players may resign.

The full rule set lives in [`docs/RULES.md`](docs/RULES.md).

The current codebase is a scaffold that provides:

- A home page, lobby, game room, and profile page.
- Client-side routing.
- Zustand stores for authentication and game state.
- A WebSocket service ready to connect to a backend.
- A PWA configuration via `vite-plugin-pwa`.
- A test harness using Vitest + React Testing Library.

## Tech Stack

- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS 3
- React Router 6
- Zustand 5 (state management)
- WebSockets (multiplayer scaffolding)
- Vitest + React Testing Library + jsdom
- `vite-plugin-pwa`

## Scripts

- `npm run dev` — start development server (`http://localhost:5173` by default)
- `npm run server` — start multiplayer WebSocket server (`ws://localhost:3001/ws`)
- `npm run build` — type-check and production build
- `npm run preview` — preview production build
- `npm test` — run tests in watch mode
- `npm run lint` — run ESLint

## Project Structure

```
src/
  components/     # Shared UI components (Board, GameControls, GameClocks, MoveHistoryPanel)
  contexts/       # React context providers (WebSocketProvider)
  hooks/          # Custom hooks (useWebSocketActions)
  pages/          # Route-level page components
  services/       # External service clients (WebSocket, API)
  stores/         # Zustand stores (auth, game, local game, stats)
  engine/         # Pure, tested rules engine (board, moves, win/draw detection)
  types/          # Shared TypeScript types

server/           # WebSocket multiplayer server (tsx), driven by src/engine/
```

## Routes

- `/` — Home page with calls to action.
- `/lobby` — Game lobby; list or create rooms.
- `/game/:gameId` — Active game room.
- `/profile/:username` — Player profile placeholder.

## Current State

The local pass-and-play prototype is **complete** — the game is fully playable in a browser, and online multiplayer works end-to-end.

- Game rules are fully specified in [`docs/RULES.md`](docs/RULES.md) and implemented as a pure, tested engine in `src/engine/`.
- Play locally at `/game/local`, or online at `/game/<room>` (requires `npm run server`).
- Board UI has legal-move highlighting, move history, elapsed-time clocks, win/stalemate/repetition detection, and resign/draw offer.
- Online rooms support chat, reconnecting back to your seat, and disconnect-forfeit (still-connected player wins after a grace period).
- Profile page shows local pass-and-play stats and match history.
- The WebSocket client connects but expects a backend matching the message types in `src/types/index.ts`.
- Authentication is client-side only (Zustand persist to `localStorage`).

## Documentation

- [`docs/RULES.md`](docs/RULES.md) — full game rules (source of truth).
- [`ROADMAP.md`](ROADMAP.md) — development phases and current priorities.
- [`AGENTS.md`](AGENTS.md) — context and conventions for AI agents.

## Environment Variables

- `VITE_WS_URL` — WebSocket server URL (defaults to `wss://localhost:3001`).

## Testing

Tests live in `src/__tests__/` and run with Vitest. Add component tests alongside new features; see `HomePage.test.tsx` for the current pattern.
