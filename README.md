# Outwit

A local-playable prototype of **Outwit**, a custom strategic turn-based board game. Built as a Vite + React + TypeScript PWA with the goal of eventually supporting real-time online matches.

## What Outwit Is

Outwit is an original turn-based board game (game rules are still being defined). The current codebase is a scaffold that provides:

- A home page, lobby, game room, and profile page.
- Client-side routing.
- Zustand stores for authentication and game state.
- A WebSocket service ready to connect to a backend.
- A PWA configuration via `vite-plugin-pwa`.
- A test harness using Vitest + React Testing Library.

## Tech Stack

- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS 3
- React Router 6
- Zustand 5 (state management)
- WebSockets (multiplayer scaffolding)
- Vitest + React Testing Library + jsdom
- `vite-plugin-pwa`

## Scripts

- `npm run dev` — start development server (`http://localhost:5173` by default)
- `npm run build` — type-check and production build
- `npm run preview` — preview production build
- `npm test` — run tests in watch mode
- `npm run lint` — run ESLint

## Project Structure

```
src/
  components/     # Shared UI components (currently Layout)
  contexts/       # React context providers (WebSocketProvider)
  hooks/          # Custom hooks (useWebSocketActions)
  pages/          # Route-level page components
  services/       # External service clients (WebSocket, API)
  stores/         # Zustand stores (authStore, gameStore)
  types/          # TypeScript type definitions
  utils/          # Utility helpers
```

## Routes

- `/` — Home page with calls to action.
- `/lobby` — Game lobby; list or create rooms.
- `/game/:gameId` — Active game room.
- `/profile/:username` — Player profile placeholder.

## Current State

This is a **pure scaffold / local playable prototype**.

- No real game rules or board logic exist yet.
- The WebSocket client connects but expects a backend matching the message types in `src/types/index.ts`.
- Authentication is client-side only (Zustand persist to `localStorage`).

## Environment Variables

- `VITE_WS_URL` — WebSocket server URL (defaults to `wss://localhost:3001`).

## Testing

Tests live in `src/__tests__/` and run with Vitest. Add component tests alongside new features; see `HomePage.test.tsx` for the current pattern.
