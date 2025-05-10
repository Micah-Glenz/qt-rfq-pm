import sqlite3
import os
from sqlite3 import Error
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quote_tracker.db')

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
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer    TEXT NOT NULL,
                    quote_no    TEXT NOT NULL UNIQUE,
                    description TEXT,
                    sales_rep   TEXT,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                ''')
                
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
