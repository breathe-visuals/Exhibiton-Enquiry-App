# Backend Sync & Structure Refactoring Plan

The current edit/update logic relies on a "wipe and replace" method in Google Apps Script, which is extremely dangerous. If you delete a product, the backend currently wipes the ENTIRE Products sheet and attempts to rewrite all the rows minus the deleted one. If the Google Apps Script times out halfway through, you could lose all your products. 

Furthermore, because the frontend is "optimistic" (it instantly shows success), you never see if the backend actually failed to delete the product or trash the image.

To make the app professional, error-proof, and fully trustworthy, we will implement the following structured plan:

## Phase 1: Atomic Sheet Updates (No more wiping sheets)
We will rewrite `updateEnquiry` and `_deleteRowsById` in `Code.gs`.
Instead of clearing the entire `Products` sheet on every edit:
1. **Find and Update**: We will iterate through the sheet and update existing products in-place using their `product_id`.
2. **Targeted Deletion**: For deleted products, we will find their exact row number and use `sheet.deleteRow(rowIndex)` (looping backwards so indices don't shift).
3. **Safe Appending**: Only truly *new* products will be appended to the bottom. 
*Benefit: Zero risk of data loss. If a script times out, the rest of the sheet remains perfectly intact.*

## Phase 2: Guaranteed Drive Cleanup
Currently, if `DriveApp.getFileById().setTrashed(true)` fails (e.g. due to ownership limits), it fails silently. 
1. We will implement a `TrashQueue` logic. If an image fails to delete, its ID is appended to a hidden column or a "Trash" sheet to be retried on the next execution.
2. We will ensure the regex that extracts Google Drive File IDs flawlessly captures all edge cases (shared links, direct links, export links).

## Phase 3: Synchronized Frontend Accountability
1. We will modify `App.jsx` so that if the background sync fails (e.g., the sheet couldn't delete the product), the frontend will **revert** the UI back to match the sheet and show a clear error toast: *"Sync failed: Product could not be deleted from Google Sheets."*
2. This creates true "trust" — what you see on the screen is 100% guaranteed to be what is in the sheet.

## Phase 4: Data Validation & Logging
1. Add strict `product_id` generation and tracking so every product card is permanently linked to its exact row in the Google Sheet.
2. Add a `sync_status` to the offline queue so you can visually see in the app if an edit is currently pending, succeeded, or failed.

---
**Approval Needed:**
If you agree with this approach, I will begin by rewriting the core `updateEnquiry` and sheet manipulation logic in `Code.gs` to be atomic and safe.
