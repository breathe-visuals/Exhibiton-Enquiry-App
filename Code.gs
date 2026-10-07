// ---------------------------------------------------------------------------
//  Exhibition Enquiry App � Google Apps Script Backend
//  Multi-user safe: uses LockService on all writes + random IDs to prevent
//  race conditions when multiple users submit enquiries simultaneously.
// ---------------------------------------------------------------------------

const SPREADSHEET_ID          = '1uLjPw-BZDsL9U9eCBeYpH-OpB3tC83spIjCATkJTWPI';
const BUSINESS_CARD_FOLDER_ID = '1-YN7EGNGuasPAqUhtchaL-9UvBRVuD33';
const PRODUCT_IMAGE_FOLDER_ID = '1qVqxdwMrLMFUSDAbZemHigf6Y2X4rMnS';

// How long (ms) to wait for a write lock before giving up
const LOCK_TIMEOUT_MS = 30000;

// --- Safety limits -----------------------------------------------------------
// Max base64 payload per image (~2 MB decoded → ~2.7 MB base64)
const MAX_IMAGE_B64_CHARS = 3600000;
// Max products per enquiry
const MAX_PRODUCTS = 20;
// Valid enquiry statuses
const VALID_STATUSES = ['New', 'Follow Up', 'Closed'];

// --- ID Generation ------------------------------------------------------------
// timestamp + 6-digit random to avoid collisions between concurrent requests
function generateId(prefix) {
  var ts   = new Date().getTime();
  var rand = Math.floor(Math.random() * 900000 + 100000);
  return prefix + '-' + ts + '-' + rand;
}

