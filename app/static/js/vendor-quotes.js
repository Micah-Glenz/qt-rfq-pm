/**
 * Vendor Quotes module for managing vendor quotes
 */
const VendorQuotesModule = (function() {
  /**
   * Render vendor quotes for a quote as information-dense table
   * @param {Array} vendorQuotes - Array of vendor quote objects
   * @returns {string} - HTML string
   */
  function renderVendorQuotes(vendorQuotes) {
    if (!vendorQuotes || vendorQuotes.length === 0) {
      return `
        <div class="compact-vendor-quotes">
          <div class="compact-header">
            <h3 class="compact-title">Vendor Quotes</h3>
            <button class="compact-action-btn" id="addVendorQuoteBtn">Add Vendor Quote</button>
          </div>
          <div class="compact-content">
            <div style="text-align: center; padding: 32px; color: #6b7280; font-size: 12px;">
              No vendor quotes available
            </div>
          </div>
        </div>
      `;
    }

    // Create compact layout with header and table
    let html = `
      <div class="compact-vendor-quotes">
        <div class="compact-header">
          <h3 class="compact-title">Vendor Quotes</h3>
          <button class="compact-action-btn" id="addVendorQuoteBtn">Add Vendor Quote</button>
        </div>
        <div class="compact-content">
          <div class="vendor-quotes-container">
            <div class="vendor-quotes-table-wrapper">
              <table class="corporate-vendor-quotes-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Cost</th>
                    <th>Lead Time</th>
                    <th>Contact</th>
                    <th>Notes</th>
                    <th style="text-align: right; padding-right: 12px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
    `;

    vendorQuotes.forEach(vq => {
      // Handle both legacy and enhanced vendor quote data
      const vendorName = vq.vendor?.name || vq.vendor || 'Unknown';
      const status = vq.status || getStatusFromLegacy(vq);
      const cost = vq.cost || '';
      const leadTime = vq.lead_time_days || '';
      const contact = vq.contact_person || vq.vendor?.contact_name || '';
      const notes = vq.notes || '';
      const quoteDate = vq.quote_date || vq.date || '';

      // Convert status to CSS class (lowercase, replace spaces with hyphens)
      const statusClass = status.toLowerCase().replace(/\s+/g, '-');

      // Format dates
      let formattedQuoteDate = '';
      if (quoteDate) {
        const dateObj = new Date(quoteDate);
        formattedQuoteDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      // Format cost with currency
      const formattedCost = cost ? `$${parseFloat(cost).toFixed(2)}` : '—';

      html += `
        <tr data-id="${vq.id}" data-status="${status}" class="vendor-quote-row">
          <td>
            <span class="corporate-vendor-type">${vq.type}</span>
          </td>
          <td>
            <div class="vendor-info">
              <div style="font-weight: 500; color: #374151;">${vendorName}</div>
              ${vq.vendor?.email ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${vq.vendor.email}</div>` : ''}
            </div>
          </td>
          <td>
            <span class="corporate-status-badge ${statusClass}">${status}</span>
          </td>
          <td style="color: #6b7280; font-size: 13px;">${formattedQuoteDate}</td>
          <td class="corporate-vendor-cost">${formattedCost}</td>
          <td class="corporate-lead-time">${leadTime ? `${leadTime} days` : '—'}</td>
          <td style="color: #6b7280; font-size: 13px;">${contact || '—'}</td>
          <td style="color: #6b7280; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${notes}">${notes || '—'}</td>
          <td>
            <div class="corporate-action-buttons">
              <button class="corporate-btn-sm secondary email-vendor-quote" data-id="${vq.id}" title="Send Email">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Email
              </button>
              <button class="corporate-btn-sm primary edit-vendor-quote" data-id="${vq.id}" title="Edit">Edit</button>
              <button class="corporate-btn-sm delete-vendor-quote" data-id="${vq.id}" title="Delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Convert legacy requested/entered status to new status system
   * @param {Object} vq - Vendor quote object
   * @returns {string} - Status string
   */
  function getStatusFromLegacy(vq) {
    if (vq.entered) return 'Firm';  // Received quotes are now Firm
    if (vq.requested) return 'Sent';  // Requested quotes are now Sent
    return 'Not Started';  // Default to Not Started
  }
  
  /**
   * Initialize vendor quote-related event listeners
   */
  function initVendorQuoteControls() {
    // Add Vendor Quote button (corporate layout)
    const addVendorQuoteBtn = document.getElementById('addVendorQuoteBtn');
    if (addVendorQuoteBtn) {
      // Get current quote from QuotesModule
      const currentQuote = QuotesModule.getCurrentQuote();
      if (currentQuote) {
        addVendorQuoteBtn.addEventListener('click', () => openAddVendorQuoteModal(currentQuote.id));
      }
    }

    // Edit buttons
    document.querySelectorAll('.edit-vendor-quote').forEach(btn => {
      btn.addEventListener('click', handleEditVendorQuote);
    });

    // Delete buttons
    document.querySelectorAll('.delete-vendor-quote').forEach(btn => {
      btn.addEventListener('click', handleDeleteVendorQuote);
    });

    // Email buttons
    document.querySelectorAll('.email-vendor-quote').forEach(btn => {
      btn.addEventListener('click', handleEmailVendorQuote);
    });

    // Add hover effect to table rows
    document.querySelectorAll('.vendor-quote-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.style.cursor = 'pointer';
      });
      row.addEventListener('mouseleave', () => {
        row.style.cursor = 'default';
      });

      // Row click to edit (optional UX improvement)
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.vendor-actions')) return;

        const editBtn = row.querySelector('.edit-vendor-quote');
        if (editBtn) {
          handleEditVendorQuote({ stopPropagation: () => {}, target: editBtn });
        }
      });
    });
  }
  
  /**
   * Handle inline note input
   */
  function handleNoteInput(event) {
    const noteElement = event.target;
    // Show placeholder when empty
    if (noteElement.innerText.trim() === '') {
      noteElement.classList.add('empty');
    } else {
      noteElement.classList.remove('empty');
    }
  }
  
  /**
   * Handle inline note blur (save changes)
   */
  async function handleNoteBlur(event) {
    const noteElement = event.target;
    const vendorQuoteId = parseInt(noteElement.dataset.id, 10);
    const originalValue = noteElement.dataset.original;
    const newValue = noteElement.innerText.trim();
    
    // If value hasn't changed, skip update
    if (newValue === originalValue) {
      return;
    }
    
    try {
      // Get current vendor quote data
      const currentQuote = QuotesModule.getCurrentQuote();
      const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
      
      if (vendorQuote) {
        // Update with new notes
        await API.updateVendorQuote(vendorQuoteId, {
          type: vendorQuote.type,
          vendor: vendorQuote.vendor,
          date: vendorQuote.date,
          notes: newValue,
          requested: vendorQuote.requested,
          entered: vendorQuote.entered
        });
        
        // Update the data attribute
        noteElement.dataset.original = newValue;
        
        // Update in current quote data
        vendorQuote.notes = newValue;

        // No full refresh needed - optimistic update already applied
      }
    } catch (error) {
      // Revert to original value on error
      noteElement.innerText = originalValue;
      showToast(`Failed to update notes: ${error.message}`, 'error');
    }
  }
  
  /**
   * Update vendor quote completion statistics optimistically in the quotes list
   * @param {number} quoteId - The quote ID
   * @param {number} vendorQuoteId - The vendor quote ID that changed
   * @param {boolean} isFullyComplete - Whether the vendor quote is now fully complete
   */
  function updateVendorQuoteCompletionOptimistically(quoteId, vendorQuoteId, isFullyComplete) {
    // Find the quote item in the list
    const quoteItem = document.querySelector(`.quote-item[data-id="${quoteId}"]`);
    if (!quoteItem) return;
    
    // Get the current quote data to calculate completion
    const currentQuote = QuotesModule.getCurrentQuote();
    if (!currentQuote) return;
    
    // Find the vendor quote and update its completion status
    const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
    if (!vendorQuote) return;
    
    // Calculate how many vendor quotes are fully complete
    let completedCount = 0;
    currentQuote.vendor_quotes.forEach(vq => {
      if (vq.id === vendorQuoteId) {
        // Use the new completion status for this vendor quote
        if (isFullyComplete) completedCount++;
      } else {
        // Use existing status for other vendor quotes
        if (vq.requested && vq.entered) completedCount++;
      }
    });
    
    const totalCount = currentQuote.vendor_quotes.length;
    
    // Update the vendor quote icon display
    const vendorQuoteIcon = quoteItem.querySelector('.quote-icon[title="Vendor Quotes"]');
    if (vendorQuoteIcon) {
      vendorQuoteIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        ${completedCount}/${totalCount}
      `;
    }
  }
  
  /**
   * Handle requested checkbox change
   * @param {Event} event - Change event
   */
  async function handleRequestedChange(event) {
    const checkbox = event.target;
    const vendorQuoteId = parseInt(checkbox.dataset.id, 10);
    const requested = checkbox.checked;
    
    // Update UI immediately for responsive feel
    const currentQuote = QuotesModule.getCurrentQuote();
    let vendorQuote = null;
    
    if (currentQuote) {
      vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
      if (vendorQuote) {
        // Update the data optimistically
        vendorQuote.requested = requested;
        
        // Update the UI to reflect completion status
        const item = checkbox.closest('.vendor-quote-item');
        if (item) {
          const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
          item.classList.toggle('fully-complete', isFullyComplete);
        }
        
        // Update vendor quote counts optimistically in the quotes list
        updateVendorQuoteCompletionOptimistically(currentQuote.id, vendorQuoteId, vendorQuote.requested && vendorQuote.entered);
      }
    }
    
    try {
      await API.updateVendorQuote(vendorQuoteId, { requested });
      // No need for toast on simple checkbox toggle
      // No full refresh needed - optimistic updates are already applied
    } catch (error) {
      // Revert the checkbox and UI if the update fails
      checkbox.checked = !requested;
      
      if (vendorQuote) {
        // Revert the data
        vendorQuote.requested = !requested;
        
        // Revert the UI
        const item = checkbox.closest('.vendor-quote-item');
        if (item) {
          const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
          item.classList.toggle('fully-complete', isFullyComplete);
        }
        
        // Revert the optimistic update in the quotes list
        updateVendorQuoteCompletionOptimistically(currentQuote.id, vendorQuoteId, vendorQuote.requested && vendorQuote.entered);
      }
      
      showToast(`Failed to update vendor quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle entered checkbox change
   * @param {Event} event - Change event
   */
  async function handleEnteredChange(event) {
    const checkbox = event.target;
    const vendorQuoteId = parseInt(checkbox.dataset.id, 10);
    const entered = checkbox.checked;
    
    // Update UI immediately for responsive feel
    const currentQuote = QuotesModule.getCurrentQuote();
    let vendorQuote = null;
    
    if (currentQuote) {
      vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
      if (vendorQuote) {
        // Update the data optimistically
        vendorQuote.entered = entered;
        
        // Update the UI to reflect completion status
        const item = checkbox.closest('.vendor-quote-item');
        if (item) {
          const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
          item.classList.toggle('fully-complete', isFullyComplete);
        }
        
        // Update vendor quote counts optimistically in the quotes list
        updateVendorQuoteCompletionOptimistically(currentQuote.id, vendorQuoteId, vendorQuote.requested && vendorQuote.entered);
      }
    }
    
    try {
      await API.updateVendorQuote(vendorQuoteId, { entered });
      // No need for toast on simple checkbox toggle
      // No full refresh needed - optimistic updates are already applied
    } catch (error) {
      // Revert the checkbox and UI if the update fails
      checkbox.checked = !entered;
      
      if (vendorQuote) {
        // Revert the data
        vendorQuote.entered = !entered;
        
        // Revert the UI
        const item = checkbox.closest('.vendor-quote-item');
        if (item) {
          const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
          item.classList.toggle('fully-complete', isFullyComplete);
        }
        
        // Revert the optimistic update in the quotes list
        updateVendorQuoteCompletionOptimistically(currentQuote.id, vendorQuoteId, vendorQuote.requested && vendorQuote.entered);
      }
      
      showToast(`Failed to update vendor quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Create vendor dropdown HTML
   * @param {Array} vendors - Array of vendor objects
   * @param {string} selectedVendorId - Optional currently selected vendor ID
   * @returns {string} - HTML for vendor dropdown
   */
  function createVendorDropdown(vendors, selectedVendorId = '') {
    const vendorOptions = vendors.map(vendor =>
      `<option value="${vendor.id}" ${vendor.id == selectedVendorId ? 'selected' : ''}>${vendor.name}${vendor.specialization ? ` (${vendor.specialization})` : ''}</option>`
    ).join('');

    return `
      <select id="vendorSelect" name="vendor_id" required>
        <option value="">Select a vendor...</option>
        <option value="">─────────────</option>
        <option value="" style="font-style: italic;" ${!selectedVendorId ? 'selected' : ''}>(No vendor selected)</option>
        <option value="">─────────────</option>
        ${vendorOptions}
      </select>
    `;
  }

  /**
   * Open add vendor quote modal
   * @param {number} quoteId - The quote ID
   * @param {Object} vendorQuote - Optional vendor quote data for editing
   */
  async function openAddVendorQuoteModal(quoteId, vendorQuote = null) {
    // Get today's date in YYYY-MM-DD format for the date input
    const today = new Date().toISOString().split('T')[0];

    // Fetch vendors for dropdown
    let vendors = [];
    try {
      vendors = await API.getVendors(true);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      showToast('Failed to load vendors', 'error');
      return;
    }

    const isEditing = vendorQuote !== null;
    const modalTitle = isEditing ? 'Edit Vendor Quote' : 'Add Vendor Quote';
    const selectedVendorId = vendorQuote?.vendor_id || '';

    // Create vendor dropdown HTML
    const vendorDropdown = createVendorDropdown(vendors, selectedVendorId);

    // Create modal HTML with enhanced fields
    const modalHtml = `
      <div id="vendorQuoteModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${modalTitle}</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="vendorQuoteForm">
              <div class="form-group">
                <label for="vendorQuoteType">Type</label>
                <select id="vendorQuoteType" name="type" required>
                  <option value="freight">Freight</option>
                  <option value="install">Installation</option>
                  <option value="forward">Freight Forward</option>
                </select>
              </div>
              <div class="form-group">
                <label for="vendorSelect">Vendor</label>
                ${vendorDropdown}
              </div>
              <div class="form-group">
                <label for="vendorQuoteStatus">Status</label>
                <select id="vendorQuoteStatus" name="status">
                  <option value="Not Started">Not Started</option>
                  <option value="Not Sent">Not Sent</option>
                  <option value="Sent">Sent</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Invalid">Invalid</option>
                  <option value="Firm">Firm</option>
                </select>
              </div>
              <div class="form-group">
                <label for="vendorQuoteCost">Cost ($)</label>
                <input type="number" id="vendorQuoteCost" name="cost" step="0.01" min="0" placeholder="0.00">
              </div>
              <div class="form-group">
                <label for="vendorQuoteLeadTime">Lead Time (days)</label>
                <input type="number" id="vendorQuoteLeadTime" name="lead_time_days" min="0" placeholder="0">
              </div>
              <div class="form-group">
                <label for="vendorQuoteDate">Quote Date</label>
                <input type="date" id="vendorQuoteDate" name="quote_date" value="${today}">
              </div>
              <div class="form-group">
                <label for="vendorQuoteValidUntil">Valid Until</label>
                <input type="date" id="vendorQuoteValidUntil" name="valid_until">
              </div>
              <div class="form-group">
                <label for="vendorQuoteContact">Contact Person</label>
                <input type="text" id="vendorQuoteContact" name="contact_person" placeholder="Contact name">
              </div>
              <div class="form-group">
                <label for="vendorQuoteNotes">Notes</label>
                <textarea id="vendorQuoteNotes" name="notes" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn cancel-modal">Cancel</button>
                <button type="submit" class="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Inject the modal if it doesn't exist
    if (!document.getElementById('vendorQuoteModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Add event listeners for closing
      document.querySelector('#vendorQuoteModal .close-modal').addEventListener('click', closeVendorQuoteModal);
      document.querySelector('#vendorQuoteModal .cancel-modal').addEventListener('click', closeVendorQuoteModal);
    } else {
      // Just update the date value if the modal already exists
      document.getElementById('vendorQuoteDate').value = today;
    }

    // Fill form data if editing
    if (isEditing) {
      // Fill the form with existing data (handle both legacy and enhanced data)
      document.getElementById('vendorQuoteType').value = vendorQuote.type;

      // Handle status (could be enhanced status or legacy)
      const status = vendorQuote.status || getStatusFromLegacy(vendorQuote);
      document.getElementById('vendorQuoteStatus').value = status;

      // Enhanced fields
      document.getElementById('vendorQuoteCost').value = vendorQuote.cost || '';
      document.getElementById('vendorQuoteLeadTime').value = vendorQuote.lead_time_days || '';
      document.getElementById('vendorQuoteDate').value = vendorQuote.quote_date || vendorQuote.date || '';
      document.getElementById('vendorQuoteValidUntil').value = vendorQuote.valid_until || '';
      document.getElementById('vendorQuoteContact').value = vendorQuote.contact_person || vendorQuote.vendor?.contact_name || '';
      document.getElementById('vendorQuoteNotes').value = vendorQuote.notes || '';
    }

    // Always bind the submit handler with the latest quoteId
    const form = document.getElementById('vendorQuoteForm');
    form.onsubmit = e => handleVendorQuoteSubmit(e, quoteId, vendorQuote?.id);

    // Reset form and show modal
    if (!isEditing) {
      document.getElementById('vendorQuoteForm').reset();
      document.getElementById('vendorQuoteDate').value = today; // Set today's date
    }
    document.getElementById('vendorQuoteModal').style.display = 'block';
    document.getElementById('vendorSelect').focus();
  }
  
  /**
   * Close vendor quote modal
   */
  function closeVendorQuoteModal() {
    const modal = document.getElementById('vendorQuoteModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Handle vendor quote form submission
   * @param {Event} event - Submit event
   * @param {number} quoteId - The quote ID
   * @param {number} vendorQuoteId - Optional vendor quote ID for editing
   */
  async function handleVendorQuoteSubmit(event, quoteId, vendorQuoteId = null) {
    event.preventDefault();

    const vendorSelect = document.getElementById('vendorSelect');

    const vendorId = vendorSelect.value;

    // Vendor selection is now required
    if (!vendorId) {
      showToast('Please select a vendor', 'error');
      return;
    }

    // Get vendor name from selected option
    const selectedOption = vendorSelect.options[vendorSelect.selectedIndex];
    const vendorName = selectedOption.text.split(' (')[0]; // Remove specialization if present

    const formData = {
      type: document.getElementById('vendorQuoteType').value,
      vendor_id: vendorId,
      vendor: vendorName,
      status: document.getElementById('vendorQuoteStatus').value,
      cost: parseFloat(document.getElementById('vendorQuoteCost').value) || null,
      lead_time_days: parseInt(document.getElementById('vendorQuoteLeadTime').value) || null,
      quote_date: document.getElementById('vendorQuoteDate').value || null,
      valid_until: document.getElementById('vendorQuoteValidUntil').value || null,
      contact_person: document.getElementById('vendorQuoteContact').value,
      notes: document.getElementById('vendorQuoteNotes').value
    };
    
    try {
      if (vendorQuoteId) {
        // Editing existing vendor quote
        await API.updateVendorQuote(vendorQuoteId, formData);
        showToast('Vendor quote updated successfully', 'success');
      } else {
        // Adding new vendor quote
        await API.createVendorQuote(quoteId, formData);
        showToast('Vendor quote added successfully', 'success');
      }
      
      closeVendorQuoteModal();
      
      // Directly refresh the vendor quotes list
      const currentQuote = QuotesModule.getCurrentQuote();
      if (currentQuote && currentQuote.id === quoteId) {
        try {
          // Fetch fresh vendor quotes data
          const updatedQuote = await API.getQuoteById(quoteId);
          
          // Update the vendor quotes section directly
          const vendorQuotesContainer = document.getElementById('vendorQuotesList');
          if (vendorQuotesContainer) {
            vendorQuotesContainer.innerHTML = renderVendorQuotes(updatedQuote.vendor_quotes);
            initVendorQuoteControls();
            
            // Also update the current quote data
            currentQuote.vendor_quotes = updatedQuote.vendor_quotes;
          } else {
            // If container not found, do a full refresh
            QuotesModule.refreshCurrentQuote();
          }
        } catch (error) {
          console.error('Failed to refresh vendor quotes:', error);
          QuotesModule.refreshCurrentQuote();
        }
      } else {
        // Fallback to full refresh
        QuotesModule.refreshCurrentQuote();
      }
    } catch (error) {
      showToast(`Failed to save vendor quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle edit vendor quote
   * @param {Event} event - Click event
   */
  async function handleEditVendorQuote(event) {
    event.stopPropagation();
    const vendorQuoteId = parseInt(event.target.dataset.id, 10);
    const currentQuote = QuotesModule.getCurrentQuote();

    if (!currentQuote) return;

    // Find the vendor quote in the current quote
    const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);

    if (!vendorQuote) {
      showToast('Vendor quote not found', 'error');
      return;
    }

    // Open the modal with the vendor quote data for editing
    await openAddVendorQuoteModal(currentQuote.id, vendorQuote);
  }
  
  /**
   * Handle delete vendor quote
   * @param {Event} event - Click event
   */
  async function handleDeleteVendorQuote(event) {
    event.stopPropagation();
    const vendorQuoteId = parseInt(event.target.dataset.id, 10);

    if (confirm('Are you sure you want to delete this vendor quote?')) {
      try {
        await API.deleteVendorQuote(vendorQuoteId);
        showToast('Vendor quote deleted successfully', 'success');

        // Get current quote and refresh vendor quotes list
        const currentQuote = QuotesModule.getCurrentQuote();
        if (currentQuote) {
          try {
            // Fetch fresh vendor quotes data
            const updatedQuote = await API.getQuoteById(currentQuote.id);

            // Update the vendor quotes section directly
            const vendorQuotesContainer = document.getElementById('vendorQuotesList');
            if (vendorQuotesContainer) {
              vendorQuotesContainer.innerHTML = renderVendorQuotes(updatedQuote.vendor_quotes);
              initVendorQuoteControls();

              // Also update the current quote data
              currentQuote.vendor_quotes = updatedQuote.vendor_quotes;
            } else {
              // If container not found, do a full refresh
              QuotesModule.refreshCurrentQuote();
            }
          } catch (error) {
            console.error('Failed to refresh vendor quotes:', error);
            QuotesModule.refreshCurrentQuote();
          }
        }
      } catch (error) {
        showToast(`Failed to delete vendor quote: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Handle email vendor quote
   * @param {Event} event - Click event
   */
  async function handleEmailVendorQuote(event) {
    event.stopPropagation();
    const vendorQuoteId = parseInt(event.target.dataset.id, 10);

    console.log('Email button clicked for vendor quote:', vendorQuoteId);

    try {
      // Check if EmailModule is available
      if (typeof EmailModule === 'undefined') {
        console.error('EmailModule is not available');
        showToast('Email module not loaded', 'error');
        return;
      }

      console.log('Opening email modal for vendor quote:', vendorQuoteId);
      // Open email modal using EmailModule
      EmailModule.openEmailModal(vendorQuoteId);
    } catch (error) {
      console.error('Failed to open email modal:', error);
      showToast('Failed to open email composer: ' + error.message, 'error');
    }
  }
  
  // Public API
  return {
    renderVendorQuotes,
    initVendorQuoteControls,
    openAddVendorQuoteModal
  };
})();