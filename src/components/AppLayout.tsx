// Shared app shell.
// - Phone: no top bar; navigation lives in a bottom tab bar (safe-area aware,
//   thumb-reachable, and available in installed PWA mode).
// - Tablet/desktop (md+): a left icon rail (chess.com-style) instead of a top
//   bar, so the game view can use the full viewport height for the board.
// Wraps every route via <Outlet />. See src/routes.tsx.

import { NavLink, Outlet } from 'react-router-dom';

function BoardIcon({ className }: { className?: string }) {
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
  { to: '/lobby', label: 'Play', Icon: BoardIcon },
  { to: '/profile/guest', label: 'Profile', Icon: ProfileIcon },
];

const railLink = ({ isActive }: { isActive: boolean }) =>
  [
    'flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-[0.65rem] font-semibold transition',
    isActive ? 'bg-accent/15 text-accent' : 'text-taupe hover:bg-surface hover:text-parchment',
  ].join(' ');

const tabLink = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.7rem] font-semibold transition',
    isActive ? 'text-accent' : 'text-taupe hover:text-parchment',
  ].join(' ');

// Legal links live on every page: Google's branding verification requires the
// homepage to link to the privacy policy and terms.
function Footer() {
  return (
    <footer className="mt-auto border-t border-wood-edge/40 px-4 py-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-taupe">
        <span>Outwit</span>
        <NavLink to="/privacy" className="hover:text-accent">
          Privacy Policy
        </NavLink>
        <NavLink to="/terms" className="hover:text-accent">
          Terms of Service
        </NavLink>
      </div>
    </footer>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-dvh bg-primary text-parchment">
      {/* Left rail (tablet/desktop): replaces the top bar so game screens get
          the full viewport height, like chess.com's desktop rail. */}
      <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-2 border-r border-wood-edge/60 bg-surface/40 py-4 md:flex">
        <NavLink
          to="/"
          aria-label="Outwit home"
          title="Home"
          className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition hover:bg-accent/25"
        >
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
        </NavLink>
        <nav className="flex w-full flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={railLink}>
              <item.Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content. On phones the fixed tab bar (plus the home-indicator inset)
          needs bottom padding; on md+ the rail handles navigation. */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:pb-0 md:pt-0">
        <Outlet />
        <Footer />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-wood-edge/60 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
