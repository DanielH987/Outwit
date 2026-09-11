# Outwit Roadmap

This roadmap tracks where Outwit is today and where it is headed. Priorities are ordered to get to a fun, local two-player game first, then expand outward.

## Current Phase: Pure Scaffold / Local Playable Prototype

Status: **In Progress**

The app has routing, basic pages, a Zustand store skeleton, a WebSocket client scaffold, and documented rules in [`docs/RULES.md`](docs/RULES.md). The next milestone is a fully playable two-player game running locally in one browser.

## Phase 1 — Define the Game (In Progress)

Goal: Decide and document what Outwit actually is.

- [x] Define the board (size, shape, coordinates).
- [x] Define the pieces (names, movement abilities, starting positions).
- [x] Document the rules in a single source-of-truth location: [`docs/RULES.md`](docs/RULES.md).
- [x] Define the win condition: be first to fill your **own** base with all 9 chips.
- [ ] Resolve the open rules questions below.
- [ ] Translate the rules into pure TypeScript types and helper functions in `src/engine/`.

> If the rules are not yet known, ask the user. Do not default to chess, checkers, or any existing game.

## Phase 2 — Local Two-Player Board

Goal: Two players can sit at the same device and play a complete game.

- [ ] Render the board and pieces in `src/components/`.
- [ ] Handle clicks/taps to select pieces and target squares.
- [ ] Validate moves using pure logic in `src/utils/` or `src/engine/`.
- [ ] Enforce turns (player A / player B).
- [ ] Detect game end: win (base filled), stalemate (no legal moves — draw), and threefold repetition (draw).
- [ ] Add resign and draw-offer flows (local mode).

## Phase 3 — Game State & History

Goal: The game feels complete from a state perspective.

- [ ] Track move history.
- [ ] Add a move history panel.
- [ ] Add a timer / clock UI (even if local only).

## Phase 4 — Polish & Profile

Goal: Improve UX and add lightweight persistent stats.

- [ ] Improve lobby UI (create/join rooms).
- [ ] Build out profile page with local stats.
- [ ] Add responsive styling and touch-friendly interactions.
- [ ] Improve accessibility (keyboard navigation, ARIA labels).

## Phase 5 — Multiplayer Backend

Goal: Connect to a real backend and enable online play.

- [ ] Define a minimal backend contract using `ServerMessage` and `ClientMessage` types.
- [ ] Implement matchmaking or direct room joining.
- [ ] Sync game state across clients in real time.
- [ ] Handle reconnection and disconnection gracefully.

## Open Questions

Rules: **none** — [`docs/RULES.md`](docs/RULES.md) is fully specified as of v0.6.

Product questions:

- Should the game support AI opponents for solo practice?
- What time controls should be available (blitz, rapid, untimed)?
- Should user accounts be anonymous, guest-based, or persistent?

## Long-Term Vision

A PWA where players can:

- Create an account or play as a guest.
- Join quick matches or custom rooms.
- Track ratings and match history.
- Chat during games.
- Install the app on mobile and desktop.

For now, focus on resolving the open rules questions, then encoding the engine.