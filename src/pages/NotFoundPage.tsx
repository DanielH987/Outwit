import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-slate-400">This page does not exist.</p>
      <Link to="/" className="text-accent hover:underline">
        Back to home
      </Link>
    </main>
  );
}
