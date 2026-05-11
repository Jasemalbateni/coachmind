'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';

const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

/**
 * Detect the drill editor route (`/drills/[id]` or `/drills/[id]/...`) without
 * matching `/drills` itself, the v2 editor, or any other section. Used to hide
 * the global NavBar on iPad inside the editor — coaches need every pixel for
 * the pitch on a tablet.
 */
function isDrillEditorPath(pathname: string): boolean {
  if (pathname.startsWith('/drills/') && pathname !== '/drills') return true;
  if (pathname.startsWith('/v2/editor/')) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  const inEditor = isDrillEditorPath(pathname);

  return (
    <div className="bg-brand-bg text-slate-900 min-h-screen-dvh flex overflow-hidden h-screen-dvh">
      {/*
        Sidebar behaviour:
        - All non-editor pages: NavBar visible everywhere (collapses to icons
          under 900 px via NavBar's own `nav:` breakpoint).
        - Drill editor on tablet (< xl, < 1280 px): NavBar hidden entirely so
          the canvas + palette + inspector get the full viewport.
        - Drill editor on desktop (≥ xl): NavBar visible as usual.

        Using a `display: contents` wrapper lets us hide the NavBar via CSS
        without re-rendering the layout tree.
      */}
      <div className={inEditor ? 'hidden xl:contents' : 'contents'}>
        <NavBar />
      </div>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
