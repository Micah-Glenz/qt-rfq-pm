/**
 * Settings module for managing application settings
 */
const SettingsModule = (function() {
  // Private variables
  let defaultTasks = [];
  let salesReps = [];
  let vendors = [];

  // DOM elements
  const elements = {
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn')
  };
  
  /**
   * Initialize the module
   */
  function init() {
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);

    // Close modal handlers
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(el => {
      el.addEventListener('click', closeModals);
    });

    // Load sales reps from localStorage or initialize with defaults
    loadSalesReps();

    // Initialize sales rep dropdown in new quote modal
    const salesRepDropdown = document.getElementById('salesRepDropdown');
    if (salesRepDropdown) {
      updateSalesRepDropdown(salesRepDropdown);
    }

    // Initialize settings tabs
    initSettingsTabs();

    // Initialize font size
    initFontSize();

    // Initialize theme on page load
    initTheme();
  }
  
  /**
   * Load sales reps from API or localStorage for backward compatibility
   */
  async function loadSalesReps() {
    try {
      // Try to load from API first
      const response = await fetch('/api/sales-reps/');
      const result = await response.json();

      if (result.success) {
        salesReps = result.data;
        return;
      }
    } catch (error) {
      console.warn('Failed to load sales reps from API, falling back to localStorage:', error);
    }

    // Fallback to localStorage for backward compatibility
    const savedReps = localStorage.getItem('salesReps');

    if (savedReps) {
      const parsedReps = JSON.parse(savedReps);
      // Convert legacy string array to object format
      salesReps = parsedReps.map(rep =>
        typeof rep === 'string'
          ? { id: null, name: rep, email: null, phone: null, is_active: true }
          : rep
      );
    } else {
      // Default sales reps
      salesReps = [];
    }
  }

  /**
   * Save sales reps to localStorage (legacy fallback)
   */
  function saveSalesReps() {
    // Only save to localStorage if API is not available or if we have legacy data
    localStorage.setItem('salesReps', JSON.stringify(salesReps));
  }

  /**
   * Get the current list of sales reps
   * @returns {Array} - Array of sales rep objects
   */
  function getSalesReps() {
    return salesReps;
  }
  
  /**
   * Open settings modal
   */
  function openSettingsModal() {
    renderSalesReps();
    loadApiConfig();

    // Initialize theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      const currentTheme = localStorage.getItem('theme') || 'default';
      themeSelect.value = currentTheme;

      // Add event listener for theme changes
      themeSelect.addEventListener('change', function() {
        const selectedTheme = this.value;
        applyTheme(selectedTheme);
        localStorage.setItem('theme', selectedTheme);
      });
    }

    // Initialize show hidden quotes toggle
    const showHiddenToggle = document.getElementById('showHiddenToggle');
    if (showHiddenToggle) {
      showHiddenToggle.checked = localStorage.getItem('showHiddenQuotes') === 'true';

      // Add event listener for show hidden toggle
      showHiddenToggle.addEventListener('change', function() {
        const showHidden = this.checked;
        localStorage.setItem('showHiddenQuotes', showHidden);
        // Reload quotes with new hidden setting
        QuotesModule.reloadQuotes();
      });
    }

    // Set up vendor form event listeners
    const addVendorBtn = document.getElementById('addVendorBtn');
    if (addVendorBtn) {
      addVendorBtn.addEventListener('click', handleAddVendor);
    }

    // Set up sales rep form event listeners
    const addSalesRepBtn = document.getElementById('addSalesRepBtn');
    if (addSalesRepBtn) {
      addSalesRepBtn.addEventListener('click', handleAddSalesRep);
    }

    // Load vendors when vendors tab is activated
    const vendorsTab = document.querySelector('[data-tab="vendors"]');
    if (vendorsTab) {
      vendorsTab.addEventListener('click', () => {
        loadVendors();
      });
    }

    elements.settingsModal.style.display = 'block';
  }
  
  /**
   * Load API configuration
   */
  async function loadApiConfig() {
    try {
      const config = await fetch('/api/config').then(res => res.json());
      
      const urlInput = document.getElementById('gasApiUrl');
      const keyInput = document.getElementById('gasApiKey');
      const spreadsheetInput = document.getElementById('defaultSpreadsheetId');
      
      if (urlInput) {
        urlInput.value = config.gas_api_url || '';
      }
      
      if (keyInput) {
        // Don't populate the key for security, just show if it's set
        keyInput.placeholder = config.gas_api_key_set ? 'API key is set' : 'Enter your API key';
      }
      
      if (spreadsheetInput) {
        spreadsheetInput.value = config.default_spreadsheet_id || '';
      }
    } catch (error) {
      console.error('Failed to load API config:', error);
    }
  }
  
  /**
   * Get API configuration
   */
  async function getApiConfig() {
    try {
      const config = await fetch('/api/config').then(res => res.json());
      return config;
    } catch (error) {
      console.error('Failed to get API config:', error);
      return {};
    }
  }
  
  /**
   * Render sales reps list matching vendor pattern
   */
  function renderSalesReps() {
    const salesRepsContainer = document.getElementById('salesRepsList');
    if (!salesRepsContainer) return;

    if (salesReps.length === 0) {
      salesRepsContainer.innerHTML = '<div class="empty-state">No sales reps found</div>';
      return;
    }

    salesRepsContainer.innerHTML = salesReps.map(rep => `
      <div class="vendor-item" data-id="${rep.id}">
        <div class="vendor-info">
          <div class="vendor-name">${rep.name}</div>
          ${rep.email ? `<div class="vendor-contact">${rep.email}</div>` : ''}
          ${rep.phone ? `<div class="vendor-contact">${rep.phone}</div>` : ''}
          ${!rep.is_active ? '<div class="vendor-contact" style="color: #999; font-style: italic;">Inactive</div>' : ''}
        </div>
        <div class="vendor-actions">
          <button class="vendor-edit-btn" data-id="${rep.id}">✏️</button>
          <button class="vendor-delete-btn" data-id="${rep.id}">×</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.vendor-edit-btn').forEach(btn => {
      btn.addEventListener('click', handleEditSalesRep);
    });
    document.querySelectorAll('.vendor-delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteSalesRep);
    });
  }
  
  /**
   * Handle edit sales rep - matches vendor pattern
   * @param {Event} event - Click event
   */
  async function handleEditSalesRep(event) {
    const salesRepId = parseInt(event.target.dataset.id, 10);
    const rep = salesReps.find(r => r.id === salesRepId);

    if (!rep) {
      showToast('Sales rep not found', 'error');
      return;
    }

    // Populate form with sales rep data
    populateSalesRepForm(rep);

    // Change button to update mode
    const addSalesRepBtn = document.getElementById('addSalesRepBtn');
    if (addSalesRepBtn) {
      addSalesRepBtn.textContent = 'Update Sales Rep';
      addSalesRepBtn.onclick = () => handleUpdateSalesRep(salesRepId);
      // Remove the original click listener to prevent conflicts
      addSalesRepBtn.removeEventListener('click', handleAddSalesRep);
    }

    // Scroll to form
    const salesRepForm = document.getElementById('newSalesRepName');
    if (salesRepForm) {
      salesRepForm.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Populate sales rep form with sales rep data for editing
   * @param {Object} rep - Sales rep object
   */
  function populateSalesRepForm(rep) {
    const nameInput = document.getElementById('newSalesRepName');
    const emailInput = document.getElementById('newSalesRepEmail');
    const phoneInput = document.getElementById('newSalesRepPhone');

    // Populate form fields
    if (nameInput) nameInput.value = rep.name || '';
    if (emailInput) emailInput.value = rep.email || '';
    if (phoneInput) phoneInput.value = rep.phone || '';
  }

  /**
   * Reset sales rep form to add mode
   */
  function resetSalesRepForm() {
    const nameInput = document.getElementById('newSalesRepName');
    const emailInput = document.getElementById('newSalesRepEmail');
    const phoneInput = document.getElementById('newSalesRepPhone');
    const addSalesRepBtn = document.getElementById('addSalesRepBtn');

    // Clear all form fields
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';

    // Reset button to add mode
    if (addSalesRepBtn) {
      addSalesRepBtn.textContent = 'Add Sales Rep';
      addSalesRepBtn.onclick = handleAddSalesRep;
      // Add back the original click listener
      addSalesRepBtn.addEventListener('click', handleAddSalesRep);
    }
  }

  /**
   * Handle delete sales rep
   * @param {Event} event - Click event
   */
  async function handleDeleteSalesRep(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const rep = salesReps[index];

    if (!rep) {
      showToast('Sales rep not found', 'error');
      return;
    }

    const action = rep.is_active ? 'deactivate' : 'delete';
    const confirmMessage = rep.is_active
      ? `Are you sure you want to deactivate "${rep.name}"? You can reactivate them later.`
      : `Are you sure you want to permanently delete "${rep.name}"? This cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // For legacy reps without ID, just remove from localStorage
    if (!rep.id) {
      salesReps.splice(index, 1);
      saveSalesReps();
      renderSalesReps();
      updateSalesRepDropdown();
      showToast('Sales rep deleted successfully', 'success');
      return;
    }

    // For API-managed reps, call the API
    try {
      const response = await fetch(`/api/sales-reps/${rep.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete sales rep');
      }

      // Remove from local array and re-render
      salesReps.splice(index, 1);
      renderSalesReps();
      updateSalesRepDropdown();

      showToast(`Sales rep ${action}d successfully`, 'success');
    } catch (error) {
      showToast(`Failed to ${action} sales rep: ${error.message}`, 'error');
    }
  }
  
  
  /**
   * Handle add sales rep - matches vendor pattern
   */
  async function handleAddSalesRep() {
    const nameInput = document.getElementById('newSalesRepName');
    const emailInput = document.getElementById('newSalesRepEmail');
    const phoneInput = document.getElementById('newSalesRepPhone');

    // Check if elements exist
    if (!nameInput || !emailInput || !phoneInput) {
      console.error('Sales rep form elements not found');
      showToast('Error: Sales rep form not properly initialized', 'error');
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim() || null;
    const phone = phoneInput.value.trim() || null;

    if (!name) {
      showToast('Sales rep name cannot be empty', 'error');
      return;
    }

    try {
      const salesRepData = {
        name: name,
        email: email || null,
        phone: phone || null,
        is_active: true
      };

      // Try to add via API first
      const response = await fetch('/api/sales-reps/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(salesRepData)
      });

      const result = await response.json();

      if (result.success) {
        salesReps.push(result.data);
      } else {
        throw new Error(result.error || 'Failed to add sales rep');
      }

      // Clear form
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';

      // Reload sales reps
      renderSalesReps();
      updateSalesRepDropdown();

      showToast('Sales rep added successfully', 'success');
    } catch (error) {
      console.warn('Failed to add sales rep via API, falling back to localStorage:', error);

      // Fallback to localStorage for offline functionality
      salesReps.push({
        id: null,
        name: name,
        email: email,
        phone: phone,
        is_active: true
      });
      saveSalesReps();

      // Clear form
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';

      // Reload sales reps
      renderSalesReps();
      updateSalesRepDropdown();

      showToast('Sales rep added locally (sync unavailable)', 'success');
    }
  }

  /**
   * Handle update sales rep
   * @param {number} salesRepId - Sales Rep ID to update
   */
  async function handleUpdateSalesRep(salesRepId) {
    const nameInput = document.getElementById('newSalesRepName');
    const emailInput = document.getElementById('newSalesRepEmail');
    const phoneInput = document.getElementById('newSalesRepPhone');

    // Check if elements exist
    if (!nameInput || !emailInput || !phoneInput) {
      console.error('Sales rep form elements not found');
      showToast('Error: Sales rep form not properly initialized', 'error');
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim() || null;
    const phone = phoneInput.value.trim() || null;

    if (!name) {
      showToast('Sales rep name cannot be empty', 'error');
      return;
    }

    try {
      const salesRepData = {
        name: name,
        email: email || null,
        phone: phone || null,
        is_active: true
      };

      const response = await fetch(`/api/sales-reps/${salesRepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(salesRepData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update sales rep');
      }

      // Reset form to add mode
      resetSalesRepForm();

      // Reload sales reps
      renderSalesReps();
      updateSalesRepDropdown();

      showToast('Sales rep updated successfully', 'success');
    } catch (error) {
      showToast(`Failed to update sales rep: ${error.message}`, 'error');
    }
  }
  
  /**
   * Update sales rep dropdown with current options
   * @param {HTMLElement} dropdown - The dropdown element to update
   */
  function updateSalesRepDropdown(dropdown) {
    const currentValue = dropdown.value;

    // Create options - use both ID and name for value
    let options = '<option value="">Select a sales rep</option>';
    salesReps.forEach(rep => {
      if (rep.is_active) {
        // Use ID as value if available, otherwise use name for legacy reps
        const value = rep.id ? rep.id : rep.name;
        options += `<option value="${value}">${rep.name}</option>`;
      }
    });

    dropdown.innerHTML = options;

    // Try to restore selected value
    if (currentValue) {
      // Check if the selected value still exists (by ID or name)
      const stillExists = salesReps.some(rep =>
        (rep.id && rep.id.toString() === currentValue.toString()) ||
        (!rep.id && rep.name === currentValue)
      );

      if (stillExists) {
        dropdown.value = currentValue;
      }
    }
  }

  
  /**
   * Load vendors from API
   */
  async function loadVendors() {
    try {
      vendors = await API.getVendors(true); // Get active vendors only
      renderVendors();
    } catch (error) {
      console.error('Failed to load vendors:', error);
      showToast('Failed to load vendors', 'error');
    }
  }

  /**
   * Render vendors list
   */
  function renderVendors() {
    const vendorsContainer = document.getElementById('vendorsList');
    if (!vendorsContainer) return;

    if (vendors.length === 0) {
      vendorsContainer.innerHTML = '<div class="empty-state">No vendors found</div>';
      return;
    }

    vendorsContainer.innerHTML = vendors.map(vendor => `
      <div class="vendor-item" data-id="${vendor.id}">
        <div class="vendor-info">
          <div class="vendor-name">${vendor.name}</div>
          <div class="vendor-specialization">${vendor.specialization || 'No specialization'}</div>
          ${vendor.contact_info ? `<div class="vendor-contact">${vendor.contact_info}</div>` : ''}
        </div>
        <div class="vendor-actions">
          <button class="vendor-edit-btn" data-id="${vendor.id}">✏️</button>
          <button class="vendor-delete-btn" data-id="${vendor.id}">×</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.vendor-edit-btn').forEach(btn => {
      btn.addEventListener('click', handleEditVendor);
    });
    document.querySelectorAll('.vendor-delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteVendor);
    });
  }

  /**
   * Handle edit vendor
   * @param {Event} event - Click event
   */
  async function handleEditVendor(event) {
    const vendorId = parseInt(event.target.dataset.id, 10);
    const vendor = vendors.find(v => v.id === vendorId);

    if (!vendor) {
      showToast('Vendor not found', 'error');
      return;
    }

    // Populate form with vendor data
    populateVendorForm(vendor);

    // Change button to update mode
    const addVendorBtn = document.getElementById('addVendorBtn');
    if (addVendorBtn) {
      addVendorBtn.textContent = 'Update Vendor';
      addVendorBtn.onclick = () => handleUpdateVendor(vendorId);
      // Remove the original click listener to prevent conflicts
      addVendorBtn.removeEventListener('click', handleAddVendor);
    }

    // Scroll to form
    const vendorForm = document.getElementById('vendorForm');
    if (vendorForm) {
      vendorForm.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Populate vendor form with vendor data for editing
   * @param {Object} vendor - Vendor object
   */
  function populateVendorForm(vendor) {
    const nameInput = document.getElementById('newVendorName');
    const contactInput = document.getElementById('newVendorContact');
    const emailInput = document.getElementById('newVendorEmail');
    const phoneInput = document.getElementById('newVendorPhone');
    const specializationInput = document.getElementById('newVendorSpecialization');
    const notesInput = document.getElementById('newVendorNotes');

    // Parse contact_info to extract individual fields
    let contact = '';
    let email = '';
    let phone = '';
    let notes = '';

    if (vendor.contact_info) {
      const parts = vendor.contact_info.split(' | ');
      contact = parts[0] || '';
      // Look for email and phone in the parts
      parts.forEach(part => {
        if (part.includes('@')) email = part;
        if (/^\(?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(part)) phone = part;
        if (part.startsWith('Notes: ')) notes = part.substring(7);
      });
    }

    // Populate form fields
    if (nameInput) nameInput.value = vendor.name || '';
    if (contactInput) contactInput.value = contact;
    if (emailInput) emailInput.value = email;
    if (phoneInput) phoneInput.value = phone;
    if (specializationInput) specializationInput.value = vendor.specialization || '';
    if (notesInput) notesInput.value = notes;
  }

  /**
   * Handle update vendor
   * @param {number} vendorId - Vendor ID to update
   */
  async function handleUpdateVendor(vendorId) {
    const nameInput = document.getElementById('newVendorName');
    const contactInput = document.getElementById('newVendorContact');
    const emailInput = document.getElementById('newVendorEmail');
    const phoneInput = document.getElementById('newVendorPhone');
    const specializationInput = document.getElementById('newVendorSpecialization');
    const notesInput = document.getElementById('newVendorNotes');

    // Check if elements exist
    if (!nameInput || !contactInput || !emailInput || !phoneInput || !specializationInput || !notesInput) {
      console.error('Vendor form elements not found');
      showToast('Error: Vendor form not properly initialized', 'error');
      return;
    }

    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const specialization = specializationInput.value.trim();
    const notes = notesInput.value.trim();

    if (!name) {
      showToast('Vendor name cannot be empty', 'error');
      return;
    }

    try {
      const vendorData = {
        name: name,
        contact_name: contact || null,
        email: email || null,
        phone: phone || null,
        specialization: specialization || null,
        notes: notes || null
      };

      await API.updateVendor(vendorId, vendorData);

      // Reset form to add mode
      resetVendorForm();

      // Reload vendors
      await loadVendors();

      showToast('Vendor updated successfully', 'success');
    } catch (error) {
      showToast(`Failed to update vendor: ${error.message}`, 'error');
    }
  }

  /**
   * Reset vendor form to add mode
   */
  function resetVendorForm() {
    const nameInput = document.getElementById('newVendorName');
    const contactInput = document.getElementById('newVendorContact');
    const emailInput = document.getElementById('newVendorEmail');
    const phoneInput = document.getElementById('newVendorPhone');
    const specializationInput = document.getElementById('newVendorSpecialization');
    const notesInput = document.getElementById('newVendorNotes');
    const addVendorBtn = document.getElementById('addVendorBtn');

    // Clear all form fields
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (specializationInput) specializationInput.value = '';
    if (notesInput) notesInput.value = '';

    // Reset button to add mode
    if (addVendorBtn) {
      addVendorBtn.textContent = 'Add Vendor';
      addVendorBtn.onclick = handleAddVendor;
      // Add back the original click listener
      addVendorBtn.addEventListener('click', handleAddVendor);
    }
  }

  /**
   * Handle add vendor
   */
  async function handleAddVendor() {
    const nameInput = document.getElementById('newVendorName');
    const contactInput = document.getElementById('newVendorContact');
    const emailInput = document.getElementById('newVendorEmail');
    const phoneInput = document.getElementById('newVendorPhone');
    const specializationInput = document.getElementById('newVendorSpecialization');
    const notesInput = document.getElementById('newVendorNotes');

    // Check if elements exist
    if (!nameInput || !contactInput || !emailInput || !phoneInput || !specializationInput || !notesInput) {
      console.error('Vendor form elements not found');
      showToast('Error: Vendor form not properly initialized', 'error');
      return;
    }

    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const specialization = specializationInput.value.trim();
    const notes = notesInput.value.trim();

    if (!name) {
      showToast('Vendor name cannot be empty', 'error');
      return;
    }

    try {
      const vendorData = {
        name: name,
        contact_name: contact || null,
        email: email || null,
        phone: phone || null,
        specialization: specialization || null,
        notes: notes || null,
        is_active: true
      };

      const newVendor = await API.createVendor(vendorData);

      // Clear form
      nameInput.value = '';
      contactInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      specializationInput.value = '';
      notesInput.value = '';

      // Reload vendors
      await loadVendors();

      showToast('Vendor added successfully', 'success');
    } catch (error) {
      showToast(`Failed to add vendor: ${error.message}`, 'error');
    }
  }

  /**
   * Handle delete vendor
   * @param {Event} event - Click event
   */
  async function handleDeleteVendor(event) {
    const vendorId = parseInt(event.target.dataset.id, 10);
    const vendor = vendors.find(v => v.id === vendorId);

    if (!vendor) return;

    if (confirm(`Are you sure you want to delete "${vendor.name}"? This will mark the vendor as inactive but won't remove existing vendor quotes.`)) {
      try {
        await API.deleteVendor(vendorId);
        await loadVendors();
        showToast('Vendor deleted successfully', 'success');
      } catch (error) {
        showToast(`Failed to delete vendor: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Close all modals
   */
  function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }
  
  /**
   * Load default tasks from the API
   */
  async function loadDefaultTasks() {
    try {
      elements.defaultTasksList.innerHTML = '<div class="loading">Loading default tasks...</div>';
      
      defaultTasks = await API.getDefaultTasks();
      renderDefaultTasks();
      
      // Initialize drag-and-drop functionality
      initSortable();
    } catch (error) {
      showToast(`Error loading default tasks: ${error.message}`, 'error');
      elements.defaultTasksList.innerHTML = '<div class="empty-state">Failed to load default tasks</div>';
    }
  }
  
  /**
   * Render default tasks
   */
  function renderDefaultTasks() {
    if (defaultTasks.length === 0) {
      elements.defaultTasksList.innerHTML = '<div class="empty-state">No default tasks</div>';
      return;
    }
    
    elements.defaultTasksList.innerHTML = defaultTasks.map(task => `
      <div class="default-task-item ${task.is_separator ? 'separator' : ''}" data-id="${task.id}">
        <div class="task-label">${task.label}</div>
        <div class="task-actions">
          <span class="delete-task" data-id="${task.id}">×</span>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.default-task-item .delete-task').forEach(btn => {
      btn.addEventListener('click', handleDeleteDefaultTask);
    });
  }
  
  /**
   * Initialize sortable functionality for dragging and reordering tasks
   */
  function initSortable() {
    // For simplicity, we'll implement a very basic drag-and-drop
    // In a production app, you'd use a library like SortableJS
    
    const tasksList = elements.defaultTasksList;
    const taskItems = tasksList.querySelectorAll('.default-task-item');
    
    taskItems.forEach(item => {
      item.draggable = true;
      
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', item.dataset.id);
        item.classList.add('dragging');
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });
    
    tasksList.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = getDragAfterElement(tasksList, e.clientY);
      const draggable = document.querySelector('.dragging');
      
      if (afterElement) {
        tasksList.insertBefore(draggable, afterElement);
      } else {
        tasksList.appendChild(draggable);
      }
    });
  }
  
  /**
   * Helper function to determine where to place dragged element
   * @param {HTMLElement} container - The container element
   * @param {number} y - The y position
   * @returns {HTMLElement} - The element to insert after
   */
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.default-task-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  /**
   * Handle adding a default task
   */
  function handleAddDefaultTask() {
    const taskLabel = elements.newTaskInput.value.trim();
    
    if (!taskLabel) {
      showToast('Task label cannot be empty', 'error');
      return;
    }
    
    addDefaultTask(taskLabel, false);
  }
  
  /**
   * Handle adding a default separator
   */
  function handleAddDefaultSeparator() {
    const taskLabel = elements.newTaskInput.value.trim();
    
    if (!taskLabel) {
      showToast('Separator label cannot be empty', 'error');
      return;
    }
    
    addDefaultTask(taskLabel, true);
  }
  
  /**
   * Add a default task
   * @param {string} label - The task label
   * @param {boolean} isSeparator - Whether this is a separator
   */
  async function addDefaultTask(label, isSeparator) {
    try {
      // Calculate next sort order
      const lastTask = defaultTasks.length > 0 ? defaultTasks[defaultTasks.length - 1] : null;
      const sortOrder = lastTask ? lastTask.sort_order + 10 : 0;
      
      await API.createDefaultTask({ 
        label, 
        is_separator: isSeparator,
        sort_order: sortOrder
      });
      
      elements.newTaskInput.value = '';
      loadDefaultTasks();
      showToast(`${isSeparator ? 'Separator' : 'Task'} added successfully`, 'success');
    } catch (error) {
      showToast(`Failed to add ${isSeparator ? 'separator' : 'task'}: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle deleting a default task
   * @param {Event} event - Click event
   */
  async function handleDeleteDefaultTask(event) {
    const taskId = parseInt(event.target.dataset.id, 10);
    
    if (confirm('Are you sure you want to delete this default task?')) {
      try {
        await API.deleteDefaultTask(taskId);
        loadDefaultTasks();
        showToast('Default task deleted successfully', 'success');
      } catch (error) {
        showToast(`Failed to delete default task: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Handle saving settings (reordering tasks and API config)
   */
  async function handleSaveSettings() {
    try {
      // Save API configuration if changed
      const urlInput = document.getElementById('gasApiUrl');
      const keyInput = document.getElementById('gasApiKey');
      const spreadsheetInput = document.getElementById('defaultSpreadsheetId');
      
      if (urlInput || keyInput || spreadsheetInput) {
        const configData = {};
        
        if (urlInput && urlInput.value) {
          configData.gas_api_url = urlInput.value;
        }
        
        // Only send key if it was changed
        if (keyInput && keyInput.value) {
          configData.gas_api_key = keyInput.value;
        }
        
        if (spreadsheetInput && spreadsheetInput.value) {
          configData.default_spreadsheet_id = spreadsheetInput.value;
        }
        
        if (Object.keys(configData).length > 0) {
          await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
          });
        }
      }
      
      // Get all task IDs in current order
      const taskIds = Array.from(
        document.querySelectorAll('.default-task-item')
      ).map(el => parseInt(el.dataset.id, 10));
      
      if (taskIds.length > 0) {
        await API.reorderDefaultTasks(taskIds);
      }
      
      showToast('Settings saved successfully', 'success');
      closeModals();
    } catch (error) {
      showToast(`Failed to save settings: ${error.message}`, 'error');
    }
  }
  
  /**
   * Get the show hidden quotes setting
   * @returns {boolean} - Whether to show hidden quotes
   */
  function getShowHiddenQuotes() {
    return localStorage.getItem('showHiddenQuotes') === 'true';
  }
  
  /**
   * Apply a theme to the application
   * @param {string} themeName - The name of the theme to apply
   */
  function applyTheme(themeName) {
    const body = document.body;
    
    // Remove all theme classes
    const themeClasses = ['dark-mode', 'chill-coffee', 'ocean-breeze', 'sunset-glow', 'forest-mist', 'cherry-blossom', 'midnight-purple', 'cyberpunk', 'dingy-dank'];
    themeClasses.forEach(theme => body.classList.remove(theme));
    
    // Add new theme class (if not default)
    if (themeName !== 'default') {
      body.classList.add(themeName);
    }
  }
  
  /**
   * Initialize settings tabs
   */
  function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const content = document.getElementById(`${tabName}Tab`);
        if (content) {
          content.classList.add('active');
        }

        // Initialize TemplateManager when email templates tab is activated
        if (tabName === 'email-templates' && typeof TemplateManager !== 'undefined') {
          TemplateManager.init();
        }
      });
    });
  }
  
  /**
   * Initialize font size control
   */
  function initFontSize() {
    const savedFontSize = localStorage.getItem('fontSize') || '14';
    applyFontSize(savedFontSize);
    
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    if (fontSizeSlider && fontSizeValue) {
      fontSizeSlider.value = savedFontSize;
      fontSizeValue.textContent = `${savedFontSize}px`;
      
      fontSizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        fontSizeValue.textContent = `${size}px`;
        applyFontSize(size);
        localStorage.setItem('fontSize', size);
      });
    }
  }
  
  /**
   * Apply font size to the application
   * @param {string} size - Font size in pixels
   */
  function applyFontSize(size) {
    document.documentElement.style.setProperty('--font-size-base', `${size}px`);
  }
  
  /**
   * Initialize theme on page load
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    applyTheme(savedTheme);
  }

    
  // Public API
  return {
    init,
    getSalesReps,
    updateSalesRepDropdown,
    handleAddSalesRep,
    handleAddVendor,
    getApiConfig,
    getShowHiddenQuotes,
    initTheme,
    initFontSize,
    applyFontSize,
    // Vendor editing functions
    handleEditVendor,
    handleUpdateVendor,
    populateVendorForm,
    resetVendorForm,
    loadVendors
  };
})();