/**
 * Events module for managing events
 */
const EventsModule = (function() {
  /**
   * Render events for a quote
   * @param {Array} events - Array of event objects
   * @returns {string} - HTML string
   */
  function renderEvents(events) {
    if (!events || events.length === 0) {
      return '<div class="empty-state no-events">No events</div>';
    }

    let html = '';
    events.forEach(ev => {
      const datetime = formatDate(ev.created_at);
      html += `
        <div class="event-item" data-id="${ev.id}">
          <div class="event-single-line">
            <div class="event-description">${ev.description}</div>
            <div class="event-datetime">
              <span class="event-time">${datetime.time}</span>
              <span class="event-date">${datetime.date}</span>
            </div>
            <span class="event-delete-btn" data-id="${ev.id}">×</span>
          </div>
          ${ev.past ? `<div class="event-past">Before: ${ev.past}</div>` : ''}
        </div>
      `;
    });

    return html;
  }

  /**
   * Initialize event-related event listeners
   */
  function initEventControls() {
    document.querySelectorAll('.event-delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteEvent);
    });
  }

  /**
   * Handle delete event
   */
  async function handleDeleteEvent(event) {
    event.stopPropagation();
    const eventId = parseInt(event.target.dataset.id, 10);

    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await API.deleteEvent(eventId);
        showToast('Event deleted successfully', 'success');
        QuotesModule.refreshCurrentQuote();
      } catch (error) {
        showToast(`Failed to delete event: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Open add event modal
   * @param {number} quoteId - The quote ID
   */
  function openAddEventModal(quoteId) {
    const modalHtml = `
      <div id="addEventModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Event</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="addEventForm">
              <div class="form-group">
                <label for="eventDescription">Description</label>
                <textarea id="eventDescription" required></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn cancel-modal">Cancel</button>
                <button type="submit" class="btn primary">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    if (!document.getElementById('addEventModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      document.querySelector('#addEventModal .close-modal').addEventListener('click', closeEventModal);
      document.querySelector('#addEventModal .cancel-modal').addEventListener('click', closeEventModal);
    }

    const form = document.getElementById('addEventForm');
    form.onsubmit = e => handleEventSubmit(e, quoteId);

    document.getElementById('addEventModal').style.display = 'block';
    document.getElementById('eventDescription').focus();
  }

  /**
   * Close event modal
   */
  function closeEventModal() {
    const modal = document.getElementById('addEventModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Handle add event form submission
   * @param {Event} e - Submit event
   * @param {number} quoteId - The quote ID
   */
  async function handleEventSubmit(e, quoteId) {
    e.preventDefault();
    const description = document.getElementById('eventDescription').value.trim();
    if (!description) return;

    try {
      await API.createEvent(quoteId, { description });
      showToast('Event added successfully', 'success');
      closeEventModal();
      QuotesModule.refreshCurrentQuote();
    } catch (error) {
      showToast(`Failed to add event: ${error.message}`, 'error');
    }
  }

  /**
   * Format a date string
   */
  function formatDate(dateString) {
    if (!dateString) return { time: 'N/A', date: 'N/A' };

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { time: 'Invalid', date: 'Invalid' };
    }
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateOptions = { month: '2-digit', day: '2-digit', year: 'numeric' };
    return {
      time: date.toLocaleString(undefined, timeOptions),
      date: date.toLocaleString(undefined, dateOptions)
    };
  }

  return {
    renderEvents,
    initEventControls,
    openAddEventModal
  };
})();
