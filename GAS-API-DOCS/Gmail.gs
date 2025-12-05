/**
 * FILE: Gmail.gs
 * DESCRIPTION: Handles sending and searching emails via GmailApp.
 */

const GMAIL_CONFIG = {
  // Limit search results to prevent timeouts (standard execution limit is 6 mins)
  MAX_SEARCH_RESULTS: 20
};

/**
 * Controller: Send Email
 * Supports: to, cc, bcc, subject, body (html/text), fromName, replyTo
 */
function handleSendEmail(data) {
  // 1. Validation
  const required = ['to', 'subject', 'body'];
  const missing = required.filter(field => !data[field]);
  if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);

  // 2. Prepare Advanced Options
  const options = {};
  
  if (data.cc) options.cc = data.cc;
  if (data.bcc) options.bcc = data.bcc;
  if (data.fromName) options.name = data.fromName;
  if (data.replyTo) options.replyTo = data.replyTo;
  
  // Detect HTML: either explicit flag or regex check for HTML tags
  if (data.isHtml || /<[a-z][\s\S]*>/i.test(data.body)) {
    options.htmlBody = data.body;
  }

  try {
    // 3. Send Email
    // GmailApp.sendEmail(recipient, subject, body, options)
    // Note: The 'body' arg is the plain-text fallback. If htmlBody is in options, Gmail uses that.
    GmailApp.sendEmail(data.to, data.subject, data.body, options);

    return {
      sent: true,
      recipient: data.to,
      subject: data.subject,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Controller: Search Emails
 * Uses standard Gmail search operators (e.g., "label:work is:unread")
 */
function handleSearchEmails(data) {
  if (!data.query) throw new Error("Missing 'query' parameter (e.g. 'is:unread')");

  try {
    // 1. Execute Search
    // GmailApp.search(query, start, max)
    const threads = GmailApp.search(data.query, 0, GMAIL_CONFIG.MAX_SEARCH_RESULTS);
    
    // 2. Format Results (Extract metadata from threads)
    const results = threads.map(thread => {
      const msgs = thread.getMessages();
      const lastMsg = msgs[msgs.length - 1]; // Get the most recent message in the thread

      return {
        threadId: thread.getId(),
        messageCount: thread.getMessageCount(),
        isUnread: thread.isUnread(),
        subject: lastMsg.getSubject(),
        snippet: lastMsg.getPlainBody().substring(0, 150) + "...", // Preview text
        from: lastMsg.getFrom(),
        to: lastMsg.getTo(),
        date: lastMsg.getDate()
      };
    });

    return {
      query: data.query,
      resultCount: results.length,
      threads: results
    };

  } catch (error) {
    throw new Error(`Gmail search failed: ${error.message}`);
  }
}