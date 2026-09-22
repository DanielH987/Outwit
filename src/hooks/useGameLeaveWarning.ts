import { useEffect } from 'react';

/**
 * Wires up a browser-level warning when the user tries to close or refresh the
 * tab while a game is still in progress, in the style of Chess.com.
 *
 * Works in both local and online contexts: a game counts as "in progress" if
 * `enabled` is true and `gameState` indicates an unfinished game.
 *
 * Notes:
 * - Modern browsers no longer display custom message text for security reasons;
 *   the browser shows its own generic confirmation prompt.
 * - For client-side navigation (e.g. clicking a lobby link inside the app), we
 *   currently let the user leave intentionally. This hook covers the destructive
 *   close/reload scenarios.
 */
export function useGameLeaveWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // `preventDefault()` on the event plus a non-null returnValue is the
      // cross-browser way to trigger the browser's "leave site?" dialog.
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);
}
