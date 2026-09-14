import { AppRoutes } from './routes';
import { WebSocketProvider } from './contexts/WebSocketProvider';

export function App() {
  return (
    <WebSocketProvider>
      <AppRoutes />
    </WebSocketProvider>
  );
}
