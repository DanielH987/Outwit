# Outwit Roadmap

This roadmap tracks where Outwit is today and where it is headed. Priorities are ordered to get to a fun, local two-player game first, then expand outward.

## Current Phase: Complete (local + online playable)

The local pass-and-play game is fully playable at `/game/:gameId`. The multiplayer backend in `server/index.ts` and the client routing for online rooms are complete. The next milestone is hardening the server (disconnection, reconnection, chat, auth) and wiring clock/time-control messages.

## Phase 1 — Define the Game (In Progress)

Goal: Decide and document what Outwit actually is.

- [x] Define the board (size, shape, coordinates).
- [x] Define the pieces (names, movement abilities, starting positions).
- [x] Document the rules in a single source-of-truth location: [`docs/RULES.md`](docs/RULES.md).
- [x] Define the win condition: be first to fill your **own** base with all 9 chips.
- [x] Resolve the open rules questions.
- [x] Encode the rules as a pure engine with unit tests: `src/engine/` + `src/__tests__/engine/`.

> If the rules are not yet known, ask the user. Do not default to chess, checkers, or any existing game.

## Phase 2 — Local Two-Player Board (Done)

Goal: Two players can sit at the same device and play a complete game.

- [x] Render the board and pieces in `src/components/Board.tsx`.
- [x] Handle clicks/taps to select pieces and target squares.
- [x] Validate moves using pure logic in `src/engine/`.
- [x] Enforce turns (White moves first, alternating).
- [x] Detect game end: win (base filled), stalemate (no legal moves — draw), and threefold repetition (draw).
- [x] Add resign and draw-offer flows (local mode).

## Phase 3 — Game State & History (Done)

Goal: The game feels complete from a state perspective.

- [x] Track move history.
- [x] Add a move history panel (chess.com-style two-column list).
- [x] Add elapsed-time clocks per player (untimed, informational).

## Phase 4 — Polish & Profile (Done)

Goal: Improve UX and add lightweight persistent stats.

- [x] Lobby highlights local pass-and-play ("Play now" / "Resume local game") and defers online rooms to Phase 5.
- [x] Profile page shows local stats (games, wins, draws) and a match-history list.
- [x] Board uses semantic roles (`grid`/`gridcell`) with labeled tiles and live status text; remaining a11y polish (full keyboard nav) is optional.
- [ ] Responsive/touch follow-ups (e.g. larger hit targets) as needed.

## Phase 5 — Multiplayer Backend (Done)

Goal: Connect to a real backend and enable online play.

- [x] Define a minimal backend contract using `ServerMessage` and `ClientMessage` types, plus shared payload types.
- [x] Implement direct room joining by room name (first joiner = White, second = Black, rest spectate).
- [x] Sync authoritative game state across clients in real time; moves validated by `src/engine/`.
- [x] Chat per room.
- [x] Seats persist across disconnect; reconnection with the same `userId` re-binds to the original side.
- [x] Disconnect-forfeit: after a grace period (default 60 s, tunable via `OUTWIT_FORFEIT_SECONDS`), the still-connected player wins. Reconnecting cancels the timer.
- [ ] Clock/time-control messages once a time-control rule exists (optional, Phase 6).

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