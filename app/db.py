import sqlite3
import os
from sqlite3 import Error
from datetime import datetime

# Default database path for local development
default_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quote_tracker.db')

# Use DATABASE_PATH from environment variable if available, otherwise use default.
# On Render, you'll set DATABASE_PATH to something like /var/data/quote_tracker.db
DATABASE_PATH = os.environ.get('DATABASE_PATH', default_db_path)

# Ensure the directory for the database exists, especially for persistent disks
db_dir = os.path.dirname(DATABASE_PATH)
if not os.path.exists(db_dir):
    os.makedirs(db_dir)

class DatabaseManager:
    @staticmethod
    def get_connection():
        """Create a database connection and return it"""
        try:
            conn = sqlite3.connect(DATABASE_PATH)
            conn.row_factory = sqlite3.Row  # Return rows as dictionaries
            return conn
        except Error as e:
            print(f"Database connection error: {e}")
            return None

    @staticmethod
    def init_db():
        """Initialize the database with tables if they don't exist"""
        connection = DatabaseManager.get_connection()
        if connection:
            try:
                cursor = connection.cursor()
                
                # Create quotes table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS quotes (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer          TEXT NOT NULL,
                    quote_no          TEXT NOT NULL UNIQUE,
                    description       TEXT,
                    sales_rep         TEXT,
                    project_sheet_url TEXT,
                    mpsf_link         TEXT,
                    folder_link       TEXT,
                    method_link       TEXT,
                    hidden            BOOLEAN DEFAULT 0,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')
                
                # Add hidden column if it doesn't exist
                cursor.execute("PRAGMA table_info(quotes)")
                columns = [column[1] for column in cursor.fetchall()]
                if 'hidden' not in columns:
                    cursor.execute("ALTER TABLE quotes ADD COLUMN hidden BOOLEAN DEFAULT 0")
                
                # Add method_link column if it doesn't exist
                if 'method_link' not in columns:
                    cursor.execute("ALTER TABLE quotes ADD COLUMN method_link TEXT")
                
                # Create tasks table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id     INTEGER NOT NULL,
                    label        TEXT NOT NULL,
                    done         BOOLEAN DEFAULT 0,
                    is_separator BOOLEAN DEFAULT 0,
                    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
                )
                ''')
                
                # Create vendor_quotes table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendor_quotes (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id   INTEGER NOT NULL,
                    type       TEXT CHECK(type IN ('freight','install','forward')) NOT NULL,
                    vendor     TEXT NOT NULL,
                    requested  BOOLEAN DEFAULT 0,
                    entered    BOOLEAN DEFAULT 0,
                    status     TEXT DEFAULT 'draft',
                    notes      TEXT,
                    date       DATE,
                    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
                )
                ''')
                
                # Create notes table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS notes (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id   INTEGER NOT NULL,
                    content    TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
                )
                ''')

                # Create events table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS events (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id   INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    past        TEXT,
                    present     TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
                )
                ''')

                # Add past/present columns if they don't exist
                cursor.execute("PRAGMA table_info(events)")
                event_columns = [column[1] for column in cursor.fetchall()]
                if 'past' not in event_columns:
                    cursor.execute("ALTER TABLE events ADD COLUMN past TEXT")
                if 'present' not in event_columns:
                    cursor.execute("ALTER TABLE events ADD COLUMN present TEXT")
                
                # Create vendors table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS vendors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    contact_name TEXT,
                    email TEXT,
                    phone TEXT,
                    specialization TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')

                # Create sales_reps table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS sales_reps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    email TEXT UNIQUE,
                    phone TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')

                # Create email_history table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS email_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL,
                    vendor_quote_id INTEGER NOT NULL,
                    vendor_id INTEGER NOT NULL,
                    to_email TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    body TEXT NOT NULL,
                    template_id INTEGER,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'sent',
                    gas_response TEXT NULL,
                    FOREIGN KEY(quote_id) REFERENCES quotes(id),
                    FOREIGN KEY(vendor_quote_id) REFERENCES vendor_quotes(id),
                    FOREIGN KEY(vendor_id) REFERENCES vendors(id),
                    FOREIGN KEY(template_id) REFERENCES email_templates(id)
                )
                ''')

                # Reset email_templates table to specialty-based system
                cursor.execute("PRAGMA table_info(email_templates)")
                template_columns = [column[1] for column in cursor.fetchall()]

                # Check if we need to migrate from old vendor-based structure
                if 'vendor_id' in template_columns:
                    print("Converting email_templates table to specialty-based system...")
                    # Drop old table and recreate with new structure
                    cursor.execute("DROP TABLE IF EXISTS email_templates")
                    print("Old templates deleted.")

                # Create new specialty-based table (if it doesn't exist)
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS email_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    specialty TEXT NOT NULL CHECK(specialty IN ('freight', 'install', 'forward', 'general')),
                    subject_template TEXT NOT NULL,
                    body_template TEXT NOT NULL,
                    is_default BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')

                # Add email_status column to email_history if it doesn't exist
                cursor.execute("PRAGMA table_info(email_history)")
                email_history_columns = [column[1] for column in cursor.fetchall()]
                if 'email_status' not in email_history_columns:
                    cursor.execute("ALTER TABLE email_history ADD COLUMN email_status TEXT DEFAULT 'current'")

                # Add cc_emails column to email_history if it doesn't exist
                if 'cc_emails' not in email_history_columns:
                    cursor.execute("ALTER TABLE email_history ADD COLUMN cc_emails TEXT DEFAULT '[]'")

                # Add bcc_emails column to email_history if it doesn't exist
                if 'bcc_emails' not in email_history_columns:
                    cursor.execute("ALTER TABLE email_history ADD COLUMN bcc_emails TEXT DEFAULT '[]'")

                # Add status column to vendor_quotes if it doesn't exist
                cursor.execute("PRAGMA table_info(vendor_quotes)")
                vendor_quotes_columns = [column[1] for column in cursor.fetchall()]
                if 'status' not in vendor_quotes_columns:
                    cursor.execute("ALTER TABLE vendor_quotes ADD COLUMN status TEXT DEFAULT 'draft'")

                # Add sales_rep_id column to quotes table if it doesn't exist (for migration)
                cursor.execute("PRAGMA table_info(quotes)")
                quotes_columns = [column[1] for column in cursor.fetchall()]
                if 'sales_rep_id' not in quotes_columns:
                    cursor.execute("ALTER TABLE quotes ADD COLUMN sales_rep_id INTEGER")
                    # Add foreign key constraint (will be enforced after data migration)
                    print("Added sales_rep_id column to quotes table")

                # Create indexes for email tables
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_templates_specialty ON email_templates(specialty)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON email_templates(is_default)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_history_quote_id ON email_history(quote_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_history_vendor_id ON email_history(vendor_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_history_vendor_quote_id ON email_history(vendor_quote_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_history_email_status ON email_history(email_status)")

                # Create indexes for sales_reps table
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_reps_name ON sales_reps(name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_reps_email ON sales_reps(email)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_reps_active ON sales_reps(is_active)")

                # Create default specialty templates if they don't exist
                cursor.execute("SELECT COUNT(*) FROM email_templates")
                if cursor.fetchone()[0] == 0:
                    print("Creating default specialty email templates...")

                    # Default templates for each specialty
                    default_templates = [
                        ('General Quote Request', 'general', True,
                         "Quote Request - {customer} - {quote_no}",
                         '''Dear {contact_name},

