/**
 * Vendor Quotes module for managing vendor quotes
 */
const VendorQuotesModule = (function() {
  /**
   * Render vendor quotes for a quote
   * @param {Array} vendorQuotes - Array of vendor quote objects
   * @returns {string} - HTML string
   */
  function renderVendorQuotes(vendorQuotes) {
    if (!vendorQuotes || vendorQuotes.length === 0) {
      return '<div class="empty-state">No vendor quotes</div>';
    }
    
    let html = '';
    
    vendorQuotes.forEach(vq => {
      // Determine class based on quote type
      let typeClass = 'freight'; // Default
      if (vq.type === 'install') {
        typeClass = 'install';
      } else if (vq.type === 'forward') {
        typeClass = 'forward';
      }
      
      // Determine if the vendor quote is fully complete (has both checkboxes checked)
      const isFullyComplete = vq.requested && vq.entered;
      
      html += `
        <div class="vendor-quote-item ${isFullyComplete ? 'fully-complete' : ''}" data-id="${vq.id}">
          <div class="vendor-quote-content">
            <div class="vendor-quote-header ${typeClass}">
              ${vq.type.toUpperCase()}: ${vq.vendor}
            </div>
            <div class="vendor-quote-subtext">
              ${vq.date ? `Date: ${vq.date}` : ''}
              ${vq.notes ? `<div>${vq.notes}</div>` : ''}
            </div>
            <div class="vendor-quote-status">
              <div class="status-item">
                <input type="checkbox" class="status-check vendor-requested-checkbox" 
                  data-id="${vq.id}" ${vq.requested ? 'checked' : ''}>
                Requested
              </div>
              <div class="status-item">
                <input type="checkbox" class="status-check vendor-entered-checkbox" 
                  data-id="${vq.id}" ${vq.entered ? 'checked' : ''}>
                Entered
              </div>
            </div>
          </div>
          <div class="vendor-quote-actions">
            <button class="btn small edit-vendor-quote" data-id="${vq.id}">Edit</button>
            <button class="btn small delete-vendor-quote" data-id="${vq.id}">Delete</button>
          </div>
        </div>
      `;
    });
    
    return html;
  }
  
  /**
   * Initialize vendor quote-related event listeners
   */
  function initVendorQuoteControls() {
    document.querySelectorAll('.edit-vendor-quote').forEach(btn => {
      btn.addEventListener('click', handleEditVendorQuote);
    });
    
    document.querySelectorAll('.delete-vendor-quote').forEach(btn => {
      btn.addEventListener('click', handleDeleteVendorQuote);
    });
    
    // Add event listeners for checkbox status changes
    document.querySelectorAll('.vendor-requested-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', handleRequestedChange);
    });
    
    document.querySelectorAll('.vendor-entered-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', handleEnteredChange);
    });
  }
  
  /**
   * Handle requested checkbox change
   * @param {Event} event - Change event
   */
  async function handleRequestedChange(event) {
    const checkbox = event.target;
    const vendorQuoteId = parseInt(checkbox.dataset.id, 10);
    const requested = checkbox.checked;
    
    try {
      await API.updateVendorQuote(vendorQuoteId, { requested });
      
      // Update the current quote data
      const currentQuote = QuotesModule.getCurrentQuote();
      if (currentQuote) {
        const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
        if (vendorQuote) {
          vendorQuote.requested = requested;
          
          // Update the UI to reflect completion status
          const item = checkbox.closest('.vendor-quote-item');
          if (item) {
            const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
            item.classList.toggle('fully-complete', isFullyComplete);
          }
        }
      }
    } catch (error) {
      // Revert the checkbox if the update fails
      checkbox.checked = !requested;
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
    
    try {
      await API.updateVendorQuote(vendorQuoteId, { entered });
      
      // Update the current quote data
      const currentQuote = QuotesModule.getCurrentQuote();
      if (currentQuote) {
        const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
        if (vendorQuote) {
          vendorQuote.entered = entered;
          
          // Update the UI to reflect completion status
          const item = checkbox.closest('.vendor-quote-item');
          if (item) {
            const isFullyComplete = vendorQuote.requested && vendorQuote.entered;
            item.classList.toggle('fully-complete', isFullyComplete);
          }
        }
      }
    } catch (error) {
      // Revert the checkbox if the update fails
      checkbox.checked = !entered;
      showToast(`Failed to update vendor quote: ${error.message}`, 'error');
    }
  }
  
  /**
   * Open add vendor quote modal
   * @param {number} quoteId - The quote ID
   */
  function openAddVendorQuoteModal(quoteId) {
    // Get today's date in YYYY-MM-DD format for the date input
    const today = new Date().toISOString().split('T')[0];
    
    // Create modal HTML
    const modalHtml = `
      <div id="vendorQuoteModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Vendor Quote</h2>
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
                <label for="vendorName">Vendor</label>
                <input type="text" id="vendorName" name="vendor" required>
              </div>
              <div class="form-group">
                <label for="vendorQuoteDate">Date</label>
                <input type="date" id="vendorQuoteDate" name="date" value="${today}">
              </div>
              <div class="form-group">
                <label for="vendorQuoteNotes">Notes</label>
                <textarea id="vendorQuoteNotes" name="notes"></textarea>
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
      
      // Add event listeners
      document.querySelector('#vendorQuoteModal .close-modal').addEventListener('click', closeVendorQuoteModal);
      document.querySelector('#vendorQuoteModal .cancel-modal').addEventListener('click', closeVendorQuoteModal);
      document.getElementById('vendorQuoteForm').addEventListener('submit', e => handleVendorQuoteSubmit(e, quoteId));
    } else {
      // Just update the date value if the modal already exists
      document.getElementById('vendorQuoteDate').value = today;
    }
    
    // Reset form and show modal
    document.getElementById('vendorQuoteForm').reset();
    document.getElementById('vendorQuoteDate').value = today; // Set today's date
    document.getElementById('vendorQuoteModal').style.display = 'block';
    document.getElementById('vendorName').focus();
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
    
    const formData = {
      type: document.getElementById('vendorQuoteType').value,
      vendor: document.getElementById('vendorName').value,
      date: document.getElementById('vendorQuoteDate').value || null,
      notes: document.getElementById('vendorQuoteNotes').value,
      requested: false,  // Default values when creating
      entered: false     // Default values when creating
    };
    
    try {
      if (vendorQuoteId) {
        // Editing existing vendor quote - preserve current status
        const currentQuote = QuotesModule.getCurrentQuote();
        const vendorQuote = currentQuote.vendor_quotes.find(vq => vq.id === vendorQuoteId);
        if (vendorQuote) {
          formData.requested = vendorQuote.requested;
          formData.entered = vendorQuote.entered;
        }
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
    
    // Open the modal
    openAddVendorQuoteModal(currentQuote.id);
    
    // Fill the form with existing data
    document.getElementById('vendorQuoteType').value = vendorQuote.type;
    document.getElementById('vendorName').value = vendorQuote.vendor;
    document.getElementById('vendorQuoteDate').value = vendorQuote.date || '';
    document.getElementById('vendorQuoteNotes').value = vendorQuote.notes || '';
    document.getElementById('vendorQuoteRequested').checked = vendorQuote.requested;
    document.getElementById('vendorQuoteEntered').checked = vendorQuote.entered;
    
    // Update modal title
    document.querySelector('#vendorQuoteModal .modal-header h2').textContent = 'Edit Vendor Quote';
    
    // Update form submit handler
    const form = document.getElementById('vendorQuoteForm');
    form.removeEventListener('submit', form.onsubmit);
    form.addEventListener('submit', e => handleVendorQuoteSubmit(e, currentQuote.id, vendorQuoteId));
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
  
  // Public API
  return {
    renderVendorQuotes,
    initVendorQuoteControls,
    openAddVendorQuoteModal
  };
})();