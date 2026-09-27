import * as mockApi from '../utils/mockData';

const API_URL = import.meta.env.VITE_API_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const request = async (endpoint, method = 'GET', data = null, _retryCount = 0) => {
  if (USE_MOCK) {
    // No artificial delay — localStorage is synchronous, instant response
    // Simple mock router
    if (endpoint === 'enquiries' && method === 'GET') {
      return mockApi.getEnquiries();
    }
    if (endpoint.startsWith('enquiry/') && method === 'GET') {
      const id = endpoint.split('/')[1];
      return mockApi.getEnquiryById(id);
    }
    if (endpoint === 'enquiries' && method === 'POST') {
      return mockApi.saveEnquiry(data);
    }
    if (endpoint.startsWith('enquiry/') && method === 'DELETE') {
      const id = endpoint.split('/')[1];
      return mockApi.deleteEnquiry(id);
    }
    if (endpoint === 'enquiries/batch-delete' && method === 'POST') {
      return mockApi.deleteEnquiries(data.ids);
    }
    // For other endpoints, mock them returning success for now
    return { success: true, data };
  }

  // Real backend call
  try {
    const url = new URL(API_URL);
    url.searchParams.append('endpoint', endpoint);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        method,
        payload: data
      })
    };

    if (method === 'GET') {
      options.body = JSON.stringify({ method: 'GET', payload: null });
    }

    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Google Apps Script returned a caught error
    if (result && result.success === false) {
      const errMsg = result.error || 'Unknown backend error';
      // Server busy (LockService timeout) — retry automatically
      if (_retryCount < MAX_RETRIES && errMsg.toLowerCase().includes('busy')) {
        await sleep(RETRY_DELAY_MS * (_retryCount + 1));
        return request(endpoint, method, data, _retryCount + 1);
      }
      throw new Error(errMsg);
    }
    
    return result;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const getEnquiries = () => request('enquiries', 'GET');
export const getEnquiryById = (id) => request(`enquiry/${id}`, 'GET');
export const createEnquiry = (data) => request('enquiries', 'POST', data);
export const updateEnquiry = (data) => request(`enquiry/${data.enquiry_id}`, 'PUT', data);
export const deleteEnquiry = (id) => request(`enquiry/${id}`, 'DELETE');
export const deleteEnquiries = (ids) => request('enquiries/batch-delete', 'POST', { ids });
export const addProduct = (data) => request('products', 'POST', data);
export const updateProduct = (data) => request(`product/${data.product_id}`, 'PUT', data);
export const deleteProduct = (id) => request(`product/${id}`, 'DELETE');

export const uploadImage = async (fileBase64, type) => {
  if (USE_MOCK) {
    return fileBase64; // just return the base64 string as URL for mock
  }
  return request('upload', 'POST', { file: fileBase64, type });
};
