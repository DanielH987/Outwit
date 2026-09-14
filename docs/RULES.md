# Outwit — Game Rules

**Status:** Draft v0.6 (rules complete), updated 2026-09-11.

This file is the **source of truth** for Outwit's rules. Update it before changing game logic. The spec is complete as of v0.6; new edge cases should be added to [Open Questions](#open-questions) and resolved with the user before coding them.

## 1. Board

- The board is a **9 × 10 grid**: 9 columns wide by 10 rows tall.
- Columns are `x` (`0`–`8`, left to right).
- Rows are `y` (`0`–`9`, top to bottom).
- Origin `(0, 0)` is the **top-left** corner.
- Each tile is addressed as `(x, y)`.
- The board perimeter is enclosed by **walls**. The standard board has **no interior walls**; walls exist only on the outer boundary.

### Reference Diagram

Legend: `1` = Player 1 chip, `1P` = Player 1 power chip, `2` = Player 2 chip, `2P` = Player 2 power chip, `A` = Player 1 base tile, `B` = Player 2 base tile, `.` = empty tile.

```
        x0   x1   x2   x3   x4   x5   x6   x7   x8
 y0     2    .    .    .    .    .    A    A    A
 y1     1    2    .    .    .    .    A    A    A
 y2     .    1    2    .    .    .    A    A    A
 y3     .    .    1    2    .    .    .    .    .
 y4     .    .    .    1    2P   .    .    .    .
 y5     .    .    .    .    1P   2    .    .    .
 y6     .    .    .    .    .    1    2    .    .
 y7     B    B    B    .    .    .    1    2    .
 y8     B    B    B    .    .    .    .    1    2
 y9     B    B    B    .    .    .    .    .    1
```

## 2. Bases

Each player owns a 3 × 3 base of exactly 9 tiles, matching the 9 chips per player.

| Player   | Condition                 | Location    |
| -------- | ------------------------- | ----------- |
| Player 1 | `6 ≤ x ≤ 8` and `0 ≤ y ≤ 2` | Top-right   |
| Player 2 | `0 ≤ x ≤ 2` and `7 ≤ y ≤ 9` | Bottom-left |

## 3. Chips

Each player has **9 round chips**: 8 standard chips and 1 power chip.

| Chip          | Movement                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Standard chip | Slides orthogonally (horizontally or vertically) and **must** travel as far as possible.        |
| Power chip    | Slides orthogonally **or** diagonally and may **stop mid-slide** at any clear space in its path. |

Chips slide in a straight line (a "slide"). A chip cannot turn during a slide, cannot jump over an obstacle, and cannot pass through one.

## 4. Starting Positions

| Chip              | Player 1 `(x, y)` | Player 2 `(x, y)` |
| ----------------- | ----------------- | ----------------- |
| Chip 1            | `(0, 1)`          | `(0, 0)`          |
| Chip 2            | `(1, 2)`          | `(1, 1)`          |
| Chip 3            | `(2, 3)`          | `(2, 2)`          |
| Chip 4            | `(3, 4)`          | `(3, 3)`          |
| Power Chip (5)    | `(4, 5)`          | `(4, 4)`          |
| Chip 6            | `(5, 6)`          | `(5, 5)`          |
| Chip 7            | `(6, 7)`          | `(6, 6)`          |
| Chip 8            | `(7, 8)`          | `(7, 7)`          |
| Chip 9            | `(8, 9)`          | `(8, 8)`          |

Facts about the starting layout:

- Player 1's chips all start on the diagonal `y = x + 1`.
- Player 2's chips all start on the diagonal `y = x`.
- The two starting formations are 180°-rotationally symmetric: mapping `(x, y)` to `(8 - x, 9 - y)` maps Player 1's chips onto Player 2's chips and Player 1's base onto Player 2's base.
- No chip starts inside or directly next to a base.

## 5. Objective

The first player to maneuver all 9 of their chips into their **own** designated base wins. Because each base has exactly 9 tiles and each player has exactly 9 chips, winning means occupying every tile of your base.

Chips start on the opposite half of the board from their own base **by design**. Each player must race home while the opponent's base — and every chip on the board — constrains the route. Because chips can never be captured (§8) and are locked in once they enter their base (§6), the game is a pathing and blocking puzzle: the order in which chips come home matters, and a chip parked on the wrong base tile can block the entrance.

## 6. Movement

A move is a **slide**: the chip travels in a straight line along one row, column, or (for the power chip) diagonal. A slide ends immediately before the first obstacle in its path.

### Obstacles

- The perimeter wall enclosing the board.
- Another chip, friendly or opposing.
- The perimeter of the enemy base.

### Standard Chips

- Move orthogonally only.
- **Must** slide as far as possible and cannot stop early.
- There is at most one legal destination per direction: the farthest clear tile before the first obstacle. If the adjacent tile is blocked, that direction has no legal move.

### Power Chip

- Moves orthogonally or diagonally.
- May stop at **any** clear tile along its line of movement (at least one tile, before the first obstacle).
- Cannot jump over or pass through an obstacle.
- A diagonal that clips a corner of its own base counts as entering the base (see Base Rules).

### Base Rules

