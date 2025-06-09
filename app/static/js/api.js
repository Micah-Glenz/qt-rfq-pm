/**
 * API service for Quote Tracker
 */
const API = {
  /**
   * Base URL for API requests
   */
  baseUrl: '/api',

  /**
   * Generic fetch method with error handling
   * @param {string} url - The URL to fetch
   * @param {Object} options - The fetch options
   * @returns {Promise<any>} - The response data
   */
  async fetch(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'An unknown error occurred'
        }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  /**
   * Get all quotes with optional search
   * @param {string} search - Optional search string
   * @param {boolean} includeHidden - Whether to include hidden quotes
   * @returns {Promise<Array>} - Array of quotes
   */
  async getQuotes(search = '', includeHidden = false) {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    if (includeHidden) {
      params.append('include_hidden', 'true');
    }
    
    const url = `${this.baseUrl}/quotes${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetch(url);
  },

  /**
   * Get a quote by ID with all related data
   * @param {number} quoteId - The quote ID
   * @returns {Promise<Object>} - The quote object with related data
   */
  async getQuoteById(quoteId) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}`);
  },

  /**
   * Create a new quote
   * @param {Object} quoteData - The quote data
   * @returns {Promise<Object>} - The created quote
   */
  async createQuote(quoteData) {
    return this.fetch(`${this.baseUrl}/quotes`, {
      method: 'POST',
      body: JSON.stringify(quoteData)
    });
  },

  /**
   * Update a quote
   * @param {number} quoteId - The quote ID
   * @param {Object} quoteData - The updated quote data
   * @returns {Promise<Object>} - Response message
   */
  async updateQuote(quoteId, quoteData) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}`, {
      method: 'PUT',
      body: JSON.stringify(quoteData)
    });
  },

  /**
   * Delete a quote
   * @param {number} quoteId - The quote ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteQuote(quoteId) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Create a new task for a quote
   * @param {number} quoteId - The quote ID
   * @param {Object} taskData - The task data
   * @returns {Promise<Object>} - The created task
   */
  async createTask(quoteId, taskData) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  /**
   * Update a task
   * @param {number} taskId - The task ID
   * @param {Object} taskData - The updated task data
   * @returns {Promise<Object>} - Response message
   */
  async updateTask(taskId, taskData) {
    return this.fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  /**
   * Delete a task
   * @param {number} taskId - The task ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteTask(taskId) {
    return this.fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Create a new vendor quote for a quote
   * @param {number} quoteId - The quote ID
   * @param {Object} vendorQuoteData - The vendor quote data
   * @returns {Promise<Object>} - The created vendor quote
   */
  async createVendorQuote(quoteId, vendorQuoteData) {
    // Add the quote_id to the data if creating via the general endpoint
    const data = { ...vendorQuoteData, quote_id: quoteId };
    
    return this.fetch(`${this.baseUrl}/vendor-quotes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update a vendor quote
   * @param {number} vendorQuoteId - The vendor quote ID
   * @param {Object} vendorQuoteData - The updated vendor quote data
   * @returns {Promise<Object>} - Response message
   */
  async updateVendorQuote(vendorQuoteId, vendorQuoteData) {
    return this.fetch(`${this.baseUrl}/vendor-quotes/${vendorQuoteId}`, {
      method: 'PUT',
      body: JSON.stringify(vendorQuoteData)
    });
  },

  /**
   * Delete a vendor quote
   * @param {number} vendorQuoteId - The vendor quote ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteVendorQuote(vendorQuoteId) {
    return this.fetch(`${this.baseUrl}/vendor-quotes/${vendorQuoteId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Create a new note for a quote
   * @param {number} quoteId - The quote ID
   * @param {Object} noteData - The note data
   * @returns {Promise<Object>} - The created note
   */
  async createNote(quoteId, noteData) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData)
    });
  },

  /**
   * Update a note
   * @param {number} noteId - The note ID
   * @param {Object} noteData - The updated note data
   * @returns {Promise<Object>} - Response message
   */
  async updateNote(noteId, noteData) {
    return this.fetch(`${this.baseUrl}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(noteData)
    });
  },

  /**
   * Delete a note
   * @param {number} noteId - The note ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteNote(noteId) {
    return this.fetch(`${this.baseUrl}/notes/${noteId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Create a new event for a quote
   * @param {number} quoteId - The quote ID
   * @param {Object} eventData - The event data
   * @returns {Promise<Object>} - The created event
   */
  async createEvent(quoteId, eventData) {
    return this.fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      body: JSON.stringify({ ...eventData, quote_id: quoteId })
    });
  },

  /**
   * Delete an event
   * @param {number} eventId - The event ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteEvent(eventId) {
    return this.fetch(`${this.baseUrl}/events/${eventId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get all default tasks
   * @returns {Promise<Array>} - Array of default tasks
   */
  async getDefaultTasks() {
    return this.fetch(`${this.baseUrl}/default-tasks`);
  },

  /**
   * Create a new default task
   * @param {Object} taskData - The task data
   * @returns {Promise<Object>} - The created task
   */
  async createDefaultTask(taskData) {
    return this.fetch(`${this.baseUrl}/default-tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  /**
   * Update a default task
   * @param {number} taskId - The task ID
   * @param {Object} taskData - The updated task data
   * @returns {Promise<Object>} - Response message
   */
  async updateDefaultTask(taskId, taskData) {
    return this.fetch(`${this.baseUrl}/default-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  /**
   * Delete a default task
   * @param {number} taskId - The task ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteDefaultTask(taskId) {
    return this.fetch(`${this.baseUrl}/default-tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Reorder default tasks
   * @param {Array<number>} taskIds - Ordered array of task IDs
   * @returns {Promise<Object>} - Response message
   */
  async reorderDefaultTasks(taskIds) {
    return this.fetch(`${this.baseUrl}/default-tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify(taskIds)
    });
  },

  /**
   * Update task order for a quote
   * @param {number} quoteId - The quote ID
   * @param {Array<number>} taskIds - Ordered array of task IDs
   * @returns {Promise<Object>} - Response message
   */
  async updateTaskOrder(quoteId, taskIds) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}/tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ taskIds })
    });
  }
};
