/**
 * FILE: Security.gs
 * DESCRIPTION: Handles API Keys, Rate Limiting, and Parsing.
 */

const Security = {
  
  CONFIG: {
    VALID_KEYS: ['micah_admin_key_2025'], 
    RATE_LIMIT: 5 
  },

  /**
   * Main Security Guard
   */
  guard: function(e, method) {
    // 1. Parse and Extract Route
    const parsed = this.parse(e, method);
    
    // 2. Validate Key
    if (!parsed.key || !this.CONFIG.VALID_KEYS.includes(parsed.key)) {
      const err = new Error("Access Denied: Invalid API Key");
      err.code = 403;
      throw err;
    }

    // 3. Rate Limit
    if (this.isRateLimited(parsed.key)) {
      const err = new Error("Rate Limit Exceeded");
      err.code = 429;
      throw err;
    }

    return parsed;
  },

  /**
   * Helper: Extract standard fields (key, route) and the remaining payload
   */
  parse: function(e, method) {
    let rawData = {};

    // A. Extract Raw Data based on method
    if (method === 'GET') {
      rawData = e.parameter || {};
    } else if (method === 'POST') {
      try {
        rawData = JSON.parse(e.postData.contents);
      } catch (err) {
        const error = new Error("Invalid JSON Body");
        error.code = 400;
        throw error;
      }
    }

    // B. Structure the internal request object
    return {
      key: rawData.key,
      // Default to 'home' if no route is provided
      route: rawData.route || 'home', 
      // Pass the rest of the data purely as payload
      payload: rawData
    };
  },

  isRateLimited: function(key) {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'rate_' + key;
    let count = cache.get(cacheKey);

    if (count === null) {
      cache.put(cacheKey, '1', 60); 
      return false;
    }
    if (parseInt(count) >= this.CONFIG.RATE_LIMIT) return true;
    
    cache.put(cacheKey, (parseInt(count) + 1).toString(), 60);
    return false;
  }
};