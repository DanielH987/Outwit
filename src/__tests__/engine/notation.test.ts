// Coordinate and move-notation helpers: files a–i, ranks 1–10 with rank 1 at
// the BOTTOM (chess.com convention), so engine (0,0) is a10 and (8,9) is i1.
import { describe, expect, it } from 'vitest';
import { fileLabel, formatMove, formatPosition, rankLabel } from '../../engine';

describe('coordinates', () => {
  it('maps x to files a–i', () => {
    expect(fileLabel(0)).toBe('a');
    expect(fileLabel(4)).toBe('e');
    expect(fileLabel(8)).toBe('i');
  });

  it('maps y to ranks 10–1 (top → bottom, rank 1 at the bottom)', () => {
    expect(rankLabel(0)).toBe('10');
    expect(rankLabel(9)).toBe('1');
  });

  it('formats positions', () => {
    expect(formatPosition({ x: 0, y: 1 })).toBe('a9');
    expect(formatPosition({ x: 8, y: 9 })).toBe('i1');
  });

  it('formats moves with chip number and origin/destination', () => {
    expect(formatMove('white-1', { x: 0, y: 1 }, { x: 0, y: 6 })).toBe('1 a9→a4');
    expect(formatMove('black-9', { x: 8, y: 8 }, { x: 8, y: 3 })).toBe('9 i2→i7');
  });

  it('marks the power chip with a star', () => {
    expect(formatMove('white-5', { x: 4, y: 5 }, { x: 4, y: 9 })).toBe('5★ e5→e1');
  });
});
