#/Users/kuoldeng/projectx/backend/pyfactor/users/management/commands/reset_db_main.py
import os
import shutil
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps
import django
import logging
from django.db.utils import ProgrammingError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reset database, recreate migrations, and set up NextAuth.js tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input', action='store_true',
            help='Skip all user prompts',
        )

    def find_migration_files(self):
        migration_files = []
        for root, dirs, files in os.walk('.'):
            if 'migrations' in dirs:
                migration_path = os.path.join(root, 'migrations')
                for file in os.listdir(migration_path):
                    if file != '__init__.py' and file.endswith('.py'):
                        migration_files.append(os.path.join(migration_path, file))
        return migration_files

    def list_files(self, files):
        self.stdout.write("The following migration files will be deleted:")
        for file in files:
            self.stdout.write(file)

    def prompt_confirmation(self, no_input=False):
        if no_input:
            return True
        response = input("Are you sure you want to reset the database and recreate migrations? This will delete all data. (yes/no): ")
        return response.lower() == 'yes'

    def delete_files(self, files):
        for file in files:
            if os.path.isfile(file):
                os.remove(file)
                logger.info(f"Deleted file: {file}")
            elif os.path.isdir(file):
                shutil.rmtree(file)
                logger.info(f"Deleted directory: {file}")

    def handle(self, *args, **options):
        no_input = options['no_input']
        
        if not self.prompt_confirmation(no_input):
            self.stdout.write("Operation cancelled by user.")
            return

        table_status = {}
        database_status = {}

        try:
            # Step 1: Delete migration files
            migration_files = self.find_migration_files()
            if migration_files:
                self.list_files(migration_files)
                if self.prompt_confirmation(no_input):
                    self.delete_files(migration_files)
                    logger.info("All specified migration files have been deleted.")
                else:
                    logger.info("No files were deleted.")
                    return
            else:
                logger.info("No migration files found to delete.")

            # Step 2: Drop all user databases
            conn_details = self.get_admin_db_connection_details()
            self.drop_all_user_databases(conn_details)

            # Step 3: Drop non-template databases
            database_status = self.drop_non_template_databases(conn_details)

            # Step 4: Drop all views
            self.drop_all_views()

            # Step 5: Custom flush (drop all tables)
            table_status = self.custom_flush()

            # Step 6: Drop all sequences
            self.drop_all_sequences()

            # Step 7: Reset all sequences
            self.reset_all_sequences()

            # Step 8: Recreate the public schema
            with connection.cursor() as cursor:
                self.drop_public_schema(cursor)
                           # Clear inventory data
                self.clear_inventory_data(cursor)
                
                # Clear report data  
                self.clear_report_data(cursor)

            # Step 9: Recreate and apply migrations
            self.recreate_and_apply_migrations()

            # Step 10: Reset sequences again after migrations
            self.reset_all_sequences()


            # Step 11: Check for lingering data
            self.check_and_clear_lingering_data()

            # Step 12: Recreate account types
            self.recreate_account_types()

            # Step 13: Check for any remaining model changes
            self.check_and_apply_remaining_changes()

            # Step 14: Create NextAuth.js tables
            self.create_nextauth_tables(conn_details)

            self.print_summary(table_status, database_status)

            logger.info("Database reset, migrations recreated, and NextAuth.js tables created successfully.")
        except Exception as e:
            logger.error(f"An error occurred during the process: {e}")
            self.stdout.write(self.style.ERROR(f"Process failed: {e}"))
            
    def get_admin_db_connection_details(self):
        default_db = settings.DATABASES['default']
        return {
            'dbname': 'postgres',  # Connect to 'postgres' database for administrative tasks
            'user': default_db['USER'],
            'password': default_db['PASSWORD'],
            'host': default_db['HOST'],
            'port': default_db['PORT'],
            'connect_timeout': 30,  # Increased timeout for RDS
            'options': '-c statement_timeout=0',  # No statement timeout
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5
        }
        
    def drop_all_user_databases(self, conn_details):
        database_status = {}
        max_retries = 3
        retry_delay = 5  # seconds

        try:
            # First connect to postgres database to get list of databases
            with psycopg2.connect(**{**conn_details, 'dbname': 'postgres'}) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    # Get all databases owned by the current user, excluding system DBs
                    cur.execute("""
                        SELECT d.datname 
                        FROM pg_database d
                        JOIN pg_roles r ON d.datdba = r.oid
                        WHERE d.datistemplate = false 
                        AND d.datname NOT IN ('postgres', 'template0', 'template1', 'rdsadmin')
                        AND r.rolname = current_user;
                    """)
                    databases = cur.fetchall()

            # Now process each database
            for db in databases:
                db_name = db[0]
                for attempt in range(max_retries):
                    try:
                        # Connect to postgres database for each operation
                        with psycopg2.connect(**{**conn_details, 'dbname': 'postgres'}) as conn:
                            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                            with conn.cursor() as cur:
                                try:
                                    # Force terminate all connections except our own
                                    cur.execute("""
                                        SELECT pg_terminate_backend(pid)
                                        FROM pg_stat_activity
                                        WHERE datname = %s 
                                        AND pid <> pg_backend_pid()
                                        AND usename = current_user;
                                    """, (db_name,))
                                    
                                    # Wait a moment for connections to close
                                    import time
                                    time.sleep(2)
                                    
                                    # Drop the database
                                    cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                                    database_status[db_name] = "Dropped"
                                    logger.info(f"Database {db_name} dropped successfully.")
                                    break  # Success - exit retry loop
                                        
                                except Exception as e:
                                    if "cannot run inside a transaction block" in str(e):
                                        # If in transaction, reconnect with autocommit
                                        conn.rollback()
                                        continue
                                    elif "permission denied" in str(e) and "SUPERUSER" in str(e):
                                        # Skip if we don't have permission
                                        database_status[db_name] = f"Skipped: {str(e)}"
                                        logger.warning(f"Skipping database {db_name} due to permissions: {e}")
                                        break
                                    else:
                                        raise
                    except Exception as e:
                        if attempt == max_retries - 1:
                            database_status[db_name] = f"Error: {str(e)}"
                            logger.error(f"Error dropping database {db_name} after {max_retries} attempts: {e}")
                        else:
                            logger.warning(f"Attempt {attempt + 1} failed for {db_name}: {e}")
                            time.sleep(retry_delay)

            logger.info("\nDatabase Status:")
            for db, status in database_status.items():
                logger.info(f"{db}: {status}")

        except Exception as e:
            logger.error(f"Error in drop_all_user_databases: {e}")
        
        return database_status


    def recreate_main_database(self, conn_details):
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                with psycopg2.connect(**conn_details) as conn:
                    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                    with conn.cursor() as cur:
                        main_db_name = settings.DATABASES['default']['NAME']
                        
                        # First check if we have the necessary permissions
                        cur.execute("SELECT current_user, current_setting('is_superuser');")
                        current_user, is_superuser = cur.fetchone()
                        logger.info(f"Connected as {current_user} (superuser: {is_superuser})")
                        
                        # Terminate existing connections
                        cur.execute("""
                            SELECT pg_terminate_backend(pid)
                            FROM pg_stat_activity
                            WHERE datname = %s 
                            AND pid <> pg_backend_pid()
                            AND usename = current_user;
                        """, (main_db_name,))
                        
                        # Wait for connections to close
                        import time
                        time.sleep(2)
                        
                        # Drop and recreate the database
                        cur.execute(f'DROP DATABASE IF EXISTS "{main_db_name}";')
                        cur.execute(f"""
                            CREATE DATABASE "{main_db_name}"
                            WITH 
                            OWNER = {current_user}
                            ENCODING = 'UTF8'
                            LC_COLLATE = 'en_US.UTF-8'
                            LC_CTYPE = 'en_US.UTF-8'
                            TEMPLATE = template0;
                        """)
                        logger.info(f"Main database '{main_db_name}' recreated successfully.")
                        
                        # Set default privileges
                        cur.execute(f"""
                            REVOKE CONNECT ON DATABASE "{main_db_name}" FROM PUBLIC;
                            GRANT CONNECT ON DATABASE "{main_db_name}" TO {current_user};
                            GRANT ALL PRIVILEGES ON DATABASE "{main_db_name}" TO {current_user};
                        """)
                        logger.info(f"Privileges set for '{main_db_name}'")
                        
                        return  # Success - exit the retry loop
                        
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Failed to recreate main database after {max_retries} attempts: {e}")


    def get_db_connection_details(self):
        default_db = settings.DATABASES['default']
        return {
            'dbname': default_db['NAME'],
            'user': default_db['USER'],
            'password': default_db['PASSWORD'],
            'host': default_db['HOST'],
            'port': default_db['PORT']
        }

    def drop_public_schema(self, cursor):
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                # First check if we have the necessary permissions
                cursor.execute("SELECT current_user, current_setting('is_superuser');")
                current_user, is_superuser = cursor.fetchone()
                logger.info(f"Connected as {current_user} (superuser: {is_superuser})")
                
                # Drop and recreate schema with proper ownership
                cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
                cursor.execute("CREATE SCHEMA public;")
                
                # Set proper ownership and permissions for RDS using current user
                cursor.execute(f"ALTER SCHEMA public OWNER TO {current_user};")
                cursor.execute(f"GRANT ALL ON SCHEMA public TO {current_user};")
                cursor.execute("GRANT ALL ON SCHEMA public TO PUBLIC;")
                
                # Set search path
                cursor.execute(f"ALTER DATABASE {settings.DATABASES['default']['NAME']} SET search_path TO public;")
                
                logger.info("Public schema dropped and recreated successfully with proper permissions.")
                return  # Success - exit the retry loop
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} to reset public schema failed: {str(e)}")
                if attempt < max_retries - 1:
                    import time
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Failed to reset public schema after {max_retries} attempts: {str(e)}")

    def clear_user_data(self, cursor):
        try:
            cursor.execute("TRUNCATE TABLE users_user CASCADE;")
            logger.info("User data cleared successfully.")
        except ProgrammingError:
            logger.info("users_user table does not exist. Skipping.")
        except Exception as e:
            logger.error(f"Error clearing user data: {e}")

    def drop_non_template_databases(self, conn_details):
        database_status = {}
        max_retries = 3
        retry_delay = 5  # seconds

        try:
            # First connect to postgres database to get list of databases
            with psycopg2.connect(**{**conn_details, 'dbname': 'postgres'}) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT d.datname 
                        FROM pg_database d
                        WHERE d.datistemplate = false 
                        AND d.datname NOT IN ('postgres', 'template0', 'template1', 'rdsadmin', %s);
                    """, (settings.DATABASES['default']['NAME'],))
                    databases = cur.fetchall()

            # Now process each database
            for db in databases:
                db_name = db[0]
                for attempt in range(max_retries):
                    try:
                        # Connect to postgres database for each operation
                        with psycopg2.connect(**{**conn_details, 'dbname': 'postgres'}) as conn:
                            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                            with conn.cursor() as cur:
                                try:
                                    # Check if we have permission to manage this database
                                    cur.execute("""
                                        SELECT has_database_privilege(current_user, %s, 'CREATE')
                                    """, (db_name,))
                                    has_permission = cur.fetchone()[0]
                                    
                                    if not has_permission:
                                        database_status[db_name] = "Skipped: No permission"
                                        logger.warning(f"Skipping database {db_name} due to insufficient permissions")
                                        break
                                    
                                    # Force terminate all connections except our own
                                    cur.execute("""
                                        SELECT pg_terminate_backend(pid)
                                        FROM pg_stat_activity
                                        WHERE datname = %s 
                                        AND pid <> pg_backend_pid()
                                        AND usename = current_user;
                                    """, (db_name,))
                                    
                                    # Wait a moment for connections to close
                                    import time
                                    time.sleep(2)
                                    
                                    # Drop the database
                                    cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                                    database_status[db_name] = "Dropped"
                                    logger.info(f"Database {db_name} dropped successfully.")
                                    break  # Success - exit retry loop
                                        
                                except Exception as e:
                                    if "cannot run inside a transaction block" in str(e):
                                        # If in transaction, reconnect with autocommit
                                        conn.rollback()
                                        continue
                                    elif "permission denied" in str(e) and "SUPERUSER" in str(e):
                                        # Skip if we don't have permission
                                        database_status[db_name] = f"Skipped: {str(e)}"
                                        logger.warning(f"Skipping database {db_name} due to permissions: {e}")
                                        break
                                    else:
                                        raise
                    except Exception as e:
                        if attempt == max_retries - 1:
                            database_status[db_name] = f"Error: {str(e)}"
                            logger.error(f"Error dropping database {db_name} after {max_retries} attempts: {e}")
                        else:
                            logger.warning(f"Attempt {attempt + 1} failed for {db_name}: {e}")
                            time.sleep(retry_delay)

            logger.info("\nDatabase Status:")
            for db, status in database_status.items():
                logger.info(f"{db}: {status}")

        except Exception as e:
            logger.error(f"Error in drop_non_template_databases: {e}")
        
        return database_status

    def custom_flush(self):
        logger.info("Flushing database...")
        table_status = {}
        with connection.cursor() as cursor:
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
            tables = cursor.fetchall()
            for table in tables:
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS "{table[0]}" CASCADE;')
                    table_status[table[0]] = "Dropped"
                except Exception as e:
                    table_status[table[0]] = f"Error: {str(e)}"
                    logger.error(f"Error dropping table {table[0]}: {e}")
        
        logger.info("Database flush attempt completed.")
        return table_status

    def reset_all_sequences(self):
        logger.info("Resetting all sequences...")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 'SELECT SETVAL(' ||
                    quote_literal(quote_ident(PGT.schemaname) || '.' || quote_ident(S.relname)) ||
                    ', COALESCE(MAX(' ||quote_ident(C.attname)|| '), 1) ) FROM ' ||
                    quote_ident(PGT.schemaname)|| '.'||quote_ident(T.relname)|| ';'
                FROM pg_class AS S,
                    pg_depend AS D,
                    pg_class AS T,
                    pg_attribute AS C,
                    pg_tables AS PGT
                WHERE S.relkind = 'S'
                    AND S.oid = D.objid
                    AND D.refobjid = T.oid
                    AND D.refobjid = C.attrelid
                    AND D.refobjsubid = C.attnum
                    AND T.relname = PGT.tablename
                ORDER BY S.relname;
            """)
            statements = cursor.fetchall()
            for stmt in statements:
                cursor.execute(stmt[0])
        logger.info("All sequences reset.")

    def drop_all_views(self):
        logger.info("Dropping all views...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT table_name FROM information_schema.views WHERE table_schema = 'public';")
            views = cursor.fetchall()
            for view in views:
                try:
                    cursor.execute(f'DROP VIEW IF EXISTS "{view[0]}" CASCADE;')
                    logger.info(f"Dropped view: {view[0]}")
                except Exception as e:
                    logger.error(f"Error dropping view {view[0]}: {e}")
        
    def drop_all_sequences(self):
        logger.info("Dropping all sequences...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';")
            sequences = cursor.fetchall()
            for seq in sequences:
                try:
                    cursor.execute(f'DROP SEQUENCE IF EXISTS "{seq[0]}" CASCADE;')
                    logger.info(f"Dropped sequence: {seq[0]}")
                except Exception as e:
                    logger.error(f"Error dropping sequence {seq[0]}: {e}")

    def recreate_and_apply_migrations(self):
        logger.info("Making new migrations...")
        django.core.management.call_command('makemigrations')
        
        logger.info("Applying migrations...")
        django.core.management.call_command('migrate')
        
        # Add indexes after migrations
        logger.info("Adding indexes...")
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_inventory_item_sku ON inventory_inventoryitem(sku);
                CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory_inventoryitem(name);
                CREATE INDEX IF NOT EXISTS idx_report_type ON reports_report(report_type);
            """)

    def check_and_clear_lingering_data(self):
        logger.info("Checking for lingering data...")
        with connection.cursor() as cursor:
            for model in apps.get_models():
                if model._meta.managed:
                    table_name = model._meta.db_table
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                        count = cursor.fetchone()[0]
                        if count > 0:
                            logger.info(f"Clearing {count} records from {table_name}")
                            cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE;")
                    except Exception as e:
                        logger.error(f"Error checking table {table_name}: {e}")
        logger.info("Lingering data check and clear complete.")

    def recreate_account_types(self):
        from finance.models import AccountType
        AccountType.objects.all().delete()
        account_types = [
            'Current Asset', 'Current Liability', 'Equity', 'Revenue',
            'Operating Expense', 'Cost of Goods Sold', 'Non-Operating Expense'
        ]
        for account_type in account_types:
            AccountType.objects.create(name=account_type)
        logger.info("Account types recreated.")

    def check_and_apply_remaining_changes(self):
        logger.info("Checking for any remaining model changes...")
        django.core.management.call_command('makemigrations')
        django.core.management.call_command('migrate')
        logger.info("Any remaining changes have been captured and applied.")

    def clear_inventory_data(self, cursor):
        try:
            cursor.execute("TRUNCATE TABLE inventory_inventoryitem CASCADE;")
            cursor.execute("TRUNCATE TABLE inventory_category CASCADE;")
            cursor.execute("TRUNCATE TABLE inventory_supplier CASCADE;")
            cursor.execute("TRUNCATE TABLE inventory_location CASCADE;")
            cursor.execute("TRUNCATE TABLE inventory_inventorytransaction CASCADE;")
            logger.info("Inventory data cleared successfully.")
        except Exception as e:
            logger.error(f"Error clearing inventory data: {e}")

    def clear_report_data(self, cursor):
        try:
            cursor.execute("TRUNCATE TABLE reports_report CASCADE;")
            logger.info("Report data cleared successfully.")
        except Exception as e:
            logger.error(f"Error clearing report data: {e}")

    def create_nextauth_tables(self, conn_details):
        logger.info("Starting to create NextAuth.js tables")
        
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    commands = (
                        """
                        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                        """,
                        # Tenant table
                        """
                        CREATE TABLE IF NOT EXISTS auth_tenant (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            schema_name VARCHAR(63) UNIQUE NOT NULL,
                            name VARCHAR(100) NOT NULL,
                            owner_id UUID NOT NULL,
                            created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            is_active BOOLEAN DEFAULT TRUE,
                            database_status VARCHAR(50) DEFAULT 'not_created',
                            setup_status VARCHAR(20) DEFAULT 'not_started',
                            last_setup_attempt TIMESTAMP,
                            setup_error_message TEXT,
                            last_health_check TIMESTAMP,
                            database_setup_task_id VARCHAR(255)
                        );
                        """,
                        # User table
                        """
                        CREATE TABLE IF NOT EXISTS users_user (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            email VARCHAR(255) UNIQUE NOT NULL,
                            first_name VARCHAR(100),
                            last_name VARCHAR(100),
                            is_active BOOLEAN DEFAULT TRUE,
                            occupation VARCHAR(50) DEFAULT 'OTHER',
                            role VARCHAR(20) DEFAULT 'EMPLOYEE',
                            tenant_id UUID REFERENCES auth_tenant(id),
                            is_staff BOOLEAN DEFAULT FALSE,
                            date_joined TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            email_confirmed BOOLEAN DEFAULT FALSE,
                            confirmation_token UUID DEFAULT uuid_generate_v4(),
                            is_onboarded BOOLEAN DEFAULT FALSE,
                            stripe_customer_id VARCHAR(255),
                            password VARCHAR(128),
                            is_superuser BOOLEAN DEFAULT FALSE,
                            last_login TIMESTAMP
                        );
                        """,
                        # Account table for OAuth
                        """
                        CREATE TABLE IF NOT EXISTS users_account (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
                            provider VARCHAR(255) NOT NULL,
                            provider_account_id VARCHAR(255) NOT NULL,
                            refresh_token TEXT,
                            access_token TEXT,
                            expires_at BIGINT,
                            token_type VARCHAR(255),
                            scope VARCHAR(255),
                            id_token TEXT,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE(provider, provider_account_id)
                        );
                        """,
                        # Session table
                        """
                        CREATE TABLE IF NOT EXISTS users_session (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
                            expires TIMESTAMP NOT NULL,
                            session_token VARCHAR(255) UNIQUE NOT NULL,
                            access_token TEXT,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        );
                        """,
                        # Verification token table
                        """
                        CREATE TABLE IF NOT EXISTS users_verification_token (
                            identifier VARCHAR(255) NOT NULL,
                            token VARCHAR(255) NOT NULL,
                            expires TIMESTAMP NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (identifier, token)
                        );
                        """,
                        # Add indexes
                        """
                        CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON auth_tenant(schema_name);
                        CREATE INDEX IF NOT EXISTS idx_user_email ON users_user(email);
                        CREATE INDEX IF NOT EXISTS idx_user_tenant ON users_user(tenant_id);
                        CREATE INDEX IF NOT EXISTS idx_account_user ON users_account(user_id);
                        CREATE INDEX IF NOT EXISTS idx_session_user ON users_session(user_id);
                        """
                    )

                    for i, command in enumerate(commands, 1):
                        try:
                            logger.info(f"Executing table creation command {i} of {len(commands)}")
                            cur.execute(command)
                            logger.info(f"Table creation command {i} executed successfully")
                        except Exception as e:
                            logger.error(f"Error executing command {i}: {str(e)}")
                            raise

                logger.info("All tables created successfully.")
                self.stdout.write(self.style.SUCCESS("All tables created successfully."))
                
        except Exception as e:
            logger.error(f"An error occurred while creating tables: {e}")
            self.stdout.write(self.style.ERROR(f"Failed to create tables: {e}"))

    def print_summary(self, table_status, database_status):
        self.stdout.write("\nOperation Summary:")
        self.stdout.write(f"Tables attempted to flush: {len(table_status)}")
        self.stdout.write(f"Tables successfully flushed: {sum(1 for status in table_status.values() if status == 'Dropped')}")
        self.stdout.write(f"Tables with errors: {sum(1 for status in table_status.values() if status.startswith('Error'))}")

        self.stdout.write(f"\nDatabases attempted to drop: {len(database_status)}")
        self.stdout.write(f"Databases successfully dropped: {sum(1 for status in database_status.values() if status == 'Dropped')}")
        self.stdout.write(f"Databases with errors: {sum(1 for status in database_status.values() if status.startswith('Error'))}")

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
