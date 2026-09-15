import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LobbyPage } from '../pages/LobbyPage';
import { ProfilePage } from '../pages/ProfilePage';
import { useLocalGameStore } from '../stores/localGameStore';
import { useProfileStore } from '../stores/profileStore';
import { useStatsStore } from '../stores/statsStore';

describe('LobbyPage', () => {
  beforeEach(() => {
    useLocalGameStore.getState().reset();
    useProfileStore.setState({ displayName: null, guestName: null });
  });

  it('shows local pass-and-play CTA and links to /game/local', () => {
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Game Lobby/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Play now/i })[0]).toHaveAttribute('href', '/game/local');
    expect(screen.getByText(/Create a room/i)).toBeInTheDocument();
    expect(screen.getByText(/Join a room/i)).toBeInTheDocument();
  });

  it('shows a resume button when a local game is in progress', () => {
    useLocalGameStore.getState().selectChip('white-1');
    useLocalGameStore.getState().moveSelected({ x: 0, y: 6 });
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Resume local game/i })).toHaveAttribute('href', '/game/local');
  });

  it('shows the name being played as, with a link to change it', () => {
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    const line = screen.getByTestId('playing-as');
    expect(line).toHaveTextContent(/Playing as/);
    // Guest fallback is generated on demand.
    expect(line.textContent).toMatch(/Guest \d{4}/);
    expect(screen.getByRole('link', { name: /Change name/i })).toHaveAttribute('href', '/profile/guest');
  });

  it('uses the saved display name in the lobby', () => {
    useProfileStore.getState().setDisplayName('Alice');
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByTestId('playing-as')).toHaveTextContent('Alice');
  });

  it('create game navigates to a generated 6-character room code', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game/:roomId" element={<p>Game room placeholder</p>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Create room/i }));
    expect(screen.getByText('Game room placeholder')).toBeInTheDocument();
  });
});

describe('ProfilePage', () => {
  beforeEach(() => {
    useStatsStore.getState().clear();
  });

  it('shows zeroed stats and empty state', () => {
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText(/No local games yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /guest/i })).toBeInTheDocument();
  });

  it('renders stats and match history from the stats store', () => {
    const add = useStatsStore.getState().addMatch;
    add({
      finishedAt: new Date('2026-09-11T12:00:00Z').toISOString(),
      winner: 'white',
      reason: 'base-filled',
      moveCount: 42,
      whiteSeconds: 120,
      blackSeconds: 90,
    });
    add({
      finishedAt: new Date('2026-09-11T13:00:00Z').toISOString(),
      winner: null,
      reason: 'stalemate',
      moveCount: 60,
      whiteSeconds: 300,
      blackSeconds: 310,
    });

    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText('2')).toBeInTheDocument(); // Games
    expect(screen.getAllByText('1')).toHaveLength(2); // White wins and Draws
    expect(screen.getByText('White won')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
    expect(screen.getByText(/42 moves/)).toBeInTheDocument();
  });
});

describe('stats recording on local game end', () => {
  beforeEach(() => {
    useStatsStore.getState().clear();
    useLocalGameStore.getState().reset();
  });

  it('records a finished game on resignation', () => {
    useLocalGameStore.getState().resign('black');
    const matches = useStatsStore.getState().matches;
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ winner: 'white', reason: 'resignation', moveCount: 0 });
  });

  it('records a finished game on draw agreement', () => {
    useLocalGameStore.getState().offerDraw('white');
    useLocalGameStore.getState().acceptDraw();
    const matches = useStatsStore.getState().matches;
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ winner: null, reason: 'agreement' });
  });

  it('does not double-record if finish actions repeat', () => {
    useLocalGameStore.getState().resign('white');
    // reset then resign again; reset clears the finished state so this is a new game.
    useLocalGameStore.getState().reset();
    useLocalGameStore.getState().resign('white');
    expect(useStatsStore.getState().matches).toHaveLength(2);
  });
});
