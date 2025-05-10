from app.db import DatabaseContext

class DefaultTask:
    def __init__(self, id=None, label=None, sort_order=0, is_separator=False, created_at=None):
        self.id = id
        self.label = label
        self.sort_order = sort_order
        self.is_separator = is_separator
        self.created_at = created_at
    
    @staticmethod
    def get_all():
        """Get all default tasks ordered by sort_order"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, label, sort_order, is_separator, created_at
                FROM default_tasks
                ORDER BY sort_order
            ''')
            
            rows = cursor.fetchall()
            tasks = []
            
            for row in rows:
                task = {
                    'id': row['id'],
                    'label': row['label'],
                    'sort_order': row['sort_order'],
                    'is_separator': bool(row['is_separator']),
                    'created_at': row['created_at']
                }
                tasks.append(task)
            
            return tasks
    
    @staticmethod
    def create(label, sort_order=None, is_separator=False):
        """Create a new default task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            # If sort_order is not provided, place at the end
            if sort_order is None:
                cursor.execute('SELECT MAX(sort_order) FROM default_tasks')
                result = cursor.fetchone()
                max_sort_order = result[0] if result[0] is not None else 0
                sort_order = max_sort_order + 10
            
            cursor.execute('''
                INSERT INTO default_tasks (label, sort_order, is_separator)
                VALUES (?, ?, ?)
            ''', (label, sort_order, is_separator))
            
            task_id = cursor.lastrowid
            conn.commit()
            return task_id
    
    @staticmethod
    def update(task_id, label=None, sort_order=None, is_separator=None):
        """Update a default task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            # Build update query based on provided parameters
            query_parts = []
            params = []
            
            if label is not None:
                query_parts.append("label = ?")
                params.append(label)
            
            if sort_order is not None:
                query_parts.append("sort_order = ?")
                params.append(sort_order)
            
            if is_separator is not None:
                query_parts.append("is_separator = ?")
                params.append(1 if is_separator else 0)
            
            if not query_parts:
                return False
            
            query = f"UPDATE default_tasks SET {', '.join(query_parts)} WHERE id = ?"
            params.append(task_id)
            
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def delete(task_id):
        """Delete a default task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM default_tasks WHERE id = ?', (task_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def reorder_all(task_ids):
        """Update sort order of all tasks based on provided ordered list of IDs"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            for i, task_id in enumerate(task_ids):
                cursor.execute('''
                    UPDATE default_tasks
                    SET sort_order = ?
                    WHERE id = ?
                ''', (i * 10, task_id))
            
            conn.commit()
            return True
