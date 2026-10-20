import { HistoryRecord, HistoryActionType } from '../types';

const DB_NAME = 'TheRisingTribe_StudioHistory';
const DB_VERSION = 1;
const STORE_NAME = 'history_records';

function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('actionType', 'actionType', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let memoryHistory: HistoryRecord[] = [];

export const HistoryService = {
  async getAllRecords(): Promise<HistoryRecord[]> {
    try {
      const db = await openHistoryDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.getAll();

        request.onsuccess = () => {
          const records: HistoryRecord[] = (request.result || []).reverse();
          resolve(records);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [...memoryHistory].sort((a, b) => b.timestamp - a.timestamp);
    }
  },

  async addRecord(item: Omit<HistoryRecord, 'id' | 'timestamp'>): Promise<HistoryRecord> {
    const record: HistoryRecord = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
    };

    try {
      const db = await openHistoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      memoryHistory.unshift(record);
    }

    return record;
  },

  async deleteRecord(id: string): Promise<void> {
    try {
      const db = await openHistoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      memoryHistory = memoryHistory.filter((r) => r.id !== id);
    }
  },

  async clearAllHistory(): Promise<void> {
    try {
      const db = await openHistoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      memoryHistory = [];
    }
  },

  async exportHistoryCsv(): Promise<string> {
    const records = await this.getAllRecords();
    const headers = ['ID', 'Date/Time', 'Action Type', 'Title', 'Pages', 'Size (Bytes)', 'Details', 'Status'];
    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.timestamp).toISOString()}"`,
      `"${r.actionType}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.pageCount,
      r.sizeBytes,
      `"${r.details.replace(/"/g, '""')}"`,
      `"${r.status}"`,
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  },
};
