from app.db import DatabaseContext
from app.models.vendor import Vendor
from app.models.event import Event
import json

class VendorQuote:
    def __init__(self, id=None, quote_id=None, vendor_id=None, type=None, status='draft',
                 cost=None, lead_time_days=None, valid_until=None, quote_date=None,
                 contact_person=None, notes=None, created_at=None, updated_at=None):
        self.id = id
        self.quote_id = quote_id
        self.vendor_id = vendor_id
        self.type = type
        self.status = status
        self.cost = cost
        self.lead_time_days = lead_time_days
        self.valid_until = valid_until
        self.quote_date = quote_date
        self.contact_person = contact_person
        self.notes = notes
        self.created_at = created_at
        self.updated_at = updated_at
    
    @staticmethod
    def get_by_quote_id(quote_id):
        """Get all vendor quotes for a quote with vendor information"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT
                    vq.id, vq.quote_id, vq.vendor_id, vq.type, vq.status,
                    vq.cost, vq.lead_time_days, vq.valid_until, vq.quote_date,
                    vq.contact_person, vq.notes, vq.created_at, vq.updated_at,
                    v.name as vendor_name, v.contact_name as vendor_contact_name,
                    v.email as vendor_email, v.phone as vendor_phone
                FROM vendor_quotes vq
                JOIN vendors v ON vq.vendor_id = v.id
                WHERE vq.quote_id = ?
                ORDER BY vq.type, vq.created_at
            ''', (quote_id,))

            rows = cursor.fetchall()
            vendor_quotes = []

            for row in rows:
                vendor_quote = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_id': row['vendor_id'],
                    'type': row['type'],
                    'status': row['status'],
                    'cost': float(row['cost']) if row['cost'] else None,
                    'lead_time_days': row['lead_time_days'],
                    'valid_until': row['valid_until'],
                    'quote_date': row['quote_date'],
                    'contact_person': row['contact_person'],
                    'notes': row['notes'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'vendor': {
                        'name': row['vendor_name'],
                        'contact_name': row['vendor_contact_name'],
                        'email': row['vendor_email'],
                        'phone': row['vendor_phone']
                    }
                }
                vendor_quotes.append(vendor_quote)

            return vendor_quotes

    @staticmethod
    def get_by_quote_id_legacy(quote_id):
        """Get vendor quotes from legacy table (for migration)"""
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
        """Create a new vendor quote (legacy method for compatibility)"""
        # Convert legacy boolean status to new status system
        status = 'draft'
        if entered:
            status = 'received'
        elif requested:
            status = 'requested'

        # Find or create vendor
        vendor_data = Vendor.get_all()
        vendor_id = None
        for v in vendor_data:
            if v['name'] == vendor:
                vendor_id = v['id']
                break

        if not vendor_id:
            # Create vendor if it doesn't exist
            vendor_id = Vendor.create(vendor, specialization=type)

        return VendorQuote.create_enhanced(
            quote_id=quote_id,
            vendor_id=vendor_id,
            type=type,
            status=status,
            cost=None,
            lead_time_days=None,
            quote_date=date,
            contact_person=None,
            notes=notes
        )

    @staticmethod
    def create_enhanced(quote_id, vendor_id, type, status='draft', cost=None,
                       lead_time_days=None, valid_until=None, quote_date=None,
                       contact_person=None, notes=None):
        """Create a new enhanced vendor quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO vendor_quotes
                (quote_id, vendor_id, type, status, cost, lead_time_days,
                 valid_until, quote_date, contact_person, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (quote_id, vendor_id, type, status, cost, lead_time_days,
                  valid_until, quote_date, contact_person, notes))

            vendor_quote_id = cursor.lastrowid
            conn.commit()

            # Get vendor name for event
            vendor = Vendor.get_by_id(vendor_id)
            vendor_name = vendor['name'] if vendor else 'Unknown'

            new_values = {
                "type": type,
                "vendor_id": vendor_id,
                "vendor_name": vendor_name,
                "status": status,
                "cost": str(cost) if cost else None,
                "lead_time_days": lead_time_days,
                "valid_until": str(valid_until) if valid_until else None,
                "contact_person": contact_person,
                "notes": notes,
            }

            Event.create(
                quote_id,
                f"Vendor quote created ({type} - {vendor_name})",
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
    def update_enhanced(vendor_quote_id, status=None, cost=None, lead_time_days=None,
                       valid_until=None, quote_date=None, contact_person=None, notes=None):
        """Update enhanced vendor quote fields"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT quote_id, vendor_id, type, status, cost, lead_time_days,
                       valid_until, quote_date, contact_person, notes
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

            if status is not None:
                query_parts.append("status = ?")
                params.append(status)

            if cost is not None:
                query_parts.append("cost = ?")
                params.append(cost)

            if lead_time_days is not None:
                query_parts.append("lead_time_days = ?")
                params.append(lead_time_days)

            if valid_until is not None:
                query_parts.append("valid_until = ?")
                params.append(valid_until)

            if quote_date is not None:
                query_parts.append("quote_date = ?")
                params.append(quote_date)

            if contact_person is not None:
                query_parts.append("contact_person = ?")
                params.append(contact_person)

            if notes is not None:
                query_parts.append("notes = ?")
                params.append(notes)

            if not query_parts:
                return False

            # Add updated_at timestamp
            query_parts.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE vendor_quotes SET {', '.join(query_parts)} WHERE id = ?"
            params.append(vendor_quote_id)

            cursor.execute(query, params)
            conn.commit()
            success = cursor.rowcount > 0

        if success:
            # Get vendor name for event
            vendor = Vendor.get_by_id(old_row["vendor_id"])
            vendor_name = vendor['name'] if vendor else 'Unknown'

            old_values = {}
            new_values = {}

            if status is not None and old_row["status"] != status:
                old_values["status"] = old_row["status"]
                new_values["status"] = status

            if cost is not None and (old_row["cost"] or 0) != cost:
                old_values["cost"] = str(old_row["cost"]) if old_row["cost"] else None
                new_values["cost"] = str(cost)

            if lead_time_days is not None and old_row["lead_time_days"] != lead_time_days:
                old_values["lead_time_days"] = old_row["lead_time_days"]
                new_values["lead_time_days"] = lead_time_days

            if valid_until is not None and str(old_row["valid_until"] or "") != str(valid_until or ""):
                old_values["valid_until"] = str(old_row["valid_until"]) if old_row["valid_until"] else None
                new_values["valid_until"] = str(valid_until) if valid_until else None

            if contact_person is not None and (old_row["contact_person"] or "") != (contact_person or ""):
                old_values["contact_person"] = old_row["contact_person"]
                new_values["contact_person"] = contact_person

            if notes is not None and (old_row["notes"] or "") != (notes or ""):
                old_values["notes"] = old_row["notes"]
                new_values["notes"] = notes

            if old_values:
                Event.create(
                    old_row["quote_id"],
                    f"Vendor quote updated ({old_row['type']} - {vendor_name})",
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

    @staticmethod
    def delete_enhanced(vendor_quote_id):
        """Delete enhanced vendor quote and log the removal"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                SELECT vq.quote_id, vq.type, v.name as vendor_name
                FROM vendor_quotes vq
                JOIN vendors v ON vq.vendor_id = v.id
                WHERE vq.id = ?
                ''',
                (vendor_quote_id,)
            )
            row = cursor.fetchone()
            cursor.execute('DELETE FROM vendor_quotes WHERE id = ?', (vendor_quote_id,))
            conn.commit()
            success = cursor.rowcount > 0

        if success and row:
            Event.create(
                row['quote_id'],
                f"Vendor quote deleted ({row['type']} - {row['vendor_name']})",
            )

        return success
