import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocketActions } from '@/hooks/useWebSocketActions';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { joinRoom, leaveRoom } = useWebSocketActions();

  useEffect(() => {
    if (!gameId) return;
    joinRoom(gameId);
    return () => leaveRoom(gameId);
  }, [gameId, joinRoom, leaveRoom]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-2xl font-bold">Game Room: {gameId}</h2>
      <p className="text-slate-400">Board and game UI will be built here.</p>
      <div className="aspect-square w-full max-w-lg rounded-xl bg-surface shadow-lg">
        {/* Board placeholder */}
      </div>
    </main>
  );
}