// --- Response helpers ---------------------------------------------------------
function okResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errResponse(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Router -------------------------------------------------------------------
function doPost(e) {
  try {
    var endpoint    = e.parameter.endpoint;
    var requestData = JSON.parse(e.postData.contents);
    var method      = requestData.method;
    var payload     = requestData.payload;
    var result      = null;

    if (endpoint === 'upload' && method === 'POST') {
      result = handleUpload(payload);
    } else if (endpoint === 'enquiries' && method === 'GET') {
      result = getEnquiries();
    } else if (endpoint === 'enquiries' && method === 'POST') {
      result = createEnquiry(payload);
    } else if (endpoint === 'delete-images' && method === 'POST') {
      result = handleDeleteImages(payload);
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'PUT') {
      result = updateEnquiry(endpoint.split('/')[1], payload);
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'GET') {
      result = getEnquiryById(endpoint.split('/')[1]);
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'DELETE') {
      result = deleteEnquiry(endpoint.split('/')[1]);
    } else if (endpoint === 'enquiries/batch-delete' && method === 'POST') {
      result = batchDeleteEnquiries(payload.ids);
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'PATCH') {
      result = updateEnquiryStatus(endpoint.split('/')[1], payload.status);
    } else {
      return errResponse('Invalid endpoint or method');
    }

    return okResponse(result);
  } catch (error) {
    var errMsg   = error.message || 'Internal server error';
    var errStack = error.stack   || '(no stack)';
    // Log full detail server-side only; never expose stack traces to clients
    Logger.log('[ERROR] doPost: ' + errMsg + '\n' + errStack);
    return errResponse(errMsg);
  }
}

function doGet(e) {
  try {
    var endpoint = e.parameter.endpoint;
    if (!endpoint) {
      return ContentService
        .createTextOutput('Exhibition Enquiry App backend is running.')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    if (endpoint === 'enquiries') return okResponse(getEnquiries());
    if (endpoint.startsWith('enquiry/')) return okResponse(getEnquiryById(endpoint.split('/')[1]));
    return errResponse('Not found');
  } catch (error) {
    Logger.log('doGet error: ' + error.message);
    return errResponse(error.message);
  }
}

// --- Sheet helpers ------------------------------------------------------------
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Enquiries') {
      sheet.appendRow([
        'enquiry_id','customer_name','mobile','business_name','address',
        'business_card_url','business_card_url_2','advance_amount',
        'payment_mode','payment_mode_custom','general_notes','event_name',
        'created_by','created_at','updated_at','status'
      ]);
    } else if (sheetName === 'Products') {
      sheet.appendRow([
        'product_id','enquiry_id','photo_url','description',
        'quantity','unit','weight','purity_material',
        'size','customer_requirement','notes','created_at'
      ]);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// --- Image upload -------------------------------------------------------------
function handleUpload(payload) {
  var file = payload.file;
  var type = payload.type;
  if (!file) throw new Error('No file provided');
  var folderId = type === 'business_card' ? BUSINESS_CARD_FOLDER_ID : PRODUCT_IMAGE_FOLDER_ID;
  return _uploadBase64(file, folderId);
}

function _uploadBase64(base64Str, folderId) {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  var parts       = base64Str.split(',');
  var contentType = parts[0].split(';')[0].split(':')[1];
  var base64Data  = parts[1];
  var ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  var blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    contentType,
    'img_' + generateId('f') + '.' + ext
  );
  var folder    = DriveApp.getFolderById(folderId);
  var savedFile = folder.createFile(blob);

  // setSharing can fail if the Google Workspace domain restricts external
  // sharing. Wrap in try-catch so the upload always succeeds and returns
  // a URL even when public sharing is blocked by an org policy.
  try {
    savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingErr) {
    Logger.log('setSharing skipped (domain restriction?): ' + sharingErr.message);
    // File is still accessible to the script owner - images will load in
    // the app as long as the user is signed into the same Google account.
  }

  return 'https://drive.google.com/thumbnail?id=' + savedFile.getId() + '&sz=w1000';
}
var _newlyUploadedUrls = [];

function _maybeUpload(val, type) {
  if (!val || typeof val !== 'string') return '';  // guard non-string / null
  if (val.startsWith('data:image')) {
    // Enforce size limit before hitting Drive to prevent execution timeouts
    if (val.length > MAX_IMAGE_B64_CHARS) {
      throw new Error('Image is too large (max ~2 MB). Please compress it before uploading.');
    }
    var folderId = type === 'business_card' ? BUSINESS_CARD_FOLDER_ID : PRODUCT_IMAGE_FOLDER_ID;
    var url = _uploadBase64(val, folderId);
    _newlyUploadedUrls.push(url);
    return url;
  }
  return val; // already a Drive URL - pass through, no DriveApp call
}

// --- Input validation ---------------------------------------------------------
function _validateEnquiry(enquiry) {
  if (!enquiry || typeof enquiry !== 'object') {
    throw new Error('Invalid payload: expected an enquiry object.');
  }
  var name   = String(enquiry.customer_name || '').trim();
  var mobile = String(enquiry.mobile        || '').trim();
  if (!name)   throw new Error('customer_name is required.');
  if (!mobile) throw new Error('mobile is required.');
  if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) {
    throw new Error('mobile must be 7-20 digits (numbers, +, -, spaces, parentheses).');
  }
  var products = enquiry.products || [];
  if (!Array.isArray(products)) throw new Error('products must be an array.');
  if (products.length > MAX_PRODUCTS) {
    throw new Error('Too many products (max ' + MAX_PRODUCTS + ' per enquiry).');
  }
  if (enquiry.status && VALID_STATUSES.indexOf(enquiry.status) === -1) {
    throw new Error('Invalid status: ' + enquiry.status);
  }
}

