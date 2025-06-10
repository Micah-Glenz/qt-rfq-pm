from datetime import datetime
from app.db import DatabaseContext
from app.models.event import Event
import json

class Quote:
    def __init__(self, id=None, customer=None, quote_no=None, description=None, 
                 sales_rep=None, project_sheet_url=None, mpsf_link=None, 
                 folder_link=None, method_link=None, hidden=False, created_at=None, updated_at=None):
        self.id = id
        self.customer = customer
        self.quote_no = quote_no
        self.description = description
        self.sales_rep = sales_rep
        self.project_sheet_url = project_sheet_url
        self.mpsf_link = mpsf_link
        self.folder_link = folder_link
        self.method_link = method_link
        self.hidden = hidden
        self.created_at = created_at
        self.updated_at = updated_at
    
    @staticmethod
    def create(customer, quote_no, description=None, sales_rep=None, 
               project_sheet_url=None, mpsf_link=None, folder_link=None, method_link=None):
        """Create a new quote in the database"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO quotes (customer, quote_no, description, sales_rep,
                                  project_sheet_url, mpsf_link, folder_link, method_link)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (customer, quote_no, description, sales_rep, 
                  project_sheet_url, mpsf_link, folder_link, method_link))
            
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
        """Get a quote by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, customer, quote_no, description, sales_rep, 
                       project_sheet_url, mpsf_link, folder_link, method_link, hidden,
                       created_at, updated_at
                FROM quotes
                WHERE id = ?
            ''', (quote_id,))
            
            row = cursor.fetchone()
            if row:
                return Quote(
                    id=row['id'],
                    customer=row['customer'],
                    quote_no=row['quote_no'],
                    description=row['description'],
                    sales_rep=row['sales_rep'],
                    project_sheet_url=row['project_sheet_url'],
                    mpsf_link=row['mpsf_link'],
                    folder_link=row['folder_link'],
                    method_link=row['method_link'],
                    hidden=row['hidden'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
            return None
    
    @staticmethod
    def get_all(search=None, include_hidden=False):
        """Get all quotes, optionally filtered by search term and hidden status"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            # Base query with hidden filter
            base_query = '''
                SELECT q.id, q.customer, q.quote_no, q.description, q.sales_rep, 
                       q.hidden, q.created_at, q.updated_at,
                       COUNT(DISTINCT t.id) AS task_count,
                       SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS completed_tasks,
                       COUNT(DISTINCT v.id) AS vendor_quote_count,
                       COUNT(DISTINCT n.id) AS note_count
                FROM quotes q
                LEFT JOIN tasks t ON q.id = t.quote_id AND t.is_separator = 0
                LEFT JOIN vendor_quotes v ON q.id = v.quote_id
                LEFT JOIN notes n ON q.id = n.quote_id
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
            
            base_query += " GROUP BY q.id ORDER BY q.created_at DESC"
            
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
                    'task_count': row['task_count'],
                    'completed_tasks': row['completed_tasks'] or 0,
                    'vendor_quote_count': row['vendor_quote_count'],
                    'note_count': row['note_count']
                }
                quotes.append(quote)
            
            return quotes
    
    @staticmethod
    def update(quote_id, customer, quote_no, description, sales_rep,
               project_sheet_url=None, mpsf_link=None, folder_link=None, method_link=None, hidden=None):
        """Update a quote and log changes as an event"""
        old_quote = Quote.get_by_id(quote_id)

        with DatabaseContext() as conn:
            cursor = conn.cursor()

            if hidden is None:
                cursor.execute('''
                    UPDATE quotes
                    SET customer = ?,
                        quote_no = ?,
                        description = ?,
                        sales_rep = ?,
                        project_sheet_url = ?,
                        mpsf_link = ?,
                        folder_link = ?,
                        method_link = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (customer, quote_no, description, sales_rep,
                      project_sheet_url, mpsf_link, folder_link, method_link, quote_id))
            else:
                cursor.execute('''
                    UPDATE quotes
                    SET customer = ?,
                        quote_no = ?,
                        description = ?,
                        sales_rep = ?,
                        project_sheet_url = ?,
                        mpsf_link = ?,
                        folder_link = ?,
                        method_link = ?,
                        hidden = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (customer, quote_no, description, sales_rep,
                      project_sheet_url, mpsf_link, folder_link, method_link, hidden, quote_id))

            conn.commit()
            success = cursor.rowcount > 0

        if success and old_quote:
            old_values = {}
            new_values = {}
            fields = [
                ('customer', customer),
                ('quote_no', quote_no),
                ('description', description),
                ('sales_rep', sales_rep),
                ('project_sheet_url', project_sheet_url),
                ('mpsf_link', mpsf_link),
                ('folder_link', folder_link),
                ('method_link', method_link)
            ]

            for field, new_val in fields:
                if getattr(old_quote, field) != new_val:
                    old_values[field] = getattr(old_quote, field)
                    new_values[field] = new_val

            if hidden is not None and old_quote.hidden != hidden:
                old_values['hidden'] = old_quote.hidden
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
