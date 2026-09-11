// Game setup helpers: initial board state.

import { CHIPS_PER_PLAYER, POWER_CHIP_NUMBER, startingPosition } from './board';
import type { BoardState, Chip } from './types';

export function createInitialChips(): Chip[] {
  const chips: Chip[] = [];
  for (let n = 1; n <= CHIPS_PER_PLAYER; n++) {
    chips.push({ id: `white-${n}`, player: 'white', isPower: n === POWER_CHIP_NUMBER, position: startingPosition('white', n) });
    chips.push({ id: `black-${n}`, player: 'black', isPower: n === POWER_CHIP_NUMBER, position: startingPosition('black', n) });
  }
  return chips;
}

export function createInitialState(): BoardState {
  return { chips: createInitialChips(), sideToMove: 'white' };
}
