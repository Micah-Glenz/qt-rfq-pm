/**
 * Email module for managing vendor email communication
 */
const EmailModule = (function() {
  'use strict';

  let currentVendorQuote = null;
  let currentVendorTemplates = [];
  let availableVariables = {};

  /**
   * Initialize email functionality
   */
  function init() {
    console.log('EmailModule initialized');
    // No global initialization needed - module is used on-demand
  }

  /**
   * Open email modal for sending vendor email
   * @param {number} vendorQuoteId - The vendor quote ID
   */
  async function openEmailModal(vendorQuoteId) {
    console.log('openEmailModal called with vendorQuoteId:', vendorQuoteId);

    try {
      // Get current quote data from QuotesModule
      const currentQuote = QuotesModule.getCurrentQuote();
      console.log('Current quote:', currentQuote);

      if (!currentQuote) {
        console.error('No quote selected');
        showToast('No quote selected', 'error');
        return;
      }

      // Find the vendor quote
      const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
      if (!vendorQuote) {
        showToast('Vendor quote not found', 'error');
        return;
      }

      currentVendorQuote = vendorQuote;

      // Gather variables for substitution
      availableVariables = await gatherVariablesForVendorQuote(vendorQuoteId);

      // Load vendor templates
      await loadVendorTemplates(vendorQuote.vendor_id);

      // Create and show modal
      createEmailModal();

      // Initialize modal with vendor data
      initializeEmailModal();

      // Show the modal
      const modal = document.getElementById('emailModal');
      modal.classList.add('show');

    } catch (error) {
      console.error('Failed to open email modal:', error);
      showToast('Failed to open email composer', 'error');
    }
  }

  /**
   * Gather available variables for a vendor quote
   * @param {number} vendorQuoteId - The vendor quote ID
   * @returns {Promise<Object>} - Variables object
   */
  async function gatherVariablesForVendorQuote(vendorQuoteId) {
    try {
      const currentQuote = QuotesModule.getCurrentQuote();
      if (!currentQuote) return {};

      // Find the vendor quote
      const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
      if (!vendorQuote) return {};

      // Get vendor information
      let vendor = null;
      if (vendorQuote.vendor_id) {
        vendor = await API.getVendor(vendorQuote.vendor_id);
      }

      // Build variables object
      const variables = {
        customer: currentQuote.customer || '',
        quote_no: currentQuote.quote_no || '',
        description: currentQuote.description || '',
        sales_rep: currentQuote.sales_rep || '',
        vendor_name: vendor?.name || vendorQuote.vendor || '',
        contact_name: vendor?.contact_name || vendorQuote.contact_person || '',
        vendor_email: vendor?.email || '',
        vendor_phone: vendor?.phone || '',
        quote_type: vendorQuote.type || '',
        quote_id: currentQuote.id,
        vendor_id: vendorQuote.vendor_id || '',
        vendor_quote_id: vendorQuoteId,
        current_date: new Date().toISOString().split('T')[0]
      };

      return variables;
    } catch (error) {
      console.error('Failed to gather variables:', error);
      return {
        current_date: new Date().toISOString().split('T')[0],
        vendor_quote_id: vendorQuoteId
      };
    }
  }

  /**
   * Load vendor-specific email templates
   * @param {number} vendorId - The vendor ID
   */
  async function loadVendorTemplates(vendorId) {
    try {
      const templates = await API.getEmailTemplates();
      currentVendorTemplates = templates.filter(template =>
        !vendorId || template.vendor_id == vendorId
      );
    } catch (error) {
      console.error('Failed to load email templates:', error);
      currentVendorTemplates = [];
    }
  }

  /**
   * Create email modal HTML
   */
  function createEmailModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('emailModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHtml = `
      <div id="emailModal" class="modal">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2>Send Email to Vendor</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="emailForm">
              <!-- Recipient Information -->
              <div class="form-group">
                <label for="emailTo">To:</label>
                <input type="email" id="emailTo" name="to" required placeholder="vendor@example.com">
                <small class="form-help" id="emailHelpText">Email will be sent to the vendor's primary email address</small>

                <!-- Test Mode Option -->
                <div class="form-group" style="margin-top: 0.5rem;">
                  <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="testMode" name="test_mode" style="margin-right: 0.5rem;">
                    <span>Test Mode (send to test address only)</span>
                  </label>
                  <small class="form-help">When enabled, emails will be sent to the test address regardless of vendor email</small>
                </div>
              </div>

              <!-- Template Selection -->
              <div class="form-group">
                <label for="emailTemplate">Email Template:</label>
                <select id="emailTemplate" name="template_id">
                  <option value="">Select a template (optional)</option>
                  <option value="">─────────────────</option>
                </select>
                <button type="button" id="manageTemplatesBtn" class="btn small" style="margin-top: 0.5rem;">
                  Manage Templates
                </button>
              </div>

              <!-- Subject Line -->
              <div class="form-group">
                <label for="emailSubject">Subject:</label>
                <input type="text" id="emailSubject" name="subject" required
                       placeholder="Enter email subject" maxlength="200">
                <div class="character-count">
                  <span id="subjectCount">0</span>/200 characters
                </div>
              </div>

              <!-- Email Body -->
              <div class="form-group">
                <label for="emailBody">Message:</label>
                <textarea id="emailBody" name="body" rows="12" required
                          placeholder="Enter your email message here..."></textarea>
                <div class="email-actions">
                  <button type="button" id="previewBtn" class="btn small secondary">Preview Variables</button>
                  <button type="button" id="resetBtn" class="btn small secondary">Reset</button>
                </div>
              </div>

              <!-- Available Variables -->
              <div class="form-group" id="variablesSection" style="display: none;">
                <label>Available Variables:</label>
                <div class="variables-grid" id="variablesGrid">
                  <!-- Variables will be populated here -->
                </div>
                <div class="preview-section" id="previewSection" style="display: none;">
                  <h4>Preview:</h4>
                  <div class="preview-content" id="previewContent">
                    <!-- Preview will be shown here -->
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="button" class="btn cancel-modal">Cancel</button>
                <button type="submit" class="btn primary" id="sendEmailBtn">
                  <span class="btn-text">Send Email</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="loading-spinner"></span>
                    Sending...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind event listeners
    bindEmailModalEvents();
  }

  /**
   * Initialize email modal with current vendor data
   */
  function initializeEmailModal() {
    if (!currentVendorQuote) return;

    // Set recipient email - prioritize vendor email
    const vendorEmail = currentVendorQuote.vendor?.email || '';
    const testEmail = 'micah+gasapitest@commfitness.com';

    // Use vendor email if available, otherwise show test email as placeholder
    document.getElementById('emailTo').value = vendorEmail || testEmail;

    // Update help text based on email availability
    const helpText = document.getElementById('emailHelpText');
    if (vendorEmail) {
      helpText.textContent = 'Email will be sent to the vendor\'s primary email address';
      helpText.style.color = '#28a745';
    } else {
      helpText.textContent = 'No vendor email on file - email will be sent to test address';
      helpText.style.color = '#ffc107';
    }

    // Populate template dropdown
    populateTemplateDropdown();

    // Set initial subject if no template selected
    if (!document.getElementById('emailTemplate').value) {
      const defaultSubject = `Quote Request - ${availableVariables.customer || 'Customer'} - ${availableVariables.quote_no || 'Quote #'}`;
      document.getElementById('emailSubject').value = defaultSubject;
      updateCharacterCount();
    }

    // Set initial body if no template selected
    if (!document.getElementById('emailTemplate').value) {
      const defaultBody = `Dear ${availableVariables.contact_name || availableVariables.vendor_name || 'Vendor'},\n\n` +
        `We are requesting a quote for ${availableVariables.customer || 'our current project'}.\n\n` +
        `Project Details:\n` +
        `- Quote Number: ${availableVariables.quote_no || 'TBD'}\n` +
        `${availableVariables.description ? `- Description: ${availableVariables.description}\n` : ''}` +
        `${availableVariables.quote_type ? `- Service Type: ${availableVariables.quote_type}\n` : ''}` +
        `\n` +
        `Please provide your best pricing and lead time information.\n\n` +
        `Thank you for your consideration.\n\n` +
        `Best regards,\n` +
        `${availableVariables.sales_rep || 'Sales Representative'}`;

      document.getElementById('emailBody').value = defaultBody;
    }

    // Populate available variables
    populateVariables();
  }

  /**
   * Bind event listeners for email modal
   */
  function bindEmailModalEvents() {
    const modal = document.getElementById('emailModal');

    // Close modal events
    modal.querySelector('.close-modal').addEventListener('click', closeEmailModal);
    modal.querySelector('.cancel-modal').addEventListener('click', closeEmailModal);

    // Form submission
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);

    // Template selection
    document.getElementById('emailTemplate').addEventListener('change', handleTemplateChange);

    // Character count
    document.getElementById('emailSubject').addEventListener('input', updateCharacterCount);

    // Preview and reset buttons
    document.getElementById('previewBtn').addEventListener('click', togglePreview);
    document.getElementById('resetBtn').addEventListener('click', resetToDefault);

    // Manage templates button
    document.getElementById('manageTemplatesBtn').addEventListener('click', openTemplateManager);

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEmailModal();
      }
    });
  }

  /**
   * Populate template dropdown with vendor templates
   */
  function populateTemplateDropdown() {
    const select = document.getElementById('emailTemplate');

    // Clear existing options (except the first two)
    while (select.options.length > 2) {
      select.remove(2);
    }

    // Add vendor templates
    currentVendorTemplates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.subject_template || 'Untitled Template';
      select.appendChild(option);
    });

    // Add general templates (if any)
    const generalTemplates = currentVendorTemplates.filter(template => !template.vendor_id);
    if (generalTemplates.length > 0 && currentVendorTemplates.some(t => t.vendor_id)) {
      const separator = document.createElement('option');
      separator.textContent = '─────────────────';
      separator.disabled = true;
      select.appendChild(separator);

      generalTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.subject_template || 'Untitled Template';
        select.appendChild(option);
      });
    }
  }

  /**
   * Handle template selection change
   */
  async function handleTemplateChange() {
    const templateId = document.getElementById('emailTemplate').value;

    if (!templateId) {
      // Reset to default content
      initializeEmailModal();
      return;
    }

    try {
      // Get template details
      const template = currentVendorTemplates.find(t => t.id == templateId);
      if (!template) return;

      // Substitute variables
      const subject = substituteVariables(template.subject_template, availableVariables);
      const body = substituteVariables(template.body_template, availableVariables);

      // Update form fields
      document.getElementById('emailSubject').value = subject;
      document.getElementById('emailBody').value = body;
      updateCharacterCount();

    } catch (error) {
      console.error('Failed to load template:', error);
      showToast('Failed to load email template', 'error');
    }
  }

  /**
   * Substitute variables in template content
   * @param {string} content - The template content
   * @param {Object} variables - Variables object
   * @returns {string} - Content with substituted variables
   */
  function substituteVariables(content, variables) {
    if (!content || !variables) return content;

    let substitutedContent = content;

    // Replace {variable} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      substitutedContent = substitutedContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value || ''
      );
    });

    return substitutedContent;
  }

  /**
   * Update subject character count
   */
  function updateCharacterCount() {
    const subject = document.getElementById('emailSubject').value;
    const count = subject.length;
    document.getElementById('subjectCount').textContent = count;

    // Change color if approaching limit
    const countElement = document.getElementById('subjectCount');
    if (count > 180) {
      countElement.style.color = '#dc3545';
    } else if (count > 160) {
      countElement.style.color = '#ffc107';
    } else {
      countElement.style.color = '#6c757d';
    }
  }

  /**
   * Populate available variables display
   */
  function populateVariables() {
    const variablesGrid = document.getElementById('variablesGrid');
    if (!variablesGrid) return;

    const variablesHtml = Object.entries(availableVariables)
      .filter(([key, value]) => value && value.toString().trim())
      .map(([key, value]) => `
        <div class="variable-item">
          <strong>{${key}}</strong>
          <span class="variable-value">${escapeHtml(value.toString())}</span>
        </div>
      `).join('');

    variablesGrid.innerHTML = variablesHtml || '<p>No variables available</p>';
  }

  /**
   * Toggle preview section
   */
  function togglePreview() {
    const variablesSection = document.getElementById('variablesSection');
    const previewBtn = document.getElementById('previewBtn');

    if (variablesSection.style.display === 'none') {
      variablesSection.style.display = 'block';
      previewBtn.textContent = 'Hide Variables';
      updatePreview();
    } else {
      variablesSection.style.display = 'none';
      previewBtn.textContent = 'Preview Variables';
    }
  }

  /**
   * Update preview content
   */
  function updatePreview() {
    const subject = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');

    if (!subject && !body) {
      previewSection.style.display = 'none';
      return;
    }

    previewSection.style.display = 'block';

    const previewHtml = `
      <div class="preview-email">
        <div class="preview-subject"><strong>Subject:</strong> ${escapeHtml(subject)}</div>
        <div class="preview-body">
          <strong>Body:</strong>
          <pre>${escapeHtml(body)}</pre>
        </div>
      </div>
    `;

    previewContent.innerHTML = previewHtml;
  }

  /**
   * Reset email form to default content
   */
  function resetToDefault() {
    document.getElementById('emailTemplate').value = '';
    initializeEmailModal();
  }

  /**
   * Handle email form submission
   * @param {Event} event - Submit event
   */
  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!currentVendorQuote) {
      showToast('No vendor quote selected', 'error');
      return;
    }

    const sendBtn = document.getElementById('sendEmailBtn');
    const btnText = sendBtn.querySelector('.btn-text');
    const btnLoading = sendBtn.querySelector('.btn-loading');

    // Show loading state
    sendBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    try {
      // Gather form data
      const emailData = {
        to: document.getElementById('emailTo').value,
        subject: document.getElementById('emailSubject').value,
        body: document.getElementById('emailBody').value,
        template_id: document.getElementById('emailTemplate').value || null,
        test_mode: document.getElementById('testMode').checked
      };

      // Send email
      const response = await API.sendVendorEmail(currentVendorQuote.id, emailData);

      // Show success message
      showToast(`Email sent successfully to ${emailData.to}`, 'success');

      // Show additional response info if available
      if (response.gas_response) {
        console.log('Email sent with response:', response.gas_response);
      }

      // Close modal
      closeEmailModal();

    } catch (error) {
      console.error('Failed to send email:', error);
      showToast(`Failed to send email: ${error.message}`, 'error');
    } finally {
      // Hide loading state
      sendBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  /**
   * Close email modal
   */
  function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
      modal.remove();
    }

    // Reset state
    currentVendorQuote = null;
    currentVendorTemplates = [];
    availableVariables = {};
  }

  /**
   * Open template manager (placeholder for Phase 4)
   */
  function openTemplateManager() {
    showToast('Template manager will be available in Phase 4', 'info');
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
    openEmailModal,
    openTemplateManager
  };
})();