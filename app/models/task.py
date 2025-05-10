from app.db import DatabaseContext

class Task:
    def __init__(self, id=None, quote_id=None, label=None, done=False, is_separator=False):
        self.id = id
        self.quote_id = quote_id
        self.label = label
        self.done = done
        self.is_separator = is_separator
    
    @staticmethod
    def get_by_quote_id(quote_id):
        """Get all tasks for a quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, quote_id, label, done, is_separator
                FROM tasks
                WHERE quote_id = ?
                ORDER BY id
            ''', (quote_id,))
            
            rows = cursor.fetchall()
            tasks = []
            
            for row in rows:
                task = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'label': row['label'],
                    'done': bool(row['done']),
                    'is_separator': bool(row['is_separator'])
                }
                tasks.append(task)
            
            return tasks
    
    @staticmethod
    def create(quote_id, label, is_separator=False):
        """Create a new task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tasks (quote_id, label, is_separator)
                VALUES (?, ?, ?)
            ''', (quote_id, label, is_separator))
            
            task_id = cursor.lastrowid
            conn.commit()
            return task_id
    
    @staticmethod
    def update(task_id, label=None, done=None, is_separator=None):
        """Update a task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            # Build update query based on provided parameters
            query_parts = []
            params = []
            
            if label is not None:
                query_parts.append("label = ?")
                params.append(label)
            
            if done is not None:
                query_parts.append("done = ?")
                params.append(1 if done else 0)
            
            if is_separator is not None:
                query_parts.append("is_separator = ?")
                params.append(1 if is_separator else 0)
            
            if not query_parts:
                return False
            
            query = f"UPDATE tasks SET {', '.join(query_parts)} WHERE id = ?"
            params.append(task_id)
            
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def delete(task_id):
        """Delete a task"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
            conn.commit()
            return cursor.rowcount > 0
