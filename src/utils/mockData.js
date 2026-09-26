// utils/mockData.js

const ENQUIRIES_KEY = 'exhibition_enquiries';

export const getEnquiries = () => {
  const data = localStorage.getItem(ENQUIRIES_KEY);
  if (!data) return generateMockData();
  return JSON.parse(data);
};

export const saveEnquiry = (enquiry) => {
  const enquiries = getEnquiries();
  
  if (enquiry.enquiry_id) {
    // Update existing
    const index = enquiries.findIndex(e => e.enquiry_id === enquiry.enquiry_id);
    if (index !== -1) {
      enquiries[index] = { ...enquiry, updated_at: new Date().toISOString() };
    }
  } else {
    // Create new
    const newEnquiry = {
      ...enquiry,
      enquiry_id: `ENQ-${Date.now()}`,
      business_card_url_2: enquiry.business_card_url_2 || null,
      advance_amount: enquiry.advance_amount || '',
      payment_mode: enquiry.payment_mode || '',
      payment_mode_custom: enquiry.payment_mode_custom || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'New'
    };
    enquiries.unshift(newEnquiry); // add to top
  }
  
  localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));
  return true;
};

export const getEnquiryById = (id) => {
  const enquiries = getEnquiries();
  return enquiries.find(e => e.enquiry_id === id);
};

/**
 * Delete one enquiry by ID.
 */
export const deleteEnquiry = (id) => {
  const enquiries = getEnquiries();
  const updated = enquiries.filter(e => e.enquiry_id !== id);
  localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(updated));
  return true;
};

/**
 * Delete multiple enquiries by array of IDs.
 */
export const deleteEnquiries = (ids) => {
  const set = new Set(ids);
  const enquiries = getEnquiries();
  const updated = enquiries.filter(e => !set.has(e.enquiry_id));
  localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(updated));
  return true;
};

// Generate some initial mock data if localStorage is empty
const generateMockData = () => {
  const mockData = [
    {
      enquiry_id: 'ENQ-1001',
      customer_name: 'Rahul Sharma',
      mobile: '9876543210',
      business_name: 'Sharma Jewellers',
      address: 'Mumbai',
      business_card_url: null,
      general_notes: 'Looking for modern designs.',
      event_name: 'Gems & Jewellery Expo 2026',
      created_by: 'Staff 1',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'Follow Up',
      products: [
        {
          product_id: 'PRD-1',
          photo_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80&w=400',
          description: 'Diamond Necklace Set',
          quantity: '2',
          unit: 'set',
          weight: '150g',
          notes: 'Customer wants matching earrings'
        }
      ]
    }
  ];
  localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(mockData));
  return mockData;
};
