from app.db import DatabaseContext
from datetime import datetime
import re

class EmailTemplate:
    def __init__(self, id=None, name=None, specialty=None, subject_template=None, body_template=None,
                 is_default=False, created_at=None, updated_at=None):
        self.id = id
        self.name = name
        self.specialty = specialty
        self.subject_template = subject_template
        self.body_template = body_template
        self.is_default = is_default
        self.created_at = created_at
        self.updated_at = updated_at

    @staticmethod
    def create(name=None, specialty=None, subject_template=None, body_template=None, is_default=False):
        """Create a new email template with specialty-based categorization"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # If this is marked as default, unset other defaults for this specialty
            if is_default:
                cursor.execute("UPDATE email_templates SET is_default = 0 WHERE specialty = ?", (specialty,))

            cursor.execute('''
                INSERT INTO email_templates (name, specialty, subject_template, body_template, is_default)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, specialty, subject_template, body_template, is_default))

            template_id = cursor.lastrowid
            conn.commit()
            return template_id

    @staticmethod
    def get_by_id(template_id):
        """Get an email template by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, specialty, subject_template, body_template,
                       is_default, created_at, updated_at
                FROM email_templates
                WHERE id = ?
            ''', (template_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'specialty': row['specialty'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'is_default': bool(row['is_default']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
            return None

    @staticmethod
    def get_by_specialty(specialty, include_all=False):
        """Get email templates by specialty, optionally including all templates"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            if include_all:
                cursor.execute('''
                    SELECT id, name, specialty, subject_template, body_template,
                           is_default, created_at, updated_at
                    FROM email_templates
                    ORDER BY specialty, is_default DESC, name
                ''')
            else:
                cursor.execute('''
                    SELECT id, name, specialty, subject_template, body_template,
                           is_default, created_at, updated_at
                    FROM email_templates
                    WHERE specialty = ?
                    ORDER BY is_default DESC, name
                ''', (specialty,))

            rows = cursor.fetchall()
            templates = []

            for row in rows:
                template = {
                    'id': row['id'],
                    'name': row['name'],
                    'specialty': row['specialty'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'is_default': bool(row['is_default']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                templates.append(template)

            return templates

    @staticmethod
    def get_default_for_specialty(specialty):
        """Get the default email template for a specific specialty"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, specialty, subject_template, body_template,
                       is_default, created_at, updated_at
                FROM email_templates
                WHERE specialty = ? AND is_default = 1
                LIMIT 1
            ''', (specialty,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'specialty': row['specialty'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'is_default': bool(row['is_default']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }

            # If no default for this specialty, return general default
            if specialty != 'general':
                return EmailTemplate.get_default_for_specialty('general')

            return None

    @staticmethod
    def get_template_for_vendor(vendor_specialization):
        """Get the best template for a vendor based on their specialization"""
        # Try to get default template for the vendor's specialty first
        template = EmailTemplate.get_default_for_specialty(vendor_specialization)
        if template:
            return template

        # Fall back to general template
        return EmailTemplate.get_default_for_specialty('general')

    @staticmethod
    def get_all():
        """Get all email templates grouped by specialty"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, specialty, subject_template, body_template,
                       is_default, created_at, updated_at
                FROM email_templates
                ORDER BY specialty, is_default DESC, name
            ''')

            rows = cursor.fetchall()
            templates = []

            for row in rows:
                template = {
                    'id': row['id'],
                    'name': row['name'],
                    'specialty': row['specialty'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'is_default': bool(row['is_default']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                templates.append(template)

            return templates

    @staticmethod
    def get_by_specialties():
        """Get all email templates grouped by specialty"""
        templates = EmailTemplate.get_all()
        grouped = {}

        for template in templates:
            if template['specialty'] not in grouped:
                grouped[template['specialty']] = []
            grouped[template['specialty']].append(template)

        return grouped

    @staticmethod
    def search(query):
        """Search email templates by name, specialty, or content"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            search_pattern = f'%{query}%'
            cursor.execute('''
                SELECT id, name, specialty, subject_template, body_template,
                       is_default, created_at, updated_at
                FROM email_templates
                WHERE name LIKE ?
                   OR specialty LIKE ?
                   OR subject_template LIKE ?
                   OR body_template LIKE ?
                ORDER BY specialty, is_default DESC, name
            ''', (search_pattern, search_pattern, search_pattern, search_pattern))

            rows = cursor.fetchall()
            templates = []

            for row in rows:
                template = {
                    'id': row['id'],
                    'name': row['name'],
                    'specialty': row['specialty'],
                    'subject_template': row['subject_template'],
                    'body_template': row['body_template'],
                    'is_default': bool(row['is_default']),
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                templates.append(template)

            return templates

    @staticmethod
    def update(template_id, name=None, specialty=None, subject_template=None,
               body_template=None, is_default=None):
        """Update an email template"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Get current template to check specialty change
            cursor.execute("SELECT specialty FROM email_templates WHERE id = ?", (template_id,))
            current = cursor.fetchone()
            if not current:
                return False

            # Build update query based on provided parameters
            query_parts = []
            params = []

            if name is not None:
                query_parts.append("name = ?")
                params.append(name)

            if specialty is not None:
                query_parts.append("specialty = ?")
                params.append(specialty)

            if subject_template is not None:
                query_parts.append("subject_template = ?")
                params.append(subject_template)

            if body_template is not None:
                query_parts.append("body_template = ?")
                params.append(body_template)

            if is_default is not None:
                # If setting as default, unset other defaults for this specialty
                target_specialty = specialty if specialty is not None else current['specialty']
                if is_default:
                    cursor.execute("UPDATE email_templates SET is_default = 0 WHERE specialty = ? AND id != ?",
                                 (target_specialty, template_id))
                query_parts.append("is_default = ?")
                params.append(is_default)

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
    def set_as_default(template_id):
        """Set a template as the default for its specialty"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Get the template's specialty
            cursor.execute("SELECT specialty FROM email_templates WHERE id = ?", (template_id,))
            template = cursor.fetchone()
            if not template:
                return False

            # Unset all other defaults for this specialty
            cursor.execute("UPDATE email_templates SET is_default = 0 WHERE specialty = ? AND id != ?",
                         (template['specialty'], template_id))

            # Set this template as default
            cursor.execute("UPDATE email_templates SET is_default = 1 WHERE id = ?", (template_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(template_id):
        """Delete an email template"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            # Check if this is a default template
            cursor.execute("SELECT is_default, specialty FROM email_templates WHERE id = ?", (template_id,))
            template = cursor.fetchone()

            if template and bool(template['is_default']):
                # Don't allow deletion of default templates
                return False

            cursor.execute('DELETE FROM email_templates WHERE id = ?', (template_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def get_specialties():
        """Get all available specialties"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT specialty, COUNT(*) as template_count
                FROM email_templates
                GROUP BY specialty
                ORDER BY specialty
            ''')

            return [{'specialty': row['specialty'], 'count': row['template_count']} for row in cursor.fetchall()]

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