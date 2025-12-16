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
    // Use the enhanced endpoint which properly handles quote_date and other fields
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}/vendor-quotes/enhanced`, {
      method: 'POST',
      body: JSON.stringify(vendorQuoteData)
    });
  },

  /**
   * Update a vendor quote
   * @param {number} vendorQuoteId - The vendor quote ID
   * @param {Object} vendorQuoteData - The updated vendor quote data
   * @returns {Promise<Object>} - Response message
   */
  async updateVendorQuote(vendorQuoteId, vendorQuoteData) {
    return this.fetch(`${this.baseUrl}/vendor-quotes/${vendorQuoteId}/enhanced`, {
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
  },

  /**
   * Get all vendors with optional filtering
   * @param {boolean} activeOnly - Whether to get only active vendors
   * @param {string} specialization - Filter by specialization
   * @returns {Promise<Array>} - Array of vendors
   */
  async getVendors(activeOnly = true, specialization = null) {
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append('active_only', 'true');
    }
    if (specialization) {
      params.append('specialization', specialization);
    }

    const url = `${this.baseUrl}/vendors${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  },

  /**
   * Get a vendor by ID
   * @param {number} vendorId - The vendor ID
   * @returns {Promise<Object>} - The vendor object
   */
  async getVendor(vendorId) {
    const response = await this.fetch(`${this.baseUrl}/vendors/${vendorId}`);
    return response.data;
  },

  /**
   * Create a new vendor
   * @param {Object} vendorData - The vendor data
   * @returns {Promise<Object>} - The created vendor
   */
  async createVendor(vendorData) {
    const response = await this.fetch(`${this.baseUrl}/vendors`, {
      method: 'POST',
      body: JSON.stringify(vendorData)
    });
    return response.data;
  },

  /**
   * Update a vendor
   * @param {number} vendorId - The vendor ID
   * @param {Object} vendorData - The updated vendor data
   * @returns {Promise<Object>} - Response message
   */
  async updateVendor(vendorId, vendorData) {
    return this.fetch(`${this.baseUrl}/vendors/${vendorId}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData)
    });
  },

  /**
   * Delete a vendor (sets is_active=False)
   * @param {number} vendorId - The vendor ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteVendor(vendorId) {
    return this.fetch(`${this.baseUrl}/vendors/${vendorId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get all email templates with optional filtering
   * @param {string} search - Optional search string
   * @returns {Promise<Array>} - Array of email templates
   */
  async getEmailTemplates(search = '') {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    // Always request flat format for backward compatibility
    params.append('flat', 'true');

    const url = `${this.baseUrl}/email-templates${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  },

  /**
   * Get an email template by ID
   * @param {number} templateId - The template ID
   * @returns {Promise<Object>} - The template object
   */
  async getEmailTemplate(templateId) {
    const response = await this.fetch(`${this.baseUrl}/email-templates/${templateId}`);
    return response.data;
  },

  /**
   * Create a new email template
   * @param {Object} templateData - The template data
   * @returns {Promise<Object>} - The created template
   */
  async createEmailTemplate(templateData) {
    const response = await this.fetch(`${this.baseUrl}/email-templates`, {
      method: 'POST',
      body: JSON.stringify(templateData)
    });
    return response.data;
  },

  /**
   * Update an email template
   * @param {number} templateId - The template ID
   * @param {Object} templateData - The updated template data
   * @returns {Promise<Object>} - Response message
   */
  async updateEmailTemplate(templateId, templateData) {
    const response = await this.fetch(`${this.baseUrl}/email-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(templateData)
    });
    return response.data;
  },

  /**
   * Delete an email template
   * @param {number} templateId - The template ID
   * @returns {Promise<Object>} - Response message
   */
  async deleteEmailTemplate(templateId) {
    return this.fetch(`${this.baseUrl}/email-templates/${templateId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get the default email template
   * @returns {Promise<Object>} - The default template
   */
  async getDefaultEmailTemplate() {
    const response = await this.fetch(`${this.baseUrl}/email-templates/default`);
    return response.data;
  },

  /**
   * Get the best template for a vendor (vendor-specific or default)
   * @param {number} vendorId - The vendor ID
   * @returns {Promise<Object>} - The template object
   */
  async getTemplateForVendor(vendorId) {
    const response = await this.fetch(`${this.baseUrl}/email-templates/for-vendor/${vendorId}`);
    return response.data;
  },

  /**
   * Preview an email template with variable substitution
   * @param {number} templateId - The template ID
   * @param {Object} variables - Variables for substitution
   * @returns {Promise<Object>} - Preview data
   */
  async previewEmailTemplate(templateId, variables = {}) {
    const params = new URLSearchParams();
    Object.entries(variables).forEach(([key, value]) => {
      params.append(key, value);
    });

    const url = `${this.baseUrl}/email-templates/${templateId}/preview${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetch(url);
    return response.data;
  },

  /**
   * Send email to vendor
   * @param {number} vendorQuoteId - The vendor quote ID
   * @param {Object} emailData - The email data
   * @returns {Promise<Object>} - Response data
   */
  async sendVendorEmail(vendorQuoteId, emailData) {
    const response = await this.fetch(`${this.baseUrl}/vendor-quotes/${vendorQuoteId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
    return response.data;
  },

  /**
   * Get email history for a quote
   * @param {number} quoteId - The quote ID
   * @returns {Promise<Array>} - Array of email history
   */
  getEmailHistoryByQuote(quoteId) {
    return this.fetch(`${this.baseUrl}/quotes/${quoteId}/email-history`);
  },

  /**
   * Get email history for a vendor
   * @param {number} vendorId - The vendor ID
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset
   * @returns {Promise<Array>} - Array of email history
   */
  async getEmailHistoryByVendor(vendorId, limit = 100, offset = 0) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const url = `${this.baseUrl}/vendors/${vendorId}/email-history${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  },

  /**
   * Get all email history with pagination and search
   * @param {string} search - Optional search string
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset
   * @returns {Promise<Object>} - Email history with pagination
   */
  async getAllEmailHistory(search = '', limit = 100, offset = 0) {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const url = `${this.baseUrl}/email-history${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetch(url);
  },

  /**
   * Update email status
   * @param {number} emailId - The email ID
   * @param {string} emailStatus - New email status ('current' or 'superceded')
   * @returns {Promise<Object>} - Response data
   */
  async updateEmailStatus(emailId, emailStatus) {
    const response = await this.fetch(`${this.baseUrl}/email-history/${emailId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ email_status: emailStatus })
    });
    return response;
  }
};
