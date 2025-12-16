from datetime import datetime
from app.db import DatabaseContext
from app.models.event import Event
from app.models.sales_rep import SalesRep
import json

class Quote:
    def __init__(self, id=None, customer=None, quote_no=None, description=None,
                 sales_rep=None, mpsf_link=None,
                 folder_link=None, method_link=None, hidden=False, created_at=None, updated_at=None):
        self.id = id
        self.customer = customer
        self.quote_no = quote_no
        self.description = description
        self.sales_rep = sales_rep
        self.mpsf_link = mpsf_link
        self.folder_link = folder_link
        self.method_link = method_link
        self.hidden = hidden
        self.created_at = created_at
        self.updated_at = updated_at
    
    @staticmethod
    def create(customer, quote_no, description=None, sales_rep=None,
               mpsf_link=None, folder_link=None, method_link=None, sales_rep_id=None):
        """Create a new quote in the database"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Handle sales_rep_id or legacy sales_rep string
            if sales_rep_id:
                # New system: use sales_rep_id
                cursor.execute('''
                    INSERT INTO quotes (customer, quote_no, description, sales_rep_id,
                                      mpsf_link, folder_link, method_link)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (customer, quote_no, description, sales_rep_id,
                      mpsf_link, folder_link, method_link))
            else:
                # Legacy system: use sales_rep string
                cursor.execute('''
                    INSERT INTO quotes (customer, quote_no, description, sales_rep,
                                      mpsf_link, folder_link, method_link)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (customer, quote_no, description, sales_rep,
                      mpsf_link, folder_link, method_link))

            quote_id = cursor.lastrowid
            conn.commit()

            # Add default tasks
            cursor.execute('''
                SELECT id, label, is_separator
                FROM default_tasks
                ORDER BY sort_order
            ''')

            default_tasks = cursor.fetchall()
            for task in default_tasks:
                cursor.execute('''
                    INSERT INTO tasks (quote_id, label, is_separator)
                    VALUES (?, ?, ?)
                ''', (quote_id, task['label'], task['is_separator']))

            conn.commit()
            return quote_id
    
    @staticmethod
    def get_by_id(quote_id):
        """Get a quote by ID with enhanced sales rep information"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT q.id, q.customer, q.quote_no, q.description, q.sales_rep, q.sales_rep_id,
                       q.mpsf_link, q.folder_link, q.method_link, q.hidden,
                       q.created_at, q.updated_at,
                       sr.name as sales_rep_name, sr.email as sales_rep_email, sr.phone as sales_rep_phone
                FROM quotes q
                LEFT JOIN sales_reps sr ON q.sales_rep_id = sr.id
                WHERE q.id = ?
            ''', (quote_id,))

            row = cursor.fetchone()
            if row:
                # Determine sales rep info with backward compatibility
                sales_rep_info = {
                    'id': row['sales_rep_id'],
                    'name': row['sales_rep_name'] or row['sales_rep'],  # Fallback to string if no ID match
                    'email': row['sales_rep_email'],
                    'phone': row['sales_rep_phone']
                }

                quote = {
                    'id': row['id'],
                    'customer': row['customer'],
                    'quote_no': row['quote_no'],
                    'description': row['description'],
                    'sales_rep': sales_rep_info['name'],  # Maintain backward compatibility
                    'sales_rep_info': sales_rep_info,
                    'sales_rep_id': row['sales_rep_id'],
                    'mpsf_link': row['mpsf_link'],
                    'folder_link': row['folder_link'],
                    'method_link': row['method_link'],
                    'hidden': row['hidden'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                return quote
            return None
    
    @staticmethod
    def get_all(search=None, include_hidden=False):
        """Get all quotes, optionally filtered by search term and hidden status"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Base query without task references (tasks table has been removed)
            base_query = '''
                SELECT q.id, q.customer, q.quote_no, q.description, q.sales_rep,
                       q.hidden, q.created_at, q.updated_at,
                       0 AS task_count,
                       0 AS completed_tasks,
                       COALESCE(vendor_stats.vendor_quote_count, 0) AS vendor_quote_count,
                       COALESCE(vendor_stats.completed_vendor_quotes, 0) AS completed_vendor_quotes,
                       COALESCE(note_stats.note_count, 0) AS note_count
                FROM quotes q
                LEFT JOIN (
                    SELECT quote_id,
                           COUNT(*) AS vendor_quote_count,
                           SUM(CASE WHEN status = 'selected' OR status = 'received' OR status = 'reviewing' THEN 1 ELSE 0 END) AS completed_vendor_quotes
                    FROM vendor_quotes
                    GROUP BY quote_id
                ) vendor_stats ON q.id = vendor_stats.quote_id
                LEFT JOIN (
                    SELECT quote_id,
                           COUNT(*) AS note_count
                    FROM notes
                    GROUP BY quote_id
                ) note_stats ON q.id = note_stats.quote_id
            '''

            where_clauses = []
            params = []

            # Only show visible quotes unless including hidden
            if not include_hidden:
                where_clauses.append("q.hidden = 0")

            # Add search filter if provided
            if search:
                search_param = f"%{search}%"
                where_clauses.append('''
                    (q.customer LIKE ? OR
                     q.quote_no LIKE ? OR
                     q.description LIKE ? OR
                     q.sales_rep LIKE ?)
                ''')
                params.extend([search_param, search_param, search_param, search_param])

            # Construct final query
            if where_clauses:
                base_query += " WHERE " + " AND ".join(where_clauses)

            base_query += " ORDER BY q.created_at DESC"

            cursor.execute(base_query, params)

            rows = cursor.fetchall()
            quotes = []

            for row in rows:
                quote = {
                    'id': row['id'],
                    'customer': row['customer'],
                    'quote_no': row['quote_no'],
                    'description': row['description'],
                    'sales_rep': row['sales_rep'],
                    'hidden': row['hidden'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'task_count': 0,  # Tasks table has been removed
                    'completed_tasks': 0,  # Tasks table has been removed
                    'vendor_quote_count': row['vendor_quote_count'],
                    'completed_vendor_quotes': row['completed_vendor_quotes'] or 0,
                    'note_count': row['note_count']
                }
                quotes.append(quote)

            return quotes
    
    @staticmethod
    def update(quote_id, customer, quote_no, description, sales_rep=None,
               mpsf_link=None, folder_link=None, method_link=None, hidden=None, sales_rep_id=None):
        """Update a quote and log changes as an event"""
        old_quote = Quote.get_by_id(quote_id)

        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Handle both legacy sales_rep and new sales_rep_id
            if hidden is None:
                if sales_rep_id is not None:
                    # New system: update only sales_rep_id
                    cursor.execute('''
                        UPDATE quotes
                        SET customer = ?, quote_no = ?, description = ?, sales_rep_id = ?,
                            mpsf_link = ?, folder_link = ?, method_link = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (customer, quote_no, description, sales_rep_id,
                          mpsf_link, folder_link, method_link, quote_id))
                else:
                    # Legacy system: update only sales_rep string
                    cursor.execute('''
                        UPDATE quotes
                        SET customer = ?, quote_no = ?, description = ?, sales_rep = ?,
                            mpsf_link = ?, folder_link = ?, method_link = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (customer, quote_no, description, sales_rep,
                          mpsf_link, folder_link, method_link, quote_id))
            else:
                if sales_rep_id is not None:
                    # New system: update both sales_rep_id and hidden
                    cursor.execute('''
                        UPDATE quotes
                        SET customer = ?, quote_no = ?, description = ?, sales_rep_id = ?, hidden = ?,
                            mpsf_link = ?, folder_link = ?, method_link = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (customer, quote_no, description, sales_rep_id, hidden,
                          mpsf_link, folder_link, method_link, quote_id))
                else:
                    # Legacy system: update both sales_rep and hidden
                    cursor.execute('''
                        UPDATE quotes
                        SET customer = ?, quote_no = ?, description = ?, sales_rep = ?, hidden = ?,
                            mpsf_link = ?, folder_link = ?, method_link = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (customer, quote_no, description, sales_rep, hidden,
                          mpsf_link, folder_link, method_link, quote_id))

            conn.commit()
            success = cursor.rowcount > 0

        if success and old_quote:
            old_values = {}
            new_values = {}

            # Determine what changed for event logging
            fields = [
                ('customer', customer),
                ('quote_no', quote_no),
                ('description', description),
                ('mpsf_link', mpsf_link),
                ('folder_link', folder_link),
                ('method_link', method_link)
            ]

            # Handle sales rep changes
            if sales_rep_id is not None:
                if old_quote.get('sales_rep_id') != sales_rep_id:
                    old_values['sales_rep_id'] = old_quote.get('sales_rep_id')
                    new_values['sales_rep_id'] = sales_rep_id
            elif sales_rep is not None:
                if old_quote.get('sales_rep') != sales_rep:
                    old_values['sales_rep'] = old_quote.get('sales_rep')
                    new_values['sales_rep'] = sales_rep

            for field, new_val in fields:
                if old_quote.get(field) != new_val:
                    old_values[field] = old_quote.get(field)
                    new_values[field] = new_val

            if hidden is not None and old_quote.get('hidden') != hidden:
                old_values['hidden'] = old_quote.get('hidden')
                new_values['hidden'] = hidden

            if old_values:
                Event.create(
                    quote_id,
                    'Quote updated',
                    json.dumps(old_values),
                    json.dumps(new_values)
                )

        return success
    
    @staticmethod
    def delete(quote_id):
        """Delete a quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM quotes WHERE id = ?', (quote_id,))
            conn.commit()
            return cursor.rowcount > 0