- A chip may enter and occupy its **own** base.
- **Lock-in:** once a chip enters its own base, it can never leave. It may still move between tiles *inside* the base if space allows, but it can never cross back out.
- The base perimeter is therefore a **one-way boundary** for the owner's chips: permeable inward, impassable outward.
- **Crossing counts as entering.** If a slide passes over any tile of its own base, the chip enters the base at that tile and is locked in from that moment.
- Therefore a slide may **never enter its own base and then exit it** — possible only for a power chip whose diagonal clips a base corner (e.g. `(7, 3) → (6, 2) → (5, 1)`, where `(6, 2)` is a base tile). The chip may stop on any clear base tile along that diagonal, but destinations beyond the point where the path leaves the base are illegal. Stopping before the entry tile does not trigger lock-in.
- A locked-in chip still slides by normal rules, but the base boundary acts as a wall from the inside. A locked-in standard chip must slide as far as possible, stopping at the last clear tile before the boundary or another obstacle. A locked-in power chip may still stop at any clear tile along its path inside the base.
- A chip may **never** enter the enemy base. The enemy base perimeter is a hard boundary in both directions.

## 7. Turn Structure

- **Player 1 is White and moves first**; Player 2 is Black and moves second. Players alternate turns.
- A turn consists of moving exactly **one chip**.
- A player **must move if able**. There is no passing.
- If the player to move has **no legal move**, the game ends immediately in a **stalemate** (a draw).

## 8. Capturing

- There are **no captures**. Chips cannot be captured, pushed, or removed.
- Every chip is a permanent obstacle that blocks both friendly and opposing movement.
- An occupied tile can never be entered.

## 9. Game End

The game ends in exactly one of these ways:

| Outcome       | Condition                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Win**       | A player occupies all 9 tiles of their own base with their own chips.                          |
| **Stalemate** | The player to move has no legal move. This is a draw.                                          |
| **Draw**      | Both players agree to a draw via the draw-offer flow.                                          |
| **Draw**      | Threefold repetition: the same position occurs three times with the same player to move.       |
| **Resignation** | A player resigns; the opponent wins.                                                         |
| **Forfeit (online)** | A player disconnects and fails to reconnect within a grace period (~60 s by default). The still-connected player wins. Reconnecting inside the grace period cancels the forfeit. Local pass-and-play has no forfeit. |

Notes:

- Draw offers may be made at any time; the opponent may accept or decline.
- There is **no move limit** and no time-based end condition for now.
- If a player is stalemated (§7), the game is drawn — stalemate is **not** a win for the opponent, matching chess convention.

## 10. Open Questions

None. The core rules are fully specified as of v0.6; online-specific additions (disconnect-forfeit grace period) are in §9 and are implementation-level, not board rules. Add questions here if new edge cases surface.

## 11. Implementation Notes

- Implement rules as pure functions in `src/engine/` (or `src/utils/`) with no React or browser dependencies so they can be unit-tested.
- Suggested first primitives: `Position`, `Chip { id, player, isPower, position }`, `BoardState`, `isInBase(position, player)`, `isInEnemyBase(position, player)`, `getLegalMoves(state, chipId)`, `applyMove(state, move)`, `isWin(state)`.
- `getLegalMoves` must encode the asymmetry: standard chips have at most one destination per direction (the farthest clear tile), while the power chip may choose any clear tile along each direction.
- Movement generation needs two notions of the base:
  - For an unlocked chip, the **enemy** base perimeter is a wall, while the **own** base perimeter is passable inward. If a slide crosses into the own base, the chip is locked in and the base boundary becomes a wall for the rest of that slide and for all future moves.
  - For a locked-in chip, the **own** base perimeter is a wall in every direction.
- Ray capping: a slide may not enter its own base and exit again. When generating a power chip's diagonal rays, truncate the ray at the last own-base tile before the path leaves the base; destinations past that point are illegal. Tiles before the first own-base tile remain valid, and stopping there does not lock the chip in.
- Standard chips are unaffected by ray capping: orthogonal lines through a rectangular base can never enter and exit it. They only need the lock-in flag set when the farthest legal tile lies inside the own base.
- Win check: every tile of the player's base is occupied by one of that player's chips. `isWin(state, player)`; a game-over check should evaluate win, then stalemate, then threefold repetition.
- Stalemate check: the side to move has no legal move across any of its chips. `hasAnyLegalMove(state, player)`.
- Threefold repetition needs a position key that includes chip positions, lock-in flags, and the side to move. A plain board hash is insufficient because lock-in state is part of the position. Count occurrences in a position-key history.
- Resignation and draw offers are match actions, not board-state transitions. Model them as game status (`in-progress | finished`) plus a result (`white | black | draw`) with a reason (`base-filled | stalemate | agreement | repetition | resignation`). Resigning is not a board mutation and needs no legal-move validation.
- Walls can be represented as out-of-bounds coordinates rather than board state: any ray that reaches a coordinate outside `0 ≤ x ≤ 8` or `0 ≤ y ≤ 9` simply stops at the last in-bounds tile. No wall data is needed for the standard board.
- Add tests under `src/__tests__/engine/` before wiring up the board UI.
- Do not resolve rules questions by assumption. Ask the user and update this file first.
