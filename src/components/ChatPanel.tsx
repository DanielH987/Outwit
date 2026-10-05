// Chat panel for online rooms. Read-only w.r.t. game state; the provider
// appends incoming messages to gameStore.

import { useState } from 'react';
import { useGameStore } from '@/stores';
import type { PlayerId } from '@/engine';
import { CountryFlag } from '@/components/CountryFlag';

interface ChatPanelProps {
  roomId: string;
  sendChat: (roomId: string, text: string) => void;
  requestChat: (roomId: string) => void;
  respondChatRequest: (roomId: string, accepted: boolean) => void;
  /** For display: which side "we" are on, to label the chat box. */
  mySide: 'white' | 'black' | PlayerId | null;
}

export function ChatPanel({ roomId, sendChat, requestChat, respondChatRequest, mySide }: ChatPanelProps) {
  const messages = useGameStore((s) => s.messages);
  const chatStatus = useGameStore((s) => s.chatStatus);
  const [draft, setDraft] = useState('');

  const MAX_LENGTH = 500;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(roomId, text.slice(0, MAX_LENGTH));
    setDraft('');
  };

  const isPlayer = mySide !== null;

  const renderControls = () => {
    if (!isPlayer) {
      return <p className="text-taupe">Chat is only available to seated players.</p>;
    }
    switch (chatStatus) {
      case 'accepted':
        return (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
              placeholder={`Chat as ${mySide}`}
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              aria-label="Chat message"
            />
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-accent px-3 py-2 font-semibold text-primary transition hover:bg-accent-hover"
            >
              Send
            </button>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center justify-between rounded-lg bg-primary/60 px-3 py-2 text-parchment/90">
            <span>Chat request sent.</span>
            <span className="text-xs text-taupe">Waiting for opponent…</span>
          </div>
        );
      case 'requested':
        return (
          <div className="flex flex-col gap-2">
            <p className="text-parchment/90">Your opponent wants to chat.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => respondChatRequest(roomId, true)}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => respondChatRequest(roomId, false)}
                className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-danger hover:text-danger"
              >
                Decline
              </button>
            </div>
          </div>
        );
      case 'none':
      default:
        return (
          <button
            type="button"
            onClick={() => requestChat(roomId)}
            className="w-full rounded-lg bg-accent px-3 py-2 font-semibold text-primary transition hover:bg-accent-hover"
          >
            Ask to chat
          </button>
        );
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-surface p-4 text-sm text-parchment shadow-lg shadow-black/30" data-testid="chat-panel">
      <p className="font-semibold">Chat</p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-taupe">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <p key={m.id} className="text-parchment/90">
              <CountryFlag code={m.countryCode} className="text-sm" />{' '}
              <span className="text-taupe">{m.username ?? 'Anon'}:</span> {m.text}
            </p>
          ))
        )}
      </div>
      {renderControls()}
    </div>
  );
}