// --- Sanitise a single text field (trim + strip control chars) ----------------
function _sanitise(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// --- Create Enquiry (with write lock) -----------------------------------------
function createEnquiry(enquiry) {
  _newlyUploadedUrls = []; // reset per-invocation tracker
  // 1. Validate inputs before touching Drive or Sheets
  _validateEnquiry(enquiry);

  // NOTE: The frontend pre-uploads all images via /upload before calling this.
  // _maybeUpload here is a safety net only – if the value is already a Drive URL
  // it is returned as-is (no DriveApp call). If it's somehow still base64 it
  // will upload now. Either way, no DriveApp call occurs for normal Drive URLs.
  var bcUrl1   = _maybeUpload(enquiry.business_card_url,   'business_card');
  var bcUrl2   = _maybeUpload(enquiry.business_card_url_2, 'business_card');
  var products = (enquiry.products || []).map(function(p) {
    return Object.assign({}, p, { photo_url: _maybeUpload(p.photo_url, 'product') });
  });
  Logger.log('createEnquiry: bcUrl1=' + (bcUrl1 ? 'set' : 'empty') + ' bcUrl2=' + (bcUrl2 ? 'set' : 'empty') + ' products=' + products.length);

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
  } catch (lockErr) {
    throw new Error('Server is busy with another request. Please try again in a moment.');
  }

  try {
    var ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
    var enquiriesSheet = getOrCreateSheet(ss, 'Enquiries');
    var productsSheet  = getOrCreateSheet(ss, 'Products');
    var now            = new Date().toISOString();
    var enquiryId      = enquiry.enquiry_id || generateId('ENQ');

    // 2. Duplicate guard: reject if this enquiry_id already exists in the sheet
    var existing = sheetToObjects(enquiriesSheet);
    for (var d = 0; d < existing.length; d++) {
      if (String(existing[d].enquiry_id) === String(enquiryId)) {
        Logger.log('Duplicate enquiry_id rejected: ' + enquiryId);
        // Return success silently - the frontend already has the data
        return { success: true, enquiry_id: enquiryId, duplicate: true };
      }
    }

    // 3. Write to Sheets - if this throws, the catch block cleans up Drive files
    enquiriesSheet.appendRow([
      enquiryId,
      _sanitise(enquiry.customer_name),
      _sanitise(enquiry.mobile),
      _sanitise(enquiry.business_name),
      _sanitise(enquiry.address),
      bcUrl1,
      bcUrl2,
      _sanitise(enquiry.advance_amount),
      _sanitise(enquiry.payment_mode),
      _sanitise(enquiry.payment_mode_custom),
      _sanitise(enquiry.general_notes),
      _sanitise(enquiry.event_name),
      _sanitise(enquiry.created_by) || 'Unknown',
      now,                            // created_at  (col 14)
      now,                            // updated_at  (col 15)
      enquiry.status || 'New',        // status      (col 16)
    ]);

    if (products.length > 0) {
      var rows = products.map(function(p) {
        return [
          p.product_id           || generateId('PRD'),
          enquiryId,
          p.photo_url            || '',
          p.description          || '',
          p.quantity             || '',
          p.unit                 || '',
          p.weight               || '',
          p.purity_material      || '',
          p.size                 || '',   // size  (col 9)
          p.customer_requirement || '',   // customer_requirement  (col 10)
          p.notes                || '',   // notes  (col 11)
          now,                           // created_at  (col 12)
        ];
      });
      productsSheet
        .getRange(productsSheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }

    SpreadsheetApp.flush(); // commit before releasing lock
    return { success: true, enquiry_id: enquiryId };

  } catch (writeErr) {
    // 4. Orphan cleanup: Sheets write failed → trash ONLY Drive files uploaded by THIS script execution
    Logger.log('[ERROR] createEnquiry Sheets write failed: ' + writeErr.message + ' — cleaning up ' + _newlyUploadedUrls.length + ' newly uploaded Drive file(s)');
    try { _deleteDriveImages(_newlyUploadedUrls); } catch (_) { /* best-effort */ }
    throw writeErr; // re-throw so the client sees the real error

  } finally {
    lock.releaseLock();
  }
}

// --- Update Enquiry (with write lock) -----------------------------------------
function updateEnquiry(enquiryId, enquiry) {
  _newlyUploadedUrls = []; // reset per-invocation tracker
  if (!enquiryId) throw new Error('Missing enquiry ID.');
  _validateEnquiry(enquiry);

  var bcUrl1   = _maybeUpload(enquiry.business_card_url,   'business_card');
  var bcUrl2   = _maybeUpload(enquiry.business_card_url_2, 'business_card');
  var products = (enquiry.products || []).map(function(p) {
    return Object.assign({}, p, { photo_url: _maybeUpload(p.photo_url, 'product') });
  });

  // Collect ALL drive URLs currently in the payload so we can diff later
  var uploadedUrls = [];
  if (bcUrl1 && String(bcUrl1).indexOf('drive.google.com') !== -1) uploadedUrls.push(String(bcUrl1));
  if (bcUrl2 && String(bcUrl2).indexOf('drive.google.com') !== -1) uploadedUrls.push(String(bcUrl2));
  products.forEach(function(p) {
    if (p.photo_url && String(p.photo_url).indexOf('drive.google.com') !== -1) {
      uploadedUrls.push(String(p.photo_url));
    }
  });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
  } catch (lockErr) {
    throw new Error('Server is busy with another request. Please try again in a moment.');
  }

  try {
    var ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
    var enquiriesSheet = getOrCreateSheet(ss, 'Enquiries');
    var productsSheet  = getOrCreateSheet(ss, 'Products');
    var now            = new Date().toISOString();

    var data  = enquiriesSheet.getDataRange().getValues();
    if (data.length <= 1) throw new Error('Enquiry not found: ' + enquiryId);
    
    var headers = data[0];
    var idCol   = headers.indexOf('enquiry_id');
    var rowIndex = -1;
    var createdAt = now;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(enquiryId)) {
        rowIndex = i + 1;
        createdAt = data[i][headers.indexOf('created_at')] || now;
        break;
      }
    }

    if (rowIndex === -1) {
       throw new Error('Enquiry not found: ' + enquiryId);
    }

    // Capture old state to calculate which Drive images to trash
    var oldBc1 = data[rowIndex - 1][headers.indexOf('business_card_url')];
    var oldBc2 = data[rowIndex - 1][headers.indexOf('business_card_url_2')];
    
    var oldProductsData = sheetToObjects(productsSheet).filter(function(p) {
      return String(p.enquiry_id) === String(enquiryId);
    });

    var oldDriveUrls = [];
    if (oldBc1 && String(oldBc1).indexOf('drive.google.com') !== -1) oldDriveUrls.push(String(oldBc1));
    if (oldBc2 && String(oldBc2).indexOf('drive.google.com') !== -1) oldDriveUrls.push(String(oldBc2));
    oldProductsData.forEach(function(p) {
      if (p.photo_url && String(p.photo_url).indexOf('drive.google.com') !== -1) {
        oldDriveUrls.push(String(p.photo_url));
      }
    });

    // We have uploadedUrls which represents ALL Drive images in the incoming payload.
    // Diff: Any url in oldDriveUrls that is NOT in uploadedUrls has been deleted/replaced.
    var urlsToTrash = [];
    oldDriveUrls.forEach(function(oldUrl) {
      if (uploadedUrls.indexOf(oldUrl) === -1) {
        urlsToTrash.push(oldUrl);
      }
    });

    var rowData = [
      enquiryId,
      _sanitise(enquiry.customer_name),
      _sanitise(enquiry.mobile),
      _sanitise(enquiry.business_name),
      _sanitise(enquiry.address),
      bcUrl1,
      bcUrl2,
      _sanitise(enquiry.advance_amount),
      _sanitise(enquiry.payment_mode),
      _sanitise(enquiry.payment_mode_custom),
      _sanitise(enquiry.general_notes),
      _sanitise(enquiry.event_name),
      _sanitise(enquiry.created_by) || 'Unknown',
      createdAt,
      now,
      enquiry.status || 'New',
    ];

    enquiriesSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);

    // Update products: delete old ones, insert new ones
    _deleteRowsById(ss, 'Products', 'enquiry_id', [enquiryId]);

    if (products.length > 0) {
      var prodRows = products.map(function(p) {
        return [
          p.product_id || generateId('PRD'),
          enquiryId,
          p.photo_url || '',
          _sanitise(p.description),
          _sanitise(p.quantity),
          _sanitise(p.unit),
          _sanitise(p.weight),
          _sanitise(p.purity_material),
          _sanitise(p.size) || '',
          _sanitise(p.customer_requirement),
          _sanitise(p.notes),
          now
        ];
      });
      productsSheet
        .getRange(productsSheet.getLastRow() + 1, 1, prodRows.length, prodRows[0].length)
        .setValues(prodRows);
    }

    SpreadsheetApp.flush();
    
    // Trash obsolete images
    if (urlsToTrash.length > 0) {
      try { _deleteDriveImages(urlsToTrash); } catch (e) { Logger.log("Error trashing obsolete images: " + e); }
    }

    return { success: true, enquiry_id: enquiryId };

  } catch (writeErr) {
    Logger.log('[ERROR] updateEnquiry Sheets write failed: ' + writeErr.message);
    try { _deleteDriveImages(_newlyUploadedUrls); } catch (_) { }
    throw writeErr;
  } finally {
    lock.releaseLock();
  }
}

