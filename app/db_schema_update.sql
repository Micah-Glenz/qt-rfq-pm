-- Enhanced Vendor Schema Implementation
-- This script adds the enhanced vendor functionality while removing tasks/events

-- Step 1: Create vendors table for master vendor data
CREATE TABLE IF NOT EXISTS vendors (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    contact_name  TEXT,
    email         TEXT,
    phone         TEXT,
    specialization TEXT CHECK(specialization IN ('freight','install','forward','general')),
    is_active     BOOLEAN DEFAULT 1,
    notes         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create enhanced vendor_quotes table
CREATE TABLE IF NOT EXISTS vendor_quotes_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id        INTEGER NOT NULL,
    vendor_id       INTEGER NOT NULL,
    type            TEXT CHECK(type IN ('freight','install','forward')) NOT NULL,

    -- Enhanced status tracking
    status          TEXT CHECK(status IN ('draft','requested','received','reviewing','selected','rejected','expired')) DEFAULT 'draft',

    -- Core financial information
    cost            DECIMAL(12,2),

    -- Timing information
    lead_time_days  INTEGER,
    valid_until     DATE,
    quote_date      DATE,

    -- Communication tracking
    contact_person  TEXT,
    notes           TEXT,

    -- Metadata
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY(vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Step 3: Migrate existing vendor data
-- Create vendors from existing unique vendor names
INSERT OR IGNORE INTO vendors (name, specialization)
SELECT DISTINCT vendor,
       CASE
         WHEN type = 'freight' THEN 'freight'
         WHEN type = 'install' THEN 'install'
         WHEN type = 'forward' THEN 'forward'
         ELSE 'general'
       END as specialization
FROM vendor_quotes;

-- Step 4: Migrate existing vendor quotes to new structure
INSERT INTO vendor_quotes_new
(quote_id, vendor_id, type, status, cost, lead_time_days, notes, created_at)
SELECT
    vq.quote_id,
    v.id as vendor_id,
    vq.type,
    CASE
      WHEN vq.entered = 1 THEN 'received'
      WHEN vq.requested = 1 THEN 'requested'
      ELSE 'draft'
    END as status,
    NULL as cost,  -- Will be added later
    NULL as lead_time_days,  -- Will be added later
    vq.notes,
    CURRENT_TIMESTAMP as created_at
FROM vendor_quotes vq
JOIN vendors v ON vq.vendor = v.name;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_quote_id ON vendor_quotes_new(quote_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_vendor_id ON vendor_quotes_new(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_status ON vendor_quotes_new(status);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_specialization ON vendors(specialization);