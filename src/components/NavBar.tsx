'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import SyncStatusIndicator from './SyncStatusIndicator';

const links = [
  { href: '/drills',        label: 'Drills',        icon: '⚽' },
  { href: '/sessions',      label: 'Sessions',      icon: '📋' },
  { href: '/teams',         label: 'Teams',         icon: '👥' },
  { href: '/season-plans',  label: 'Season Plans',  icon: '📅' },
  { href: '/calendar',      label: 'Calendar',      icon: '🗓' },
];

/**
 * NavBar — full-width 240px sidebar above 900px (desktop), collapses to a
 * 64px icon-only rail below that (iPad portrait + smaller). Section labels,
 * link text, and the footer line are all hidden in compact mode; the logo
 * shrinks to just the "CM" badge. `title` attributes preserve discoverability
 * on hover, and labels remain available to screen-readers via aria-label.
 */
export default function NavBar() {
  const pathname = usePathname();
  const { user, cloudEnabled, signOut } = useAuth();

  return (
    <aside className="no-print w-16 nav:w-60 bg-brand-dark text-white flex flex-col shrink-0 h-screen-dvh overflow-y-auto safe-pt safe-pl transition-[width] duration-200">
      {/* Logo */}
      <div className="px-3 nav:px-5 py-5 flex items-center gap-3 border-b border-white/10 justify-center nav:justify-start">
        <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-lg shadow-brand-orange/30">
          C
        </div>
        <div className="min-w-0 hidden nav:block">
          <p className="font-bold text-sm leading-tight truncate">CoachDesigner</p>
          <p className="text-[10px] text-white/40">Coach Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 nav:px-3 pt-4 pb-3 space-y-0.5">
        <p className="hidden nav:block text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 pb-2">
          Navigation
        </p>
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              title={l.label}
              aria-label={l.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all justify-center nav:justify-start ${
                active
                  ? 'bg-brand-orange/20 text-brand-orange'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base shrink-0">{l.icon}</span>
              <span className="hidden nav:inline">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Signed-in user + sync indicator + sign-out — only visible when
          cloud mode is on AND a user is present. In local-only mode this
          whole block is hidden so the existing offline experience is
          unchanged. */}
      {cloudEnabled && user && (
        <div className="border-t border-white/10 px-2 nav:px-3 py-3">
          {/* Expanded: avatar + email */}
          <div className="hidden nav:flex items-center gap-2 mb-1 px-1">
            <div className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center text-xs font-bold shrink-0">
              {(user.email ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <p className="text-xs text-white/70 truncate" title={user.email ?? ''}>
              {user.email}
            </p>
          </div>
          <SyncStatusIndicator />
          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors justify-center nav:justify-start"
          >
            <span className="text-base shrink-0">↩</span>
            <span className="hidden nav:inline">Sign out</span>
          </button>
        </div>
      )}

      {/* Footer — only visible in expanded mode */}
      <div className="hidden nav:block px-4 pb-4 border-t border-white/10 pt-3">
        <p className="text-[10px] text-white/20 text-center">Coach Drill Designer</p>
      </div>
    </aside>
  );
}
