/**
 * Settings module for managing application settings
 */
const SettingsModule = (function() {
  // Private variables
  let defaultTasks = [];
  let salesReps = [];
  
  // DOM elements
  const elements = {
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    defaultTasksList: document.getElementById('defaultTasksList'),
    newTaskInput: document.getElementById('newTaskInput'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    addSeparatorBtn: document.getElementById('addSeparatorBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn')
  };
  
  /**
   * Initialize the module
   */
  function init() {
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.addTaskBtn.addEventListener('click', handleAddDefaultTask);
    elements.addSeparatorBtn.addEventListener('click', handleAddDefaultSeparator);
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
  }
  
  /**
   * Load sales reps from localStorage or initialize with defaults
   */
  function loadSalesReps() {
    const savedReps = localStorage.getItem('salesReps');
    
    if (savedReps) {
      salesReps = JSON.parse(savedReps);
    } else {
      // Default sales reps
      salesReps = ['test'];
      saveSalesReps();
    }
  }
  
  /**
   * Save sales reps to localStorage
   */
  function saveSalesReps() {
    localStorage.setItem('salesReps', JSON.stringify(salesReps));
  }
  
  /**
   * Get the current list of sales reps
   * @returns {Array} - Array of sales rep names
   */
  function getSalesReps() {
    return salesReps;
  }
  
  /**
   * Open settings modal
   */
  function openSettingsModal() {
    loadDefaultTasks();
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
   * Render sales reps list
   */
  function renderSalesReps() {
    const salesRepsContainer = document.getElementById('salesRepsList');
    if (!salesRepsContainer) return;
    
    if (salesReps.length === 0) {
      salesRepsContainer.innerHTML = '<div class="empty-state">No sales reps</div>';
      return;
    }
    
    salesRepsContainer.innerHTML = salesReps.map((rep, index) => `
      <div class="sales-rep-item" data-index="${index}">
        <div class="sales-rep-name">${rep}</div>
        <div class="sales-rep-delete" data-index="${index}">×</div>
      </div>
    `).join('');
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.sales-rep-delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteSalesRep);
    });
  }
  
  /**
   * Handle delete sales rep
   * @param {Event} event - Click event
   */
  function handleDeleteSalesRep(event) {
    const index = parseInt(event.target.dataset.index, 10);
    
    if (confirm(`Are you sure you want to delete "${salesReps[index]}"?`)) {
      salesReps.splice(index, 1);
      saveSalesReps();
      renderSalesReps();
      
      // Update all sales rep dropdowns
      const dropdowns = document.querySelectorAll('.sales-rep-select');
      dropdowns.forEach(dropdown => {
        const selectedValue = dropdown.value;
        updateSalesRepDropdown(dropdown);
        dropdown.value = selectedValue;
      });
    }
  }
  
  /**
   * Handle add sales rep
   */
  function handleAddSalesRep() {
    const newRepInput = document.getElementById('newSalesRepInput');
    const repName = newRepInput.value.trim();
    
    if (!repName) {
      showToast('Sales rep name cannot be empty', 'error');
      return;
    }
    
    // Check for duplicates
    if (salesReps.includes(repName)) {
      showToast('Sales rep already exists', 'error');
      return;
    }
    
    salesReps.push(repName);
    saveSalesReps();
    newRepInput.value = '';
    renderSalesReps();
    
    // Update all sales rep dropdowns
    const dropdowns = document.querySelectorAll('.sales-rep-select');
    dropdowns.forEach(dropdown => {
      updateSalesRepDropdown(dropdown);
    });
    
    showToast('Sales rep added successfully', 'success');
  }
  
  /**
   * Update sales rep dropdown with current options
   * @param {HTMLElement} dropdown - The dropdown element to update
   */
  function updateSalesRepDropdown(dropdown) {
    const currentValue = dropdown.value;
    
    // Create options
    let options = '<option value="">Select a sales rep</option>';
    salesReps.forEach(rep => {
      options += `<option value="${rep}">${rep}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // Restore selected value if it still exists
    if (salesReps.includes(currentValue)) {
      dropdown.value = currentValue;
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
    getApiConfig,
    getShowHiddenQuotes,
    initTheme,
    initFontSize,
    applyFontSize
  };
})();