// Shared app shell: sticky top bar (wordmark + nav) on all sizes, plus a
// bottom tab bar on small screens (thumb-reachable, PWA-friendly). Wraps every
// route via <Outlet />. See src/routes.tsx.

import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/lobby', label: 'Play' },
  { to: '/profile/guest', label: 'Profile' },
];

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-accent/15 text-accent' : 'text-taupe hover:text-parchment',
  ].join(' ');

const tabLink = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition',
    isActive ? 'text-accent' : 'text-taupe hover:text-parchment',
  ].join(' ');

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-primary text-parchment">
      <header className="sticky top-0 z-20 border-b border-wood-edge/60 bg-primary/95 backdrop-blur">
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

      {/* Extra bottom padding on mobile so the fixed tab bar never covers content. */}
      <div className="flex flex-1 flex-col pb-16 sm:pb-0">
        <Outlet />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-wood-edge/60 bg-surface/95 backdrop-blur sm:hidden"
        aria-label="Main"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={tabLink}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
