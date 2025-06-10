from app.db import DatabaseContext
from app.models.event import Event
import json

class Note:
    def __init__(self, id=None, quote_id=None, content=None, created_at=None):
        self.id = id
        self.quote_id = quote_id
        self.content = content
        self.created_at = created_at
    
    @staticmethod
    def get_by_quote_id(quote_id):
        """Get all notes for a quote, ordered by most recent first"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, quote_id, content, created_at
                FROM notes
                WHERE quote_id = ?
                ORDER BY created_at DESC
            ''', (quote_id,))
            
            rows = cursor.fetchall()
            notes = []
            
            for row in rows:
                note = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'content': row['content'],
                    'created_at': row['created_at']
                }
                notes.append(note)
            
            return notes
    
    @staticmethod
    def create(quote_id, content):
        """Create a new note"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO notes (quote_id, content)
                VALUES (?, ?)
            ''', (quote_id, content))
            
            note_id = cursor.lastrowid
            conn.commit()
            return note_id
    
    @staticmethod
    def delete(note_id):
        """Delete a note"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def update(note_id, content):
        """Update a note's content and log changes as an event"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT quote_id, content FROM notes WHERE id = ?",
                (note_id,),
            )
            old_row = cursor.fetchone()
            if not old_row:
                return False

            cursor.execute(
                '''
                UPDATE notes
                SET content = ?
                WHERE id = ?
            ''',
                (content, note_id),
            )
            conn.commit()
            success = cursor.rowcount > 0

        if success and old_row["content"] != content:
            Event.create(
                old_row["quote_id"],
                "Note updated",
                json.dumps({"content": old_row["content"]}),
                json.dumps({"content": content}),
            )

        return success
