from app.db import DatabaseContext
from datetime import datetime
import json
import logging

# Set up logging for email history operations
logger = logging.getLogger(__name__)

class EmailHistory:
    def __init__(self, id=None, quote_id=None, vendor_quote_id=None, vendor_id=None,
                 to_email=None, subject=None, body=None, template_id=None, sent_at=None,
                 status='sent', gas_response=None, email_status='current', cc_emails=None, bcc_emails=None):
        self.id = id
        self.quote_id = quote_id
        self.vendor_quote_id = vendor_quote_id
        self.vendor_id = vendor_id
        self.to_email = to_email
        self.subject = subject
        self.body = body
        self.template_id = template_id
        self.sent_at = sent_at
        self.status = status
        self.gas_response = gas_response
        self.email_status = email_status
        self.cc_emails = cc_emails or []
        self.bcc_emails = bcc_emails or []

    @staticmethod
    def _parse_cc_bcc_arrays(cc_emails_json, bcc_emails_json):
        """Parse CC/BCC JSON arrays from database with error handling"""
        try:
            cc_emails = json.loads(cc_emails_json) if cc_emails_json else []
        except (json.JSONDecodeError, TypeError):
            cc_emails = []

        try:
            bcc_emails = json.loads(bcc_emails_json) if bcc_emails_json else []
        except (json.JSONDecodeError, TypeError):
            bcc_emails = []

        return cc_emails, bcc_emails

    @staticmethod
    def create(quote_id, vendor_quote_id, vendor_id, to_email, subject, body,
                template_id=None, status='sent', gas_response=None, email_status='current', cc_emails=None, bcc_emails=None):
        """Create a new email history record"""
        try:
            # Convert gas_response to JSON string if it's a dict
            gas_response_json = json.dumps(gas_response) if isinstance(gas_response, dict) else gas_response

            # Convert CC/BCC arrays to JSON strings
            cc_emails_json = json.dumps(cc_emails or [])
            bcc_emails_json = json.dumps(bcc_emails or [])

            with DatabaseContext() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO email_history
                    (quote_id, vendor_quote_id, vendor_id, to_email, subject, body,
                     template_id, status, gas_response, email_status, cc_emails, bcc_emails)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (quote_id, vendor_quote_id, vendor_id, to_email, subject, body,
                      template_id, status, gas_response_json, email_status, cc_emails_json, bcc_emails_json))

                history_id = cursor.lastrowid
                conn.commit()

                logger.info(f"Email history created: ID={history_id}, Quote={quote_id}, Vendor={vendor_id}, To={to_email}")
                if cc_emails:
                    logger.info(f"CC recipients: {cc_emails}")
                if bcc_emails:
                    logger.info(f"BCC recipients: {bcc_emails}")
                return history_id

        except Exception as e:
            logger.error(f"Failed to create email history: {str(e)}")
            raise Exception(f"Database error while creating email history: {str(e)}")

    @staticmethod
    def get_by_id(history_id):
        """Get an email history record by ID"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT eh.id, eh.quote_id, eh.vendor_quote_id, eh.vendor_id,
                       eh.to_email, eh.subject, eh.body, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       eh.cc_emails, eh.bcc_emails,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                WHERE eh.id = ?
            ''', (history_id,))

            row = cursor.fetchone()
            if row:
                # Parse CC/BCC JSON arrays
                cc_emails, bcc_emails = EmailHistory._parse_cc_bcc_arrays(row['cc_emails'], row['bcc_emails'])

                return {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_quote_id': row['vendor_quote_id'],
                    'vendor_id': row['vendor_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'body': row['body'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'cc_emails': cc_emails,
                    'bcc_emails': bcc_emails,
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
            return None

    @staticmethod
    def get_by_quote(quote_id):
        """Get all email history for a specific quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT eh.id, eh.vendor_quote_id, eh.vendor_id,
                       eh.to_email, eh.subject, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       eh.cc_emails, eh.bcc_emails,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                WHERE eh.quote_id = ?
                ORDER BY eh.sent_at DESC
            ''', (quote_id,))

            rows = cursor.fetchall()
            history_list = []

            for row in rows:
                # Parse CC/BCC JSON arrays
                cc_emails, bcc_emails = EmailHistory._parse_cc_bcc_arrays(row['cc_emails'], row['bcc_emails'])

                history = {
                    'id': row['id'],
                    'vendor_quote_id': row['vendor_quote_id'],
                    'vendor_id': row['vendor_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'cc_emails': cc_emails,
                    'bcc_emails': bcc_emails,
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
                history_list.append(history)

            return history_list

    @staticmethod
    def get_by_vendor(vendor_id):
        """Get all email history for a specific vendor"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT eh.id, eh.quote_id, eh.vendor_quote_id,
                       eh.to_email, eh.subject, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                WHERE eh.vendor_id = ?
                ORDER BY eh.sent_at DESC
            ''', (vendor_id,))

            rows = cursor.fetchall()
            history_list = []

            for row in rows:
                history = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_quote_id': row['vendor_quote_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
                history_list.append(history)

            return history_list

    @staticmethod
    def get_by_vendor_quote(vendor_quote_id):
        """Get all email history for a specific vendor quote"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT eh.id, eh.quote_id, eh.vendor_id,
                       eh.to_email, eh.subject, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                WHERE eh.vendor_quote_id = ?
                ORDER BY eh.sent_at DESC
            ''', (vendor_quote_id,))

            rows = cursor.fetchall()
            history_list = []

            for row in rows:
                history = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_id': row['vendor_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
                history_list.append(history)

            return history_list

    @staticmethod
    def get_all(limit=100, offset=0):
        """Get all email history with pagination"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT eh.id, eh.quote_id, eh.vendor_quote_id, eh.vendor_id,
                       eh.to_email, eh.subject, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       eh.cc_emails, eh.bcc_emails,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                ORDER BY eh.sent_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))

            rows = cursor.fetchall()
            history_list = []

            for row in rows:
                history = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_quote_id': row['vendor_quote_id'],
                    'vendor_id': row['vendor_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
                history_list.append(history)

            return history_list

    @staticmethod
    def search(query, limit=100, offset=0):
        """Search email history by subject, vendor name, or quote number"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            search_pattern = f'%{query}%'
            cursor.execute('''
                SELECT eh.id, eh.quote_id, eh.vendor_quote_id, eh.vendor_id,
                       eh.to_email, eh.subject, eh.template_id,
                       eh.sent_at, eh.status, eh.gas_response, eh.email_status,
                       v.name as vendor_name, q.quote_no
                FROM email_history eh
                JOIN vendors v ON eh.vendor_id = v.id
                JOIN quotes q ON eh.quote_id = q.id
                WHERE eh.subject LIKE ?
                   OR v.name LIKE ?
                   OR q.quote_no LIKE ?
                   OR eh.to_email LIKE ?
                ORDER BY eh.sent_at DESC
                LIMIT ? OFFSET ?
            ''', (search_pattern, search_pattern, search_pattern, search_pattern, limit, offset))

            rows = cursor.fetchall()
            history_list = []

            for row in rows:
                history = {
                    'id': row['id'],
                    'quote_id': row['quote_id'],
                    'vendor_quote_id': row['vendor_quote_id'],
                    'vendor_id': row['vendor_id'],
                    'to_email': row['to_email'],
                    'subject': row['subject'],
                    'template_id': row['template_id'],
                    'sent_at': row['sent_at'],
                    'status': row['status'],
                    'gas_response': row['gas_response'],
                    'email_status': row['email_status'],
                    'vendor_name': row['vendor_name'],
                    'quote_no': row['quote_no']
                }
                history_list.append(history)

            return history_list

    @staticmethod
    def update_status(history_id, status, gas_response=None):
        """Update the status of an email history record"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()

            if gas_response:
                cursor.execute('''
                    UPDATE email_history
                    SET status = ?, gas_response = ?
                    WHERE id = ?
                ''', (status, gas_response, history_id))
            else:
                cursor.execute('''
                    UPDATE email_history
                    SET status = ?
                    WHERE id = ?
                ''', (status, history_id))

            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def update_email_status(history_id, email_status):
        """Update the email_status of an email history record"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE email_history
                SET email_status = ?
                WHERE id = ?
            ''', (email_status, history_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def get_count():
        """Get total count of email history records"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM email_history')
            return cursor.fetchone()[0]

    @staticmethod
    def delete_old_records(days_old=365):
        """Delete email history records older than specified days (for maintenance)"""
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM email_history
                WHERE sent_at < datetime('now', '-{} days')
            '''.format(days_old))
            deleted_count = cursor.rowcount
            conn.commit()
            return deleted_count