// --- Read all Enquiries --------------------------------------------------------
function getEnquiries() {
  var ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
  var enquiriesSheet = getOrCreateSheet(ss, 'Enquiries');
  var productsSheet  = getOrCreateSheet(ss, 'Products');

  var enquiriesData = sheetToObjects(enquiriesSheet);
  var productsData  = sheetToObjects(productsSheet);

  // Group products by enquiry_id (O(n) map instead of O(n�) nested filter)
  var productMap = {};
  productsData.forEach(function(p) {
    var id = String(p.enquiry_id);
    if (!productMap[id]) productMap[id] = [];
    productMap[id].push(p);
  });

  enquiriesData.forEach(function(e) {
    e.products = productMap[String(e.enquiry_id)] || [];
  });

  return enquiriesData.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

// --- Read single Enquiry ------------------------------------------------------
function getEnquiryById(enquiryId) {
  var ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
  var enquiriesSheet = getOrCreateSheet(ss, 'Enquiries');
  var productsSheet  = getOrCreateSheet(ss, 'Products');

  var enquiries = sheetToObjects(enquiriesSheet);
  var enquiry   = null;
  for (var i = 0; i < enquiries.length; i++) {
    if (String(enquiries[i].enquiry_id) === String(enquiryId)) {
      enquiry = enquiries[i];
      break;
    }
  }
  if (!enquiry) throw new Error('Enquiry not found: ' + enquiryId);

  enquiry.products = sheetToObjects(productsSheet).filter(function(p) {
    return String(p.enquiry_id) === String(enquiryId);
  });

  return enquiry;
}

// --- Delete single Enquiry (with write lock) ----------------------------------
function deleteEnquiry(enquiryId) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(LOCK_TIMEOUT_MS); }
  catch (_) { throw new Error('Server is busy. Please try again.'); }

  try {
    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var enquiryData = sheetToObjects(getOrCreateSheet(ss, 'Enquiries'));
    var productData = sheetToObjects(getOrCreateSheet(ss, 'Products'));

    var enquiry  = null;
    for (var i = 0; i < enquiryData.length; i++) {
      if (String(enquiryData[i].enquiry_id) === String(enquiryId)) {
        enquiry = enquiryData[i]; break;
      }
    }
    var products = productData.filter(function(p) {
      return String(p.enquiry_id) === String(enquiryId);
    });

    var imageUrls = [];
    if (enquiry) {
      if (enquiry.business_card_url)   imageUrls.push(enquiry.business_card_url);
      if (enquiry.business_card_url_2) imageUrls.push(enquiry.business_card_url_2);
    }
    products.forEach(function(p) { if (p.photo_url) imageUrls.push(p.photo_url); });

    _deleteDriveImages(imageUrls);
    _deleteRowsById(ss, 'Enquiries', 'enquiry_id', [enquiryId]);
    _deleteRowsById(ss, 'Products',  'enquiry_id', [enquiryId]);
    SpreadsheetApp.flush();

    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

// --- Batch delete Enquiries (with write lock) ----------------------------------
function batchDeleteEnquiries(ids) {
  if (!ids || ids.length === 0) return { success: true, deleted: 0 };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(LOCK_TIMEOUT_MS); }
  catch (_) { throw new Error('Server is busy. Please try again.'); }

  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var idSet = {};
    ids.forEach(function(id) { idSet[String(id)] = true; });

    var enquiryData = sheetToObjects(getOrCreateSheet(ss, 'Enquiries'));
    var productData = sheetToObjects(getOrCreateSheet(ss, 'Products'));

    var imageUrls = [];
    enquiryData.forEach(function(e) {
      if (!idSet[String(e.enquiry_id)]) return;
      if (e.business_card_url)   imageUrls.push(e.business_card_url);
      if (e.business_card_url_2) imageUrls.push(e.business_card_url_2);
    });
    productData.forEach(function(p) {
      if (idSet[String(p.enquiry_id)] && p.photo_url) imageUrls.push(p.photo_url);
    });

    _deleteDriveImages(imageUrls);
    _deleteRowsById(ss, 'Enquiries', 'enquiry_id', ids);
    _deleteRowsById(ss, 'Products',  'enquiry_id', ids);
    SpreadsheetApp.flush();

    return { success: true, deleted: ids.length };
  } finally {
    lock.releaseLock();
  }
}

