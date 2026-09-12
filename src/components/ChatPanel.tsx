// Chat panel for online rooms. Read-only w.r.t. game state; the provider
// appends incoming messages to gameStore.

import { useState } from 'react';
import { useGameStore } from '@/stores';
import type { PlayerId } from '@/engine';

interface ChatPanelProps {
  roomId: string;
  sendChat: (roomId: string, text: string) => void;
  /** For display: which side "we" are on, to label the chat box. */
  mySide: 'white' | 'black' | PlayerId | null;
}

export function ChatPanel({ roomId, sendChat, mySide }: ChatPanelProps) {
  const messages = useGameStore((s) => s.messages);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(roomId, text);
    setDraft('');
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-surface p-4 text-sm text-slate-200 shadow-lg" data-testid="chat-panel">
      <p className="font-semibold">Chat</p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-slate-500">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <p key={m.id} className="text-slate-300">
              <span className="text-slate-500">{m.username ?? 'Anon'}:</span> {m.text}
            </p>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-slate-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-accent"
          placeholder={mySide ? `Chat as ${mySide}` : 'Spectate chat'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          aria-label="Chat message"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-accent px-3 py-2 font-semibold text-primary"
        >
          Send
        </button>
      </div>
    </div>
  );
}
