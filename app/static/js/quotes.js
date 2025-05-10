/**
 * Quotes module for managing quote data and UI interactions
 */
const QuotesModule = (function() {
  // Private variables
  let currentQuote = null;
  let quotesList = [];
  let isLoading = false;
  
  // DOM elements
  const elements = {
    quotesList: document.getElementById('quotesList'),
    quoteDetail: document.getElementById('quoteDetail'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    newQuoteBtn: document.getElementById('newQuoteBtn'),
    newQuoteModal: document.getElementById('newQuoteModal'),
    newQuoteForm: document.getElementById('newQuoteForm')
  };
  
  /**
   * Initialize the module
   */
  function init() {
    // Load quotes
    loadQuotes();
    
    // Add event listeners
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.clearSearchBtn.addEventListener('click', clearSearch);
    elements.newQuoteBtn.addEventListener('click', openNewQuoteModal);
    elements.newQuoteForm.addEventListener('submit', handleNewQuoteSubmit);
    
    // Close modal handlers
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(el => {
      el.addEventListener('click', closeModals);
    });
  }
  
  /**
   * Load quotes from the API
   * @param {string} search - Optional search string
   */
  async function loadQuotes(search = '') {
    try {
      elements.quotesList.innerHTML = '<div class="loading">Loading quotes...</div>';
      
      quotesList = await API.getQuotes(search);
      renderQuotesList();
      
      // If no quote is selected and we have quotes, select the first one
      if (!currentQuote && quotesList.length > 0) {
        loadQuoteDetail(quotesList[0].id);
      }
    } catch (error) {
      showToast(`Error loading quotes: ${error.message}`, 'error');
      elements.quotesList.innerHTML = '<div class="empty-state">Failed to load quotes</div>';
    }
  }
  
  /**
   * Render the quotes list
   */
  function renderQuotesList() {
    if (quotesList.length === 0) {
      elements.quotesList.innerHTML = '<div class="empty-state">No quotes found</div>';
      return;
    }
    
    elements.quotesList.innerHTML = quotesList.map(quote => `
      <div class="quote-item ${currentQuote && quote.id === currentQuote.id ? 'selected' : ''}" 
           data-id="${quote.id}">
        <div class="quote-number">${quote.quote_no}</div>
        <div class="quote-customer">${quote.customer}${quote.sales_rep ? ` (${quote.sales_rep})` : ''}</div>
        ${quote.description ? `<div class="quote-description">${truncateText(quote.description, 60)}</div>` : ''}
        <div class="quote-stats">
          <div class="quote-stat" title="Tasks">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${quote.completed_tasks || 0}/${quote.task_count || 0}
          </div>
          <div class="quote-stat" title="Vendor Quotes">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            ${quote.vendor_quote_count || 0}
          </div>
          <div class="quote-stat" title="Notes">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            ${quote.note_count || 0}
          </div>
        </div>
      </div>
    `).join('');
    
    // Add click event listeners
    document.querySelectorAll('.quote-item').forEach(item => {
      item.addEventListener('click', () => {
        if (isLoading) return; // Prevent clicking while loading
        loadQuoteDetail(parseInt(item.dataset.id, 10));
      });
    });
  }
  
  /**
   * Load quote details
   * @param {number} quoteId - The quote ID to load
   * @param {boolean} forceReload - Force reload even if it's the same quote
   */
  async function loadQuoteDetail(quoteId, forceReload = false) {
    // Don't reload if it's the same quote, unless forced to reload
    if (!forceReload && currentQuote && currentQuote.id === quoteId) return;
    
    try {
      isLoading = true;
      
      // Add loading state with transition
      if (elements.quoteDetail.innerHTML) {
        elements.quoteDetail.classList.add('loading');
        
        // Small delay for the fade out animation
        await new Promise(resolve => setTimeout(resolve, 150));
      } else {
        elements.quoteDetail.innerHTML = '<div class="loading">Loading quote details...</div>';
      }
      
      const quote = await API.getQuoteById(quoteId);
      currentQuote = quote;
      
      // Highlight selected quote in the list
      document.querySelectorAll('.quote-item').forEach(item => {
        item.classList.toggle('selected', parseInt(item.dataset.id, 10) === quoteId);
      });
      
      renderQuoteDetail();
    } catch (error) {
      showToast(`Error loading quote details: ${error.message}`, 'error');
      elements.quoteDetail.innerHTML = '<div class="empty-state">Failed to load quote details</div>';
    } finally {
      isLoading = false;
      elements.quoteDetail.classList.remove('loading');
    }
  }
  
  /**
   * Render quote details
   */
  function renderQuoteDetail() {
    if (!currentQuote) {
      elements.quoteDetail.innerHTML = '<div class="empty-state">Select a quote to view details</div>';
      return;
    }
    
    const tasksHtml = TasksModule.renderTasks(currentQuote.tasks);
    const vendorQuotesHtml = VendorQuotesModule.renderVendorQuotes(currentQuote.vendor_quotes);
    const notesHtml = NotesModule.renderNotes(currentQuote.notes);
    
    // Create sales rep dropdown HTML
    const salesReps = SettingsModule.getSalesReps();
    let salesRepDropdownHTML = `
      <select id="salesRepSelect" class="sales-rep-select">
        <option value="">Select a sales rep</option>
        ${salesReps.map(rep => `
          <option value="${rep}" ${currentQuote.sales_rep === rep ? 'selected' : ''}>${rep}</option>
        `).join('')}
      </select>
    `;
    
    elements.quoteDetail.innerHTML = `
      <!-- Quote Info Card -->
      <div class="quote-card">
        <div class="card-header">
          <h3 id="quoteNoDisplay" class="editable" data-field="quote_no" data-original="${currentQuote.quote_no}">${currentQuote.quote_no}</h3>
          <div class="quote-actions">
            <button class="btn small" id="editModeBtn">Edit</button>
            <button class="btn small primary" id="saveQuoteBtn" style="display: none;">Save</button>
            <button class="btn small" id="cancelEditBtn" style="display: none;">Cancel</button>
          </div>
        </div>
        
        <div class="card-content" id="quoteInfoCardContent">
          <div class="quote-info">
            <div class="info-group">
              <div class="info-label">Customer</div>
              <div class="info-value">
                <span id="customerDisplay" class="editable" data-field="customer" data-original="${currentQuote.customer}">${currentQuote.customer}</span>
              </div>
            </div>
            <div class="info-group">
              <div class="info-label">Sales Rep</div>
              <div class="info-value">${salesRepDropdownHTML}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Created</div>
              <div class="info-value">${formatDate(currentQuote.created_at)}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Last Updated</div>
              <div class="info-value">${formatDate(currentQuote.updated_at)}</div>
            </div>
          </div>
          
          <div class="info-group" style="margin-top: 0.5rem;">
            <div class="info-label">Description</div>
            <div class="info-value">
              <span id="descriptionDisplay" class="editable" data-field="description" data-original="${currentQuote.description || ''}">${currentQuote.description || 'No description'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tasks Card -->
      <div class="quote-card">
        <div class="card-header">
          <h3>Tasks</h3>
          <button class="btn small" id="addTaskBtn">Add Task</button>
        </div>
        <div class="card-content" id="tasksCardContent">
          <div id="tasksList">
            ${tasksHtml}
          </div>
        </div>
      </div>
      
      <!-- Vendor Quotes Card -->
      <div class="quote-card">
        <div class="card-header">
          <h3>Vendor Quotes</h3>
          <button class="btn small" id="addVendorQuoteBtn">Add Vendor Quote</button>
        </div>
        <div class="card-content" id="vendorQuotesCardContent">
          <div id="vendorQuotesList" class="vendor-quotes-list">
            ${vendorQuotesHtml}
          </div>
        </div>
      </div>
      
      <!-- Notes Card -->
      <div class="quote-card">
        <div class="card-header">
          <h3>Notes</h3>
          <button class="btn small" id="addNoteBtn">Add Note</button>
        </div>
        <div class="card-content" id="notesCardContent">
          <div id="notesList" class="notes-list">
            ${notesHtml}
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners for detail page actions
    document.getElementById('editModeBtn').addEventListener('click', enableEditMode);
    document.getElementById('saveQuoteBtn').addEventListener('click', saveQuoteChanges);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEditMode);
    document.getElementById('addTaskBtn').addEventListener('click', () => TasksModule.openAddTaskModal(currentQuote.id));
    document.getElementById('addVendorQuoteBtn').addEventListener('click', () => VendorQuotesModule.openAddVendorQuoteModal(currentQuote.id));
    document.getElementById('addNoteBtn').addEventListener('click', () => NotesModule.openAddNoteModal(currentQuote.id));
    
    // Add event listener for sales rep dropdown
    document.getElementById('salesRepSelect').addEventListener('change', handleSalesRepChange);
    
    // Initialize task checkboxes
    TasksModule.initTaskCheckboxes();
    
    // Initialize vendor quote controls
    VendorQuotesModule.initVendorQuoteControls();
    
    // Initialize note controls
    NotesModule.initNoteControls();
    
    // Update layout based on current container width
    updateDetailLayout();
    
    // Update scroll indicators after rendering
    setTimeout(updateScrollIndicators, 100);
    
    // Add scroll event listeners to all scrollable content areas
    document.querySelectorAll('.card-content').forEach(content => {
      content.addEventListener('scroll', function() {
        // Get the indicator element
        const indicator = this.querySelector('.scroll-indicator');
        if (indicator) {
          // If scrolled to bottom (or near bottom), hide the indicator
          const atBottom = Math.abs(this.scrollHeight - this.clientHeight - this.scrollTop) < 5;
          indicator.style.opacity = atBottom ? '0' : '1';
        }
      });
    });
  }
  
  /**
   * Handle sales rep change
   * @param {Event} event - Change event
   */
  async function handleSalesRepChange(event) {
    const salesRep = event.target.value;
    
    try {
      await API.updateQuote(currentQuote.id, {
        customer: currentQuote.customer,
        quote_no: currentQuote.quote_no,
        description: currentQuote.description,
        sales_rep: salesRep
      });
      
      // Update current quote object
      currentQuote.sales_rep = salesRep;
      
      // Update the quote in the quotes list
      const quoteIndex = quotesList.findIndex(q => q.id === currentQuote.id);
      if (quoteIndex !== -1) {
        quotesList[quoteIndex].sales_rep = salesRep;
        renderQuotesList();
      }
      
      showToast('Sales rep updated successfully', 'success');
    } catch (error) {
      showToast(`Failed to update sales rep: ${error.message}`, 'error');
      
      // Reset to previous value
      document.getElementById('salesRepSelect').value = currentQuote.sales_rep || '';
    }
  }
  
  /**
   * Handle search input
   */
  function handleSearch() {
    const searchValue = elements.searchInput.value.trim();
    loadQuotes(searchValue);
  }
  
  /**
   * Clear search
   */
  function clearSearch() {
    elements.searchInput.value = '';
    loadQuotes();
  }
  
  /**
   * Open new quote modal
   */
  function openNewQuoteModal() {
    elements.newQuoteModal.style.display = 'block';
    elements.newQuoteForm.reset();
    
    // Update sales rep dropdown - make sure to fully initialize it
    const salesRepSelect = document.getElementById('salesRepDropdown');
    if (salesRepSelect) {
      // Get the current list of sales reps and update dropdown
      const salesReps = SettingsModule.getSalesReps();
      if (salesReps && salesReps.length > 0) {
        SettingsModule.updateSalesRepDropdown(salesRepSelect);
      }
    }
    
    document.getElementById('customer').focus();
  }
  
  /**
   * Enable edit mode for quote details
   */
  function enableEditMode() {
    // Hide edit button, show save/cancel buttons
    document.getElementById('editModeBtn').style.display = 'none';
    document.getElementById('saveQuoteBtn').style.display = 'inline-block';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    
    // Make editable fields actually editable
    const editables = document.querySelectorAll('.editable');
    editables.forEach(element => {
      const field = element.dataset.field;
      const originalValue = element.dataset.original;
      
      // Save original content for cancellation
      element.dataset.displayContent = element.innerHTML;
      
      // Replace with appropriate input
      if (field === 'description') {
        element.innerHTML = `<textarea class="inline-edit-input" data-field="${field}">${originalValue}</textarea>`;
      } else {
        element.innerHTML = `<input type="text" class="inline-edit-input" data-field="${field}" value="${originalValue}">`;
      }
    });
    
    // Focus on the first input
    const firstInput = document.querySelector('.inline-edit-input');
    if (firstInput) {
      firstInput.focus();
    }
  }
  
  /**
   * Save quote changes
   */
  async function saveQuoteChanges() {
    // Get values from all inputs
    const inputs = document.querySelectorAll('.inline-edit-input');
    const formData = {};
    
    inputs.forEach(input => {
      formData[input.dataset.field] = input.value.trim();
    });
    
    // Add the current sales rep
    formData.sales_rep = document.getElementById('salesRepSelect').value;
    
    try {
      // Validate required fields
      if (!formData.customer || !formData.quote_no) {
        showToast('Customer and Quote # are required fields', 'error');
        return;
      }
      
      // Update the quote
      await API.updateQuote(currentQuote.id, formData);
      
      // Update the current quote object
      Object.keys(formData).forEach(key => {
        currentQuote[key] = formData[key];
      });
      
      // Update the quote in the list
      const quoteIndex = quotesList.findIndex(q => q.id === currentQuote.id);
      if (quoteIndex !== -1) {
        quotesList[quoteIndex] = { ...quotesList[quoteIndex], ...formData };
        renderQuotesList();
      }
      
      // Refresh the quote detail view
      renderQuoteDetail();
      
      showToast('Quote updated successfully', 'success');
    } catch (error) {
      showToast(`Failed to update quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Cancel edit mode without saving changes
   */
  function cancelEditMode() {
    // Restore elements to their original display state
    const editables = document.querySelectorAll('.editable');
    editables.forEach(element => {
      element.innerHTML = element.dataset.displayContent;
    });
    
    // Hide save/cancel buttons, show edit button
    document.getElementById('editModeBtn').style.display = 'inline-block';
    document.getElementById('saveQuoteBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
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
   * Handle new quote form submission
   * @param {Event} event - The submit event
   */
  async function handleNewQuoteSubmit(event) {
    event.preventDefault();
    
    const formData = {
      customer: document.getElementById('customer').value,
      quote_no: document.getElementById('quoteNo').value,
      description: document.getElementById('description').value,
      sales_rep: document.getElementById('salesRepDropdown').value
    };
    
    try {
      const result = await API.createQuote(formData);
      showToast('Quote created successfully', 'success');
      closeModals();
      loadQuotes();
      loadQuoteDetail(result.id);
    } catch (error) {
      showToast(`Failed to create quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Refresh the current quote data
   */
  function refreshCurrentQuote() {
    if (currentQuote) {
      loadQuoteDetail(currentQuote.id, true); // Force reload
    }
  }
  
  /**
   * Format a date string
   * @param {string} dateString - The date string
   * @returns {string} - Formatted date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  /**
   * Truncate text to a specific length and add ellipsis if needed
   * @param {string} text - The text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
  
  /**
   * Debounce function to limit how often a function can be called
   * @param {Function} func - The function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} - Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Public API
  return {
    init,
    loadQuotes,
    loadQuoteDetail,
    refreshCurrentQuote,
    getCurrentQuote: () => currentQuote
  };
})();