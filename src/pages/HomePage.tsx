import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="text-5xl font-extrabold text-accent">Outwit</h1>
      <p className="max-w-md text-lg text-slate-300">
        The modern home for competitive turn-based board games. Play live, climb
        the ranks, and outwit your opponents.
      </p>
      <div className="flex gap-4">
        <Link
          to="/lobby"
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-sky-300"
        >
          Play Now
        </Link>
        <Link
          to="/profile/guest"
          className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-slate-200 transition hover:border-accent hover:text-accent"
        >
          Profile
        </Link>
      </div>
    </main>
  );
}
