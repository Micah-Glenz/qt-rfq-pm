from app.db import DatabaseContext
from datetime import datetime
import re

class EmailTemplate:
    def __init__(self, id=None, vendor_id=None, subject_template=None, body_template=None,
                 created_at=None, updated_at=None):
        self.id = id
        self.vendor_id = vendor_id
        self.subject_template = subject_template
        self.body_template = body_template
        self.created_at = created_at
        self.updated_at = updated_at

    @staticmethod
    def create(vendor_id, subject_template, body_template):
        """Create a new email template for a vendor"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO email_templates (vendor_id, subject_template, body_template)
                VALUES (?, ?, ?)
            ''', (vendor_id, subject_template, body_template))

            template_id = cursor.lastrowid
            conn.commit()
            return template_id

    @staticmethod
    def get_by_id(template_id):
        """Get an email template by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT et.id, et.vendor_id, et.subject_template, et.body_template,
                       et.created_at, et.updated_at, v.name as vendor_name
                FROM email_templates et
                JOIN vendors v ON et.vendor_id = v.id
                WHERE et.id = ?
            ''', (template_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'vendor_id': row['vendor_id'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'vendor_name': row['vendor_name']
                }
            return None

    @staticmethod
    def get_by_vendor(vendor_id):
        """Get an email template by vendor ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT et.id, et.vendor_id, et.subject_template, et.body_template,
                       et.created_at, et.updated_at, v.name as vendor_name
                FROM email_templates et
                JOIN vendors v ON et.vendor_id = v.id
                WHERE et.vendor_id = ?
            ''', (vendor_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'vendor_id': row['vendor_id'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'vendor_name': row['vendor_name']
                }
            return None

    @staticmethod
    def get_all():
        """Get all email templates with vendor information"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT et.id, et.vendor_id, et.subject_template, et.body_template,
                       et.created_at, et.updated_at, v.name as vendor_name,
                       v.email as vendor_email, v.specialization
                FROM email_templates et
                JOIN vendors v ON et.vendor_id = v.id
                ORDER BY v.name
            ''')

            rows = cursor.fetchall()
            templates = []

            for row in rows:
                template = {
                    'id': row['id'],
                    'vendor_id': row['vendor_id'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'vendor_name': row['vendor_name'],
                    'vendor_email': row['vendor_email'],
                    'specialization': row['specialization']
                }
                templates.append(template)

            return templates

    @staticmethod
    def search(query):
        """Search email templates by vendor name or template content"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            search_pattern = f'%{query}%'
            cursor.execute('''
                SELECT et.id, et.vendor_id, et.subject_template, et.body_template,
                       et.created_at, et.updated_at, v.name as vendor_name,
                       v.email as vendor_email, v.specialization
                FROM email_templates et
                JOIN vendors v ON et.vendor_id = v.id
                WHERE v.name LIKE ?
                   OR et.subject_template LIKE ?
                   OR et.body_template LIKE ?
                ORDER BY v.name
            ''', (search_pattern, search_pattern, search_pattern))

            rows = cursor.fetchall()
            templates = []

            for row in rows:
                template = {
                    'id': row['id'],
                    'vendor_id': row['vendor_id'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'vendor_name': row['vendor_name'],
                    'vendor_email': row['vendor_email'],
                    'specialization': row['specialization']
                }
                templates.append(template)

            return templates

    @staticmethod
    def update(template_id, subject_template=None, body_template=None):
        """Update an email template"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Build update query based on provided parameters
            query_parts = []
            params = []

            if subject_template is not None:
                query_parts.append("subject_template = ?")
                params.append(subject_template)

            if body_template is not None:
                query_parts.append("body_template = ?")
                params.append(body_template)

            if not query_parts:
                return False

            # Always update updated_at when making changes
            query_parts.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE email_templates SET {', '.join(query_parts)} WHERE id = ?"
            params.append(template_id)

            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(template_id):
        """Delete an email template"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM email_templates WHERE id = ?', (template_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete_by_vendor(vendor_id):
        """Delete an email template by vendor ID (used when vendor is deleted)"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM email_templates WHERE vendor_id = ?', (vendor_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def vendor_has_template(vendor_id):
        """Check if a vendor already has an email template"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM email_templates WHERE vendor_id = ?', (vendor_id,))
            return cursor.fetchone()[0] > 0

    @staticmethod
    def substitute_variables(template_content, variables):
        """
        Replace {variable} placeholders with actual values

        Args:
            template_content: String with {variable} placeholders
            variables: Dictionary of variable names to values

        Returns:
            String with variables substituted
        """
        if not template_content:
            return template_content

        # Find all variables in the template
        pattern = r'\{([^}]+)\}'
        matches = re.findall(pattern, template_content)

        # Substitute each variable
        substituted_content = template_content
        for var_name in matches:
            placeholder = f'{{{var_name}}}'
            value = str(variables.get(var_name, ''))
            substituted_content = substituted_content.replace(placeholder, value)

        return substituted_content

    @staticmethod
    def extract_variables(template_content):
        """
        Extract all variable names from template content

        Args:
            template_content: String with {variable} placeholders

        Returns:
            List of variable names found in template
        """
        if not template_content:
            return []

        pattern = r'\{([^}]+)\}'
        matches = re.findall(pattern, template_content)
        return list(set(matches))  # Return unique variable names

    @staticmethod
    def get_preview(template_id, variables=None):
        """
        Get template preview with variables substituted

        Args:
            template_id: ID of the template
            variables: Dictionary of variables (optional)

        Returns:
            Dictionary with substituted content and used variables
        """
        template = EmailTemplate.get_by_id(template_id)
        if not template:
            return None

        # Use provided variables or defaults
        if variables is None:
            variables = {}

        # Add default current date if not provided
        if 'current_date' not in variables:
            variables['current_date'] = datetime.now().strftime('%Y-%m-%d')

        # Extract variables from template
        subject_vars = EmailTemplate.extract_variables(template['subject_template'])
        body_vars = EmailTemplate.extract_variables(template['body_template'])
        all_vars = list(set(subject_vars + body_vars))

        # Substitute variables
        subject_substituted = EmailTemplate.substitute_variables(template['subject_template'], variables)
        body_substituted = EmailTemplate.substitute_variables(template['body_template'], variables)

        return {
            'template_id': template_id,
            'template': template,
            'variables_found': all_vars,
            'variables_provided': list(variables.keys()),
            'missing_variables': [var for var in all_vars if var not in variables],
            'subject_substituted': subject_substituted,
            'body_substituted': body_substituted
        }