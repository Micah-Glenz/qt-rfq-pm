/**
 * Notes module for managing notes
 */
const NotesModule = (function() {
  /**
   * Render notes for a quote
   * @param {Array} notes - Array of note objects
   * @returns {string} - HTML string
   */
  function renderNotes(notes) {
    if (!notes || notes.length === 0) {
      return '<div class="empty-state">No notes</div>';
    }
    
    let html = '';
    
    notes.forEach(note => {
      html += `
        <div class="note-item" data-id="${note.id}">
          <div class="note-header">
            <div>${formatDate(note.created_at)}</div>
            <span class="note-delete-btn" data-id="${note.id}">×</span>
          </div>
          <div class="note-content">${note.content}</div>
        </div>
      `;
    });
    
    return html;
  }
  
  /**
   * Initialize note-related event listeners
   */
  function initNoteControls() {
    document.querySelectorAll('.note-delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteNote);
    });
  }
  
  /**
   * Open add note modal
   * @param {number} quoteId - The quote ID
   */
  function openAddNoteModal(quoteId) {
    // Create modal HTML
    const modalHtml = `
      <div id="noteModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Note</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="noteForm">
              <div class="form-group">
                <label for="noteContent">Note</label>
                <textarea id="noteContent" name="content" required rows="5"></textarea>
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
    if (!document.getElementById('noteModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Add event listeners
      document.querySelector('#noteModal .close-modal').addEventListener('click', closeNoteModal);
      document.querySelector('#noteModal .cancel-modal').addEventListener('click', closeNoteModal);
      document.getElementById('noteForm').addEventListener('submit', e => handleNoteSubmit(e, quoteId));
    }
    
    // Reset form and show modal
    document.getElementById('noteForm').reset();
    document.getElementById('noteModal').style.display = 'block';
    document.getElementById('noteContent').focus();
  }
  
  /**
   * Close note modal
   */
  function closeNoteModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Handle note form submission
   * @param {Event} event - Submit event
   * @param {number} quoteId - The quote ID
   */
  async function handleNoteSubmit(event, quoteId) {
    event.preventDefault();
    
    const content = document.getElementById('noteContent').value;
    
    try {
      await API.createNote(quoteId, { content });
      showToast('Note added successfully', 'success');
      closeNoteModal();
      QuotesModule.refreshCurrentQuote();
    } catch (error) {
      showToast(`Failed to add note: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle delete note
   * @param {Event} event - Click event
   */
  async function handleDeleteNote(event) {
    event.stopPropagation();
    const noteId = parseInt(event.target.dataset.id, 10);
    
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await API.deleteNote(noteId);
        showToast('Note deleted successfully', 'success');
        QuotesModule.refreshCurrentQuote();
      } catch (error) {
        showToast(`Failed to delete note: ${error.message}`, 'error');
      }
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
  
  // Public API
  return {
    renderNotes,
    initNoteControls,
    openAddNoteModal
  };
})();