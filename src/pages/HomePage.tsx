import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="text-5xl font-extrabold text-accent">Outwit</h1>
      <p className="max-w-md text-lg text-parchment/90">
        The modern home for competitive turn-based board games. Play live, climb
        the ranks, and outwit your opponents.
      </p>
      <div className="flex gap-4">
        <Link
          to="/lobby"
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-accent-hover"
        >
          Play Now
        </Link>
        <Link
          to="/profile/guest"
          className="rounded-lg border border-wood-edge bg-surface px-6 py-3 font-semibold text-parchment transition hover:border-accent hover:text-accent"
        >
          Profile
        </Link>
      </div>
    </main>
  );
}
