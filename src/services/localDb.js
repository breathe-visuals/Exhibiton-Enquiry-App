export const DB_NAME = 'EnquiryAppDB';
export const DB_VERSION = 1;

const STORES = {
  ENQUIRIES: 'enquiries', // Key: enquiry_id
  SYNC_QUEUE: 'sync_queue', // Key: id (autoIncrement)
};

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error('IndexedDB Error:', e.target.error);
      reject(e.target.error);
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.ENQUIRIES)) {
        db.createObjectStore(STORES.ENQUIRIES, { keyPath: 'enquiry_id' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const saveLocalEnquiries = async (enquiries) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ENQUIRIES, 'readwrite');
    const store = tx.objectStore(STORES.ENQUIRIES);
    // Clear and put all
    store.clear();
    enquiries.forEach(eq => store.put(eq));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getLocalEnquiries = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ENQUIRIES, 'readonly');
    const store = tx.objectStore(STORES.ENQUIRIES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const addSyncTask = async (endpoint, method, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const task = { endpoint, method, data, timestamp: Date.now(), retryCount: 0 };
    const request = store.add(task);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-updated'));
      resolve(request.result);
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const getSyncTasks = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('timestamp');
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const removeSyncTask = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.delete(id);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-updated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const updateSyncTask = async (task) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.put(task);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
