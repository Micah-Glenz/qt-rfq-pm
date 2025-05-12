/**
 * Google Apps Script API Module
 */
const GASAPI = (function() {
  // Configuration - These will be set later by the user
  let CONFIG = {
    apiUrl: '',
    apiKey: ''
  };
  
  /**
   * Set the API configuration
   * @param {Object} config - Configuration object with apiUrl and apiKey
   */
  function setConfig(config) {
    CONFIG.apiUrl = config.apiUrl;
    CONFIG.apiKey = config.apiKey;
  }
  
  /**
   * Get the current configuration
   * @returns {Object} - Current configuration
   */
  function getConfig() {
    return { ...CONFIG };
  }
  
  /**
   * Make API request to Google Apps Script
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} - Response data
   */
  async function makeRequest(payload) {
    if (!CONFIG.apiUrl || !CONFIG.apiKey) {
      throw new Error('API URL and Key must be configured first');
    }
    
    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          apiKey: CONFIG.apiKey
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message || 'API request failed');
      }
      
      return data.data;
    } catch (error) {
      console.error('GAS API Error:', error);
      throw error;
    }
  }
  
  /**
   * Create a project with folder and sheet
   * @param {Object} projectData - Project information
   * @returns {Promise<Object>} - Created project details
   */
  async function createProject(projectData) {
    const result = await makeRequest({
      operation: 'addProjectSheet',
      customerName: projectData.customerName,
      projectDescription: projectData.projectDescription,
      estimateNumber: projectData.estimateNumber,
      salesRep: projectData.salesRep,
      spreadsheetId: projectData.spreadsheetId
    });
    
    return result;
  }
  
  /**
   * Create folder only
   * @param {Object} folderData - Folder information
   * @returns {Promise<Object>} - Created folder details
   */
  async function createFolder(folderData) {
    return makeRequest({
      operation: 'createFolder',
      salesRep: folderData.salesRep,
      customerName: folderData.customerName,
      projectDescription: folderData.projectDescription,
      estimateNumber: folderData.estimateNumber
    });
  }
  
  /**
   * Copy template file
   * @param {Object} templateData - Template information
   * @returns {Promise<Object>} - Copied file details
   */
  async function copyTemplate(templateData) {
    return makeRequest({
      operation: 'copyTemplate',
      folderId: templateData.folderId,
      customerName: templateData.customerName,
      estimateNumber: templateData.estimateNumber
    });
  }
  
  /**
   * Create project sheet only
   * @param {Object} sheetData - Sheet information
   * @returns {Promise<Object>} - Created sheet details
   */
  async function createProjectSheet(sheetData) {
    return makeRequest({
      operation: 'createProjectSheet',
      sheetName: sheetData.sheetName,
      spreadsheetId: sheetData.spreadsheetId,
      customerName: sheetData.customerName,
      projectDescription: sheetData.projectDescription,
      estimateNumber: sheetData.estimateNumber,
      mpsfLink: sheetData.mpsfLink,
      folderLink: sheetData.folderLink
    });
  }
  
  /**
   * Update status summary
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {Promise<Object>} - Update status
   */
  async function updateStatusSummary(spreadsheetId) {
    return makeRequest({
      operation: 'updateStatusSummary',
      spreadsheetId: spreadsheetId
    });
  }
  
  /**
   * Get sheet status
   * @param {Object} statusData - Status request data
   * @returns {Promise<Object>} - Sheet status
   */
  async function getSheetStatus(statusData) {
    return makeRequest({
      operation: 'getSheetStatus',
      spreadsheetId: statusData.spreadsheetId,
      sheetName: statusData.sheetName
    });
  }
  
  /**
   * Get all sheet statuses
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {Promise<Object>} - All sheet statuses
   */
  async function getAllSheetStatuses(spreadsheetId) {
    return makeRequest({
      operation: 'getAllSheetStatuses',
      spreadsheetId: spreadsheetId
    });
  }
  
  // Public API
  return {
    setConfig,
    getConfig,
    createProject,
    createFolder,
    copyTemplate,
    createProjectSheet,
    updateStatusSummary,
    getSheetStatus,
    getAllSheetStatuses
  };
})();
