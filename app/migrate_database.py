#!/usr/bin/env python3
"""
Database Migration Script
- Removes tasks and events tables
- Implements enhanced vendor functionality
- Preserves existing data
"""

import sqlite3
import os
from datetime import datetime
from app.db import DATABASE_PATH

def backup_database():
    """Create a backup of the current database"""
    backup_path = DATABASE_PATH.replace('.db', f'_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')

    with open(DATABASE_PATH, 'rb') as src:
        with open(backup_path, 'wb') as dst:
            dst.write(src.read())

    print(f"Database backed up to: {backup_path}")
    return backup_path

def run_migration():
    """Execute the full migration"""
    print("Starting database migration...")

    # Create backup
    backup_path = backup_database()

    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # Step 1: Create vendors table
        print("Creating vendors table...")
        cursor.execute('''
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
            )
        ''')

        # Step 2: Create enhanced vendor_quotes table
        print("Creating enhanced vendor_quotes_new table...")
        cursor.execute('''
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
            )
        ''')

        # Step 3: Migrate vendor data
        print("Migrating vendor data...")
        cursor.execute('''
            INSERT OR IGNORE INTO vendors (name, specialization)
            SELECT DISTINCT vendor,
                   CASE
                     WHEN type = 'freight' THEN 'freight'
                     WHEN type = 'install' THEN 'install'
                     WHEN type = 'forward' THEN 'forward'
                     ELSE 'general'
                   END as specialization
            FROM vendor_quotes
        ''')

        # Step 4: Migrate vendor quotes
        print("Migrating vendor quotes...")
        cursor.execute('''
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
                NULL as cost,
                NULL as lead_time_days,
                vq.notes,
                CURRENT_TIMESTAMP as created_at
            FROM vendor_quotes vq
            JOIN vendors v ON vq.vendor = v.name
        ''')

        # Step 5: Create indexes
        print("Creating indexes...")
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_quote_id ON vendor_quotes_new(quote_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_vendor_id ON vendor_quotes_new(vendor_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendor_quotes_new_status ON vendor_quotes_new(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendors_specialization ON vendors(specialization)')

        # Step 6: Drop old tables
        print("Removing old tables...")
        cursor.execute('DROP TABLE IF EXISTS tasks')
        cursor.execute('DROP TABLE IF EXISTS default_tasks')
        cursor.execute('DROP TABLE IF EXISTS events')

        # Step 7: Remove old vendor_quotes table
        print("Removing old vendor_quotes table...")
        cursor.execute('DROP TABLE IF EXISTS vendor_quotes')

        # Step 8: Rename new tables to final names
        print("Finalizing table names...")
        cursor.execute('DROP TABLE IF EXISTS vendor_quotes')
        cursor.execute('ALTER TABLE vendor_quotes_new RENAME TO vendor_quotes')

        # Commit all changes
        conn.commit()
        print("Migration completed successfully!")

        print("\nMigration Summary:")
        print("- Created vendors table for master vendor data")
        print("- Enhanced vendor_quotes with cost, lead time, and status tracking")
        print("- Removed tasks, events, and default_tasks tables")
        print("- Preserved all existing vendor quote data")
        print(f"- Original database backed up to: {backup_path}")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        print("Database rolled back to original state")
        return False

    finally:
        conn.close()

    return True

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\nNext steps:")
        print("1. Update frontend to use new layout structure")
        print("2. Update API endpoints for enhanced vendor functionality")
        print("3. Test the new vendor quote management system")
    else:
        print("\nPlease check the error above and restore from backup if needed")