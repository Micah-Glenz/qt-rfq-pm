from app.db import DatabaseContext
from app.models.event import Event
import json

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
        new_values = {
            "type": type,
            "vendor": vendor,
            "requested": bool(requested),
            "entered": bool(entered),
            "notes": notes,
            "date": date,
        }
        Event.create(
            quote_id,
            f"Vendor quote created ({type} - {vendor})",
            None,
            json.dumps(new_values),
        )

        return vendor_quote_id
    
    @staticmethod
    def update(
        vendor_quote_id,
        type=None,
        vendor=None,
        requested=None,
        entered=None,
        notes=None,
        date=None,
    ):
        """Update a vendor quote and log changes as an event"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT quote_id, type, vendor, requested, entered, notes, date
                FROM vendor_quotes WHERE id = ?
            """,
                (vendor_quote_id,),
            )
            old_row = cursor.fetchone()
            if not old_row:
                return False

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
            success = cursor.rowcount > 0

        if success:
            old_values = {}
            new_values = {}
            if type is not None and old_row["type"] != type:
                old_values["type"] = old_row["type"]
                new_values["type"] = type
            if vendor is not None and old_row["vendor"] != vendor:
                old_values["vendor"] = old_row["vendor"]
                new_values["vendor"] = vendor
            if requested is not None and bool(old_row["requested"]) != bool(requested):
                old_values["requested"] = bool(old_row["requested"])
                new_values["requested"] = bool(requested)
            if entered is not None and bool(old_row["entered"]) != bool(entered):
                old_values["entered"] = bool(old_row["entered"])
                new_values["entered"] = bool(entered)
            if notes is not None and (old_row["notes"] or "") != (notes or ""):
                old_values["notes"] = old_row["notes"]
                new_values["notes"] = notes
            if date is not None and (old_row["date"] or "") != (date or ""):
                old_values["date"] = old_row["date"]
                new_values["date"] = date

            if old_values:
                new_type = type if type is not None else old_row["type"]
                new_vendor = vendor if vendor is not None else old_row["vendor"]
                description = f"Vendor quote updated ({new_type} - {new_vendor})"
                Event.create(
                    old_row["quote_id"],
                    description,
                    json.dumps(old_values),
                    json.dumps(new_values),
                )

        return success
    
    @staticmethod
    def delete(vendor_quote_id):
        """Delete a vendor quote and log the removal"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT quote_id, type, vendor FROM vendor_quotes WHERE id = ?',
                (vendor_quote_id,)
            )
            row = cursor.fetchone()
            cursor.execute('DELETE FROM vendor_quotes WHERE id = ?', (vendor_quote_id,))
            conn.commit()
            success = cursor.rowcount > 0

        if success and row:
            Event.create(
                row['quote_id'],
                f"Vendor quote deleted ({row['type']} - {row['vendor']})",
            )

        return success
