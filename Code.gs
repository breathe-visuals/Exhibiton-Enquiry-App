// ═══════════════════════════════════════════════════════════════════════════
//  Exhibition Enquiry App – Google Apps Script Backend
//  Multi-user safe: uses LockService on all writes + random IDs to prevent
//  race conditions when multiple users submit enquiries simultaneously.
// ═══════════════════════════════════════════════════════════════════════════

const SPREADSHEET_ID          = '1uLjPw-BZDsL9U9eCBeYpH-OpB3tC83spIjCATkJTWPI';
const BUSINESS_CARD_FOLDER_ID = '1-YN7EGNGuasPAqUhtchaL-9UvBRVuD33';
const PRODUCT_IMAGE_FOLDER_ID = '1qVqxdwMrLMFUSDAbZemHigf6Y2X4rMnS';

// How long (ms) to wait for a write lock before giving up
const LOCK_TIMEOUT_MS = 30000;

// ─── ID Generation ────────────────────────────────────────────────────────────
// timestamp + 6-digit random to avoid collisions between concurrent requests
function generateId(prefix) {
  var ts   = new Date().getTime();
  var rand = Math.floor(Math.random() * 900000 + 100000);
  return prefix + '-' + ts + '-' + rand;
}

// ─── Response helpers ─────────────────────────────────────────────────────────
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

// ─── Router ───────────────────────────────────────────────────────────────────
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
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'GET') {
      result = getEnquiryById(endpoint.split('/')[1]);
    } else if (endpoint && endpoint.startsWith('enquiry/') && method === 'DELETE') {
      result = deleteEnquiry(endpoint.split('/')[1]);
    } else if (endpoint === 'enquiries/batch-delete' && method === 'POST') {
      result = batchDeleteEnquiries(payload.ids);
    } else {
      return errResponse('Invalid endpoint or method');
    }

    return okResponse(result);
  } catch (error) {
    Logger.log('doPost error: ' + error.message + '\n' + (error.stack || ''));
    return errResponse(error.message || 'Internal server error');
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

// ─── Sheet helpers ────────────────────────────────────────────────────────────
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Enquiries') {
      sheet.appendRow([
        'enquiry_id','customer_name','mobile','business_name','address',
        'business_card_url','business_card_url_2','advance_amount',
        'payment_mode','payment_mode_custom','general_notes','event_name',
        'created_by','created_at','status'
      ]);
    } else if (sheetName === 'Products') {
      sheet.appendRow([
        'product_id','enquiry_id','photo_url','description',
        'quantity','unit','weight','purity_material',
        'customer_requirement','created_at'
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

// ─── Image upload ─────────────────────────────────────────────────────────────
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
  savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + savedFile.getId() + '&sz=w1000';
}

function _maybeUpload(val, type) {
  if (!val) return '';
  if (val.startsWith('data:image')) {
    var folderId = type === 'business_card' ? BUSINESS_CARD_FOLDER_ID : PRODUCT_IMAGE_FOLDER_ID;
    return _uploadBase64(val, folderId);
  }
  return val; // already a URL – pass through
}

// ─── Create Enquiry (with write lock) ─────────────────────────────────────────
function createEnquiry(enquiry) {
  // Upload images BEFORE acquiring the lock (Drive ops are slow)
  var bcUrl1   = _maybeUpload(enquiry.business_card_url, 'business_card');
  var bcUrl2   = _maybeUpload(enquiry.business_card_url_2, 'business_card');
  var products = (enquiry.products || []).map(function(p) {
    return Object.assign({}, p, { photo_url: _maybeUpload(p.photo_url, 'product') });
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
    var enquiryId      = enquiry.enquiry_id || generateId('ENQ');

    enquiriesSheet.appendRow([
      enquiryId,
      enquiry.customer_name       || '',
      enquiry.mobile              || '',
      enquiry.business_name       || '',
      enquiry.address             || '',
      bcUrl1,
      bcUrl2,
      enquiry.advance_amount      || '',
      enquiry.payment_mode        || '',
      enquiry.payment_mode_custom || '',
      enquiry.general_notes       || '',
      enquiry.event_name          || '',
      enquiry.created_by          || 'Unknown',
      now,
      enquiry.status              || 'New',
    ]);

    if (products.length > 0) {
      var rows = products.map(function(p) {
        return [
          p.product_id            || generateId('PRD'),
          enquiryId,
          p.photo_url             || '',
          p.description           || '',
          p.quantity              || '',
          p.unit                  || '',
          p.weight                || '',
          p.purity_material       || '',
          p.customer_requirement  || '',
          now,
        ];
      });
      productsSheet
        .getRange(productsSheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }

    SpreadsheetApp.flush(); // commit before releasing lock
    return { success: true, enquiry_id: enquiryId };

  } finally {
    lock.releaseLock();
  }
}

// ─── Read all Enquiries ────────────────────────────────────────────────────────
function getEnquiries() {
  var ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
  var enquiriesSheet = getOrCreateSheet(ss, 'Enquiries');
  var productsSheet  = getOrCreateSheet(ss, 'Products');

  var enquiriesData = sheetToObjects(enquiriesSheet);
  var productsData  = sheetToObjects(productsSheet);

  // Group products by enquiry_id (O(n) map instead of O(n²) nested filter)
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

// ─── Read single Enquiry ──────────────────────────────────────────────────────
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

// ─── Delete single Enquiry (with write lock) ──────────────────────────────────
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

// ─── Batch delete Enquiries (with write lock) ──────────────────────────────────
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

// ─── Sheet row deletion helper ────────────────────────────────────────────────
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

// ─── Drive image deletion ─────────────────────────────────────────────────────
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