We are requesting a quote for {customer} for the following project:

Project Details:
• Quote Number: {quote_no}
• Description: {description}
• Service Type: {quote_type}

Please provide your best pricing and lead time information for this project. If you need any additional information, please don't hesitate to contact us.

Thank you for your consideration.

Best regards,
{sales_rep}
{current_date}'''),

                        ('Freight Quote Request', 'freight', True,
                         "Freight Quote Request - {customer} - {quote_no}",
                         '''Dear {contact_name},

We are requesting a freight quote for {customer} for the following project:

Project Details:
• Quote Number: {quote_no}
• Description: {description}
• Pickup Location: {pickup_location}
• Delivery Location: {delivery_location}

Please provide your best freight pricing including:
- Transportation costs
- Insurance options
- Estimated transit time
- Any additional fees

Thank you for your consideration.

Best regards,
{sales_rep}
{current_date}'''),

                        ('Installation Quote Request', 'install', True,
                         "Installation Quote Request - {customer} - {quote_no}",
                         '''Dear {contact_name},

We are requesting an installation quote for {customer} for the following project:

Project Details:
• Quote Number: {quote_no}
• Description: {description}
• Installation Location: {installation_location}
• Scope of Work: {scope_of_work}

Please provide your best installation pricing including:
- Labor costs
- Equipment requirements
- Timeline for completion
- Any permits or special requirements

Thank you for your consideration.

Best regards,
{sales_rep}
{current_date}'''),

                        ('Forwarding Quote Request', 'forward', True,
                         "Forwarding Quote Request - {customer} - {quote_no}",
                         '''Dear {contact_name},

We are requesting a forwarding/consolidation quote for {customer} for the following project:

Project Details:
• Quote Number: {quote_no}
• Description: {description}
• Origin: {origin_location}
• Destination: {destination_location}

Please provide your best forwarding services pricing including:
- Consolidation services
- Documentation handling
- Customs clearance
- Warehousing if applicable

Thank you for your consideration.

Best regards,
{sales_rep}
{current_date}''')
                    ]

                    cursor.executemany('''
                    INSERT INTO email_templates (name, specialty, is_default, subject_template, body_template)
                    VALUES (?, ?, ?, ?, ?)
                    ''', default_templates)
                    print("Default specialty email templates created.")

                # Create default_tasks table
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS default_tasks (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    label        TEXT NOT NULL,
                    sort_order   INTEGER DEFAULT 0,
                    is_separator BOOLEAN DEFAULT 0,
                    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')

                # Enable foreign key constraints
                cursor.execute("PRAGMA foreign_keys = ON")
                
                # Add some default tasks if the table is empty
                cursor.execute("SELECT COUNT(*) FROM default_tasks")
                if cursor.fetchone()[0] == 0:
                    default_tasks = [
                        (1, "Create purchase order", 0, 0),
                        (2, "Send quote to customer", 10, 0),
                        (3, "Follow up with customer", 20, 0),
                        (4, "Request freight quote", 30, 0),
                        (5, "Request installation quote", 40, 0),
                        (6, "Finalize pricing", 50, 0),
                        (7, "Internal approvals", 60, 1),  # Separator
                        (8, "Get manager approval", 70, 0),
                        (9, "Submit to accounting", 80, 0)
                    ]
                    
                    cursor.executemany('''
                    INSERT OR IGNORE INTO default_tasks (id, label, sort_order, is_separator)
                    VALUES (?, ?, ?, ?)
                    ''', default_tasks)
                
                connection.commit()
                print("Database initialized successfully")
            except Error as e:
                print(f"Database initialization error: {e}")
            finally:
                connection.close()
        else:
            print("Could not establish database connection")


class DatabaseContext:
    """Context manager for database connections"""
    
    def __enter__(self):
        self.conn = DatabaseManager.get_connection()
        return self.conn
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()
