import { AppRoutes } from './routes';
import { IdentityProvider } from './contexts/IdentityProvider';
import { WebSocketProvider } from './contexts/WebSocketProvider';

export function App() {
  return (
    <IdentityProvider>
      <WebSocketProvider>
        <AppRoutes />
      </WebSocketProvider>
    </IdentityProvider>
  );
}
