import { CustomAudio } from '../types';

const DB_NAME = 'SchoolBellDB';
const DB_VERSION = 1;
const STORE_METADATA = 'audio_metadata';
const STORE_BLOBS = 'audio_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomAudio(metadata: CustomAudio, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
    const metaStore = tx.objectStore(STORE_METADATA);
    const blobStore = tx.objectStore(STORE_BLOBS);

    metaStore.put(metadata);
    blobStore.put(blob, metadata.id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateCustomAudioMetadata(id: string, updates: Partial<CustomAudio>): Promise<CustomAudio | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_METADATA, 'readwrite');
    const store = tx.objectStore(STORE_METADATA);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as CustomAudio | undefined;
      if (!existing) {
        resolve(null);
        return;
      }
      const updated: CustomAudio = { ...existing, ...updates };
      store.put(updated);
      resolve(updated);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getCustomAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCustomAudios(): Promise<CustomAudio[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const store = tx.objectStore(STORE_METADATA);
    const request = store.getAll();

    request.onsuccess = () => {
      const items: CustomAudio[] = request.result || [];
      // Sort newest first
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCustomAudio(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_METADATA).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface CustomAudioPackageItem {
  metadata: CustomAudio;
  base64Data: string; // Data URL format (data:audio/...;base64,...)
}

export async function exportAllCustomAudiosAsBase64(): Promise<CustomAudioPackageItem[]> {
  const items = await getAllCustomAudios();
  const result: CustomAudioPackageItem[] = [];

  for (const item of items) {
    try {
      const blob = await getCustomAudioBlob(item.id);
      if (blob) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        result.push({
          metadata: item,
          base64Data,
        });
      }
    } catch (e) {
      console.error('Failed to export audio blob to base64:', item.name, e);
    }
  }

  return result;
}

export async function importCustomAudiosFromBase64(
  items: CustomAudioPackageItem[]
): Promise<number> {
  let count = 0;
  for (const item of items) {
    try {
      if (!item.metadata || !item.base64Data) continue;
      const res = await fetch(item.base64Data);
      const blob = await res.blob();
      await saveCustomAudio(item.metadata, blob);
      count++;
    } catch (e) {
      console.error('Failed to import audio item from base64:', item.metadata?.name, e);
    }
  }
  return count;
}

