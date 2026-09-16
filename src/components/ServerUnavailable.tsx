// Shown when the online game server can't be reached (down, suspended, cold
// starting, or offline). Explains the situation and offers a retry, instead of
// leaving the page on "Connecting to server..." forever.
//
// Only renders once a few attempts have failed, so a normal cold start (which
// can take ~30-60s on a free host) doesn't alarm anyone immediately.

import { useOptionalWebSocket } from '@/contexts/WebSocketProvider';

/** Failed attempts before we assume the server is actually down. */
export const UNAVAILABLE_AFTER_FAILURES = 4;

interface ServerUnavailableProps {
  /** Show the "local play still works" hint (game pages). */
  showLocalHint?: boolean;
}

export function ServerUnavailable({ showLocalHint = false }: ServerUnavailableProps) {
  const { connection, retry } = useOptionalWebSocket();

  if (connection.status === 'open' || connection.failures < UNAVAILABLE_AFTER_FAILURES) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="server-unavailable"
      className="mx-auto w-full max-w-md rounded-xl border border-danger/60 bg-danger/15 p-4 text-center text-sm text-parchment shadow-lg shadow-black/30"
    >
      <p className="mb-1 font-semibold">Online play is unavailable</p>
      <p className="mb-3 text-parchment/90">
        We can't reach the game server right now. It may be waking up or temporarily offline.
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-primary transition hover:bg-accent-hover"
      >
        Try again
      </button>
      {showLocalHint && (
        <p className="mt-3 text-xs text-taupe">
          You can still play pass-and-play at{' '}
          <a href="/game/local" className="text-accent hover:underline">
            /game/local
          </a>
          .
        </p>
      )}
    </div>
  );
}
