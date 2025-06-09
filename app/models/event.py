from app.db import DatabaseContext

class Event:
    def __init__(self, id=None, quote_id=None, description=None, past=None, created_at=None):
        self.id = id
        self.quote_id = quote_id
        self.description = description
        self.past = past
        self.created_at = created_at

    @staticmethod
    def get_by_quote_id(quote_id):
        """Return events for a quote ordered by most recent first"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, quote_id, description, past, created_at
                FROM events
                WHERE quote_id = ?
                ORDER BY created_at DESC
            ''', (quote_id,))
            rows = cursor.fetchall()
            events = []
            for row in rows:
                events.append({
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'description': row['description'],
                    'past': row['past'],
                    'created_at': row['created_at']
                })
            return events

    @staticmethod
    def create(quote_id, description, past=None):
        """Create a new event"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO events (quote_id, description, past)
                VALUES (?, ?, ?)
            ''', (quote_id, description, past))
            event_id = cursor.lastrowid
            conn.commit()
            return event_id

    @staticmethod
    def delete(event_id):
        """Delete an event by id"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
            conn.commit()
            return cursor.rowcount > 0

