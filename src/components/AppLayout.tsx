// Shared app shell: sticky top bar (wordmark + nav) on all sizes, plus a
// bottom tab bar on small screens (thumb-reachable, PWA-friendly). Wraps every
// route via <Outlet />. See src/routes.tsx.
//
// iPhone ergonomics: the tab bar sits above the home-indicator gesture area
// using env(safe-area-inset-bottom) (requires viewport-fit=cover in the
// viewport meta). The header also respects env(safe-area-inset-top) so it
// clears the notch in standalone PWA mode.

import { NavLink, Outlet } from 'react-router-dom';

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/lobby', label: 'Play', Icon: PlayIcon },
  { to: '/profile/guest', label: 'Profile', Icon: ProfileIcon },
];

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-accent/15 text-accent' : 'text-taupe hover:text-parchment',
  ].join(' ');

const tabLink = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.7rem] font-semibold transition',
    isActive ? 'text-accent' : 'text-taupe hover:text-parchment',
  ].join(' ');

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-primary text-parchment">
      <header className="sticky top-0 z-20 border-b border-wood-edge/60 bg-primary/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <NavLink to="/" className="text-xl font-extrabold tracking-tight text-accent">
            Outwit
          </NavLink>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={desktopLink} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Extra bottom padding on mobile so the fixed tab bar (plus the home
          indicator inset) never covers content. */}
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        <Outlet />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-wood-edge/60 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Main"
      >
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={tabLink}>
              <item.Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
