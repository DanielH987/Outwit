// A country flag shown next to a player's name. Renders nothing when the
// country code is absent or unknown, so it is safe to include unconditionally.

import { countryFlagEmoji, normalizeCountryCode } from '@/utils/flags';

interface CountryFlagProps {
  code: string | null | undefined;
  className?: string;
}

export function CountryFlag({ code, className }: CountryFlagProps) {
  const emoji = countryFlagEmoji(code);
  const normalized = normalizeCountryCode(code);
  if (!emoji || !normalized) return null;
  return (
    <span
      role="img"
      aria-label={normalized}
      data-testid="country-flag"
      className={className}
    >
      {emoji}
    </span>
  );
}
