from django.apps import AppConfig
from django.db import connection, ProgrammingError

class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'finance'

    def ready(self):
        # Import signal handlers 
        try:
            import finance.signals
        except:
            pass

        # Run any SQL fixers if needed - with extreme safety
        self.run_sql_fix()

    def run_sql_fix(self):
        try:
            with connection.cursor() as cursor:
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
