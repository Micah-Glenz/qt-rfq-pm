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
      return '<div class="empty-state no-notes">No notes</div>';
    }
    
    let html = '';
    
    notes.forEach(note => {
      const datetime = formatDate(note.created_at);
      html += `
        <div class="note-item" data-id="${note.id}">
          <div class="note-single-line">
            <div class="note-content editable-note" 
                 contenteditable="true" 
                 data-id="${note.id}"
                 data-original="${note.content}">${note.content}</div>
            <div class="note-datetime">
              <span class="note-time">${datetime.time}</span>
              <span class="note-date">${datetime.date}</span>
            </div>
            <span class="note-delete-btn" data-id="${note.id}">×</span>
          </div>
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
    
    // Add event listeners for inline editable notes
    document.querySelectorAll('.note-content.editable-note').forEach(note => {
      note.addEventListener('blur', handleNoteBlur);
    });
  }
  
  /**
   * Handle inline note blur (save changes)
   */
  async function handleNoteBlur(event) {
    const noteElement = event.target;
    const noteId = parseInt(noteElement.dataset.id, 10);
    const originalValue = noteElement.dataset.original;
    const newValue = noteElement.innerText.trim();
    
    // If value hasn't changed, skip update
    if (newValue === originalValue) {
      return;
    }
    
    try {
      // Update note via API
      await API.updateNote(noteId, { content: newValue });
      
      // Update the data attribute
      noteElement.dataset.original = newValue;
      
      // Update in current quote data
      const currentQuote = QuotesModule.getCurrentQuote();
      const note = currentQuote.notes.find(n => n.id === noteId);
      if (note) {
        note.content = newValue;
      }
    } catch (error) {
      // Revert to original value on error
      noteElement.innerText = originalValue;
      showToast(`Failed to update note: ${error.message}`, 'error');
    }
  }
  
  /**
   * Open add note modal - now creates an empty note directly
   * @param {number} quoteId - The quote ID
   */
  async function openAddNoteModal(quoteId) {
    try {
      // Create an empty note directly
      await API.createNote(quoteId, { content: '' });
      showToast('Note added successfully', 'success');
      QuotesModule.refreshCurrentQuote();
    } catch (error) {
      showToast(`Failed to add note: ${error.message}`, 'error');
    }
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
   * @returns {object} - Object with formatted time and date
   */
  function formatDate(dateString) {
    if (!dateString) return { time: 'N/A', date: 'N/A' };
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { time: 'Invalid', date: 'Invalid' };
    }
    
    // Format time
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    // Format date
    const dateOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    };
    
    return {
      time: date.toLocaleString(undefined, timeOptions),
      date: date.toLocaleString(undefined, dateOptions)
    };
  }
  
  // Public API
  return {
    renderNotes,
    initNoteControls,
    openAddNoteModal
  };
})();