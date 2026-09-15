import { AppRoutes } from './routes';
import { AccountProvider } from './contexts/AccountProvider';
import { IdentityProvider } from './contexts/IdentityProvider';
import { WebSocketProvider } from './contexts/WebSocketProvider';

export function App() {
  return (
    <AccountProvider>
      <IdentityProvider>
        <WebSocketProvider>
          <AppRoutes />
        </WebSocketProvider>
      </IdentityProvider>
    </AccountProvider>
  );
}
