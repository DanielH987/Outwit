import { useParams } from 'react-router-dom';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-xl bg-surface p-6">
        <h2 className="mb-2 text-2xl font-bold">{username}</h2>
        <p className="text-slate-400">Profile stats and match history will appear here.</p>
      </div>
    </main>
  );
}
