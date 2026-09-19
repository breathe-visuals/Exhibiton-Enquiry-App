const SPREADSHEET_ID = '1uLjPw-BZDsL9U9eCBeYpH-OpB3tC83spIjCATkJTWPI';
const BUSINESS_CARD_FOLDER_ID = '1-YN7EGNGuasPAqUhtchaL-9UvBRVuD33';
const PRODUCT_IMAGE_FOLDER_ID = '1qVqxdwMrLMFUSDAbZemHigf6Y2X4rMnS';

function doPost(e) {
  try {
    const endpoint = e.parameter.endpoint;
    const requestData = JSON.parse(e.postData.contents);
    const method = requestData.method;
    const payload = requestData.payload;

    let responseData = null;

    if (endpoint === 'upload' && method === 'POST') {
      responseData = handleUpload(payload);
    } else if (endpoint === 'enquiries' && method === 'POST') {
      responseData = createEnquiry(payload);
    } else if (endpoint === 'enquiries' && method === 'GET') {
      responseData = getEnquiries();
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'GET') {
      const id = endpoint.split('/')[1];
      responseData = getEnquiryById(id);
    } else {
      throw new Error("Invalid endpoint or method");
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message, success: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (though we route most via POST to avoid CORS issues)
function doGet(e) {
  try {
    const endpoint = e.parameter.endpoint;
    let responseData = null;
    
    if (endpoint === 'enquiries') {
      responseData = getEnquiries();
    } else if (endpoint && endpoint.startsWith('enquiry/')) {
      const id = endpoint.split('/')[1];
      responseData = getEnquiryById(id);
    } else {
       return ContentService.createTextOutput("App Backend is running.").setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message, success: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensure CORS headers (Apps Script does this automatically for ContentService, but good practice)
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// --- Upload Logic ---
function handleUpload(payload) {
  const { file, type } = payload;
  // file is a base64 string like "data:image/jpeg;base64,..."
  
  if (!file) throw new Error("No file provided");

  const folderId = type === 'business_card' ? BUSINESS_CARD_FOLDER_ID : PRODUCT_IMAGE_FOLDER_ID;
  const folder = DriveApp.getFolderById(folderId);

  const splitBase = file.split(',');
  const contentType = splitBase[0].split(';')[0].split(':')[1];
  const base64Data = splitBase[1];

  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `image_${new Date().getTime()}`);
  const savedFile = folder.createFile(blob);
  
  // Set file sharing to anyone with the link can view (so frontend can show it)
  savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return savedFile.getDownloadUrl().replace('&export=download', ''); 
  // or savedFile.getUrl() for the viewer page
}

// --- Database Logic ---
function getSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Auto-create if it doesn't exist
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Enquiries') {
      sheet.appendRow(['enquiry_id', 'customer_name', 'mobile', 'business_name', 'address', 'business_card_url', 'general_notes', 'event_name', 'created_by', 'created_at', 'status']);
    } else if (sheetName === 'Products') {
      sheet.appendRow(['product_id', 'enquiry_id', 'photo_url', 'description', 'quantity', 'unit', 'weight', 'purity_material', 'customer_requirement', 'created_at']);
    }
  }
  return sheet;
}

function uploadAndGetUrl(base64Str, type) {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  
  const folderId = type === 'business_card' ? BUSINESS_CARD_FOLDER_ID : PRODUCT_IMAGE_FOLDER_ID;
  const folder = DriveApp.getFolderById(folderId);

  const splitBase = base64Str.split(',');
  const contentType = splitBase[0].split(';')[0].split(':')[1];
  const base64Data = splitBase[1];

  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `image_${new Date().getTime()}`);
  const savedFile = folder.createFile(blob);
  savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return savedFile.getDownloadUrl().replace('&export=download', ''); 
}

function createEnquiry(enquiry) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  if (enquiry.business_card_url && enquiry.business_card_url.startsWith('data:image')) {
    enquiry.business_card_url = uploadAndGetUrl(enquiry.business_card_url, 'business_card');
  }
  
  if (enquiry.products && enquiry.products.length > 0) {
    enquiry.products.forEach(p => {
      if (p.photo_url && p.photo_url.startsWith('data:image')) {
        p.photo_url = uploadAndGetUrl(p.photo_url, 'product');
      }
    });
  }
  
  // Save to Enquiries sheet
  const enquiriesSheet = getSheet(ss, 'Enquiries');
  const now = new Date().toISOString();
  const enquiryId = enquiry.enquiry_id || `ENQ-${new Date().getTime()}`;
  
  enquiriesSheet.appendRow([
    enquiryId,
    enquiry.customer_name || '',
    enquiry.mobile || '',
    enquiry.business_name || '',
    enquiry.address || '',
    enquiry.business_card_url || '',
    enquiry.general_notes || '',
    enquiry.event_name || '',
    enquiry.created_by || 'Unknown',
    now,
    enquiry.status || 'New'
  ]);
  
  // Save products to Products sheet
  if (enquiry.products && enquiry.products.length > 0) {
    const productsSheet = getSheet(ss, 'Products');
    const rows = enquiry.products.map(p => [
      p.product_id || `PRD-${new Date().getTime()}-${Math.floor(Math.random()*1000)}`,
      enquiryId,
      p.photo_url || '',
      p.description || '',
      p.quantity || '',
      p.unit || '',
      p.weight || '',
      p.purity_material || '',
      p.customer_requirement || '',
      now
    ]);
    productsSheet.getRange(productsSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { success: true, enquiry_id: enquiryId };
}

function getEnquiries() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const enquiriesSheet = getSheet(ss, 'Enquiries');
  const productsSheet = getSheet(ss, 'Products');
  
  const enquiriesData = getSheetDataAsObjects(enquiriesSheet);
  const productsData = getSheetDataAsObjects(productsSheet);
  
  // Group products by enquiry_id
  const productsByEnquiry = {};
  productsData.forEach(p => {
    if (!productsByEnquiry[p.enquiry_id]) {
      productsByEnquiry[p.enquiry_id] = [];
    }
    productsByEnquiry[p.enquiry_id].push(p);
  });
  
  // Attach products to enquiries
  enquiriesData.forEach(e => {
    e.products = productsByEnquiry[e.enquiry_id] || [];
  });
  
  // Sort by created_at descending
  return enquiriesData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getEnquiryById(enquiryId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const enquiriesSheet = getSheet(ss, 'Enquiries');
  const productsSheet = getSheet(ss, 'Products');
  
  const enquiriesData = getSheetDataAsObjects(enquiriesSheet);
  const enquiry = enquiriesData.find(e => e.enquiry_id === enquiryId);
  
  if (!enquiry) {
    throw new Error("Enquiry not found");
  }
  
  const productsData = getSheetDataAsObjects(productsSheet);
  enquiry.products = productsData.filter(p => p.enquiry_id === enquiryId);
  
  return enquiry;
}

// Utility function to turn Sheet data into JS objects
function getSheetDataAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Empty or just headers
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}
