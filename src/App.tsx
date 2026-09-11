import { AppRoutes } from './routes';
import { WebSocketProvider } from './contexts/WebSocketProvider';

export function App() {
  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-primary text-slate-100">
        <AppRoutes />
      </div>
    </WebSocketProvider>
  );
}
