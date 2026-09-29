import * as mockApi from '../utils/mockData';

const API_URL = import.meta.env.VITE_API_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

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
      throw new Error('Network error – please check your internet connection.');
    }
    console.error('API Request failed:', error);
    throw error;
  }
};

export const getEnquiries        = ()           => request('enquiries', 'GET');
export const getEnquiryById      = (id)         => request(`enquiry/${id}`, 'GET');
export const createEnquiry       = (data)       => request('enquiries', 'POST', data);
export const updateEnquiryStatus = (id, status) => request(`enquiry/${id}`, 'PATCH', { status });
export const deleteEnquiry       = (id)         => request(`enquiry/${id}`, 'DELETE');
export const deleteEnquiries     = (ids)        => request('enquiries/batch-delete', 'POST', { ids });

// Kept for future use – not yet wired to a backend endpoint
export const addProduct    = (data) => request('products', 'POST', data);
export const updateProduct = (data) => request(`product/${data.product_id}`, 'PUT', data);
export const deleteProduct = (id)   => request(`product/${id}`, 'DELETE');

export const uploadImage = async (fileBase64, type) => {
  if (USE_MOCK) return fileBase64; // return base64 as-is in mock mode
  return request('upload', 'POST', { file: fileBase64, type });
};