// --- Sheet row deletion helper ------------------------------------------------
function _deleteRowsById(ss, sheetName, colName, values) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers  = data[0];
  var colIndex = headers.indexOf(colName);
  if (colIndex === -1) return;

  var valueSet = {};
  values.forEach(function(v) { valueSet[String(v)] = true; });

  // Walk backwards so row indices stay stable
  for (var i = data.length - 1; i >= 1; i--) {
    if (valueSet[String(data[i][colIndex])]) {
      sheet.deleteRow(i + 1); // +1: Sheets are 1-indexed
    }
  }
}

// --- Drive image deletion -----------------------------------------------------
function _deleteDriveImages(urls) {
  urls.forEach(function(url) {
    try {
      if (!url || typeof url !== 'string') return;
      var fileId = null;
      var qMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (qMatch) fileId = qMatch[1];
      if (!fileId) {
        var dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (dMatch) fileId = dMatch[1];
      }
      if (!fileId) return;
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {
      Logger.log('_deleteDriveImages skipped: ' + url + ' | ' + e.message);
    }
  });
}

// --- Update Enquiry Status (with write lock) ----------------------------------
function updateEnquiryStatus(enquiryId, newStatus) {
  var VALID_STATUSES = ['New', 'Follow Up', 'Closed'];
  if (!enquiryId) throw new Error('Missing enquiry ID.');
  if (!newStatus || VALID_STATUSES.indexOf(newStatus) === -1) {
    throw new Error('Invalid status value: ' + newStatus);
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(LOCK_TIMEOUT_MS); }
  catch (_) { throw new Error('Server is busy. Please try again.'); }

  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getOrCreateSheet(ss, 'Enquiries');
    var data  = sheet.getDataRange().getValues();

    if (data.length <= 1) throw new Error('Enquiry not found: ' + enquiryId);

    var headers  = data[0];
    var idCol    = headers.indexOf('enquiry_id');
    var statCol  = headers.indexOf('status');
    if (idCol === -1 || statCol === -1) throw new Error('Sheet schema error: missing columns.');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(enquiryId)) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }
    if (rowIndex === -1) throw new Error('Enquiry not found: ' + enquiryId);

    sheet.getRange(rowIndex, statCol + 1).setValue(newStatus);
    SpreadsheetApp.flush();

    return { success: true, enquiry_id: enquiryId, status: newStatus };
  } finally {
    lock.releaseLock();
  }
}

// --- DEBUG: Test createEnquiry with a dummy payload --------------------------
// Run this manually in the Apps Script editor to verify Sheets write works.
function testCreateEnquiry() {
  var dummy = {
    customer_name:       'Test Customer',
    mobile:              '9999999999',
    business_name:       'Test Biz',
    address:             'Test Address',
    business_card_url:   '',
    business_card_url_2: '',
    advance_amount:      '',
    payment_mode:        'Cash',
    payment_mode_custom: '',
    general_notes:       'debug test',
    event_name:          'Test Event',
    created_by:          'Debug',
    status:              'New',
    products:            []
  };
  try {
    var result = createEnquiry(dummy);
    Logger.log('testCreateEnquiry SUCCESS: ' + JSON.stringify(result));
  } catch(e) {
    Logger.log('testCreateEnquiry FAILED: ' + e.message + '\n' + (e.stack || ''));
  }
}

function handleDeleteImages(payload) {
  var urls = payload.urls || [];
  var count = _deleteDriveImages(urls);
  return { success: true, trashed: count };
}
