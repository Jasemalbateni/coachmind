'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';

const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="bg-brand-bg text-slate-900 min-h-screen-dvh flex overflow-hidden h-screen-dvh">
      <NavBar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
