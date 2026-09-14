import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-taupe">This page does not exist.</p>
      <Link to="/" className="text-accent hover:underline">
        Back to home
      </Link>
    </main>
  );
}
