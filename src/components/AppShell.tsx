'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';
import { AuthProvider } from '@/lib/auth/AuthProvider';

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

  // AuthProvider wraps everything so `useAuth()` is available on every page
  // (including the public ones — sign-up + login forms call it). The provider
  // itself short-circuits when Supabase env vars are missing, so local-only
  // mode keeps working unchanged.
  return (
    <AuthProvider>
      {PUBLIC_PATHS.has(pathname) ? (
        <>{children}</>
      ) : (
        <ChromeLayout pathname={pathname}>{children}</ChromeLayout>
      )}
    </AuthProvider>
  );
}

function ChromeLayout({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const inEditor = isDrillEditorPath(pathname);

  return (
    <div className="bg-brand-bg text-slate-900 min-h-screen-dvh flex overflow-hidden h-screen-dvh">
      {/*
        Sidebar behaviour:
        - Non-editor pages: NavBar is always rendered (collapses to a 64-px
          icon rail under 900 px via NavBar's own `nav:` breakpoint).
        - Drill editor on real desktop (≥ 1280 px AND mouse/trackpad): NavBar
          visible exactly as on other pages.
        - Drill editor on any tablet — iPad portrait, iPad landscape, iPad Pro
          landscape: NavBar fully hidden, no icon rail either. The canvas /
          palette / inspector get the full viewport width.

        Tablet detection lives in `editor-navbar-hide` (see globals.css) which
        combines width + pointer + hover media queries — width alone is not
        enough because iPad Pro 12.9" landscape exceeds the `xl` breakpoint.
      */}
      <div className={inEditor ? 'editor-navbar-hide' : 'contents'}>
        <NavBar />
      </div>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
