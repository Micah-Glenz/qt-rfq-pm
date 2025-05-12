from datetime import datetime
from app.db import DatabaseContext

class Quote:
    def __init__(self, id=None, customer=None, quote_no=None, description=None, 
                 sales_rep=None, project_sheet_url=None, mpsf_link=None, 
                 folder_link=None, created_at=None, updated_at=None):
        self.id = id
        self.customer = customer
        self.quote_no = quote_no
        self.description = description
        self.sales_rep = sales_rep
        self.project_sheet_url = project_sheet_url
        self.mpsf_link = mpsf_link
        self.folder_link = folder_link
        self.created_at = created_at
        self.updated_at = updated_at
    
    @staticmethod
    def create(customer, quote_no, description=None, sales_rep=None, 
               project_sheet_url=None, mpsf_link=None, folder_link=None):
        """Create a new quote in the database"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO quotes (customer, quote_no, description, sales_rep,
                                  project_sheet_url, mpsf_link, folder_link)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (customer, quote_no, description, sales_rep, 
                  project_sheet_url, mpsf_link, folder_link))
            
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
                       project_sheet_url, mpsf_link, folder_link,
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
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
            return None
    
    @staticmethod
    def get_all(search=None):
        """Get all quotes, optionally filtered by search term"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            if search:
                search_param = f"%{search}%"
                cursor.execute('''
                    SELECT q.id, q.customer, q.quote_no, q.description, q.sales_rep, 
                           q.created_at, q.updated_at,
                           COUNT(DISTINCT t.id) AS task_count,
                           SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS completed_tasks,
                           COUNT(DISTINCT v.id) AS vendor_quote_count,
                           COUNT(DISTINCT n.id) AS note_count
                    FROM quotes q
                    LEFT JOIN tasks t ON q.id = t.quote_id AND t.is_separator = 0
                    LEFT JOIN vendor_quotes v ON q.id = v.quote_id
                    LEFT JOIN notes n ON q.id = n.quote_id
                    WHERE q.customer LIKE ? OR
                          q.quote_no LIKE ? OR
                          q.description LIKE ? OR
                          q.sales_rep LIKE ?
                    GROUP BY q.id
                    ORDER BY q.created_at DESC
                ''', (search_param, search_param, search_param, search_param))
            else:
                cursor.execute('''
                    SELECT q.id, q.customer, q.quote_no, q.description, q.sales_rep, 
                           q.created_at, q.updated_at,
                           COUNT(DISTINCT t.id) AS task_count,
                           SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS completed_tasks,
                           COUNT(DISTINCT v.id) AS vendor_quote_count,
                           COUNT(DISTINCT n.id) AS note_count
                    FROM quotes q
                    LEFT JOIN tasks t ON q.id = t.quote_id AND t.is_separator = 0
                    LEFT JOIN vendor_quotes v ON q.id = v.quote_id
                    LEFT JOIN notes n ON q.id = n.quote_id
                    GROUP BY q.id
                    ORDER BY q.created_at DESC
                ''')
            
            rows = cursor.fetchall()
            quotes = []
            
            for row in rows:
                quote = {
                    'id': row['id'],
                    'customer': row['customer'],
                    'quote_no': row['quote_no'],
                    'description': row['description'],
                    'sales_rep': row['sales_rep'],
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
               project_sheet_url=None, mpsf_link=None, folder_link=None):
        """Update a quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE quotes
                SET customer = ?,
                    quote_no = ?,
                    description = ?,
                    sales_rep = ?,
                    project_sheet_url = ?,
                    mpsf_link = ?,
                    folder_link = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (customer, quote_no, description, sales_rep, 
                  project_sheet_url, mpsf_link, folder_link, quote_id))
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def delete(quote_id):
        """Delete a quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM quotes WHERE id = ?', (quote_id,))
            conn.commit()
            return cursor.rowcount > 0
