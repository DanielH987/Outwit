// Invite codes: 6 chars, unambiguous alphabet, validate + normalize + URL.
import { describe, expect, it } from 'vitest';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  generateInviteCode,
  inviteUrl,
  isValidInviteCode,
  normalizeInviteCode,
} from '../utils/inviteCode';

describe('invite codes', () => {
  it('generates a 6-character code from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      for (const ch of code) expect(INVITE_CODE_ALPHABET).toContain(ch);
    }
  });

  it('never contains easily confused characters (I, O, 0, 1)', () => {
    const codes = Array.from({ length: 100 }, generateInviteCode).join('');
    expect(codes).not.toMatch(/[IO01]/);
  });

  it('validates codes case-insensitively, ignoring surrounding whitespace', () => {
    const code = generateInviteCode();
    expect(isValidInviteCode(code)).toBe(true);
    expect(isValidInviteCode(code.toLowerCase())).toBe(true);
    expect(isValidInviteCode(`  ${code}  `)).toBe(true);
  });

  it('rejects wrong length or invalid characters', () => {
    expect(isValidInviteCode('ABC')).toBe(false);
    expect(isValidInviteCode('ABCDEFG')).toBe(false);
    expect(isValidInviteCode('ABC0EF')).toBe(false); // 0 is excluded
    expect(isValidInviteCode('')).toBe(false);
  });

  it('normalizes typed codes to uppercase', () => {
    expect(normalizeInviteCode(' k7m2qp ')).toBe('K7M2QP');
  });

  it('builds a game URL from a code', () => {
    expect(inviteUrl('K7M2QP', 'https://outwit-one.vercel.app')).toBe(
      'https://outwit-one.vercel.app/game/K7M2QP'
    );
  });
});
