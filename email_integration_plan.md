# Simplified Email Integration Implementation Plan

## Overview
Add streamlined email functionality to vendor quotes with simple per-vendor templates, basic string formatting, and GAS API integration. Focus on simplicity and usability.

## Phase 1: Database & Models (1 day)
- Create `email_templates` table with vendor_id UNIQUE constraint (one template per vendor)
- Create `email_history` table for email tracking and audit trail
- Add EmailTemplate and EmailHistory models with basic CRUD operations

## Phase 2: Backend API (2 days)
- Create email routes blueprint with template management endpoints
- Add email sending endpoint that integrates with existing GAS API
- Include email history logging for tracking sent emails

## Phase 3: Frontend Email Module (2 days)
- Create EmailModule.js with modal-based email composer
- Add email buttons to vendor quote list for easy access
- Implement template loading based on vendor selection
- Build email sending functionality with progress feedback

## Phase 4: Template Management UI (2 days)
- Create accessible template manager listing all vendor templates
- Build simple template editor with subject and body text areas
- Add search functionality for easy vendor lookup
- Include basic CRUD operations (Create, Read, Update, Delete)

## Phase 5: Integration & Polish (1 day)
- Integrate email module into existing vendor quote workflow
- Connect template editor to vendor management system
- Add error handling and user feedback mechanisms
- Test end-to-end functionality with GAS API

## Key Features
- One-click email sending from vendor quotes with automatic data population
- Simple per-vendor email templates
- Clean, accessible template management for all users
- Email history tracking for audit and follow-up purposes
- Reliable GAS API integration for email delivery

## Technical Specifications
- Plain text emails only (no rich text complexity)
- Static templates with no variable substitution
- Modal-based email composer with template selection
- Simple template editor with subject and body fields
- Comprehensive email logging and history tracking

## Database Schema

```sql
-- Simplified Email Templates Table
CREATE TABLE email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL UNIQUE,  -- One template per vendor
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Email History Table
CREATE TABLE email_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    vendor_quote_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template_id INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    gas_response TEXT NULL,
    FOREIGN KEY(quote_id) REFERENCES quotes(id),
    FOREIGN KEY(vendor_quote_id) REFERENCES vendor_quotes(id),
    FOREIGN KEY(vendor_id) REFERENCES vendors(id),
    FOREIGN KEY(template_id) REFERENCES email_templates(id)
);
```

## Template System

**Static Templates:**
- Templates are stored as-is with no variable substitution
- Users create custom templates for each vendor
- Subject and body are pre-populated exactly as stored

**Example Template:**
```
Subject: RFQ Request - Pricing Needed

Body:
Dear Vendor,

We are requesting a quote for our current project.

Please provide your best pricing and lead time information for the services discussed.

Best regards,
Sales Team
```

## UI Design

**Email Modal Layout:**
```
┌─ Send Email to Vendor ──────────────────────────────────────┐
│                                                            │
│ To:       [vendor.company@email.com]                      │
│ Subject:  [RFQ - ACME Corp - Q2024-123]                   │
│                                                            │
│ ┌─ Email Body ─────────────────────────────────────────┐   │
│ │ Dear John Smith,                                     │   │
│ │                                                      │   │
│ │ We are requesting a quote for ACME Corporation...   │   │
│ │                                                      │   │
│ │ Please provide your best pricing and lead time.     │   │
│ │                                                      │   │
│ │ Best regards,                                       │   │
│ │ Jane Doe                                            │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ [⚙️ Edit Template] [📤 Send Email] [Cancel]               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Template Manager:**
```
┌─ Email Templates ───────────────────────────────────────┐
│ [+ New Template]                                        │
├─────────────────────────────────────────────────────────┤
│ Search: [FedEx...]                                      │
├─────────────────────────────────────────────────────────┤
│ 📄 FedEx Corporation           [Edit] [Delete]           │
│ 📄 UPS Shipping               [Edit] [Delete]           │
│ 📄 Local Installers Inc.      [Edit] [Delete]           │
│ 📄 Global Freight Forwarding [Edit] [Delete]           │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

```python
# Template Management
GET    /api/email-templates          # List all templates
POST   /api/email-templates          # Create new template
PUT    /api/email-templates/{id}     # Update template
DELETE /api/email-templates/{id}     # Delete template

# Email Operations
POST   /api/vendor-quotes/{id}/send-email  # Send email
GET    /api/quotes/{id}/email-history      # Get email history for quote
```

## Frontend Module Structure

**EmailModule.js:**
```javascript
const EmailModule = (function() {
    function openEmailModal(vendorQuoteId) { /* ... */ }
    function loadVendorTemplate(vendorId) { /* ... */ }
    function sendEmail(emailData) { /* ... */ }
    function openTemplateManager() { /* ... */ }
    function saveTemplate(templateData) { /* ... */ }

    return {
        init,
        openEmailModal,
        openTemplateManager
    };
})();
```

## GAS API Integration

**Enhanced gas_api.py:**
```python
def send_vendor_email(self, email_data):
    """Send email via Google Apps Script"""
    return self._make_request("sendVendorEmail", {
        'toEmail': email_data['to'],
        'subject': email_data['subject'],
        'body': email_data['body'],
        'quoteId': email_data['quote_id'],
        'vendorId': email_data['vendor_id']
    })
```

## Implementation Notes

**Key Simplifications:**
- One template per vendor (no hierarchy)
- Static templates with no variable substitution
- No rich text editor
- No admin restrictions
- No import/export functionality
- No live preview

**Integration Points:**
- Extend existing vendor quote list with email buttons
- Add template manager to main navigation or settings
- Integrate with existing GAS API infrastructure
- Connect to current authentication and user management

**Key Simplifications:**
- One template per vendor (no hierarchy)
- Static templates with no variable substitution
- No rich text editor
- No admin restrictions
- No import/export functionality
- No live preview