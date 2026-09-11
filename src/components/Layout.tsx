import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {children}
    </div>
  );
}
