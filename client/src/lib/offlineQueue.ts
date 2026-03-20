/**
 * offlineQueue
 *
 * Queues XP award and stats update payloads in IndexedDB when the device is
 * offline (or the server is unreachable). On app load / reconnect the queue
 * is flushed by POSTing to the REST API.
 *
 * Queue entry types:
 *   - 'xp'    → POST /api/v1/profile/me/xp    { amount: number }
 *   - 'stats' → POST /api/v1/profile/me/stats  { [key]: value }
 */

import { env } from '../env';

// ─── IndexedDB setup ──────────────────────────────────────────────────────────

const IDB_DB_NAME  = 'undercover-local';
const IDB_STORE    = 'offline-queue';
const IDB_VERSION  = 2; // bump from v1 (word-pairs store) to add queue store

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      // Preserve existing word-pairs store
      if (!db.objectStoreNames.contains('word-pairs')) {
        db.createObjectStore('word-pairs', { keyPath: 'id' });
      }
      // Create queue store if it doesn't exist
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
      }
      void event; // suppress unused-var lint
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueueEntryType = 'xp' | 'stats';

export interface XpPayload {
  amount: number;
}

export interface StatsPayload {
  [key: string]: number | string | boolean;
}

export interface QueueEntry {
  id?: number; // auto-assigned by IDB
  type: QueueEntryType;
  payload: XpPayload | StatsPayload;
  createdAt: number;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueueXp(amount: number): Promise<void> {
  const entry: QueueEntry = {
    type: 'xp',
    payload: { amount },
    createdAt: Date.now(),
  };
  await addEntry(entry);
}

export async function enqueueStats(stats: StatsPayload): Promise<void> {
  const entry: QueueEntry = {
    type: 'stats',
    payload: stats,
    createdAt: Date.now(),
  };
  await addEntry(entry);
}

async function addEntry(entry: QueueEntry): Promise<void> {
  const db = await openQueueDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).add(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ─── Flush ────────────────────────────────────────────────────────────────────

/**
 * Flush all queued entries to the REST API.
 * Entries are removed from the queue only after a successful POST.
 * Silently skips if offline.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const db = await openQueueDB();
  const entries = await getAllEntries(db);

  if (entries.length === 0) return;

  const BASE = env.VITE_API_BASE_URL;

  for (const entry of entries) {
    try {
      const path =
        entry.type === 'xp'
          ? `${BASE}/profile/me/xp`
          : `${BASE}/profile/me/stats`;

      const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      });

      if (res.ok || res.status === 401) {
        // 401 = not authenticated; drop the entry rather than retry forever
        await deleteEntry(db, entry.id!);
      }
      // On other errors (5xx, network) leave the entry for the next flush
    } catch {
      // Network error — leave entry in queue
    }
  }
}

async function getAllEntries(db: IDBDatabase): Promise<QueueEntry[]> {
  const tx = db.transaction(IDB_STORE, 'readonly');
  const store = tx.objectStore(IDB_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror   = () => reject(req.error);
  });
}

async function deleteEntry(db: IDBDatabase, id: number): Promise<void> {
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
