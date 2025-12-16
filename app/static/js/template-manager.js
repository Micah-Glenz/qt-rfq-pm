/**
 * Template Management module for handling email template CRUD operations
 */
const TemplateManager = (function() {
  'use strict';

  let templates = [];
  let vendors = [];
  let currentEditingTemplate = null;
  let availableVariables = {};

  /**
   * Initialize template manager
   */
  function init() {
    console.log('TemplateManager initialized');
    bindEvents();
    loadTemplates();
    setupAvailableVariables();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Create template button
    const createBtn = document.getElementById('createTemplateBtn');
    if (createBtn) {
      createBtn.addEventListener('click', openCreateTemplateModal);
    }

    // Specialty filter
    const specialtyFilter = document.getElementById('templateSpecialtyFilter');
    if (specialtyFilter) {
      specialtyFilter.addEventListener('change', filterTemplates);
    }
  }

  /**
   * Setup available variables for templates
   */
  function setupAvailableVariables() {
    availableVariables = {
      customer: 'Customer name',
      quote_no: 'Quote number',
      description: 'Quote description',
      sales_rep: 'Sales representative name',
      sales_rep_email: 'Sales representative email address',
      sales_rep_phone: 'Sales representative phone number',
      vendor_name: 'Vendor company name',
      contact_name: 'Vendor contact person',
      vendor_email: 'Vendor email address',
      vendor_phone: 'Vendor phone number',
      quote_type: 'Type of quote (freight, install, etc.)',
      quote_id: 'Internal quote ID',
      vendor_id: 'Internal vendor ID',
      vendor_quote_id: 'Vendor quote ID',
      current_date: 'Current date'
    };
  }

  /**
   * Load all email templates
   */
  async function loadTemplates() {
    try {
      templates = await API.getEmailTemplates();
      console.log('Loaded templates:', templates);
      renderTemplatesList();
    } catch (error) {
      console.error('Failed to load templates:', error);
      showToast('Failed to load email templates', 'error');
      renderTemplatesListError();
    }
  }

  /**
   * Render templates list
   */
  function renderTemplatesList() {
    const container = document.getElementById('templatesList');
    if (!container) return;

    if (templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No email templates found. Create your first template to get started.</p>
        </div>
      `;
      return;
    }

    const templatesHtml = templates.map(template => {
      const specialtyLabels = {
        'general': 'General',
        'freight': 'Freight',
        'install': 'Installation',
        'forward': 'Forwarding'
      };
      const specialtyLabel = specialtyLabels[template.specialty] || 'Unknown';
      const defaultBadge = template.is_default ? '<span class="badge default">Default</span>' : '';

      return `
        <div class="template-item" data-template-id="${template.id}">
          <div class="template-header">
            <h4 class="template-name">${escapeHtml(template.name || template.subject_template || 'Untitled Template')}</h4>
            <div class="template-actions">
              <button class="btn small secondary" onclick="TemplateManager.previewTemplate(${template.id})">Preview</button>
              <button class="btn small secondary" onclick="TemplateManager.editTemplate(${template.id})">Edit</button>
              <button class="btn small danger" onclick="TemplateManager.deleteTemplate(${template.id})" ${template.is_default ? 'disabled' : ''}>Delete</button>
            </div>
          </div>
          <div class="template-meta">
            <span class="template-specialty">${escapeHtml(specialtyLabel)} ${defaultBadge}</span>
            <span class="template-date">${formatDate(template.created_at)}</span>
          </div>
          <div class="template-preview">
            <p>${escapeHtml(truncateText(template.body_template || '', 100))}</p>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = templatesHtml;
  }

  /**
   * Render error state for templates list
   */
  function renderTemplatesListError() {
    const container = document.getElementById('templatesList');
    if (!container) return;

    container.innerHTML = `
      <div class="error-state">
        <p>Failed to load email templates. Please try again.</p>
        <button class="btn small" onclick="TemplateManager.loadTemplates()">Retry</button>
      </div>
    `;
  }

  /**
   * Filter templates based on specialty filter
   */
  function filterTemplates() {
    const specialty = document.getElementById('templateSpecialtyFilter')?.value || '';

    const filteredTemplates = templates.filter(template => {
      const matchesSpecialty = !specialty || template.specialty === specialty;
      return matchesSpecialty;
    });

    renderFilteredTemplates(filteredTemplates);
  }

  /**
   * Render filtered templates
   */
  function renderFilteredTemplates(filteredTemplates) {
    const container = document.getElementById('templatesList');
    if (!container) return;

    if (filteredTemplates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No templates match your search criteria.</p>
        </div>
      `;
      return;
    }

    // Reuse the same rendering logic but with filtered data
    const originalTemplates = templates;
    templates = filteredTemplates;
    renderTemplatesList();
    templates = originalTemplates;
  }

  /**
   * Open create template modal
   */
  function openCreateTemplateModal() {
    currentEditingTemplate = null;
    createTemplateModal();
  }

  /**
   * Open edit template modal
   */
  async function openEditTemplateModal(templateId) {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        showToast('Template not found', 'error');
        return;
      }

      currentEditingTemplate = template;
      createTemplateModal(template);
    } catch (error) {
      console.error('Failed to open template for editing:', error);
      showToast('Failed to open template for editing', 'error');
    }
  }

  /**
   * Create template modal
   */
  function createTemplateModal(template = null) {
    // Remove existing modal if present
    const existingModal = document.getElementById('templateEditModal');
    if (existingModal) {
      existingModal.remove();
    }

    const isEdit = template !== null;
    const modalTitle = isEdit ? 'Edit Email Template' : 'Create Email Template';

    const modalHtml = `
      <div id="templateEditModal" class="modal">
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h2>${modalTitle}</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="templateEditForm">
              <input type="hidden" id="templateId" name="id" value="${template?.id || ''}">

              <!-- Template Name (Subject) -->
              <div class="form-group">
                <label for="templateSubject">Template Subject *</label>
                <input type="text" id="templateSubject" name="subject_template" required
                       value="${escapeHtml(template?.subject_template || '')}"
                       placeholder="Enter email subject line (supports variables like {customer}, {quote_no})">
                <div class="character-count">
                  <span id="subjectCharCount">0</span>/200 characters
                </div>
              </div>

              <!-- Template Assignment -->
              <div class="form-group">
                <label for="templateSpecialty">Template Specialty *</label>
                <select id="templateSpecialty" name="specialty" required>
                  <option value="general" ${template?.specialty === 'general' ? 'selected' : ''}>General (All Vendors)</option>
                  <option value="freight" ${template?.specialty === 'freight' ? 'selected' : ''}>Freight</option>
                  <option value="install" ${template?.specialty === 'install' ? 'selected' : ''}>Installation</option>
                  <option value="forward" ${template?.specialty === 'forward' ? 'selected' : ''}>Forwarding/Consolidation</option>
                </select>
                <small class="form-help">Select the specialty for this template. Templates will be auto-selected for vendors of this type.</small>
              </div>

              <!-- Template Name -->
              <div class="form-group">
                <label for="templateNameField">Template Name *</label>
                <input type="text" id="templateNameField" name="name" required
                       value="${escapeHtml(template?.name || '')}"
                       placeholder="Enter a descriptive name for this template">
              </div>

              <!-- Default Template -->
              <div class="form-group">
                <label>
                  <input type="checkbox" id="templateDefault" name="is_default"
                         ${template?.is_default ? 'checked' : ''}>
                  Set as default template for this specialty
                </label>
                <small class="form-help">Default templates will be automatically used when sending emails to vendors of this specialty.</small>
              </div>

              <!-- Template Body -->
              <div class="form-group">
                <label for="templateBody">Template Body *</label>
                <textarea id="templateBody" name="body_template" rows="12" required
                          placeholder="Enter email body content (supports variables like {customer}, {vendor_name}, {quote_no}, etc.)">${escapeHtml(template?.body_template || '')}</textarea>
                <div class="template-actions">
                  <button type="button" id="showVariablesBtn" class="btn small secondary">Show Variables</button>
                  <button type="button" id="previewTemplateBtn" class="btn small secondary">Preview</button>
                </div>
              </div>

              <!-- Available Variables -->
              <div class="form-group" id="variablesSection" style="display: none;">
                <label>Available Variables:</label>
                <div class="variables-grid" id="variablesGrid">
                  <!-- Variables will be populated here -->
                </div>
              </div>

              <!-- Template Preview -->
              <div class="form-group" id="previewSection" style="display: none;">
                <label>Template Preview:</label>
                <div class="template-preview-content" id="templatePreviewContent">
                  <!-- Preview will be shown here -->
                </div>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="button" class="btn cancel-modal">Cancel</button>
                <button type="submit" class="btn primary" id="saveTemplateBtn">
                  <span class="btn-text">${isEdit ? 'Update Template' : 'Create Template'}</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="loading-spinner"></span>
                    ${isEdit ? 'Updating...' : 'Creating...'}
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

    // Bind modal events
    bindTemplateModalEvents();

    // Initialize character count
    updateCharacterCount();

    // Populate variables
    populateVariables();

    // Show the modal
    const modal = document.getElementById('templateEditModal');
    modal.classList.add('show');
  }

  /**
   * Bind template modal events
   */
  function bindTemplateModalEvents() {
    const modal = document.getElementById('templateEditModal');

    // Close modal events
    modal.querySelector('.close-modal').addEventListener('click', closeTemplateModal);
    modal.querySelector('.cancel-modal').addEventListener('click', closeTemplateModal);

    // Form submission
    document.getElementById('templateEditForm').addEventListener('submit', handleTemplateSubmit);

    // Character count
    document.getElementById('templateSubject').addEventListener('input', updateCharacterCount);

    // Variable controls
    document.getElementById('showVariablesBtn').addEventListener('click', toggleVariables);
    document.getElementById('previewTemplateBtn').addEventListener('click', updatePreview);

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTemplateModal();
      }
    });
  }

  /**
   * Update character count for subject field
   */
  function updateCharacterCount() {
    const subject = document.getElementById('templateSubject').value;
    const count = subject.length;
    const countElement = document.getElementById('subjectCharCount');

    if (countElement) {
      countElement.textContent = count;

      // Change color if approaching limit
      if (count > 180) {
        countElement.style.color = '#dc3545';
      } else if (count > 160) {
        countElement.style.color = '#ffc107';
      } else {
        countElement.style.color = '#6c757d';
      }
    }
  }

  /**
   * Populate available variables display
   */
  function populateVariables() {
    const variablesGrid = document.getElementById('variablesGrid');
    if (!variablesGrid) return;

    const variablesHtml = Object.entries(availableVariables)
      .map(([key, description]) => `
        <div class="variable-item">
          <strong>{${key}}</strong>
          <span class="variable-description">${description}</span>
        </div>
      `).join('');

    variablesGrid.innerHTML = variablesHtml;
  }

  /**
   * Toggle variables display
   */
  function toggleVariables() {
    const variablesSection = document.getElementById('variablesSection');
    const showBtn = document.getElementById('showVariablesBtn');

    if (variablesSection.style.display === 'none') {
      variablesSection.style.display = 'block';
      showBtn.textContent = 'Hide Variables';
    } else {
      variablesSection.style.display = 'none';
      showBtn.textContent = 'Show Variables';
    }
  }

  /**
   * Update template preview
   */
  function updatePreview() {
    const subject = document.getElementById('templateSubject').value;
    const body = document.getElementById('templateBody').value;
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('templatePreviewContent');

    if (!subject && !body) {
      previewSection.style.display = 'none';
      return;
    }

    previewSection.style.display = 'block';

    // Create sample variables for preview
    const sampleVariables = {
      customer: 'Sample Customer',
      quote_no: 'Q-2024-001',
      description: 'Sample project description',
      sales_rep: 'John Smith',
      sales_rep_email: 'john.smith@company.com',
      sales_rep_phone: '(555) 987-6543',
      vendor_name: 'Sample Vendor',
      contact_name: 'Jane Doe',
      vendor_email: 'vendor@example.com',
      vendor_phone: '(555) 123-4567',
      quote_type: 'freight',
      quote_id: '123',
      vendor_id: '456',
      vendor_quote_id: '789',
      current_date: new Date().toISOString().split('T')[0]
    };

    // Substitute variables
    const previewSubject = substituteVariables(subject, sampleVariables);
    const previewBody = substituteVariables(body, sampleVariables);

    previewContent.innerHTML = `
      <div class="preview-email">
        <div class="preview-subject"><strong>Subject:</strong> ${escapeHtml(previewSubject)}</div>
        <div class="preview-body">
          <strong>Body:</strong>
          <pre>${escapeHtml(previewBody)}</pre>
        </div>
      </div>
    `;
  }

  /**
   * Substitute variables in template content
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
   * Handle template form submission
   */
  async function handleTemplateSubmit(event) {
    event.preventDefault();

    const saveBtn = document.getElementById('saveTemplateBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnLoading = saveBtn.querySelector('.btn-loading');

    // Show loading state
    saveBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    try {
      const formData = new FormData(event.target);
      const templateData = {
        id: formData.get('id'),
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        subject_template: formData.get('subject_template'),
        body_template: formData.get('body_template'),
        is_default: formData.get('is_default') === 'on'
      };

      let response;
      if (templateData.id) {
        // Update existing template
        response = await API.updateEmailTemplate(templateData.id, templateData);
        showToast('Template updated successfully', 'success');
      } else {
        // Create new template
        response = await API.createEmailTemplate(templateData);
        showToast('Template created successfully', 'success');
      }

      // Close modal and reload templates
      closeTemplateModal();
      await loadTemplates();

    } catch (error) {
      console.error('Failed to save template:', error);
      showToast(`Failed to save template: ${error.message}`, 'error');
    } finally {
      // Hide loading state
      saveBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  /**
   * Close template modal
   */
  function closeTemplateModal() {
    const modal = document.getElementById('templateEditModal');
    if (modal) {
      modal.remove();
    }

    // Reset state
    currentEditingTemplate = null;
  }

  /**
   * Preview template
   */
  async function previewTemplate(templateId) {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        showToast('Template not found', 'error');
        return;
      }

      // Create preview modal
      createPreviewModal(template);

    } catch (error) {
      console.error('Failed to preview template:', error);
      showToast('Failed to preview template', 'error');
    }
  }

  /**
   * Create preview modal for template
   */
  function createPreviewModal(template) {
    // Remove existing modal if present
    const existingModal = document.getElementById('templatePreviewModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHtml = `
      <div id="templatePreviewModal" class="modal">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2>Template Preview: ${escapeHtml(template.subject_template || 'Untitled')}</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="template-preview-full">
              <div class="preview-subject">
                <strong>Subject:</strong> ${escapeHtml(template.subject_template || '')}
              </div>
              <div class="preview-body">
                <strong>Body:</strong>
                <pre>${escapeHtml(template.body_template || '')}</pre>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel-modal">Close</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind close events
    const modal = document.getElementById('templatePreviewModal');
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Show the modal
    modal.classList.add('show');
  }

  /**
   * Edit template
   */
  async function editTemplate(templateId) {
    await openEditTemplateModal(templateId);
  }

  /**
   * Delete template
   */
  async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await API.deleteEmailTemplate(templateId);
      showToast('Template deleted successfully', 'success');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      showToast(`Failed to delete template: ${error.message}`, 'error');
    }
  }

  /**
   * Utility function to format date
   */
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  /**
   * Utility function to truncate text
   */
  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Utility function to escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Utility function for debouncing
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  return {
    init,
    loadTemplates,
    previewTemplate,
    editTemplate,
    deleteTemplate
  };
})();