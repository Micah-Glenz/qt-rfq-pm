/**
 * FILE: Utils.gs
 * DESCRIPTION: Helper functions for formatting responses.
 */

const Utils = {
  sendJSON: function(code, message, data) {
    const response = {
      status: code === 200 ? 'success' : 'error',
      code: code,
      message: message,
      data: data || null
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
};