import * as mockApi from '../utils/mockData';

const API_URL = import.meta.env.VITE_API_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const request = async (endpoint, method = 'GET', data = null) => {
  if (USE_MOCK) {
    console.log(`[Mock API] ${method} ${endpoint}`, data);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
      // For GET requests, we can either pass params in URL or still use POST. 
      // Using POST for GAS is safer to avoid CORS preflight issues sometimes, but let's stick to standard fetch.
      // We will just use POST for everything to GAS to simplify CORS unless strictly designed otherwise.
      // Assuming a standard POST wrapper:
      options.body = JSON.stringify({ method: 'GET', payload: null });
    }

    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Google Apps Script returned a caught error
    if (result && result.success === false) {
      throw new Error(result.error || "Unknown backend error");
    }
    
    return result;
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
};

export const getEnquiries = () => request('enquiries', 'GET');
export const getEnquiryById = (id) => request(`enquiry/${id}`, 'GET');
export const createEnquiry = (data) => request('enquiries', 'POST', data);
export const updateEnquiry = (data) => request(`enquiry/${data.enquiry_id}`, 'PUT', data);
export const addProduct = (data) => request('products', 'POST', data);
export const updateProduct = (data) => request(`product/${data.product_id}`, 'PUT', data);
export const deleteProduct = (id) => request(`product/${id}`, 'DELETE');

export const uploadImage = async (fileBase64, type) => {
  if (USE_MOCK) {
    return fileBase64; // just return the base64 string as URL for mock
  }
  return request('upload', 'POST', { file: fileBase64, type });
};
