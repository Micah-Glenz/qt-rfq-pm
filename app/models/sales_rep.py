from app.db import DatabaseContext
from datetime import datetime
import re

class SalesRep:
    def __init__(self, id=None, name=None, email=None, phone=None,
                 is_active=True, created_at=None, updated_at=None):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.is_active = is_active
        self.created_at = created_at
        self.updated_at = updated_at

    @staticmethod
    def create(name, email=None, phone=None, is_active=True):
        """Create a new sales rep"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Validate email if provided
            if email and not SalesRep.validate_email(email):
                raise ValueError("Invalid email format")

            # Validate phone if provided
            if phone and not SalesRep.validate_phone(phone):
                raise ValueError("Invalid phone format")

            cursor.execute('''
                INSERT INTO sales_reps (name, email, phone, is_active)
                VALUES (?, ?, ?, ?)
            ''', (name, email, phone, is_active))

            rep_id = cursor.lastrowid
            conn.commit()
            return rep_id

    @staticmethod
    def get_all(active_only=True):
        """Get all sales reps, optionally filtered by active status"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            if active_only:
                cursor.execute('''
                    SELECT id, name, email, phone, is_active, created_at, updated_at
                    FROM sales_reps
                    WHERE is_active = 1
                    ORDER BY name
                ''')
            else:
                cursor.execute('''
                    SELECT id, name, email, phone, is_active, created_at, updated_at
                    FROM sales_reps
                    ORDER BY name
                ''')

            rows = cursor.fetchall()
            sales_reps = []

            for row in rows:
                sales_rep = {
                    'id': row['id'],
                    'name': row['name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'is_active': bool(row['is_active']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                sales_reps.append(sales_rep)

            return sales_reps

    @staticmethod
    def get_by_id(rep_id):
        """Get a sales rep by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, email, phone, is_active, created_at, updated_at
                FROM sales_reps
                WHERE id = ?
            ''', (rep_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'is_active': bool(row['is_active']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
            return None

    @staticmethod
    def get_by_email(email):
        """Get a sales rep by email"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, email, phone, is_active, created_at, updated_at
                FROM sales_reps
                WHERE email = ?
            ''', (email,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'is_active': bool(row['is_active']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
            return None

    @staticmethod
    def update(rep_id, name=None, email=None, phone=None, is_active=None):
        """Update sales rep information"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Validate email if provided
            if email is not None and not SalesRep.validate_email(email):
                raise ValueError("Invalid email format")

            # Validate phone if provided
            if phone is not None and not SalesRep.validate_phone(phone):
                raise ValueError("Invalid phone format")

            # Build update query based on provided parameters
            query_parts = []
            params = []

            if name is not None:
                query_parts.append("name = ?")
                params.append(name)

            if email is not None:
                query_parts.append("email = ?")
                params.append(email)

            if phone is not None:
                query_parts.append("phone = ?")
                params.append(phone)

            if is_active is not None:
                query_parts.append("is_active = ?")
                params.append(1 if is_active else 0)

            if not query_parts:
                return False

            # Always update updated_at when making changes
            query_parts.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE sales_reps SET {', '.join(query_parts)} WHERE id = ?"
            params.append(rep_id)

            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(rep_id):
        """Delete a sales rep (sets is_active=False instead of actual deletion)"""
        return SalesRep.update(rep_id, is_active=False)

    @staticmethod
    def validate_email(email):
        """Validate email format"""
        if not email or not email.strip():
            return False

        email = email.strip()
        # Basic email regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_phone(phone):
        """Validate phone format (basic validation)"""
        if not phone or not phone.strip():
            return True  # Phone is optional

        phone = phone.strip()
        # Remove common formatting characters for validation
        clean_phone = re.sub(r'[-.\s()]', '', phone)

        # Check if it's all digits and reasonable length
        return clean_phone.isdigit() and len(clean_phone) >= 10

    @staticmethod
    def format_phone(phone):
        """Format phone number for display"""
        if not phone:
            return ''

        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)

        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        else:
            return phone  # Return original if can't format

    @staticmethod
    def migrate_from_string_sales_reps():
        """Migrate existing string sales reps from quotes to sales_reps table"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Get unique sales rep names from quotes
            cursor.execute('''
                SELECT DISTINCT sales_rep
                FROM quotes
                WHERE sales_rep IS NOT NULL AND sales_rep != ''
                ORDER BY sales_rep
            ''')

            sales_rep_names = [row[0] for row in cursor.fetchall()]

            migrated_count = 0
            for name in sales_rep_names:
                if name and name.strip():
                    # Check if sales rep already exists
                    cursor.execute('SELECT id FROM sales_reps WHERE name = ?', (name.strip(),))
                    if not cursor.fetchone():
                        # Create new sales rep
                        cursor.execute('''
                            INSERT INTO sales_reps (name)
                            VALUES (?)
                        ''', (name.strip(),))
                        migrated_count += 1

            conn.commit()
            return migrated_count

    @staticmethod
    def migrate_quotes_to_sales_rep_ids():
        """Update quotes table to use sales_rep_id instead of sales_rep string"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Update quotes with sales_rep_id based on sales_rep name
            cursor.execute('''
                UPDATE quotes
                SET sales_rep_id = (
                    SELECT sr.id
                    FROM sales_reps sr
                    WHERE sr.name = quotes.sales_rep
                    LIMIT 1
                )
                WHERE sales_rep IS NOT NULL
                AND sales_rep != ''
                AND sales_rep_id IS NULL
            ''')

            updated_count = cursor.rowcount
            conn.commit()
            return updated_count