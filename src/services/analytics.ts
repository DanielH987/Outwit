// Minimal, privacy-first analytics wrapper around Umami.
// Falls back gracefully if the script is blocked or still loading.

export interface TrackProperties {
  [key: string]: string | number | boolean | null | undefined;
}

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, properties?: TrackProperties) => void | Promise<void>;
    };
  }
}

/** Fire a named custom event with optional properties. Safe to call anywhere. */
export function trackEvent(eventName: string, properties?: TrackProperties): void {
  if (typeof window === 'undefined') return;
  if (!window.umami) return;
  try {
    window.umami.track(eventName, properties ?? {});
  } catch {
    // Ignore analytics failures; they must never break gameplay.
  }
}

/** Identify the current page path. Useful for single-page apps that want manual page tracking. */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return;
  trackEvent('pageview', path ? { path } : undefined);
}
