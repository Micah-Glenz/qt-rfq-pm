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
   * Load vendor-specific email templates using specialty-based system
   * @param {number} vendorId - The vendor ID
   */
  async function loadVendorTemplates(vendorId) {
    try {
      const templates = await API.getEmailTemplates();

      // Get vendor information to determine specialization
      const vendor = await API.getVendor(vendorId);
      const vendorSpecialization = vendor?.specialization || 'general';

      // Get default template for vendor's specialization
      const defaultTemplate = templates.find(t => t.specialty === vendorSpecialization && t.is_default);

      // Get templates that match vendor's specialization
      const specialtyTemplates = templates.filter(t => t.specialty === vendorSpecialization);

      // Include general templates as fallbacks
      const generalTemplates = templates.filter(t => t.specialty === 'general');

      // Combine templates: default → specialty (non-default) → general (non-default)
      currentVendorTemplates = [
        ...(defaultTemplate ? [defaultTemplate] : []),
        ...specialtyTemplates.filter(t => !t.is_default),
        ...generalTemplates.filter(t => !t.is_default)
      ];

      console.log(`Loaded ${currentVendorTemplates.length} templates for vendor ${vendorId} (${vendorSpecialization})`);
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
        <div class="modal-content email-modal">
          <!-- Header -->
          <div class="email-header">
            <div class="email-header-left">
              <h2><span id="headerVendorName">Loading...</span> - Email Vendor</h2>
            </div>
            <div class="email-header-right">
              <div class="test-mode-toggle">
                <label class="checkbox-label">
                  <input type="checkbox" id="testMode" name="test_mode">
                  <span>Test Mode</span>
                </label>
              </div>
              <span class="close-modal">&times;</span>
            </div>
          </div>

          <!-- Body with two-column layout -->
          <div class="email-body">
            <!-- Main form column -->
            <div class="email-form-column">
              <div class="email-form-content">
                <form id="emailForm">
                  <!-- Template selector -->
                  <div class="form-group-inline">
                    <label for="emailTemplate">Template:</label>
                    <select id="emailTemplate" name="template_id" class="form-control">
                      <option value="">No template</option>
                    </select>
                  </div>

                  <!-- Email fields -->
                  <div class="form-group-inline">
                    <label for="emailTo">To:</label>
                    <div class="input-with-status">
                      <input type="email" id="emailTo" name="to" required placeholder="vendor@example.com" class="form-control">
                      <span class="status" id="emailStatus"></span>
                    </div>
                  </div>

                  <div class="form-group-inline">
                    <label for="emailCc">CC:</label>
                    <div class="cc-input-wrapper">
                      <input type="text" id="emailCc" name="cc" placeholder="email1@example.com, email2@example.com" class="form-control">
                      <!-- Auto-CC banner will be inserted here -->
                    </div>
                  </div>

                  <div class="form-group-inline">
                    <label for="emailBcc">BCC:</label>
                    <input type="text" id="emailBcc" name="bcc" placeholder="email1@example.com, email2@example.com" class="form-control">
                  </div>

                  <!-- Subject -->
                  <div class="form-group-inline">
                    <label for="emailSubject">Subject:</label>
                    <div class="input-with-counter">
                      <input type="text" id="emailSubject" name="subject" required
                             placeholder="Enter subject..." maxlength="200" class="form-control">
                      <span class="char-counter" id="subjectCount">0/200</span>
                    </div>
                  </div>

                  <!-- Message body -->
                  <div class="form-group-inline">
                    <div class="message-textarea-wrapper">
                      <textarea id="emailBody" name="body" required
                                placeholder="Type your message here..." class="form-control"></textarea>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Actions anchored to bottom -->
              <div class="email-form-actions">
                <button type="button" class="btn btn-secondary cancel-modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="sendEmailBtn">
                  <span class="btn-text">Send Email</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="loading-spinner"></span>
                    Sending...
                  </span>
                </button>
              </div>
            </div>

            <!-- Sidebar column -->
            <div class="email-sidebar">
              <div class="variables-list" id="variablesList">
                <!-- Variables will be populated here -->
              </div>
            </div>
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

    // Update vendor name in header
    const headerVendorName = document.getElementById('headerVendorName');
    if (headerVendorName) {
      headerVendorName.textContent = availableVariables.vendor_name || 'Unknown Vendor';
    }

    // Set recipient email - prioritize vendor email from availableVariables
    const vendorEmail = availableVariables.vendor_email || '';
    const testEmail = 'micah+gasapitest@commfitness.com';

    // Use vendor email if available, otherwise show test email as placeholder
    document.getElementById('emailTo').value = vendorEmail || testEmail;

    // Update email status indicator in input
    const emailStatus = document.getElementById('emailStatus');
    if (vendorEmail) {
      emailStatus.textContent = '✓';
      emailStatus.style.color = '#28a745';
    } else {
      emailStatus.textContent = '⚠';
      emailStatus.style.color = '#ffc107';
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
      const defaultBody = "Dear ,"

      document.getElementById('emailBody').value = defaultBody;
    }

    // Populate available variables
    populateVariables();

    // Load auto-CC recipients if we have a vendor quote
    if (currentVendorQuote && currentVendorQuote.id) {
      loadAutoCCRecipients(currentVendorQuote.id);
    }
  }

  /**
   * Handle test mode toggle
   */
  function handleTestModeToggle() {
    const testMode = document.getElementById('testMode');
    const emailTo = document.getElementById('emailTo');
    const emailStatus = document.getElementById('emailStatus');
    const testEmail = 'micah+gasapitest@commfitness.com';
    const ccTestEmail = 'micah+cctest@commfitness.com';
    const bccTestEmail = 'micah+bcctest@commfitness.com';

    if (testMode.checked) {
      // Test mode enabled - use test emails for all fields
      emailTo.value = testEmail;
      document.getElementById('emailCc').value = ccTestEmail;
      document.getElementById('emailBcc').value = bccTestEmail;

      emailStatus.textContent = '⚠';
      emailStatus.style.color = '#ffc107';
    } else {
      // Test mode disabled - use vendor email and clear CC/BCC
      const vendorEmail = availableVariables.vendor_email || '';
      emailTo.value = vendorEmail || testEmail;

      // Clear CC/BCC fields
      document.getElementById('emailCc').value = '';
      document.getElementById('emailBcc').value = '';

      if (vendorEmail) {
        emailStatus.textContent = '✓';
        emailStatus.style.color = '#28a745';
      } else {
        emailStatus.textContent = '⚠';
        emailStatus.style.color = '#ffc107';
      }
    }
  }

  
  /**
   * Bind event listeners for email modal
   */
  function bindEmailModalEvents() {
    const modal = document.getElementById('emailModal');

    // Close modal events
    modal.querySelector('.close-modal').addEventListener('click', closeEmailModal);
    modal.querySelector('.cancel-modal').addEventListener('click', closeEmailModal);

    // Form submission - bind to form submit event
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);

    // Form submission - bind to send button click since buttons are outside form
    document.getElementById('sendEmailBtn').addEventListener('click', handleSendEmailClick);

    // Template selection
    document.getElementById('emailTemplate').addEventListener('change', handleTemplateChange);

    // Character count
    document.getElementById('emailSubject').addEventListener('input', updateCharacterCount);

    // Test mode functionality (now in header) - use auto-CC aware handler
    document.getElementById('testMode').addEventListener('change', handleTestModeToggleWithAutoCC);

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEmailModal();
      }
    });
  }

  /**
   * Handle send email button click
   * @param {Event} event - Click event
   */
  function handleSendEmailClick(event) {
    console.log('Send email button clicked');
    event.preventDefault();

    // Create and dispatch a submit event on the form
    const form = document.getElementById('emailForm');
    console.log('Form found:', form);
    const submitEvent = new Event('submit', { cancelable: true });
    console.log('Dispatching submit event');
    form.dispatchEvent(submitEvent);
  }

  /**
   * Populate template dropdown with specialty-based templates
   */
  function populateTemplateDropdown() {
    const select = document.getElementById('emailTemplate');

    // Clear existing options (except the first one)
    while (select.options.length > 1) {
      select.remove(1);
    }

    if (!currentVendorTemplates || currentVendorTemplates.length === 0) {
      return;
    }

    // Group templates by specialty
    const templatesBySpecialty = {};
    currentVendorTemplates.forEach(template => {
      const specialty = template.specialty || 'general';
      if (!templatesBySpecialty[specialty]) {
        templatesBySpecialty[specialty] = [];
      }
      templatesBySpecialty[specialty].push(template);
    });

    // Define specialty display order
    const specialtyOrder = ['freight', 'install', 'forward', 'general'];
    const specialtyLabels = {
      'freight': 'Freight',
      'install': 'Install',
      'forward': 'Forward',
      'general': 'General'
    };

    // Add templates grouped by specialty
    specialtyOrder.forEach(specialty => {
      const templates = templatesBySpecialty[specialty];
      if (templates && templates.length > 0) {
        const defaultTemplate = templates.find(t => t.is_default);
        const nonDefaultTemplates = templates.filter(t => !t.is_default);

        // Add default template first if it exists
        if (defaultTemplate) {
          const defaultOption = document.createElement('option');
          defaultOption.value = defaultTemplate.id;
          defaultOption.textContent = `${defaultTemplate.name || 'Default Template'} (Default)`;
          defaultOption.title = `Default ${specialtyLabels[specialty]} template`;
          select.appendChild(defaultOption);
        }

        // Add non-default templates
        nonDefaultTemplates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = template.name || 'Template';
          option.title = `${specialtyLabels[specialty]} template: ${template.subject_template || 'No subject'}`;
          select.appendChild(option);
        });
      }
    });
  }

  /**
   * Handle template selection change with specialty-based templates
   */
  async function handleTemplateChange() {
    const templateId = document.getElementById('emailTemplate').value;

    if (!templateId) {
      // Reset to default content
      initializeEmailModal();
      return;
    }

    try {
      // Get template details from current loaded templates
      let template = currentVendorTemplates.find(t => t.id == templateId);

      // If template not found, try to fetch from API
      if (!template) {
        try {
          template = await API.getEmailTemplate(templateId);
        } catch (error) {
          console.warn('Template not found, falling back to default template:', error);
          // Fallback to first available default template
          template = currentVendorTemplates.find(t => t.is_default);
        }
      }

      if (!template) {
        showToast('Template not found, using manual content', 'warning');
        return;
      }

      // Substitute variables
      const subject = substituteVariables(template.subject_template, availableVariables);
      const body = substituteVariables(template.body_template, availableVariables);

      // Update form fields
      document.getElementById('emailSubject').value = subject;
      document.getElementById('emailBody').value = body;
      updateCharacterCount();

      // Show success message for template loading
      const specialty = template.specialty || 'general';
      const templateType = template.is_default ?
        `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} default template` :
        `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} template`;
      console.log(`Loaded ${templateType}: ${template.template_name}`);

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
    const maxLength = 200;

    // Update counter display
    document.getElementById('subjectCount').textContent = `${count}/${maxLength}`;

    // Change color if approaching limit
    const countElement = document.getElementById('subjectCount');
    if (count > maxLength * 0.9) {
      countElement.style.color = '#dc3545';
    } else if (count > maxLength * 0.8) {
      countElement.style.color = '#ffc107';
    } else {
      countElement.style.color = 'var(--text-tertiary)';
    }
  }

  /**
   * Populate available variables display in sidebar
   */
  function populateVariables() {
    const variablesList = document.getElementById('variablesList');
    if (!variablesList) return;

    const variablesHtml = Object.entries(availableVariables)
      .filter(([, value]) => value && value.toString().trim())
      .map(([key, value]) => `
        <div class="variable-item">
          <strong>{${key}}</strong>
          <span>${escapeHtml(value.toString())}</span>
        </div>
      `).join('');

    variablesList.innerHTML = `<h3 style="margin: 0 0 1rem 0; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-light); font-size: 1rem; font-weight: 600; color: var(--text-color);">Available Variables</h3>${variablesHtml || '<p style="padding: 1rem; text-align: center; color: var(--text-secondary); font-style: italic;">No variables available</p>'}`;
  }

  
  /**
   * Handle email form submission
   * @param {Event} event - Submit event
   */
  async function handleEmailSubmit(event) {
    console.log('Email submit handler called');
    event.preventDefault();

    if (!currentVendorQuote) {
      console.error('No vendor quote selected');
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
      // Parse CC/BCC emails
      const ccEmails = parseEmailList(document.getElementById('emailCc').value);
      const bccEmails = parseEmailList(document.getElementById('emailBcc').value);

      // Validate CC/BCC emails if provided
      const invalidCcEmails = ccEmails.filter(email => !isValidEmail(email));
      const invalidBccEmails = bccEmails.filter(email => !isValidEmail(email));

      if (invalidCcEmails.length > 0 || invalidBccEmails.length > 0) {
        const invalidEmails = [...invalidCcEmails, ...invalidBccEmails];
        showToast(`Invalid email format: ${invalidEmails.join(', ')}`, 'error');
        return;
      }

      // Gather form data
      const emailData = {
        to: document.getElementById('emailTo').value,
        subject: document.getElementById('emailSubject').value,
        body: document.getElementById('emailBody').value,
        template_id: document.getElementById('emailTemplate').value || null,
        test_mode: document.getElementById('testMode').checked
      };

      // Add CC/BCC if provided
      if (ccEmails.length > 0) {
        emailData.cc = ccEmails;
      }
      if (bccEmails.length > 0) {
        emailData.bcc = bccEmails;
      }

      // Send email
      const response = await API.sendVendorEmail(currentVendorQuote.id, emailData);

      // Create success message with recipient info
      let successMessage = `Email sent successfully to ${emailData.to}`;
      if (ccEmails.length > 0) {
        successMessage += ` and ${ccEmails.length} CC recipient${ccEmails.length > 1 ? 's' : ''}`;
      }
      if (bccEmails.length > 0) {
        successMessage += ` with ${bccEmails.length} BCC recipient${bccEmails.length > 1 ? 's' : ''}`;
      }

      showToast(successMessage, 'success');

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
   * Parse comma-separated email list
   * @param {string} emailString - Comma-separated email string
   * @returns {Array} - Array of trimmed email strings
   */
  function parseEmailList(emailString) {
    if (!emailString || !emailString.trim()) {
      return [];
    }

    return emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
   * Open template manager
   */
  function openTemplateManager() {
    // Close email modal first
    closeEmailModal();

    // Try to open template manager if it exists
    try {
      // Navigate to templates page or open modal
      window.location.hash = '#templates';
      showToast('Opening template manager...', 'info');
    } catch (error) {
      console.error('Failed to open template manager:', error);
      showToast('Template manager not available', 'error');
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
   * Load auto-CC recipients for a vendor quote
   * @param {number} vendorQuoteId - The vendor quote ID
   */
  async function loadAutoCCRecipients(vendorQuoteId) {
    try {
      console.log('Loading auto-CC recipients for vendor quote:', vendorQuoteId);
      const response = await fetch(`/api/vendor-quotes/${vendorQuoteId}/auto-cc-info`);

      if (!response.ok) {
        console.warn('Failed to load auto-CC info:', response.status);
        return;
      }

      const autoCCData = await response.json();
      console.log('Auto-CC data received:', autoCCData);

      if (autoCCData.success && autoCCData.data && autoCCData.data.auto_cc_enabled && autoCCData.data.auto_cc_recipients.length > 0) {
        // Filter recipients based on test mode
        const recipients = autoCCData.data.auto_cc_recipients;
        const displayRecipients = autoCCData.data.is_test_mode ?
          recipients.filter(r => r.include_in_test_mode) :
          recipients;

        if (displayRecipients.length > 0) {
          // Extract email addresses
          const autoCCEmails = displayRecipients.map(r => r.email);

          // Get current CC field
          const ccField = document.getElementById('emailCc');
          if (ccField) {
            // Get existing CC emails
            const existingCCs = parseEmailList(ccField.value);

            // Merge auto-CC emails (avoiding duplicates)
            const allCCs = [...autoCCEmails, ...existingCCs.filter(email => !autoCCEmails.includes(email))];

            // Update CC field with auto-CC recipients first, then existing ones
            ccField.value = allCCs.join(', ');
            console.log('Auto-CC recipients added to CC field:', allCCs);
          }
        }
      }

    } catch (error) {
      console.error('Error loading auto-CC recipients:', error);
    }
  }

  
  /**
   * Handle test mode toggle with auto-CC support
   */
  function handleTestModeToggleWithAutoCC() {
    handleTestModeToggle(); // Call original test mode handler

    // Reload auto-CC recipients for new test mode state
    if (currentVendorQuote && currentVendorQuote.id) {
      loadAutoCCRecipients(currentVendorQuote.id);
    }
  }

  // Auto-CC recipients are now directly added to CC field - no global functions needed

  // Public API
  return {
    init,
    openEmailModal,
    openTemplateManager
  };
})();