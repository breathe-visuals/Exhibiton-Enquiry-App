import * as mockApi from '../utils/mockData';

const API_URL = import.meta.env.VITE_API_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const OFFLINE_QUEUE_KEY = 'enquiries_offline_queue';

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
  } catch(e) { return []; }
};

const saveOfflineQueue = (queue) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const enqueueRequest = (endpoint, method, data) => {
  const queue = getOfflineQueue();
  queue.push({ endpoint, method, data, timestamp: Date.now() });
  saveOfflineQueue(queue);
  window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: queue }));
};

export const processOfflineQueue = async () => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  
  let successCount = 0;
  // Create a copy of the queue and clear the storage, 
  // so concurrent requests don't mess it up
  saveOfflineQueue([]);
  let failed = [];

  for (let i = 0; i < queue.length; i++) {
    const req = queue[i];
    try {
      const url = new URL(API_URL);
      url.searchParams.append('endpoint', req.endpoint);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ method: req.method, payload: req.data }),
      });
      
      if (!response.ok) throw new Error('Sync failed');
      const result = await response.json();
      if (result && result.success === false) throw new Error(result.error);
      
      successCount++;
    } catch (err) {
      // Put it back in the failed list to retry later
      failed.push(req);
    }
  }

  // Restore failed items
  if (failed.length > 0) {
    const currentQueue = getOfflineQueue();
    saveOfflineQueue([...failed, ...currentQueue]);
  }
  
  window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: getOfflineQueue() }));
  return successCount;
};

window.addEventListener('online', processOfflineQueue);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const request = async (endpoint, method = 'GET', data = null, _retryCount = 0) => {
  if (USE_MOCK) {
    if (endpoint === 'enquiries' && method === 'GET') return mockApi.getEnquiries();
    if (endpoint.startsWith('enquiry/') && method === 'GET') return mockApi.getEnquiryById(endpoint.split('/')[1]);
    if (endpoint === 'enquiries' && method === 'POST') return mockApi.saveEnquiry(data);
    if (endpoint.startsWith('enquiry/') && method === 'DELETE') return mockApi.deleteEnquiry(endpoint.split('/')[1]);
    if (endpoint === 'enquiries/batch-delete' && method === 'POST') return mockApi.deleteEnquiries(data.ids);
    if (endpoint.startsWith('enquiry/') && method === 'PATCH') return mockApi.updateEnquiryStatus(endpoint.split('/')[1], data.status);
    return { success: true, data };
  }

  // Real backend call (all methods tunnelled as HTTP POST)
  try {
    const url = new URL(API_URL);
    url.searchParams.append('endpoint', endpoint);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ method, payload: data }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Google Apps Script returned a caught error
    if (result && result.success === false) {
      const errMsg = result.error || 'Unknown backend error';
      // LockService timeout → auto-retry with backoff
      if (_retryCount < MAX_RETRIES && errMsg.toLowerCase().includes('busy')) {
        await sleep(RETRY_DELAY_MS * (_retryCount + 1));
        return request(endpoint, method, data, _retryCount + 1);
      }
      throw new Error(errMsg);
    }

    return result;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      // Offline Mode!
      if (method !== 'GET') {
        enqueueRequest(endpoint, method, data);
        console.warn('Network error. Request queued for offline sync:', endpoint);
        return { success: true, _queued: true }; // Fake success for UI
      }
      throw new Error('Network error – please check your internet connection.');
    }
    console.error('API Request failed:', error);
    throw error;
  }
};

export const getEnquiries        = ()           => request('enquiries', 'GET');
export const getEnquiryById      = (id)         => request(`enquiry/${id}`, 'GET');
export const createEnquiry       = (data)       => request('enquiries', 'POST', data);
export const updateEnquiry       = (id, data)   => request(`enquiry/${id}`, 'PUT', data);
export const updateEnquiryStatus = (id, status) => request(`enquiry/${id}`, 'PATCH', { status });
export const deleteEnquiry       = (id)         => request(`enquiry/${id}`, 'DELETE');
export const deleteEnquiries     = (ids)        => request('enquiries/batch-delete', 'POST', { ids });

// Kept for future use – not yet wired to a backend endpoint
export const addProduct    = (data) => request('products', 'POST', data);
export const updateProduct = (data) => request(`product/${data.product_id}`, 'PUT', data);
export const deleteProduct = (id)   => request(`product/${id}`, 'DELETE');

export const uploadImage = async (fileBase64, type) => {
  if (USE_MOCK) return fileBase64; // return base64 as-is in mock mode
  // Notice we don't queue 'upload' requests because they're part of enquiry creation flow,
  // but if the network drops here, the upload fails and the user gets a warning.
  // Ideally, images are encoded into the data payload if offline. 
  // For this app, images are uploaded PRE-SAVE. 
  return request('upload', 'POST', { file: fileBase64, type });
};

export const deleteImages = async (urls) => {
  if (USE_MOCK || !urls || urls.length === 0) return { success: true };
  return request('delete-images', 'POST', { urls });
};
