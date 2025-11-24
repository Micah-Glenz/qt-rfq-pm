from app.db import DatabaseContext
from datetime import datetime

class Vendor:
    def __init__(self, id=None, name=None, contact_name=None, email=None, phone=None,
                 specialization=None, is_active=True, notes=None, created_at=None):
        self.id = id
        self.name = name
        self.contact_name = contact_name
        self.email = email
        self.phone = phone
        self.specialization = specialization
        self.is_active = is_active
        self.notes = notes
        self.created_at = created_at

    @staticmethod
    def create(name, contact_name=None, email=None, phone=None, specialization='general', notes=None):
        """Create a new vendor"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO vendors (name, contact_name, email, phone, specialization, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (name, contact_name, email, phone, specialization, notes))

            vendor_id = cursor.lastrowid
            conn.commit()
            return vendor_id

    @staticmethod
    def get_all(active_only=True):
        """Get all vendors, optionally filtered by active status"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            if active_only:
                cursor.execute('''
                    SELECT id, name, contact_name, email, phone, specialization,
                           is_active, notes, created_at
                    FROM vendors
                    WHERE is_active = 1
                    ORDER BY name
                ''')
            else:
                cursor.execute('''
                    SELECT id, name, contact_name, email, phone, specialization,
                           is_active, notes, created_at
                    FROM vendors
                    ORDER BY name
                ''')

            rows = cursor.fetchall()
            vendors = []

            for row in rows:
                vendor = {
                    'id': row['id'],
                    'name': row['name'],
                    'contact_name': row['contact_name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'specialization': row['specialization'],
                    'is_active': bool(row['is_active']),
                    'notes': row['notes'],
                    'created_at': row['created_at']
                }
                vendors.append(vendor)

            return vendors

    @staticmethod
    def get_by_id(vendor_id):
        """Get a vendor by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, contact_name, email, phone, specialization,
                       is_active, notes, created_at
                FROM vendors
                WHERE id = ?
            ''', (vendor_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'contact_name': row['contact_name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'specialization': row['specialization'],
                    'is_active': bool(row['is_active']),
                    'notes': row['notes'],
                    'created_at': row['created_at']
                }
            return None

    @staticmethod
    def get_by_specialization(specialization):
        """Get vendors by specialization type"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, contact_name, email, phone, specialization,
                       is_active, notes, created_at
                FROM vendors
                WHERE specialization = ? AND is_active = 1
                ORDER BY name
            ''', (specialization,))

            rows = cursor.fetchall()
            vendors = []

            for row in rows:
                vendor = {
                    'id': row['id'],
                    'name': row['name'],
                    'contact_name': row['contact_name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'specialization': row['specialization'],
                    'is_active': bool(row['is_active']),
                    'notes': row['notes'],
                    'created_at': row['created_at']
                }
                vendors.append(vendor)

            return vendors

    @staticmethod
    def update(vendor_id, name=None, contact_name=None, email=None, phone=None,
               specialization=None, is_active=None, notes=None):
        """Update vendor information"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Build update query based on provided parameters
            query_parts = []
            params = []

            if name is not None:
                query_parts.append("name = ?")
                params.append(name)

            if contact_name is not None:
                query_parts.append("contact_name = ?")
                params.append(contact_name)

            if email is not None:
                query_parts.append("email = ?")
                params.append(email)

            if phone is not None:
                query_parts.append("phone = ?")
                params.append(phone)

            if specialization is not None:
                query_parts.append("specialization = ?")
                params.append(specialization)

            if is_active is not None:
                query_parts.append("is_active = ?")
                params.append(1 if is_active else 0)

            if notes is not None:
                query_parts.append("notes = ?")
                params.append(notes)

            if not query_parts:
                return False

            query = f"UPDATE vendors SET {', '.join(query_parts)} WHERE id = ?"
            params.append(vendor_id)

            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(vendor_id):
        """Delete a vendor (sets is_active=False instead of actual deletion)"""
        return Vendor.update(vendor_id, is_active=False)