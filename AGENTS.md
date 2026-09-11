# Agent Guide for Outwit

This document helps AI agents (and human contributors) work effectively on the Outwit codebase.

## Project Goal

Build a local-playable prototype of **Outwit**, a custom strategic turn-based board game. The long-term goal is an online multiplayer PWA, but right now the focus is on getting a playable two-player local game working in the browser.

## Current Phase

Pure scaffold / local playable prototype.

- Pages and routing are in place.
- State management is scaffolded.
- WebSocket client exists but has no real backend yet.
- The rules are fully specified in `docs/RULES.md` and encoded as a pure engine in `src/engine/`.
- There is no board UI or game page integration yet.

## What to Prioritize

When asked to add features, prefer this order:

1. **Define the game** — the rules are documented in `docs/RULES.md`; next is encoding the board, movement, and win detection as pure functions.
2. **Build a local two-player board UI** — render the board, handle clicks/taps, validate moves.
3. **Add local game state** — turns, move history, game-over detection.
4. **Polish UX** — timers, move history panel, resign/draw UI, basic profile stats.
5. **Connect multiplayer** — only after local play feels complete.

## Architecture Conventions

- **Pages** go in `src/pages/`. They handle routing params and compose components.
- **Reusable UI** goes in `src/components/`.
- **State** lives in `src/stores/` using Zustand. Use the existing stores; create new ones if a feature has cross-component state.
- **Types** go in `src/types/index.ts`. Keep shared domain types there; engine types live in `src/engine/types.ts` and are re-exported from `src/types/index.ts`.
- **Rules** live in `docs/RULES.md`. It is the source of truth; never invent game behavior. Ask the user before changing or extending the rules.
- **Game logic** lives in `src/engine/` as pure, framework-free functions. Keep it pure and testable; mirror tests in `src/__tests__/engine/`.
- **WebSocket** code lives in `src/services/websocket.ts` and `src/contexts/WebSocketProvider.tsx`. Do not change message types without updating `src/types/index.ts`.

## Things to Avoid

- Do not rewrite the tech stack without asking.
- Do not add a backend or server unless explicitly requested.
- Do not change existing route paths unless necessary.
- Avoid adding heavy external libraries. Prefer built-in React + browser APIs.
- Do not remove existing tests; update them when you change behavior.

## Testing Expectations

- Run `npm test` to ensure existing tests pass.
- Add tests for new components and pure game logic.
- Keep tests in `src/__tests__/` mirroring the source path when possible.
- Use `MemoryRouter` for components that depend on React Router.

## Common Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run tests
- `npm run lint` — lint check

## Questions to Ask Before Big Changes

- Does this change move us closer to a local playable prototype?
- Can the new logic be unit-tested without a browser?
- Does it require a backend change?
- Have I updated types and tests?

## File Ownership

| File/Directory | Responsibility |
| --------------- | --------------- |
| `src/pages/*` | Route-level screens |
| `src/components/*` | Shared presentational components |
| `src/stores/*` | Zustand state |
| `src/types/index.ts` | Shared TypeScript types |
| `src/engine/*` | Pure game rules engine (types, board, setup, moves, rules) |
| `docs/RULES.md` | Game rules source of truth |
| `src/services/websocket.ts` | WebSocket client singleton |
| `src/contexts/WebSocketProvider.tsx` | React integration for WebSocket |
| `src/utils/*` | Pure helpers (IDs, formatting, etc.) |
| `src/__tests__/*` | Tests |

## Important Note

Outwit is a custom game. `docs/RULES.md` is the complete source of truth. If something there is unclear or seems to conflict, ask the user before inventing behavior. Do not assume chess, checkers, or any existing game.