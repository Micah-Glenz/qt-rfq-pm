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
    // Load quotes with hidden status from settings
    const includeHidden = SettingsModule.getShowHiddenQuotes();
    loadQuotes('', includeHidden);
    
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
   * @param {boolean} includeHidden - Whether to include hidden quotes
   */
  async function loadQuotes(search = '', includeHidden = false) {
    try {
      elements.quotesList.innerHTML = '<div class="loading">Loading quotes...</div>';
      
      quotesList = await API.getQuotes(search, includeHidden);
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
   * Update header status indicator
   */
  function updateHeaderStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (!statusIndicator || !statusText || quotesList.length === 0) {
      if (statusText) statusText.textContent = 'No quotes';
      return;
    }
    
    // Calculate quote completion statistics
    let totalQuotes = quotesList.length;
    let finishedQuotes = 0;
    let quotesWithTasks = 0;
    
    quotesList.forEach(quote => {
      if (quote.task_count > 0) {
        quotesWithTasks++;
        // A quote is finished if all its tasks are completed
        if (quote.completed_tasks === quote.task_count) {
          finishedQuotes++;
        }
      }
    });
    
    // Determine status message and class
    let statusClass = 'info';
    let statusMessage = '';
    
    if (quotesWithTasks === 0) {
      statusMessage = `${totalQuotes} quotes`;
      statusClass = 'info';
    } else {
      if (finishedQuotes === quotesWithTasks) {
        statusMessage = `All quotes finished (${finishedQuotes}/${quotesWithTasks})`;
        statusClass = 'success';
      } else {
        statusMessage = `${finishedQuotes} finished / ${quotesWithTasks} total`;
        statusClass = finishedQuotes > quotesWithTasks / 2 ? 'success' : finishedQuotes < quotesWithTasks / 3 ? 'warning' : 'info';
      }
    }
    
    // Update UI
    statusIndicator.className = `status-indicator ${statusClass}`;
    statusText.textContent = statusMessage;
  }

  /**
   * Render the quotes list
   */
  function renderQuotesList() {
    if (quotesList.length === 0) {
      elements.quotesList.innerHTML = '<div class="empty-state">No quotes found</div>';
      updateHeaderStatus();
      return;
    }
    
    elements.quotesList.innerHTML = quotesList.map(quote => {
      // Determine task completion status
      const hasAllTasksCompleted = quote.task_count > 0 && quote.completed_tasks === quote.task_count;
      const hasAnyTasks = quote.task_count > 0;
      
      return `
      <div class="quote-item ${currentQuote && quote.id === currentQuote.id ? 'selected' : ''} ${quote.hidden ? 'hidden' : ''}" 
           data-id="${quote.id}">
        <div class="quote-customer-row">
          <div class="quote-line-1">${quote.customer}</div>
          <div class="quote-completion-status">
            ${hasAnyTasks ? `
              <div class="completion-indicator ${hasAllTasksCompleted ? 'all-completed' : 'incomplete'}" 
                   title="${hasAllTasksCompleted ? 'All tasks completed' : 'Tasks remaining'}">
                <div class="completion-dot"></div>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="quote-details">
          <div class="quote-line-2">
            <span class="quote-number">${quote.quote_no}</span>
            ${quote.sales_rep ? `<span class="quote-sales-rep">${quote.sales_rep}</span>` : ''}
          </div>
          ${quote.description ? `<div class="quote-line-description">${quote.description}</div>` : ''}
        </div>
        <div class="quote-line-3">
          ${quote.task_count > 0 ? `
            <span class="quote-icon" title="Tasks">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              ${quote.completed_tasks || 0}/${quote.task_count || 0}
            </span>
          ` : ''}
          ${quote.vendor_quote_count > 0 ? `
            <span class="quote-icon" title="Vendor Quotes">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              ${quote.vendor_quote_count}
            </span>
          ` : ''}
          ${quote.note_count > 0 ? `
            <span class="quote-icon" title="Notes">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              ${quote.note_count}
            </span>
          ` : ''}
        </div>
          </div>
        </div>
      </div>
    `;
    }).join('');
    
    // Add click event listeners
    document.querySelectorAll('.quote-item').forEach(item => {
      item.addEventListener('click', () => {
        if (isLoading) return; // Prevent clicking while loading
        loadQuoteDetail(parseInt(item.dataset.id, 10));
      });
    });
    
    // Update header status
    updateHeaderStatus();
  }
  
  /**
   * Load quote details
   * @param {number} quoteId - The quote ID to load
   * @param {boolean} forceReload - Force reload even if it's the same quote
   */
  async function loadQuoteDetail(quoteId, forceReload = false) {
    // Don't reload if it's the same quote, unless forced to reload
    if (!forceReload && currentQuote && currentQuote.id === quoteId) return;
    
    // Clear stored task order when changing quotes
    TasksModule.clearStoredOrder();
    
    try {
      isLoading = true;
      
      // Check if we need to create the initial structure or just update content
      const needsInitialRender = !elements.quoteDetail.innerHTML || elements.quoteDetail.innerHTML.includes('empty-state') || elements.quoteDetail.innerHTML.includes('Loading');
      
      if (needsInitialRender) {
        // First time loading or error state - show loading message
        elements.quoteDetail.innerHTML = '<div class="loading">Loading quote details...</div>';
      } else {
        // Add subtle loading indicator for content updates
        elements.quoteDetail.classList.add('updating');
      }
      
      const quote = await API.getQuoteById(quoteId);
      const previousQuote = currentQuote;
      currentQuote = quote;
      
      // Log all Google-related data
      console.group(`Google-related data for Quote ID: ${quoteId}`);
      console.log('Quote Number:', quote.quote_no);
      console.log('Customer:', quote.customer);
      console.log('Google Project Sheet URL:', quote.project_sheet_url || 'Not set');
      console.log('Google MPSF Link:', quote.mpsf_link || 'Not set');
      console.log('Google Drive Folder Link:', quote.folder_link || 'Not set');
      console.log('Method Link:', quote.method_link || 'Not set');
      console.log('Full quote object:', quote);
      console.groupEnd();
      
      // Update tabs with the current quote
      TabsModule.updateCurrentQuote(quote);
      
      // Highlight selected quote in the list
      document.querySelectorAll('.quote-item').forEach(item => {
        item.classList.toggle('selected', parseInt(item.dataset.id, 10) === quoteId);
      });
      
      if (needsInitialRender) {
        // Full render for initial load
        renderQuoteDetail();
      } else {
        // Efficient update for quote switching
        updateQuoteDetailContent(previousQuote, quote);
      }
    } catch (error) {
      showToast(`Error loading quote details: ${error.message}`, 'error');
      elements.quoteDetail.innerHTML = '<div class="empty-state">Failed to load quote details</div>';
    } finally {
      isLoading = false;
      elements.quoteDetail.classList.remove('loading');
      elements.quoteDetail.classList.remove('updating');
    }
  }
  
  /**
   * Update quote detail content without full re-render
   * @param {Object} previousQuote - The previously loaded quote
   * @param {Object} newQuote - The new quote to display
   */
  function updateQuoteDetailContent(previousQuote, newQuote) {
    // Update quote information section
    updateQuoteInfoSection(newQuote);
    
    // Update tasks section
    const tasksHtml = TasksModule.renderTasks(newQuote.tasks);
    const tasksList = document.getElementById('tasksList');
    if (tasksList) {
      tasksList.innerHTML = tasksHtml;
      TasksModule.initTaskCheckboxes();
    }
    
    // Update vendor quotes section
    const vendorQuotesHtml = VendorQuotesModule.renderVendorQuotes(newQuote.vendor_quotes);
    const vendorQuotesList = document.getElementById('vendorQuotesList');
    if (vendorQuotesList) {
      vendorQuotesList.innerHTML = vendorQuotesHtml;
      VendorQuotesModule.initVendorQuoteControls();
    }
    
    // Update notes section
    const notesHtml = NotesModule.renderNotes(newQuote.notes);
    const notesList = document.getElementById('notesList');
    if (notesList) {
      notesList.innerHTML = notesHtml;
      NotesModule.initNoteControls();
    }
    
    // Update events section
    const eventsHtml = EventsModule.renderEvents(newQuote.events);
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
      eventsList.innerHTML = eventsHtml;
      EventsModule.initEventControls();
    }
    
    // Update event listeners for the new quote
    updateDetailEventListeners();
  }
  
  /**
   * Update the quote information section
   * @param {Object} quote - The quote object
   */
  function updateQuoteInfoSection(quote) {
    // Update quote number
    const quoteNoDisplay = document.getElementById('quoteNoDisplay');
    if (quoteNoDisplay) {
      quoteNoDisplay.textContent = quote.quote_no;
      quoteNoDisplay.dataset.original = quote.quote_no;
    }
    
    // Update customer
    const customerDisplay = document.getElementById('customerDisplay');
    if (customerDisplay) {
      customerDisplay.textContent = quote.customer;
      customerDisplay.dataset.original = quote.customer;
    }
    
    // Update sales rep
    const salesRepDisplay = document.getElementById('salesRepDisplay');
    if (salesRepDisplay) {
      salesRepDisplay.textContent = quote.sales_rep || 'No sales rep assigned';
      salesRepDisplay.dataset.original = quote.sales_rep || '';
    }
    
    // Update description
    const descriptionDisplay = document.getElementById('descriptionDisplay');
    if (descriptionDisplay) {
      descriptionDisplay.textContent = quote.description || 'No description';
      descriptionDisplay.dataset.original = quote.description || '';
    }
    
    // Update project links
    updateProjectLinksSection(quote);
    
    // Update timestamps
    updateTimestamps(quote);
    
    // Update hide button text
    const hideBtn = document.getElementById('hideQuoteBtn');
    if (hideBtn) {
      hideBtn.textContent = quote.hidden ? 'Unhide' : 'Hide';
    }
  }
  
  /**
   * Update project links section
   * @param {Object} quote - The quote object
   */
  function updateProjectLinksSection(quote) {
    const projectLinksContainer = document.querySelector('.project-links');
    
    // Check if any project links exist
    const hasLinks = quote.project_sheet_url || quote.mpsf_link || quote.folder_link || quote.method_link;
    
    if (hasLinks) {
      const projectLinksHTML = `
        <div class="info-label">Project Links</div>
        <div class="project-links-container">
          ${quote.project_sheet_url ? `
            <div class="project-link">
              <a href="${quote.project_sheet_url}" target="_blank" class="link-button">
                Open Project Sheet 📊
              </a>
            </div>
          ` : ''}
          ${quote.mpsf_link ? `
            <div class="project-link">
              <a href="${quote.mpsf_link}" target="_blank" class="link-button">
                Open MPSF 📄
              </a>
            </div>
          ` : ''}
          ${quote.folder_link ? `
            <div class="project-link">
              <a href="${quote.folder_link}" target="_blank" class="link-button">
                Open Drive Folder 📁
              </a>
            </div>
          ` : ''}
          ${quote.method_link ? `
            <div class="project-link">
              <a href="${quote.method_link}" target="_blank" class="link-button">
                Open Method 🔧
              </a>
            </div>
          ` : ''}
        </div>
      `;
      
      if (projectLinksContainer) {
        projectLinksContainer.innerHTML = projectLinksHTML;
        projectLinksContainer.style.display = 'block';
      } else {
        // Create project links section if it doesn't exist
        const infoGroup = document.querySelector('.quote-info-dates');
        if (infoGroup) {
          const projectLinksDiv = document.createElement('div');
          projectLinksDiv.className = 'project-links';
          projectLinksDiv.style.marginTop = '1rem';
          projectLinksDiv.style.paddingTop = '0.5rem';
          projectLinksDiv.style.borderTop = '1px solid var(--border-color)';
          projectLinksDiv.innerHTML = projectLinksHTML;
          infoGroup.parentNode.insertBefore(projectLinksDiv, infoGroup.nextSibling);
        }
      }
    } else if (projectLinksContainer) {
      projectLinksContainer.style.display = 'none';
    }
    
    // Update editable link fields
    updateEditableLinkFields(quote);
  }
  
  /**
   * Update editable link fields
   * @param {Object} quote - The quote object
   */
  function updateEditableLinkFields(quote) {
    const linkFields = [
      { id: 'projectSheetUrlDisplay', field: 'project_sheet_url', defaultText: 'No project sheet URL' },
      { id: 'mpsfLinkDisplay', field: 'mpsf_link', defaultText: 'No MPSF link' },
      { id: 'folderLinkDisplay', field: 'folder_link', defaultText: 'No folder link' },
      { id: 'methodLinkDisplay', field: 'method_link', defaultText: 'No method link' }
    ];
    
    linkFields.forEach(({ id, field, defaultText }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = quote[field] || defaultText;
        element.dataset.original = quote[field] || '';
      }
    });
  }
  
  /**
   * Update timestamps section
   * @param {Object} quote - The quote object
   */
  function updateTimestamps(quote) {
    const infoGroups = document.querySelectorAll('.quote-info-dates .info-group');
    if (infoGroups.length >= 2) {
      // Update created timestamp
      const createdValue = infoGroups[0].querySelector('.info-value');
      if (createdValue) {
        createdValue.textContent = formatDate(quote.created_at);
      }
      
      // Update updated timestamp
      const updatedValue = infoGroups[1].querySelector('.info-value');
      if (updatedValue) {
        updatedValue.textContent = formatDate(quote.updated_at);
      }
    }
  }
  
  /**
   * Update event listeners for detail page
   */
  function updateDetailEventListeners() {
    // Remove existing listeners and add new ones
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addVendorQuoteBtn = document.getElementById('addVendorQuoteBtn');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addEventBtn = document.getElementById('addEventBtn');
    
    if (addTaskBtn) {
      addTaskBtn.replaceWith(addTaskBtn.cloneNode(true));
      document.getElementById('addTaskBtn').addEventListener('click', () => TasksModule.openAddTaskModal(currentQuote.id));
    }
    
    if (addVendorQuoteBtn) {
      addVendorQuoteBtn.replaceWith(addVendorQuoteBtn.cloneNode(true));
      document.getElementById('addVendorQuoteBtn').addEventListener('click', () => VendorQuotesModule.openAddVendorQuoteModal(currentQuote.id));
    }
    
    if (addNoteBtn) {
      addNoteBtn.replaceWith(addNoteBtn.cloneNode(true));
      document.getElementById('addNoteBtn').addEventListener('click', () => NotesModule.openAddNoteModal(currentQuote.id));
    }
    
    if (addEventBtn) {
      addEventBtn.replaceWith(addEventBtn.cloneNode(true));
      document.getElementById('addEventBtn').addEventListener('click', () => EventsModule.openAddEventModal(currentQuote.id));
    }
    
    // Re-add click-to-copy functionality for view mode
    document.querySelectorAll('.clickable-copy').forEach(element => {
      element.addEventListener('click', handleClickToCopy);
    });
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
    const eventsHtml = EventsModule.renderEvents(currentQuote.events);
    
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
      <div class="quote-title">
        <h2 class="quote-title-main">${currentQuote.customer}</h2>
        ${currentQuote.description ? `<p class="quote-title-description">${currentQuote.description}</p>` : ''}
      </div>
      <div class="quote-columns-container">
        <div class="left-column">
        <!-- Quote Info Card -->
        <div class="quote-card details-card">
          <div class="card-header">
            <h3>Details</h3>
            <div class="quote-actions">
              <button class="btn small" id="editModeBtn">Edit</button>
              <button class="btn small" id="hideQuoteBtn" style="display: none;">${currentQuote.hidden ? 'Unhide' : 'Hide'}</button>
              <button class="btn small primary" id="saveQuoteBtn" style="display: none;">Save</button>
              <button class="btn small" id="cancelEditBtn" style="display: none;">Cancel</button>
            </div>
          </div>
          
          <div class="card-content" id="quoteInfoCardContent">
            <div class="quote-info">
              <div class="info-group">
                <div class="info-label">Quote Number</div>
                <div class="info-value">
                  <span id="quoteNoDisplay" class="editable clickable-copy" data-field="quote_no" data-original="${currentQuote.quote_no}" title="Click to copy">${currentQuote.quote_no}</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-label">Customer</div>
                <div class="info-value">
                  <span id="customerDisplay" class="editable clickable-copy" data-field="customer" data-original="${currentQuote.customer}" title="Click to copy">${currentQuote.customer}</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-label">Sales Rep</div>
                <div class="info-value">
                  <span id="salesRepDisplay" class="editable clickable-copy" data-field="sales_rep" data-original="${currentQuote.sales_rep || ''}" title="Click to copy">${currentQuote.sales_rep || 'No sales rep assigned'}</span>
                </div>
              </div>
            </div>
            
            <div class="info-group" style="margin-top: 0.5rem;">
              <div class="info-label">Description</div>
              <div class="info-value">
                <span id="descriptionDisplay" class="editable clickable-copy" data-field="description" data-original="${currentQuote.description || ''}" title="Click to copy">${currentQuote.description || 'No description'}</span>
              </div>
            </div>
            
            <div class="quote-info-dates" style="margin-top: 0.75rem;">
              <div class="info-group">
                <div class="info-label">Created</div>
                <div class="info-value">${formatDate(currentQuote.created_at)}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Last Updated</div>
                <div class="info-value">${formatDate(currentQuote.updated_at)}</div>
              </div>
            </div>
            
            <!-- Project links section - shown in both view and edit mode -->
            ${currentQuote.project_sheet_url || currentQuote.mpsf_link || currentQuote.folder_link || currentQuote.method_link ? `
              <div class="project-links" style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                <div class="info-label">Project Links</div>
                <div class="project-links-container">
                  ${currentQuote.project_sheet_url ? `
                    <div class="project-link">
                      <a href="${currentQuote.project_sheet_url}" target="_blank" class="link-button">
                        Open Project Sheet 📊
                      </a>
                    </div>
                  ` : ''}
                  ${currentQuote.mpsf_link ? `
                    <div class="project-link">
                      <a href="${currentQuote.mpsf_link}" target="_blank" class="link-button">
                        Open MPSF 📄
                      </a>
                    </div>
                  ` : ''}
                  ${currentQuote.folder_link ? `
                    <div class="project-link">
                      <a href="${currentQuote.folder_link}" target="_blank" class="link-button">
                        Open Drive Folder 📁
                      </a>
                    </div>
                  ` : ''}
                  ${currentQuote.method_link ? `
                    <div class="project-link">
                      <a href="${currentQuote.method_link}" target="_blank" class="link-button">
                        Open Method 🔧
                      </a>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            <!-- Editable link fields - hidden by default, shown in edit mode -->
            <div class="google-links-edit" style="margin-top: 1rem; display: none; flex-direction: column; gap: 0.5rem;">
              <div class="info-group">
                <div class="info-label">Project Sheet URL</div>
                <div class="info-value">
                  <span id="projectSheetUrlDisplay" class="editable" data-field="project_sheet_url" data-original="${currentQuote.project_sheet_url || ''}">${currentQuote.project_sheet_url || 'No project sheet URL'}</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-label">MPSF Link</div>
                <div class="info-value">
                  <span id="mpsfLinkDisplay" class="editable" data-field="mpsf_link" data-original="${currentQuote.mpsf_link || ''}">${currentQuote.mpsf_link || 'No MPSF link'}</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-label">Drive Folder Link</div>
                <div class="info-value">
                  <span id="folderLinkDisplay" class="editable" data-field="folder_link" data-original="${currentQuote.folder_link || ''}">${currentQuote.folder_link || 'No folder link'}</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-label">Method Link</div>
                <div class="info-value">
                  <span id="methodLinkDisplay" class="editable" data-field="method_link" data-original="${currentQuote.method_link || ''}">${currentQuote.method_link || 'No method link'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Vendor Quotes Card -->
        <div class="quote-card vendor-quotes-card">
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
      </div>

      <div class="tasks-column">
        <!-- Tasks Card -->
        <div class="quote-card tasks-card">
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
      </div>

      <div class="notes-column">
        <!-- Notes Card -->
        <div class="quote-card notes-card">
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
      </div>

      <div class="events-column">
        <!-- Events Card -->
        <div class="quote-card events-card">
          <div class="card-header">
            <h3>Events</h3>
            <button class="btn small" id="addEventBtn">Add Event</button>
          </div>
          <div class="card-content" id="eventsCardContent">
            <div id="eventsList" class="events-list">
              ${eventsHtml}
            </div>
          </div>
        </div>

      </div>
      </div>
    `;
    
    // Add event listeners for detail page actions
    document.getElementById('editModeBtn').addEventListener('click', enableEditMode);
    document.getElementById('hideQuoteBtn').addEventListener('click', toggleQuoteHidden);
    document.getElementById('saveQuoteBtn').addEventListener('click', saveQuoteChanges);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEditMode);
    document.getElementById('addTaskBtn').addEventListener('click', () => TasksModule.openAddTaskModal(currentQuote.id));
    document.getElementById('addVendorQuoteBtn').addEventListener('click', () => VendorQuotesModule.openAddVendorQuoteModal(currentQuote.id));
    document.getElementById('addNoteBtn').addEventListener('click', () => NotesModule.openAddNoteModal(currentQuote.id));
    document.getElementById('addEventBtn').addEventListener('click', () => EventsModule.openAddEventModal(currentQuote.id));
    
    // Add click-to-copy functionality for view mode
    document.querySelectorAll('.clickable-copy').forEach(element => {
      element.addEventListener('click', handleClickToCopy);
    });
    
    // Initialize task checkboxes
    TasksModule.initTaskCheckboxes();
    
    // Initialize vendor quote controls
    VendorQuotesModule.initVendorQuoteControls();

    // Initialize note controls
    NotesModule.initNoteControls();
    // Initialize event controls
    EventsModule.initEventControls();
    
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
   * Toggle quote hidden status
   */
  async function toggleQuoteHidden() {
    try {
      const newHiddenStatus = !currentQuote.hidden;
      
      // Update the quote with new hidden status
      const updatedData = {
        customer: currentQuote.customer,
        quote_no: currentQuote.quote_no,
        description: currentQuote.description,
        sales_rep: currentQuote.sales_rep,
        hidden: newHiddenStatus
      };
      
      await API.updateQuote(currentQuote.id, updatedData);
      
      // Update the current quote object
      currentQuote.hidden = newHiddenStatus;
      
      // Update the button text
      document.getElementById('hideQuoteBtn').textContent = newHiddenStatus ? 'Unhide' : 'Hide';
      
      // Get the show hidden setting
      const includeHidden = SettingsModule.getShowHiddenQuotes();
      
      if (!includeHidden && newHiddenStatus) {
        // If hiding the quote and not showing hidden quotes, reload the list
        const searchValue = elements.searchInput.value.trim();
        loadQuotes(searchValue, includeHidden);
        
        // Clear the detail view
        elements.quoteDetail.innerHTML = '<div class="empty-state">Select a quote to view details</div>';
        currentQuote = null;
      } else {
        // Just update the quote in the list
        const quoteIndex = quotesList.findIndex(q => q.id === currentQuote.id);
        if (quoteIndex !== -1) {
          quotesList[quoteIndex].hidden = newHiddenStatus;
          renderQuotesList();
        }
      }
      
      showToast(`Quote ${newHiddenStatus ? 'hidden' : 'unhidden'} successfully`, 'success');
    } catch (error) {
      showToast(`Failed to update quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle search input
   */
  function handleSearch() {
    const searchValue = elements.searchInput.value.trim();
    const includeHidden = SettingsModule.getShowHiddenQuotes();
    loadQuotes(searchValue, includeHidden);
  }
  
  /**
   * Clear search
   */
  function clearSearch() {
    elements.searchInput.value = '';
    const includeHidden = SettingsModule.getShowHiddenQuotes();
    loadQuotes('', includeHidden);
  }
  
  /**
   * Handle project checkbox change
   */
  function handleProjectCheckboxChange(event) {
    const projectOptions = document.getElementById('projectOptions');
    const isChecked = event.target.checked;
    
    if (projectOptions) {
      projectOptions.style.display = isChecked ? 'block' : 'none';
      
      // If checked, populate project description with quote description
      if (isChecked) {
        const descriptionValue = document.getElementById('description').value;
        const projectDescInput = document.getElementById('projectDescription');
        if (projectDescInput && descriptionValue) {
          projectDescInput.value = descriptionValue;
        }
      }
    }
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
    
    // Set create project checkbox to checked by default
    const createProjectCheckbox = document.getElementById('createProject');
    if (createProjectCheckbox) {
      createProjectCheckbox.checked = true;
    }
    
    document.getElementById('customer').focus();
  }
  
  /**
   * Handle click-to-copy functionality
   * @param {Event} event - Click event
   */
  function handleClickToCopy(event) {
    // Don't copy if we're in edit mode
    if (document.querySelector('.details-card.edit-mode')) {
      return;
    }
    
    const element = event.target;
    const textToCopy = element.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show feedback
      const originalText = element.textContent;
      element.textContent = 'Copied!';
      element.style.color = 'var(--success-color)';
      
      setTimeout(() => {
        element.textContent = originalText;
        element.style.color = '';
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy to clipboard', 'error');
    });
  }
  
  /**
   * Enable edit mode for quote details
   */
  function enableEditMode() {
    // Hide edit button, show save/cancel/hide buttons
    document.getElementById('editModeBtn').style.display = 'none';
    document.getElementById('saveQuoteBtn').style.display = 'inline-block';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('hideQuoteBtn').style.display = 'inline-block';
    
    // Add edit-mode class to the card
    document.querySelector('.details-card').classList.add('edit-mode');
    
    // Remove click-to-copy functionality in edit mode
    document.querySelectorAll('.clickable-copy').forEach(element => {
      element.removeEventListener('click', handleClickToCopy);
      element.classList.remove('clickable-copy');
    });
    
    // Show the editable link fields in edit mode
    const googleLinksEdit = document.querySelector('.google-links-edit');
    
    if (googleLinksEdit) {
      googleLinksEdit.style.display = 'flex';
    }
    
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
      } else if (field === 'sales_rep') {
        // Replace with dropdown for sales rep
        const salesReps = SettingsModule.getSalesReps();
        element.innerHTML = `
          <select id="salesRepSelect" class="inline-edit-input sales-rep-select" data-field="${field}">
            <option value="">Select a sales rep</option>
            ${salesReps.map(rep => `
              <option value="${rep}" ${originalValue === rep ? 'selected' : ''}>${rep}</option>
            `).join('')}
          </select>
        `;
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
      
      // Remove edit-mode class from the card
      document.querySelector('.details-card').classList.remove('edit-mode');
      
      // Hide the editable link fields
      const googleLinksEdit = document.querySelector('.google-links-edit');
      
      if (googleLinksEdit) {
        googleLinksEdit.style.display = 'none';
      }
      
      // Exit edit mode - hide save/cancel/hide buttons, show edit button
      document.getElementById('editModeBtn').style.display = 'inline-block';
      document.getElementById('saveQuoteBtn').style.display = 'none';
      document.getElementById('cancelEditBtn').style.display = 'none';
      document.getElementById('hideQuoteBtn').style.display = 'none';
      
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
    
    // Remove edit-mode class from the card
    document.querySelector('.details-card').classList.remove('edit-mode');
    
    // Hide the editable link fields
    const googleLinksEdit = document.querySelector('.google-links-edit');
    
    if (googleLinksEdit) {
      googleLinksEdit.style.display = 'none';
    }
    
    // Hide save/cancel/hide buttons, show edit button
    document.getElementById('editModeBtn').style.display = 'inline-block';
    document.getElementById('saveQuoteBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('hideQuoteBtn').style.display = 'none';
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
    
    const submitButton = document.getElementById('createQuoteBtn');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoading = submitButton.querySelector('.btn-loading');
    
    // Show loading state
    submitButton.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    
    const formData = {
      customer: document.getElementById('customer').value,
      quote_no: document.getElementById('quoteNo').value,
      description: document.getElementById('description').value,
      sales_rep: document.getElementById('salesRepDropdown').value
    };
    
    const createProject = document.getElementById('createProject').checked;
    
    // Get spreadsheet ID from settings
    const config = await SettingsModule.getApiConfig();
    const spreadsheetId = config.default_spreadsheet_id;
    
    // Add project creation data if checked and we have the necessary data
    if (createProject && formData.sales_rep && spreadsheetId) {
      formData.create_project = true;
      formData.project_description = formData.description;
      formData.spreadsheet_id = spreadsheetId;
    }
    
    try {
      const result = await API.createQuote(formData);
      
      if (result.project_error) {
        showToast(`Quote created, but project creation failed: ${result.project_error}`, 'warning');
      } else {
        showToast('Quote created successfully', 'success');
      }
      
      closeModals();
      loadQuotes();
      loadQuoteDetail(result.id);
    } catch (error) {
      showToast(`Failed to create quote: ${error.message}`, 'error');
    } finally {
      // Reset button state
      submitButton.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
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
   * Reload quotes with current settings
   */
  function reloadQuotes() {
    const searchValue = elements.searchInput.value.trim();
    const includeHidden = SettingsModule.getShowHiddenQuotes();
    loadQuotes(searchValue, includeHidden);
  }
  
  /**
   * Format a date string
   * @param {string} dateString - The date string
   * @returns {string} - Formatted date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format date using device's local time
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleString(undefined, options);
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
    reloadQuotes,
    getCurrentQuote: () => currentQuote
  };
})();
