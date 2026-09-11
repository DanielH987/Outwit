// Legal move generation. Movement rules and base rules: docs/RULES.md §6.
//
// A move is a slide in a straight line. A slide ends immediately before the
// first obstacle. Obstacles are: the board edge (perimeter walls), any chip,
// and the enemy base perimeter. The own base is permeable inward but not
// outward (lock-in): a slide may never enter the own base and exit again.
// Locked-in chips (position inside own base) treat the base boundary as a
// wall in every direction.

import { chipAt, isInBase, isInBounds, isInEnemyBase } from './board';
import type { BoardState, PlayerId, Position } from './types';

const ORTHOGONAL_DIRECTIONS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIAGONAL_DIRECTIONS: Position[] = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/**
 * Walks a ray from a chip in one direction and returns every clear tile along
 * the way, in order, up to (but not including) the first obstacle.
 *
 * An "obstacle" here is dynamic:
 * - board edges (perimeter walls),
 * - any occupied tile,
 * - any tile of the enemy base,
 * - any tile outside the own base, if the ray has already entered the own base
 *   (chip locked in, or the ray crossed in mid-slide — entering is one-way and
 *   exiting is blocked; see docs/RULES.md §6 "Crossing counts as entering").
 */
function rayWalk(state: BoardState, player: PlayerId, from: Position, dir: Position): Position[] {
  const tiles: Position[] = [];
  // If the chip starts inside its own base it is locked in, so the own base
  // boundary is a wall from the start of the move.
  let insideOwnBase = isInBase(from, player);

  let current = from;
  for (;;) {
    const next = { x: current.x + dir.x, y: current.y + dir.y };
    if (!isInBounds(next)) break;
    if (chipAt(state, next)) break;
    if (isInEnemyBase(next, player)) break;

    const nextInBase = isInBase(next, player);
    if (insideOwnBase && !nextInBase) break; // would exit the own base — illegal
    if (nextInBase) insideOwnBase = true; // entering mid-slide locks in the rest of the ray

    tiles.push(next);
    current = next;
  }
  return tiles;
}

/**
 * All legal destinations for a chip, by the rules in docs/RULES.md §6:
 * - Standard chips must slide as far as possible: at most one destination per
 *   direction, the last clear tile before the obstacle (none if the adjacent
 *   tile is blocked).
 * - The power chip may stop at any clear tile along each direction.
 */
export function getLegalMoves(state: BoardState, chipId: string): Position[] {
  const chip = state.chips.find((c) => c.id === chipId);
  if (!chip) return [];

  const directions = chip.isPower
    ? [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
    : ORTHOGONAL_DIRECTIONS;

  const destinations: Position[] = [];
  for (const dir of directions) {
    const ray = rayWalk(state, chip.player, chip.position, dir);
    if (ray.length === 0) continue;
    if (chip.isPower) destinations.push(...ray);
    else destinations.push(ray[ray.length - 1]);
  }
  return destinations;
}

export function hasAnyLegalMove(state: BoardState, player: PlayerId): boolean {
  return state.chips.some((chip) => chip.player === player && getLegalMoves(state, chip.id).length > 0);
}
