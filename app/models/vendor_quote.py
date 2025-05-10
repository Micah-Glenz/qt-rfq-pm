from app.db import DatabaseContext

class VendorQuote:
    def __init__(self, id=None, quote_id=None, type=None, vendor=None,
                 requested=False, entered=False, notes=None, date=None):
        self.id = id
        self.quote_id = quote_id
        self.type = type
        self.vendor = vendor
        self.requested = requested
        self.entered = entered
        self.notes = notes
        self.date = date
    
    @staticmethod
    def get_by_quote_id(quote_id):
        """Get all vendor quotes for a quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, quote_id, type, vendor, requested, entered, notes, date
                FROM vendor_quotes
                WHERE quote_id = ?
                ORDER BY type, id
            ''', (quote_id,))
            
            rows = cursor.fetchall()
            vendor_quotes = []
            
            for row in rows:
                vendor_quote = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'type': row['type'],
                    'vendor': row['vendor'],
                    'requested': bool(row['requested']),
                    'entered': bool(row['entered']),
                    'notes': row['notes'],
                    'date': row['date']
                }
                vendor_quotes.append(vendor_quote)
            
            return vendor_quotes
    
    @staticmethod
    def create(quote_id, type, vendor, requested=False, entered=False, notes=None, date=None):
        """Create a new vendor quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO vendor_quotes (quote_id, type, vendor, requested, entered, notes, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (quote_id, type, vendor, requested, entered, notes, date))
            
            vendor_quote_id = cursor.lastrowid
            conn.commit()
            return vendor_quote_id
    
    @staticmethod
    def update(vendor_quote_id, type=None, vendor=None, requested=None, entered=None, notes=None, date=None):
        """Update a vendor quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            
            # Build update query based on provided parameters
            query_parts = []
            params = []
            
            if type is not None:
                query_parts.append("type = ?")
                params.append(type)
            
            if vendor is not None:
                query_parts.append("vendor = ?")
                params.append(vendor)
            
            if requested is not None:
                query_parts.append("requested = ?")
                params.append(1 if requested else 0)
            
            if entered is not None:
                query_parts.append("entered = ?")
                params.append(1 if entered else 0)
            
            if notes is not None:
                query_parts.append("notes = ?")
                params.append(notes)
            
            if date is not None:
                query_parts.append("date = ?")
                params.append(date)
            
            if not query_parts:
                return False
            
            query = f"UPDATE vendor_quotes SET {', '.join(query_parts)} WHERE id = ?"
            params.append(vendor_quote_id)
            
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
    
    @staticmethod
    def delete(vendor_quote_id):
        """Delete a vendor quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM vendor_quotes WHERE id = ?', (vendor_quote_id,))
            conn.commit()
            return cursor.rowcount > 0
