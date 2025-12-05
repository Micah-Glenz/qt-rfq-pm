/**
 * FILE: Code.gs
 * DESCRIPTION: Main Router and Drive Logic (Folders + MPSF Copy)
 */

// ======================================================
// 1. BUSINESS CONFIGURATION
// ======================================================
const BUSINESS_CONFIG = {
  // CHANGED: Variable name updated for clarity
  mpsfTemplateId: '1Xu_ExsfHe6K1fFJRxifWRzGRReL60ELBKkRemtEJlG0', 
  
  salesRepFolders: {
    "Chad May": "1-Yw0h4bUsXUsADoJdFpCI56UzZFI6FIk",
    "David Douglas": "1-aSnqZl1N4sKbXHt_RXrhgKE4pfsQyz6",
    "James Duty": "1-dkauyBpFO-y5UUIqreHfRk9lJF9o8ko",
    "Marc Falkenstein": "1-IakGUyX77YuCKj5a4nC4YvPsIqcbinp",
    "Mike Reis": "1-ONhneotbqglOD0CbbyFKLhSLQGwSFRB",
    "Jordan Hanna": "1xToL_fsLXongoNVfr7fNagkblHx3SWPI",
    "Lexie Potts": "1SdWh3WQzu_iE-98Hcozq1cOsaJMf_vAa",

    "test": "1UeXzwS5XjszI74-NR2LJVgNaE83cdx9M"
  }
};

// ======================================================
// 2. ENTRY POINTS
// ======================================================

function doGet(e) {
  return processRequest(e, 'GET');
}

function doPost(e) {
  return processRequest(e, 'POST');
}

function processRequest(e, method) {
  try {
    // 1. Security (Key + Rate Limit)
    const request = Security.guard(e, method);

    // 2. Router
    const result = router(request);

    // 3. Response
    return Utils.sendJSON(200, "Success", result);

  } catch (error) {
    return Utils.sendJSON(error.code || 500, error.message);
  }
}

/**
 * THE ROUTER
 */
function router(request) {
  const { route, payload } = request;

  switch (route) {
    case 'createFolder':
      return handleCreateFolder(payload);

    case 'copyTemplate':
      return handleCopyTemplate(payload);

    // === NEW GMAIL ROUTES ===
    case 'sendEmail':
      return handleSendEmail(payload); // Call function in Gmail.gs
      
    case 'searchEmails':
      return handleSearchEmails(payload); // Call function in Gmail.gs
    // ========================

    default:
      const err = new Error("Invalid route: " + route);
      err.code = 404;
      throw err;
  }
}

// ======================================================
// 3. CONTROLLERS (BUSINESS LOGIC)
// ======================================================

/**
 * Main Handler: Orchestrates the folder creation based on Sales Rep
 */
function handleCreateFolder(data) {
  const required = ['salesRep', 'customerName', 'projectDescription', 'estimateNumber'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) throw new Error(`Missing fields: ${missing.join(', ')}`);
  
  // Lookup Sales Rep Folder
  const folderId = BUSINESS_CONFIG.salesRepFolders[data.salesRep];
  if (!folderId) throw new Error(`No folder found for Rep: ${data.salesRep}`);
  
  // Delegate to core logic
  return createProjectFolder({ ...data, folderId: folderId });
}

/**
 * Core Logic: Creates structure and copies file
 */
function createProjectFolder(data) {
  const stepTimings = {};
  const startTime = new Date().getTime();
  
  try {
    const parentFolder = DriveApp.getFolderById(data.folderId);
    
    // 1. Find or Create Customer Folder (No Timestamp)
    const existingFolders = parentFolder.getFoldersByName(data.customerName);
    let customerFolder;
    if (existingFolders.hasNext()) {
      customerFolder = existingFolders.next();
    } else {
      customerFolder = parentFolder.createFolder(data.customerName);
    }
    
    // 2. Create Timestamped Project Subfolder
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM-dd-yy");
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HHmmss");
    const subfolderName = `${today} - ${data.projectDescription} - ${timestamp}`;
    
    const projectFolder = customerFolder.createFolder(subfolderName);
    
    // 3. Copy MPSF Template File
    // UPDATED REFERENCE HERE
    const templateFile = DriveApp.getFileById(BUSINESS_CONFIG.mpsfTemplateId);
    const fileName = `[MPSF] ${data.customerName} ${data.estimateNumber} ${today}`;
    
    const copiedFile = templateFile.makeCopy(fileName, projectFolder);
    
    stepTimings.total = new Date().getTime() - startTime;
    
    return {
      folderUrl: projectFolder.getUrl(),
      fileUrl: copiedFile.getUrl(),
      fileName: fileName,
      folderId: projectFolder.getId(),
      fileId: copiedFile.getId(),
      timings: stepTimings
    };

  } catch (error) {
    throw new Error(`Drive operation failed: ${error.message}`);
  }
}

/**
 * Secondary Handler: Just copies the template to a target folder
 */
function handleCopyTemplate(data) {
  const required = ['folderId', 'customerName', 'estimateNumber'];
  const missing = required.filter(field => !data[field]);
  if (missing.length > 0) throw new Error(`Missing fields: ${missing.join(', ')}`);
  
  try {
    const targetFolder = DriveApp.getFolderById(data.folderId);
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM-dd-yy");
    
    // UPDATED REFERENCE HERE
    const templateFile = DriveApp.getFileById(BUSINESS_CONFIG.mpsfTemplateId);
    const fileName = `[MPSF] ${data.customerName} ${data.estimateNumber} ${today}`;
    
    const copiedFile = templateFile.makeCopy(fileName, targetFolder);
    
    return {
      fileUrl: copiedFile.getUrl(),
      fileName: fileName,
      fileId: copiedFile.getId()
    };
  } catch (error) {
    throw new Error(`Template copy failed: ${error.message}`);
  }
}