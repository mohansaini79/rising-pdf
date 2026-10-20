import { CloudDocument, StudioStorageStats } from '../types';

const DB_NAME = 'TheRisingTribe_StudioCloudVault';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const TOTAL_CLOUD_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Studio Cloud Storage

function openDatabase(): Promise<IDBDatabase> {
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
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback memory store in case of restricted private browsing
let memoryDocs: CloudDocument[] = [];

export const CloudStorageService = {
  async getAllDocuments(): Promise<CloudDocument[]> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('updatedAt');
        const request = index.getAll();

        request.onsuccess = () => {
          // Sort newest first
          const docs: CloudDocument[] = (request.result || []).reverse();
          resolve(docs);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [...memoryDocs].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },

  async getDocument(id: string): Promise<CloudDocument | null> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return memoryDocs.find((d) => d.id === id) || null;
    }
  },

  async saveDocument(doc: CloudDocument): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(doc);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      const idx = memoryDocs.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        memoryDocs[idx] = doc;
      } else {
        memoryDocs.push(doc);
      }
    }
  },

  async deleteDocument(id: string): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      memoryDocs = memoryDocs.filter((d) => d.id !== id);
    }
  },

  async getStorageStats(): Promise<StudioStorageStats> {
    const docs = await this.getAllDocuments();
    let usedBytes = 0;
    for (const d of docs) {
      usedBytes += d.sizeBytes || 0;
    }
    return {
      usedBytes,
      totalBytes: TOTAL_CLOUD_QUOTA_BYTES,
      documentCount: docs.length,
      lastSyncedAt: Date.now(),
      cloudHealth: 'healthy',
    };
  },

  exportVaultBackup(docs: CloudDocument[]): string {
    const backup = {
      app: 'The Rising Tribe Studios - Cloud Vault',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        pageCount: d.pageCount,
        sizeBytes: d.sizeBytes,
        tags: d.tags,
        versions: d.versions,
        pdfDataUrl: d.pdfDataUrl,
      })),
    };
    return JSON.stringify(backup, null, 2);
  },

  async importVaultBackup(jsonStr: string): Promise<number> {
    const data = JSON.parse(jsonStr);
    if (!data.documents || !Array.isArray(data.documents)) {
      throw new Error('Invalid backup format');
    }
    let count = 0;
    for (const item of data.documents) {
      if (item.id && item.title && item.pdfDataUrl) {
        await this.saveDocument({
          ...item,
          cloudSyncStatus: 'synced',
        });
        count++;
      }
    }
    return count;
  },
};
