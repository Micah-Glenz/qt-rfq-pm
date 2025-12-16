/**
 * Email History module for managing email history display and actions
 */
const EmailHistoryModule = (function() {
  'use strict';

  let currentEmailHistory = [];
  let currentQuote = null;

  /**
   * Initialize email history functionality
   */
  function init() {
    // No global initialization needed - module is used on-demand
  }

  /**
   * Render email history for a quote
   * @param {Array} emails - Array of email history objects
   * @returns {string} - HTML string
   */
  function renderEmailHistory(emails) {
    if (!emails || emails.length === 0) {
      return '<div class="empty-state">No emails sent for this quote</div>';
    }

    currentEmailHistory = emails;

    // Group emails by vendor for better organization
    const emailsByVendor = groupEmailsByVendor(emails);

    let html = '<div class="email-history-list">';

    // Render each vendor's emails
    Object.entries(emailsByVendor).forEach(([vendorName, vendorEmails]) => {
      html += `
        <div class="vendor-email-group">
          <div class="vendor-group-header">
            <h4 class="vendor-name">${vendorName}</h4>
            <span class="email-count">${vendorEmails.length} email${vendorEmails.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="vendor-emails">
      `;

      vendorEmails.forEach(email => {
        const statusBadge = getStatusBadge(email.status, email.email_status);
        const formattedDate = formatEmailDate(email.sent_at);
        const previewText = truncateText(email.body, 100);

        html += `
          <div class="email-history-item" data-email-id="${email.id}">
            <div class="email-header">
              <div class="email-subject" onclick="EmailHistoryModule.showEmailDetail(${email.id})">
                ${email.subject}
              </div>
            </div>
            <div class="email-meta">
              <span class="email-status">${statusBadge}</span>
              <span class="email-date">${formattedDate}</span>
              <span class="email-recipient">${email.to_email}</span>
            </div>
            <div class="email-preview">${previewText}</div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Group emails by vendor name
   * @param {Array} emails - Array of email history objects
   * @returns {Object} - Emails grouped by vendor
   */
  function groupEmailsByVendor(emails) {
    const grouped = {};

    emails.forEach(email => {
      const vendorName = email.vendor_name || 'Unknown Vendor';

      if (!grouped[vendorName]) {
        grouped[vendorName] = [];
      }

      grouped[vendorName].push(email);
    });

    // Sort emails within each vendor group by date (newest first)
    Object.keys(grouped).forEach(vendorName => {
      grouped[vendorName].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    });

    return grouped;
  }

  /**
   * Get status badge HTML for email status
   * @param {string} status - Email status
   * @param {string} emailStatus - Email status (current/superceded)
   * @returns {string} - Status badge HTML
   */
  function getStatusBadge(status, emailStatus) {
    // Show simple [Current/Superceded] status if email_status is available
    if (emailStatus) {
      const emailStatusConfig = {
        'current': { class: 'status-current', text: 'Current', icon: '' },
        'superceded': { class: 'status-superceded', text: 'Superceded', icon: '' }
      };

      const config = emailStatusConfig[emailStatus] || emailStatusConfig['current'];
      return `<span class="status-badge ${config.class}">[${config.text}]</span>`;
    }

    // Fallback to original status system for backward compatibility
    const statusConfig = {
      'sent': { class: 'status-sent', text: 'Sent', icon: '✓' },
      'test_sent': { class: 'status-sent', text: 'Test Sent', icon: '✓' },
      'delivered': { class: 'status-delivered', text: 'Delivered', icon: '✓' },
      'opened': { class: 'status-opened', text: 'Opened', icon: '○' },
      'replied': { class: 'status-replied', text: 'Replied', icon: '↩' },
      'failed': { class: 'status-failed', text: 'Failed', icon: '✗' },
      'bounced': { class: 'status-bounced', text: 'Bounced', icon: '↺' }
    };

    const config = statusConfig[status] || statusConfig['sent'];

    return `<span class="status-badge ${config.class}">${config.icon} ${config.text}</span>`;
  }

  /**
   * Format email date for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date
   */
  function formatEmailDate(dateString) {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);

    // Format: Fri, 12/05/25
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Last 2 digits

    return `${dayName}, ${month}/${day}/${year}`;
  }

  /**
   * Truncate text to a specific length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text || '';
    }
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Show detailed email modal
   * @param {number} emailId - Email ID
   */
  async function showEmailDetail(emailId) {
    try {
      // Find email in current history
      const email = currentEmailHistory.find(e => e.id === emailId);
      if (!email) {
        showToast('Email not found', 'error');
        return;
      }

      // Create and show modal
      createEmailDetailModal(email);

    } catch (error) {
      console.error('Failed to show email detail:', error);
      showToast('Failed to load email details', 'error');
    }
  }

  /**
   * Safely parse gas response data (handles both JSON and Python dict formats)
   * @param {string} gasResponse - The gas response string
   * @returns {string} - Formatted JSON string or original string if parsing fails
   */
  function parseGasResponse(gasResponse) {
    if (!gasResponse) return 'No response data';

    try {
      // Try parsing as JSON first
      return JSON.stringify(JSON.parse(gasResponse), null, 2);
    } catch (jsonError) {
      try {
        // Try parsing Python dict format by converting to JSON
        // Replace single quotes with double quotes for JSON compatibility
        const jsonString = gasResponse
          .replace(/'/g, '"')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false')
          .replace(/None/g, 'null');
        return JSON.stringify(JSON.parse(jsonString), null, 2);
      } catch (pythonError) {
        // If both fail, return the original string
        return gasResponse;
      }
    }
  }

  /**
   * Create email detail modal
   * @param {Object} email - Email object
   */
  function createEmailDetailModal(email) {
    // Remove existing modal if present
    const existingModal = document.getElementById('emailDetailModal');
    if (existingModal) {
      existingModal.remove();
    }

    const formattedDate = new Date(email.sent_at).toLocaleString();
    const gasResponse = parseGasResponse(email.gas_response);

    const modalHtml = `
      <div id="emailDetailModal" class="modal">
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h2>Email Details</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="email-detail-content">
              <!-- Email Header -->
              <div class="email-detail-header">
                <div class="email-detail-subject">${email.subject}</div>
                <div class="email-detail-meta">
                  <div class="meta-item">
                    <strong>To:</strong> ${email.to_email}
                  </div>
                  <div class="meta-item">
                    <strong>Vendor:</strong> ${email.vendor_name}
                  </div>
                  <div class="meta-item">
                    <strong>Quote:</strong> ${email.quote_no}
                  </div>
                  <div class="meta-item">
                    <strong>Sent:</strong> ${formattedDate}
                  </div>
                  <div class="meta-item email-detail-status">
                    <strong>Status:</strong> ${getStatusBadge(email.status, email.email_status)}
                    <div class="status-update-controls">
                      <select id="statusSelect-${email.id}" class="status-select">
                        <option value="current" ${email.email_status === 'current' ? 'selected' : ''}>Current</option>
                        <option value="superceded" ${email.email_status === 'superceded' ? 'selected' : ''}>Superceded</option>
                      </select>
                      <button onclick="EmailHistoryModule.updateEmailStatus(${email.id}, document.getElementById('statusSelect-${email.id}').value)" class="update-status-btn">Update</button>
                    </div>
                  </div>
                  ${email.template_id ? `
                    <div class="meta-item">
                      <strong>Template ID:</strong> ${email.template_id}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Email Body -->
              <div class="email-detail-body">
                <h4>Message</h4>
                <div class="email-content">${email.body ? escapeHtml(email.body).replace(/\n/g, '<br>') : '<em>No message content available</em>'}</div>
              </div>

              <!-- Template Info -->
              ${email.template_id ? `
                <div class="email-detail-template">
                  <h4>Template Information</h4>
                  <p>This email was sent using a template. The template variables were automatically populated with quote and vendor information.</p>
                </div>
              ` : ''}

              <!-- GAS Response -->
              <div class="email-detail-response">
                <details>
                  <summary>Google Apps Script Response</summary>
                  <pre class="gas-response-content">${gasResponse}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind event listeners
    const modal = document.getElementById('emailDetailModal');
    modal.querySelector('.close-modal').addEventListener('click', closeEmailDetailModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEmailDetailModal();
      }
    });

    // Show the modal
    modal.classList.add('show');
  }

  /**
   * Close email detail modal
   */
  function closeEmailDetailModal() {
    const modal = document.getElementById('emailDetailModal');
    if (modal) {
      modal.remove();
    }
  }

  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update email status
   * @param {number} emailId - Email ID
   * @param {string} newStatus - New status ('current' or 'superceded')
   */
  async function updateEmailStatus(emailId, newStatus) {
    try {
      const response = await API.updateEmailStatus(emailId, newStatus);

      if (response.success) {
        showToast(`Email status updated to ${newStatus}`, 'success');

        // Update the email in current history
        const emailIndex = currentEmailHistory.findIndex(e => e.id === emailId);
        if (emailIndex !== -1) {
          currentEmailHistory[emailIndex].email_status = newStatus;
        }

        // Refresh the modal if it's open
        const modal = document.getElementById('emailDetailModal');
        if (modal) {
          // Update status display in modal
          const statusElement = modal.querySelector('.email-detail-status');
          if (statusElement) {
            const email = currentEmailHistory.find(e => e.id === emailId);
            if (email) {
              statusElement.innerHTML = getStatusBadge(email.status, newStatus);
            }
          }
        }

        return true;
      } else {
        showToast(response.error || 'Failed to update email status', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error updating email status:', error);
      showToast('Failed to update email status', 'error');
      return false;
    }
  }

// Public API
  return {
    init,
    renderEmailHistory,
    showEmailDetail,
    updateEmailStatus
  };
})();