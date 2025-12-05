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
        const statusBadge = getStatusBadge(email.status);
        const formattedDate = formatEmailDate(email.sent_at);
        const previewText = truncateText(email.body, 100);

        html += `
          <div class="email-history-item" data-email-id="${email.id}">
            <div class="email-header">
              <div class="email-subject" onclick="EmailHistoryModule.showEmailDetail(${email.id})">
                ${email.subject}
              </div>
              <div class="email-actions">
                <button class="btn-icon small" onclick="EmailHistoryModule.showEmailDetail(${email.id})" title="View email">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button class="btn-icon small" onclick="EmailHistoryModule.resendEmail(${email.id})" title="Resend email">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </button>
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
   * @returns {string} - Status badge HTML
   */
  function getStatusBadge(status) {
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
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // This week - show day name
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
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
                  <div class="meta-item">
                    <strong>Status:</strong> ${getStatusBadge(email.status)}
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
                <div class="email-content">${escapeHtml(email.body).replace(/\n/g, '<br>')}</div>
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

              <!-- Actions -->
              <div class="email-detail-actions">
                <button class="btn primary" onclick="EmailHistoryModule.resendEmail(${email.id})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Resend
                </button>
                <button class="btn secondary" onclick="EmailHistoryModule.forwardEmail(${email.id})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 2L12 12"></path>
                    <path d="M22 2l-7 20-4-9-9 4 20 7z"></path>
                  </svg>
                  Forward
                </button>
                <button class="btn secondary" onclick="EmailHistoryModule.createFollowUp(${email.id})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 10h13a7 7 0 0 1 0 14h-3"></path>
                    <polyline points="8 15 3 10 8 5"></polyline>
                  </svg>
                  Follow Up
                </button>
                <a href="#quote-${email.quote_id}" class="btn secondary" onclick="EmailHistoryModule.goToQuote(${email.quote_id})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  View Quote
                </a>
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
   * Resend email
   * @param {number} emailId - Email ID
   */
  async function resendEmail(emailId) {
    try {
      // Find the email
      const email = currentEmailHistory.find(e => e.id === emailId);
      if (!email) {
        showToast('Email not found', 'error');
        return;
      }

      // Find the vendor quote
      if (!email.vendor_quote_id) {
        showToast('Vendor quote information not available', 'error');
        return;
      }

      // Open email modal with pre-filled content
      if (typeof EmailModule !== 'undefined' && EmailModule.openEmailModal) {
        closeEmailDetailModal();
        await EmailModule.openEmailModal(email.vendor_quote_id);

        // Pre-fill the email modal with original content
        setTimeout(() => {
          const subjectField = document.getElementById('emailSubject');
          const bodyField = document.getElementById('emailBody');

          if (subjectField) subjectField.value = email.subject;
          if (bodyField) bodyField.value = email.body;
        }, 100);
      } else {
        showToast('Email module not available', 'error');
      }

    } catch (error) {
      console.error('Failed to resend email:', error);
      showToast('Failed to resend email', 'error');
    }
  }

  /**
   * Forward email
   * @param {number} emailId - Email ID
   */
  async function forwardEmail(emailId) {
    try {
      const email = currentEmailHistory.find(e => e.id === emailId);
      if (!email) {
        showToast('Email not found', 'error');
        return;
      }

      // Create forward content
      const forwardSubject = `Fwd: ${email.subject}`;
      const forwardBody = `\n\n---------- Forwarded message ---------\nFrom: ${email.vendor_name}\nDate: ${new Date(email.sent_at).toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to_email}\n\n${email.body}`;

      // Open email modal with forward content
      if (typeof EmailModule !== 'undefined' && EmailModule.openEmailModal) {
        closeEmailDetailModal();
        await EmailModule.openEmailModal(email.vendor_quote_id);

        setTimeout(() => {
          const subjectField = document.getElementById('emailSubject');
          const bodyField = document.getElementById('emailBody');

          if (subjectField) subjectField.value = forwardSubject;
          if (bodyField) bodyField.value = forwardBody;
        }, 100);
      } else {
        showToast('Email module not available', 'error');
      }

    } catch (error) {
      console.error('Failed to forward email:', error);
      showToast('Failed to forward email', 'error');
    }
  }

  /**
   * Create follow-up email
   * @param {number} emailId - Email ID
   */
  async function createFollowUp(emailId) {
    try {
      const email = currentEmailHistory.find(e => e.id === emailId);
      if (!email) {
        showToast('Email not found', 'error');
        return;
      }

      // Create follow-up content
      const followUpSubject = `Follow-up: ${email.subject}`;
      const followUpBody = `\n\n---------- Follow-up to previous message ----------\nOriginal message sent on ${new Date(email.sent_at).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}\n\n---------- Follow-up message ----------\n`;

      // Open email modal with follow-up content
      if (typeof EmailModule !== 'undefined' && EmailModule.openEmailModal) {
        closeEmailDetailModal();
        await EmailModule.openEmailModal(email.vendor_quote_id);

        setTimeout(() => {
          const subjectField = document.getElementById('emailSubject');
          const bodyField = document.getElementById('emailBody');

          if (subjectField) subjectField.value = followUpSubject;
          if (bodyField) bodyField.value = followUpBody;
        }, 100);
      } else {
        showToast('Email module not available', 'error');
      }

    } catch (error) {
      console.error('Failed to create follow-up:', error);
      showToast('Failed to create follow-up', 'error');
    }
  }

  /**
   * Go to quote
   * @param {number} quoteId - Quote ID
   */
  function goToQuote(quoteId) {
    closeEmailDetailModal();

    // Load the quote if not already loaded
    if (typeof QuotesModule !== 'undefined' && QuotesModule.loadQuoteDetail) {
      QuotesModule.loadQuoteDetail(quoteId);
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

  // Public API
  return {
    init,
    renderEmailHistory,
    showEmailDetail,
    resendEmail,
    forwardEmail,
    createFollowUp,
    goToQuote
  };
})();