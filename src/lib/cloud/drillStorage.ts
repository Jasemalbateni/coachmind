/**
 * Drills Zustand storage adapter — thin re-export of the generic
 * cloud-storage factory so the existing drillsStore import path stays valid.
 *
 * See `cloudStorage.ts` for the namespacing behaviour. Other stores
 * (sessions, season plans, folders) build their own adapters via the same
 * factory.
 */

import { makeNamespacedStorage } from './cloudStorage';

export const drillsZustandStorage = makeNamespacedStorage('coach-drills-v2');
