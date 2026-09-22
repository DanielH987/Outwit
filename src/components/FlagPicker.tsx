// Flag modal (chess.com-style): click your flag in the profile header and this
// dialog opens with a searchable grid of countries. Pick one (or remove the
// current) and it saves immediately and closes. The flag is device-wide and
// works for guests too — no account needed.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CountryFlag } from '@/components/CountryFlag';
import { COUNTRIES } from '@/utils/flags';
import { useProfileStore } from '@/stores';

interface FlagPickerProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function FlagPicker({ open, onClose }: FlagPickerProps) {
  const countryCode = useProfileStore((s) => s.countryCode);
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  // Escape closes, Tab is trapped inside the dialog.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  const pick = (code: string) => {
    useProfileStore.getState().setCountryCode(code);
    setQuery('');
    onClose();
  };

  const remove = () => {
    useProfileStore.setState({ countryCode: null });
    setQuery('');
    onClose();
  };

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-[fadeIn_150ms_ease-out]"
      data-testid="flag-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        data-testid="flag-modal"
        className="w-full max-w-md rounded-2xl border border-wood-edge bg-surface p-5 text-parchment shadow-2xl shadow-black/60 motion-safe:animate-[popIn_180ms_ease-out]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold">
            Where are you from?
          </h2>
          {countryCode && (
            <button
              type="button"
              onClick={remove}
              className="text-xs font-semibold text-taupe transition hover:text-danger"
            >
              Remove flag
            </button>
          )}
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-taupe" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <label className="sr-only" htmlFor="flag-search">Search countries</label>
          <input
            id="flag-search"
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            autoComplete="off"
            className="w-full bg-transparent py-2 text-sm text-parchment outline-none placeholder:text-taupe"
          />
        </div>

        {matches.length === 0 ? (
          <p className="py-6 text-center text-sm text-taupe">No countries match "{query.trim()}".</p>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3">
            {matches.map((c) => {
              const isSelected = c.code === countryCode;
              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => pick(c.code)}
                  aria-pressed={isSelected}
                  title={c.name}
                  className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs transition hover:bg-accent/10 ${
                    isSelected ? 'bg-accent/20 ring-1 ring-accent' : ''
                  }`}
                >
                  <CountryFlag code={c.code} />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
