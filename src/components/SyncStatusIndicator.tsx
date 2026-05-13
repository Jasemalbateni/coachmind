'use client';

/**
 * Combined cloud-sync indicator across every entity type.
 *
 * Subscribes to the global `cloudSyncStatus` store, which every entity
 * sync (drills, sessions, plans, folders, subcategories) writes into.
 * `combineStatuses` rolls these up with a "worst wins" rule:
 *
 *   any failed   → "Sync failed"
 *   any offline  → "Offline"
 *   any syncing  → "Syncing…"
 *   else         → "Synced"
 *
 * Hidden entirely when cloud mode is off or no user is signed in — local-
 * only users see nothing new.
 */

import { useAuth } from '@/lib/auth/AuthProvider';
import {
  useCloudSyncStatus,
  combineStatuses,
  type SyncStatus,
} from '@/lib/cloud/cloudSyncStatus';

const COPY: Record<SyncStatus, string> = {
  synced:  'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  failed:  'Sync failed',
};

const DOT_COLOR: Record<SyncStatus, string> = {
  synced:  'bg-emerald-400',
  syncing: 'bg-sky-400 animate-pulse',
  offline: 'bg-amber-400',
  failed:  'bg-red-400',
};

const TEXT_COLOR: Record<SyncStatus, string> = {
  synced:  'text-white/50',
  syncing: 'text-sky-300/80',
  offline: 'text-amber-300/80',
  failed:  'text-red-300/80',
};

export default function SyncStatusIndicator() {
  const { user, cloudEnabled } = useAuth();
  const entries = useCloudSyncStatus((s) => s.entries);

  if (!cloudEnabled || !user) return null;

  const { status, pending } = combineStatuses(entries);
  const label = status === 'syncing' && pending > 0 ? `Syncing… (${pending})` : COPY[status];

  return (
    <div
      title={label}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg justify-center nav:justify-start"
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[status]}`}
        aria-hidden="true"
      />
      <span className={`hidden nav:inline text-[11px] font-medium ${TEXT_COLOR[status]}`}>
        {label}
      </span>
    </div>
  );
}
