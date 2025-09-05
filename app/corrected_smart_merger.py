#!/usr/bin/env python3
"""
CORRECTED Smart Database Merger
Fixes the critical deduplication bug - properly handles overlapping quotes
Usage: python3 corrected_smart_merger.py
"""
import sqlite3
import os
import shutil
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CorrectedSmartDatabaseMerger:
    def __init__(self, main_db: str, copy_db: str, output_db: str):
        self.main_db = main_db
        self.copy_db = copy_db  
        self.output_db = output_db
        self.merge_stats = {
            'quotes_merged': 0,
            'quotes_deduplicated': 0,
            'tasks_merged': 0,
            'tasks_deduplicated': 0,
            'vendor_quotes_merged': 0,
            'vendor_quotes_deduplicated': 0,
            'notes_merged': 0,
            'notes_deduplicated': 0,
            'events_merged': 0,
            'events_deduplicated': 0
        }
        
    def create_backup(self):
        """Create timestamped backups"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        main_backup = f"{self.main_db}.backup_{timestamp}"
        copy_backup = f"{self.copy_db}.backup_{timestamp}"
        shutil.copy2(self.main_db, main_backup)
        shutil.copy2(self.copy_db, copy_backup)
        logger.info(f"✅ Backups created: {main_backup}, {copy_backup}")
        return main_backup, copy_backup
    
    def analyze_quote_overlaps(self):
        """Determine which quotes to keep from each database"""
        logger.info("🔍 Analyzing quote overlaps...")
        
        main_conn = sqlite3.connect(self.main_db)
        copy_conn = sqlite3.connect(self.copy_db)
        
        main_conn.row_factory = sqlite3.Row
        copy_conn.row_factory = sqlite3.Row
        
        # Get quotes with timestamps
        main_cursor = main_conn.cursor()
        main_cursor.execute("SELECT id, quote_no, updated_at, created_at FROM quotes")
        main_quotes = {row['quote_no']: dict(row) for row in main_cursor.fetchall()}
        
        copy_cursor = copy_conn.cursor()
        copy_cursor.execute("SELECT id, quote_no, updated_at, created_at FROM quotes")
        copy_quotes = {row['quote_no']: dict(row) for row in copy_cursor.fetchall()}
        
        # Categorize quotes
        overlapping = set(main_quotes.keys()) & set(copy_quotes.keys())
        main_only = set(main_quotes.keys()) - set(copy_quotes.keys())
        copy_only = set(copy_quotes.keys()) - set(main_quotes.keys())
        
        # Determine winners for overlapping quotes
        quote_decisions = {}
        
        for quote_no in overlapping:
            main_quote = main_quotes[quote_no]
            copy_quote = copy_quotes[quote_no]
            
            # Most recent update wins
            main_updated = main_quote['updated_at'] or main_quote['created_at']
            copy_updated = copy_quote['updated_at'] or copy_quote['created_at']
            
            if copy_updated > main_updated:
                winner, winner_data = 'copy', copy_quote
            else:
                winner, winner_data = 'main', main_quote
            
            quote_decisions[quote_no] = {
                'status': 'overlapping',
                'winner': winner,
                'winner_data': winner_data
            }
        
        # Add unique quotes
        for quote_no in main_only:
            quote_decisions[quote_no] = {
                'status': 'main_only',
                'winner': 'main',
                'winner_data': main_quotes[quote_no]
            }
        
        for quote_no in copy_only:
            quote_decisions[quote_no] = {
                'status': 'copy_only', 
                'winner': 'copy',
                'winner_data': copy_quotes[quote_no]
            }
        
        main_conn.close()
        copy_conn.close()
        
        logger.info(f"   Total quotes: {len(quote_decisions)}")
        logger.info(f"   Overlapping: {len(overlapping)} (will deduplicate)")
        logger.info(f"   Main-only: {len(main_only)}")
        logger.info(f"   Copy-only: {len(copy_only)}")
        
        return quote_decisions
    
    def merge_quotes(self, output_conn, quote_decisions):
        """Merge quotes with proper deduplication"""
        logger.info("🔀 Merging quotes with proper deduplication...")
        
        main_conn = sqlite3.connect(self.main_db)
        copy_conn = sqlite3.connect(self.copy_db)
        main_conn.row_factory = sqlite3.Row
        copy_conn.row_factory = sqlite3.Row
        
        quote_id_mapping = {}  # old_id -> new_id mapping
        
        for quote_no, decision in quote_decisions.items():
            winner = decision['winner']
            winner_data = decision['winner_data']
            old_id = winner_data['id']
            
            # Get full quote data from winning database
            conn = main_conn if winner == 'main' else copy_conn
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM quotes WHERE id = ?", (old_id,))
            full_quote = cursor.fetchone()
            
            # Insert into merged database
            output_cursor = output_conn.cursor()
            output_cursor.execute('''
                INSERT INTO quotes (customer, quote_no, description, sales_rep, 
                                  project_sheet_url, mpsf_link, folder_link, method_link,
                                  hidden, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (full_quote['customer'], full_quote['quote_no'], 
                  full_quote['description'], full_quote['sales_rep'],
                  full_quote['project_sheet_url'], full_quote['mpsf_link'], 
                  full_quote['folder_link'], full_quote['method_link'], 
                  full_quote['hidden'], full_quote['created_at'], 
                  full_quote['updated_at']))
            
            new_id = output_cursor.lastrowid
            quote_id_mapping[f"{winner}_{old_id}"] = {
                'new_id': new_id,
                'quote_no': quote_no,
                'is_winner': True
            }
            
            # For overlapping quotes, map the loser to same new_id but mark as deduplicated
            if decision['status'] == 'overlapping':
                loser = 'copy' if winner == 'main' else 'main'
                loser_quotes = {row['quote_no']: dict(row) for row in 
                               (main_conn if loser == 'main' else copy_conn).execute("SELECT id, quote_no FROM quotes").fetchall()}
                if quote_no in loser_quotes:
                    loser_old_id = loser_quotes[quote_no]['id']
                    quote_id_mapping[f"{loser}_{loser_old_id}"] = {
                        'new_id': new_id,
                        'quote_no': quote_no,
                        'is_winner': False
                    }
                    self.merge_stats['quotes_deduplicated'] += 1
            
            self.merge_stats['quotes_merged'] += 1
        
        main_conn.close()
        copy_conn.close()
        
        logger.info(f"✅ Quotes: {self.merge_stats['quotes_merged']} merged, {self.merge_stats['quotes_deduplicated']} deduplicated")
        return quote_id_mapping
    
    def merge_related_table(self, table_name, output_conn, quote_id_mapping):
        """Merge related tables with proper deduplication"""
        logger.info(f"🔗 Merging {table_name} with deduplication...")
        
        main_conn = sqlite3.connect(self.main_db)
        copy_conn = sqlite3.connect(self.copy_db)
        main_conn.row_factory = sqlite3.Row
        copy_conn.row_factory = sqlite3.Row
        
        # Get column info
        output_cursor = output_conn.cursor()
        output_cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in output_cursor.fetchall() if col[1] != 'id']
        
        records_imported = 0
        records_deduplicated = 0
        
        # Process both databases
        for db_name, conn in [('main', main_conn), ('copy', copy_conn)]:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            
            for row in cursor.fetchall():
                quote_id_key = f"{db_name}_{row['quote_id']}"
                
                if quote_id_key in quote_id_mapping:
                    mapping_info = quote_id_mapping[quote_id_key]
                    
                    if mapping_info['is_winner']:
                        # Import data from winning quotes only
                        values = []
                        for col in columns:
                            if col == 'quote_id':
                                values.append(mapping_info['new_id'])
                            else:
                                values.append(row[col])
                        
                        placeholders = ', '.join(['?' for _ in columns])
                        column_names = ', '.join(columns)
                        
                        output_cursor.execute(
                            f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})", 
                            values
                        )
                        records_imported += 1
                    else:
                        # Skip data from losing quotes
                        records_deduplicated += 1
        
        main_conn.close()
        copy_conn.close()
        
        self.merge_stats[f'{table_name}_merged'] = records_imported
        self.merge_stats[f'{table_name}_deduplicated'] = records_deduplicated
        
        logger.info(f"✅ {table_name}: {records_imported} imported, {records_deduplicated} deduplicated")
    
    def execute_merge(self):
        """Execute the complete corrected merge"""
        logger.info("🚀 STARTING CORRECTED DATABASE MERGE")
        
        # Create backups
        self.create_backup()
        
        # Analyze overlaps
        quote_decisions = self.analyze_quote_overlaps()
        
        # Initialize output database
        if os.path.exists(self.output_db):
            os.remove(self.output_db)
        
        output_conn = sqlite3.connect(self.output_db)
        
        # Copy schema from main database
        logger.info("📋 Copying database schema...")
        main_conn = sqlite3.connect(self.main_db)
        main_cursor = main_conn.cursor()
        main_cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        
        for table_sql in main_cursor.fetchall():
            if table_sql[0]:
                output_conn.execute(table_sql[0])
        
        output_conn.execute("PRAGMA foreign_keys = ON")
        main_conn.close()
        
        try:
            # Merge quotes with deduplication
            quote_id_mapping = self.merge_quotes(output_conn, quote_decisions)
            
            # Merge related tables with deduplication
            for table in ['tasks', 'vendor_quotes', 'notes', 'events']:
                self.merge_related_table(table, output_conn, quote_id_mapping)
            
            # Merge default_tasks (use main db version)
            logger.info("📋 Merging default_tasks...")
            main_conn = sqlite3.connect(self.main_db)
            main_conn.row_factory = sqlite3.Row
            cursor = main_conn.cursor()
            cursor.execute("SELECT * FROM default_tasks")
            
            output_cursor = output_conn.cursor()
            for row in cursor.fetchall():
                output_cursor.execute('''
                    INSERT INTO default_tasks (label, sort_order, is_separator, created_at)
                    VALUES (?, ?, ?, ?)
                ''', (row['label'], row['sort_order'], row['is_separator'], row['created_at']))
            
            main_conn.close()
            
            # Commit and validate
            output_conn.commit()
            
            # Basic validation
            output_cursor = output_conn.cursor()
            output_cursor.execute("SELECT COUNT(*) FROM quotes")
            final_quote_count = output_cursor.fetchone()[0]
            
            output_cursor.execute("PRAGMA foreign_key_check")
            violations = output_cursor.fetchall()
            
            # Report results
            logger.info("📊 MERGE COMPLETE - RESULTS:")
            for key, value in self.merge_stats.items():
                logger.info(f"   {key}: {value:,}")
            
            logger.info(f"   Final quote count: {final_quote_count}")
            logger.info(f"   Foreign key violations: {len(violations)}")
            
            if len(violations) == 0:
                logger.info("🎉 MERGE SUCCESSFUL! Database ready for use.")
                
                # Size info
                new_size = os.path.getsize(self.output_db)
                logger.info(f"   Final database size: {new_size/1024:.1f} KB")
            else:
                logger.error("⚠️ MERGE COMPLETED WITH VIOLATIONS")
            
        except Exception as e:
            logger.error(f"❌ MERGE FAILED: {str(e)}")
            output_conn.rollback()
            raise
        finally:
            output_conn.close()

def main():
    """Main execution"""
    merger = CorrectedSmartDatabaseMerger(
        main_db='quote_tracker.db',
        copy_db='quote_tracker copy.db', 
        output_db='quote_tracker_final_merge.db'
    )
    
    merger.execute_merge()

if __name__ == "__main__":
    main()