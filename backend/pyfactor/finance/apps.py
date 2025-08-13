from django.apps import AppConfig
from django.db import connection, ProgrammingError
from asgiref.sync import sync_to_async

class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'finance'

    def ready(self):
        # Import signal handlers 
        try:
            import finance.signals
        except:
            pass

        # Run any SQL fixers if needed
        # Skip the SQL fix in async contexts to avoid the error
        # This will run properly when Django starts in sync context
        import asyncio
        try:
            if not asyncio.get_event_loop().is_running():
                self.run_sql_fix()
        except RuntimeError:
            # We're in an async context, skip running the SQL fix
            pass

    def run_sql_fix(self):
        try:
            with connection.cursor() as cursor:
                # Fix AccountCategory constraints
                try:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'finance_accountcategory'
                        ) AS table_exists;
                    """)
                    category_table_exists = cursor.fetchone()[0]
                    
                    if category_table_exists:
                        # Check for and remove the problematic constraint
                        cursor.execute("""
                            SELECT COUNT(*) 
                            FROM pg_constraint 
                            WHERE conname = 'finance_accountcategory_code_key'
                            AND conrelid = 'finance_accountcategory'::regclass;
                        """)
                        
                        if cursor.fetchone()[0] > 0:
                            cursor.execute("""
                                ALTER TABLE finance_accountcategory 
                                DROP CONSTRAINT IF EXISTS finance_accountcategory_code_key CASCADE;
                            """)
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.info("Removed problematic AccountCategory constraint on startup")
                
                except ProgrammingError:
                    pass  # Table doesn't exist yet
                
                # Super safe check for table existence
                try:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'finance_accountreconciliation'
                        ) AS table_exists;
                    """)
                    finance_table_exists = cursor.fetchone()[0]
                except ProgrammingError:
                    finance_table_exists = False
                
                try:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'banking_bankaccount'
                        ) AS table_exists;
                    """)
                    banking_table_exists = cursor.fetchone()[0]
                except ProgrammingError:
                    banking_table_exists = False
                
                # Only apply fix if both tables exist
                if finance_table_exists and banking_table_exists:
                    try:
                        # Check if constraint already exists
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT 1 FROM pg_constraint
                                WHERE conrelid = 'finance_accountreconciliation'::regclass
                                AND confrelid = 'banking_bankaccount'::regclass
                            )
                        """)
                        
                        constraint_exists = cursor.fetchone()[0]
                        
                        if not constraint_exists:
                            # Original fix can go here, but safely wrapped
                            pass
                    except ProgrammingError:
                        # Table/constraint doesn't exist yet, skip gracefully
                        pass
        except Exception as e:
            # Just log the error but don't crash the app startup
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in run_sql_fix: {e}")
            pass
