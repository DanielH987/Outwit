// Invite codes for generated online rooms. Six characters from an unambiguous
// alphabet (no I, O, 0, 1) so codes survive being read aloud or typed by hand.

export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

export function generateInviteCode(): string {
  const bytes = new Uint32Array(INVITE_CODE_LENGTH);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return code;
}

/** Uppercase and trim a user-typed code before validation. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidInviteCode(raw: string): boolean {
  return CODE_PATTERN.test(normalizeInviteCode(raw));
}

/** Full invite URL for the current origin, e.g. `https://outwit-one.vercel.app/game/K7M2QP`. */
export function inviteUrl(code: string, origin: string = window.location.origin): string {
  return `${origin}/game/${encodeURIComponent(code)}`;
}
