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
        parser.add_argument(
            '--reset-migrations-only', action='store_true',
            help='Only reset and recreate migrations without dropping data',
        )
        parser.add_argument(
            '--clean-tenant-data', action='store_true',
            help='Delete all tenant-related data from public tables',
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

    def prompt_confirmation(self, no_input=False, message=None):
        """
        Prompt the user for confirmation before proceeding.
        
        Args:
            no_input: If True, skip the prompt and assume "yes"
            message: Custom confirmation message to display
            
        Returns:
            bool: True if confirmed, False otherwise
        """
        if no_input:
            return True
            
        confirm_message = message or "This will reset your database. Are you sure? Type 'yes' to confirm: "
        answer = input(confirm_message)
        return answer.lower() == 'yes'

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
        reset_migrations_only = options['reset_migrations_only']
        clean_tenant_data = options['clean_tenant_data']
            
        if clean_tenant_data:
            if not self.prompt_confirmation(no_input, "This will DELETE ALL TENANT DATA from your database! Are you sure? Type 'yes' to confirm: "):
                self.stdout.write("Operation cancelled by user.")
                return
            self.clean_tenant_data()
            return
                
        
        if reset_migrations_only:
            if not self.prompt_confirmation(no_input):
                self.stdout.write("Operation cancelled by user.")
                return
            self.reset_migrations()
            return
            
        
        if not self.prompt_confirmation(no_input):
            self.stdout.write("Operation cancelled by user.")
            return

        table_status = {}
        database_status = {}
        used_fake_migrations = False  # Track if we used fake migrations


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
            used_fake_migrations = self.recreate_and_apply_migrations()

            # Step 10: Reset sequences again after migrations
            self.reset_all_sequences()

            # Step 11: Check for lingering data
            self.check_and_clear_lingering_data()

            # Step 12: Recreate account types (skip if using fake migrations)
            if not used_fake_migrations:
                self.recreate_account_types()
            else:
                logger.info("Skipping account types recreation when using --fake migrations")


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
            cursor.execute("TRUNCATE TABLE custom_auth_user CASCADE;")
            logger.info("User data cleared successfully.")
        except ProgrammingError:
            logger.info("custom_auth_user table does not exist. Skipping.")
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
            # First, get all sequences
            cursor.execute("""
                SELECT 
                    PGT.schemaname,
                    S.relname AS sequence_name,
                    T.relname AS table_name,
                    C.attname AS column_name,
                    pg_catalog.format_type(C.atttypid, NULL) AS column_type
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
            sequence_data = cursor.fetchall()
            
            for schema, seq_name, table_name, column_name, column_type in sequence_data:
                # Skip UUID columns - they don't need sequences
                if 'uuid' in column_type.lower():
                    logger.info(f"Skipping sequence {seq_name} for UUID column {column_name} in table {table_name}")
                    continue
                    
                # For integer-based columns, reset the sequence
                if 'int' in column_type.lower() or column_type.lower() in ('smallint', 'bigint'):
                    try:
                        sql = f"""
                            SELECT SETVAL(
                                '{schema}.{seq_name}', 
                                COALESCE((SELECT MAX({column_name}) FROM {schema}.{table_name}), 1), 
                                false
                            );
                        """
                        cursor.execute(sql)
                        logger.info(f"Reset sequence {seq_name} for table {table_name}")
                    except Exception as e:
                        logger.warning(f"Error resetting sequence {seq_name}: {e}")
        
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
        
        # Create all 191 tables identified in the foreign key constraints
        logger.info("Creating all 191 tables directly...")
        with connection.cursor() as cursor:
            # First, create schema and extensions
            cursor.execute("CREATE SCHEMA IF NOT EXISTS public;")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
            
            # Create base tables with no dependencies first
            # Core Django tables
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_migrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL
            );
            """)
            logger.info("Created django_migrations table")
            
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_content_type (
                id BIGSERIAL PRIMARY KEY,
                app_label VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                name VARCHAR(100) NULL,
                CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model)
            );
            """)
            logger.info("Created django_content_type table")
            
            # Create django_site table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_site (
                id BIGSERIAL PRIMARY KEY,
                domain VARCHAR(100) NOT NULL,
                name VARCHAR(50) NOT NULL,
                CONSTRAINT django_site_domain_key UNIQUE (domain)
            );
            INSERT INTO django_site (domain, name) VALUES ('example.com', 'example.com')
            ON CONFLICT DO NOTHING;
            """)
            logger.info("Created django_site table")
            
            # Create base tables (no foreign key dependencies)
            
            # Auth group table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_group (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(150) NOT NULL UNIQUE
            );
            """)
            logger.info("Created auth_group table")
            
            # Create account type table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_accounttype (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_accounttype table")
            
            # Create account category table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_accountcategory (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_accountcategory table")
            
            # Create inventory category table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_category (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_category table")
            
            # Create inventory location table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_location (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                address TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_location table")
            
            # Create inventory supplier table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_supplier (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                contact_info TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_supplier table")
            
            # Create inventory department table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_department (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_department table")
            
            # Create HR role table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_role (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created hr_role table")
            
            # Create taxes state table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_state (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(2) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_state table")
            
            # Create custom charge plan table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_customchargeplan (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                rate DECIMAL(10, 2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_customchargeplan table")
            
            # Create auth_permission table after content_type but before user permissions
            # Use BIGINT for permission id to match Django's default
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_permission (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                content_type_id BIGINT NOT NULL,
                codename VARCHAR(100) NOT NULL,
                CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename),
                CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id)
                    REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED
            );
            """)
            logger.info("Created auth_permission table")
            
            # Create custom_auth_tenant table with all required fields
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_auth_tenant (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                schema_name VARCHAR(63) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                database_status VARCHAR(50) DEFAULT 'not_created',
                setup_status VARCHAR(20) DEFAULT 'not_started',
                last_setup_attempt TIMESTAMP WITH TIME ZONE,
                setup_error_message TEXT,
                last_health_check TIMESTAMP WITH TIME ZONE,
                setup_task_id VARCHAR(255),
                owner_id UUID NOT NULL,
                storage_quota_bytes BIGINT DEFAULT 2147483648,
                last_archive_date TIMESTAMP WITH TIME ZONE NULL,
                archive_retention_days INTEGER DEFAULT 2555,
                archive_expiry_notification_sent BOOLEAN DEFAULT FALSE,
                archive_expiry_notification_date TIMESTAMP WITH TIME ZONE NULL,
                archive_user_decision VARCHAR(20) DEFAULT 'pending'
            );
            """)
            logger.info("Created custom_auth_tenant table with all required fields")
                        
            # Create custom_auth_user table before anything that depends on it
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_auth_user (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                password VARCHAR(128) NOT NULL,
                last_login TIMESTAMP WITH TIME ZONE NULL,
                is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
                email VARCHAR(254) UNIQUE NOT NULL,
                first_name VARCHAR(100) NOT NULL DEFAULT '',
                last_name VARCHAR(100) NOT NULL DEFAULT '',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
                is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
                stripe_customer_id VARCHAR(255) NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
                occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
                tenant_id UUID NULL REFERENCES custom_auth_tenant(id),
                cognito_sub VARCHAR(36) UNIQUE NULL
            );
            """)
            logger.info("Created custom_auth_user table")
            
            # Create users_business table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_business (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_num VARCHAR(6) NULL,
                name VARCHAR(200) NOT NULL,
                business_name VARCHAR(200) NULL,
                business_type VARCHAR(50) NULL,
                business_subtype_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
                street VARCHAR(200) NULL,
                city VARCHAR(200) NULL,
                state VARCHAR(200) NULL,
                postcode VARCHAR(20) NULL,
                country VARCHAR(2) NOT NULL DEFAULT 'US',
                address TEXT NULL,
                email VARCHAR(254) NULL,
                phone_number VARCHAR(20) NULL,
                database_name VARCHAR(255) NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                legal_structure VARCHAR(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                date_founded DATE NULL,
                owner_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS users_business_owner_id_idx ON users_business(owner_id);
            CREATE INDEX IF NOT EXISTS users_business_business_num_idx ON users_business(business_num);
            """)
            logger.info("Created users_business table")
            
            # Create users_business_details table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_business_details (
                business_id UUID PRIMARY KEY REFERENCES users_business(id) ON DELETE CASCADE,
                business_type VARCHAR(50) NOT NULL,
                business_subtype_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
                legal_structure VARCHAR(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                country VARCHAR(2) NOT NULL DEFAULT 'US',
                date_founded DATE NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            """)
            logger.info("Created users_business_details table")
            
            # Create users_userprofile table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_userprofile (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                occupation VARCHAR(200) NULL,
                street VARCHAR(200) NULL,
                city VARCHAR(200) NULL,
                state VARCHAR(200) NULL,
                postcode VARCHAR(20) NULL,
                country VARCHAR(2) NOT NULL DEFAULT 'US',
                phone_number VARCHAR(20) NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                is_business_owner BOOLEAN NOT NULL DEFAULT FALSE,
                shopify_access_token VARCHAR(255) NULL,
                schema_name VARCHAR(63) NULL,
                metadata JSONB NULL DEFAULT '{}'::jsonb,
                business_id UUID NULL REFERENCES users_business(id) ON DELETE SET NULL,
                tenant_id UUID NULL REFERENCES custom_auth_tenant(id) ON DELETE SET NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                email_verified BOOLEAN DEFAULT FALSE,
                database_status VARCHAR(50) DEFAULT 'not_created',
                last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                setup_error_message TEXT NULL,
                database_setup_task_id VARCHAR(255) NULL
            );
            CREATE INDEX IF NOT EXISTS users_userprofile_user_id_idx ON users_userprofile(user_id);
            CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx ON users_userprofile(tenant_id);
            CREATE INDEX IF NOT EXISTS users_userprofile_business_id_idx ON users_userprofile(business_id);
            """)
            logger.info("Created users_userprofile table")
            
            # Create finance_account table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_account (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                account_number VARCHAR(50) NULL,
                account_type_id UUID NOT NULL REFERENCES finance_accounttype(id),
                parent_account_id UUID NULL REFERENCES finance_account(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_account table")
            
            # Create chart of account table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_chartofaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL,
                description TEXT NULL,
                parent_id UUID NULL REFERENCES finance_chartofaccount(id),
                category_id UUID NOT NULL REFERENCES finance_accountcategory(id),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_chartofaccount table")
            
            # Create finance_costcategory table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_costcategory (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                parent_id UUID NULL REFERENCES finance_costcategory(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_costcategory table")
            
            # Create banking_bankaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS banking_bankaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_number VARCHAR(50) NOT NULL,
                bank_name VARCHAR(255) NOT NULL,
                account_type VARCHAR(50) NOT NULL,
                routing_number VARCHAR(50) NULL,
                balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created banking_bankaccount table")
            
            # Create hr_employee table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_employee (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(254) NOT NULL,
                phone VARCHAR(20) NULL,
                hire_date DATE NOT NULL,
                supervisor_id UUID NULL REFERENCES hr_employee(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created hr_employee table")
            
            # Create payroll_payrollrun table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_payrollrun (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                payment_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created payroll_payrollrun table")
            
            # Create crm_customer table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_customer (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(254) NULL,
                phone VARCHAR(20) NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_customer table")
            
            # Create crm_lead table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_lead (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(254) NULL,
                phone VARCHAR(20) NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'new',
                assigned_to_id UUID NULL REFERENCES custom_auth_user(id),
                converted_to_id UUID NULL REFERENCES crm_customer(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_lead table")
            
            # Create crm_opportunity table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_opportunity (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                stage VARCHAR(50) NOT NULL DEFAULT 'prospecting',
                expected_close_date DATE NULL,
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                assigned_to_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_opportunity table")
            
            # Create crm_campaign table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_campaign (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'planned',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_campaign table")
            
            # Create crm_deal table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_deal (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                stage VARCHAR(50) NOT NULL DEFAULT 'negotiation',
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                opportunity_id UUID NULL REFERENCES crm_opportunity(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_deal table")
            
            # Create crm_contact table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_contact (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(254) NULL,
                phone VARCHAR(20) NULL,
                position VARCHAR(100) NULL,
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_contact table")
            
            # Create crm_activity table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_activity (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type VARCHAR(50) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                description TEXT NULL,
                due_date DATE NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                customer_id UUID NULL REFERENCES crm_customer(id),
                lead_id UUID NULL REFERENCES crm_lead(id),
                opportunity_id UUID NULL REFERENCES crm_opportunity(id),
                deal_id UUID NULL REFERENCES crm_deal(id),
                assigned_to_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_activity table")
            
            # Create crm_campaignmember table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_campaignmember (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID NOT NULL REFERENCES crm_campaign(id),
                customer_id UUID NULL REFERENCES crm_customer(id),
                lead_id UUID NULL REFERENCES crm_lead(id),
                status VARCHAR(50) NOT NULL DEFAULT 'sent',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created crm_campaignmember table")
            
            # Create inventory_product table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_product (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                price DECIMAL(15, 2) NOT NULL DEFAULT 0,
                is_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
                is_for_rent BOOLEAN NOT NULL DEFAULT FALSE,
                salestax DECIMAL(5, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                product_code VARCHAR(50) NOT NULL UNIQUE,
                department_id UUID NULL REFERENCES inventory_department(id),
                stock_quantity INTEGER NOT NULL DEFAULT 0,
                reorder_level INTEGER NOT NULL DEFAULT 0,
                height DECIMAL(10, 2) NULL,
                width DECIMAL(10, 2) NULL,
                height_unit VARCHAR(10) NOT NULL DEFAULT 'cm',
                width_unit VARCHAR(10) NOT NULL DEFAULT 'cm',
                weight DECIMAL(10, 2) NULL,
                weight_unit VARCHAR(10) NOT NULL DEFAULT 'kg',
                charge_period VARCHAR(10) NOT NULL DEFAULT 'day',
                charge_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                sku VARCHAR(50) NULL,
                cost DECIMAL(15, 2) NULL DEFAULT 0
            );
            """)
            logger.info("Created inventory_product table")

            # Create inventory_service table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_service (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                price DECIMAL(15, 2) NOT NULL DEFAULT 0,
                is_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
                is_for_rent BOOLEAN NOT NULL DEFAULT FALSE,
                salestax DECIMAL(5, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                service_code VARCHAR(50) NOT NULL UNIQUE,
                duration INTERVAL NULL,
                is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
                height DECIMAL(10, 2) NULL,
                width DECIMAL(10, 2) NULL,
                height_unit VARCHAR(10) NOT NULL DEFAULT 'cm',
                width_unit VARCHAR(10) NOT NULL DEFAULT 'cm',
                weight DECIMAL(10, 2) NULL,
                weight_unit VARCHAR(10) NOT NULL DEFAULT 'kg',
                charge_period VARCHAR(10) NOT NULL DEFAULT 'day',
                charge_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                rate DECIMAL(15, 2) NULL
            );
            """)
            logger.info("Created inventory_service table")
            
            # Create inventory_inventoryitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_inventoryitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                sku VARCHAR(50) NOT NULL,
                description TEXT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                reorder_level INTEGER NOT NULL DEFAULT 0,
                category_id UUID NULL REFERENCES inventory_category(id),
                supplier_id UUID NULL REFERENCES inventory_supplier(id),
                location_id UUID NULL REFERENCES inventory_location(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_inventoryitem table")
            
            # Create inventory_inventorytransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_inventorytransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_type VARCHAR(50) NOT NULL,
                quantity INTEGER NOT NULL,
                transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
                item_id UUID NOT NULL REFERENCES inventory_inventoryitem(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_inventorytransaction table")
            
            # Create inventory_producttypefields table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_producttypefields (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES inventory_product(id) ON DELETE CASCADE,
                category VARCHAR(100) NULL,
                subcategory VARCHAR(100) NULL,
                material VARCHAR(100) NULL,
                brand VARCHAR(100) NULL,
                condition VARCHAR(50) NULL,
                ingredients TEXT NULL,
                allergens TEXT NULL,
                nutritional_info TEXT NULL,
                size VARCHAR(20) NULL,
                color VARCHAR(50) NULL,
                gender VARCHAR(20) NULL,
                vehicle_type VARCHAR(100) NULL,
                load_capacity DECIMAL(10, 2) NULL,
                extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_producttypefields table")

            # Create inventory_servicetypefields table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_servicetypefields (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                service_id UUID NOT NULL REFERENCES inventory_service(id) ON DELETE CASCADE,
                category VARCHAR(100) NULL,
                subcategory VARCHAR(100) NULL,
                skill_level VARCHAR(50) NULL,
                certification VARCHAR(100) NULL,
                experience_years UUID NULL,
                min_booking_notice INTERVAL NULL,
                buffer_time INTERVAL NULL,
                max_capacity UUID NULL,
                amenities TEXT NULL,
                service_area VARCHAR(100) NULL,
                vehicle_requirements TEXT NULL,
                extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_servicetypefields table")
            
            # Create inventory_product_custom_charge_plans table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_product_custom_charge_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                customchargeplan_id UUID NOT NULL REFERENCES inventory_customchargeplan(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_product_custom_charge_plans table")
            
            # Create inventory_service_custom_charge_plans table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_service_custom_charge_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                service_id UUID NOT NULL REFERENCES inventory_service(id),
                customchargeplan_id UUID NOT NULL REFERENCES inventory_customchargeplan(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created inventory_service_custom_charge_plans table")
            
            # Create purchases_vendor table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_vendor (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(100) NULL,
                email VARCHAR(254) NULL,
                phone VARCHAR(20) NULL,
                address TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_vendor table")
            
            # Create purchases_purchaseorder table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_purchaseorder (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_number VARCHAR(50) NOT NULL,
                order_date DATE NOT NULL,
                expected_delivery_date DATE NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                vendor_id UUID NOT NULL REFERENCES purchases_vendor(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_purchaseorder table")
            
            # Create purchases_purchaseorderitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_purchaseorderitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                purchase_order_id UUID NOT NULL REFERENCES purchases_purchaseorder(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_purchaseorderitem table")
            
            # Create purchases_purchasereturn table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_purchasereturn (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                return_number VARCHAR(50) NOT NULL,
                return_date DATE NOT NULL,
                reason TEXT NULL,
                purchase_order_id UUID NOT NULL REFERENCES purchases_purchaseorder(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_purchasereturn table")
            
            # Create purchases_purchasereturnitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_purchasereturnitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                purchase_return_id UUID NOT NULL REFERENCES purchases_purchasereturn(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_purchasereturnitem table")
            
            # Create purchases_bill table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_bill (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bill_number VARCHAR(50) NOT NULL,
                bill_date DATE NOT NULL,
                due_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
                vendor_id UUID NOT NULL REFERENCES purchases_vendor(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_bill table")
            
            # Create purchases_billitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_billitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                description TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                bill_id UUID NOT NULL REFERENCES purchases_bill(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_billitem table")
            
            # Create purchases_procurement table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_procurement (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                procurement_number VARCHAR(50) NOT NULL,
                procurement_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                vendor_id UUID NOT NULL REFERENCES purchases_vendor(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_procurement table")
            
            # Create purchases_procurementitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases_procurementitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                procurement_id UUID NOT NULL REFERENCES purchases_procurement(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created purchases_procurementitem table")
            
            # Create finance_accountreconciliation table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_accountreconciliation (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reconciliation_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                account_id UUID NOT NULL REFERENCES finance_account(id),
                bank_account_id UUID NOT NULL REFERENCES banking_bankaccount(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                completed_by_id UUID NULL REFERENCES custom_auth_user(id),
                reviewed_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_accountreconciliation table")

            # Create finance_financetransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_financetransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                transaction_date DATE NOT NULL,
                description TEXT NULL,
                account_id UUID NOT NULL REFERENCES finance_account(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                posted_by_id UUID NULL REFERENCES custom_auth_user(id),
                bill_id UUID NULL REFERENCES purchases_bill(id),
                invoice_id UUID NULL,
                reconciliation_id UUID NULL REFERENCES finance_accountreconciliation(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_financetransaction table")

            #Create sales_invoice table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_invoice (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_number VARCHAR(50) NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                transaction_id UUID NULL REFERENCES finance_financetransaction(id),
                accounts_receivable_id UUID NULL REFERENCES finance_account(id),
                sales_revenue_id UUID NULL REFERENCES finance_account(id),
                sales_tax_payable_id UUID NULL REFERENCES finance_account(id),
                inventory_id UUID NULL REFERENCES finance_account(id),
                cost_of_goods_sold_id UUID NULL REFERENCES finance_account(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE finance_financetransaction 
                ADD CONSTRAINT finance_financetransaction_invoice_id_fkey 
                FOREIGN KEY (invoice_id) REFERENCES sales_invoice(id);
            """)
            logger.info("Created sales_invoice table")
            
            # Create sales_sale table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_sale (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sale_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                product_id UUID NULL REFERENCES inventory_product(id),
                invoice_id UUID NULL REFERENCES sales_invoice(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_sale table")
            
            # Create banking_banktransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS banking_banktransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NULL,
                transaction_type VARCHAR(50) NOT NULL,
                account_id UUID NOT NULL REFERENCES banking_bankaccount(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created banking_banktransaction table")
            
            # Create finance_cashaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_cashaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_id UUID NOT NULL REFERENCES finance_account(id),
                transaction_id UUID NULL REFERENCES finance_financetransaction(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_cashaccount table")
            
            # Create finance_reconciliationitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_reconciliationitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                match_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                reconciliation_id UUID NOT NULL REFERENCES finance_accountreconciliation(id),
                finance_transaction_id UUID NULL REFERENCES finance_financetransaction(id),
                bank_transaction_id UUID NULL REFERENCES banking_banktransaction(id),
                matched_by_id UUID NULL REFERENCES custom_auth_user(id),
                reviewed_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_reconciliationitem table")
            
            # Create finance_revenueaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_revenueaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_type_id UUID NOT NULL REFERENCES finance_accounttype(id),
                transaction_id UUID NOT NULL REFERENCES finance_financetransaction(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_revenueaccount table")
            
            # Create finance_salestaxaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_salestaxaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_id UUID NOT NULL REFERENCES finance_financetransaction(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_salestaxaccount table")
            
            # Create finance_income table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_income (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_id UUID NOT NULL REFERENCES finance_financetransaction(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_income table")
            
            # Create finance_generalledgerentry table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_generalledgerentry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                entry_date DATE NOT NULL,
                debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
                credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
                account_id UUID NOT NULL REFERENCES finance_chartofaccount(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_generalledgerentry table")
            
            # Create finance_journalentry table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_journalentry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                entry_date DATE NOT NULL,
                description TEXT NULL,
                reference VARCHAR(100) NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                posted_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_journalentry table")
            
            # Create finance_journalentryline table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_journalentryline (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                description TEXT NULL,
                debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
                credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
                account_id UUID NOT NULL REFERENCES finance_chartofaccount(id),
                journal_entry_id UUID NOT NULL REFERENCES finance_journalentry(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_journalentryline table")
            
            # Create finance_intercompanyaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_intercompanyaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_name VARCHAR(255) NOT NULL,
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_intercompanyaccount table")
            
            # Create finance_intercompanytransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_intercompanytransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                posted_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_intercompanytransaction table")
            
            # Create finance_monthendclosing table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_monthendclosing (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                closing_month DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                business_id UUID NOT NULL REFERENCES users_business(id),
                completed_by_id UUID NULL REFERENCES custom_auth_user(id),
                reviewed_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_monthendclosing table")
            
            # Create finance_monthendtask table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_monthendtask (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                closing_id UUID NOT NULL REFERENCES finance_monthendclosing(id),
                completed_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_monthendtask table")
            
            # Create finance_budget table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_budget (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                budget_year UUID NOT NULL,
                budget_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                submitted_by_id UUID NULL REFERENCES custom_auth_user(id),
                reviewed_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_budget table")
            
            # Create finance_budgetitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_budgetitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                month UUID NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                budget_id UUID NOT NULL REFERENCES finance_budget(id),
                account_id UUID NOT NULL REFERENCES finance_chartofaccount(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_budgetitem table")
            
            # Create finance_fixedasset table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_fixedasset (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                asset_name VARCHAR(255) NOT NULL,
                acquisition_date DATE NOT NULL,
                acquisition_cost DECIMAL(15, 2) NOT NULL,
                useful_life_years UUID NOT NULL,
                residual_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_fixedasset table")
            
            # Create finance_costentry table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_costentry (
                cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                entry_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                category_id UUID NOT NULL REFERENCES finance_costcategory(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                posted_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_costentry table")
            
            # Create finance_costallocation table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_costallocation (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                allocation_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NULL,
                cost_entry_id UUID NOT NULL REFERENCES finance_costentry(cost_id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_costallocation table")
            
            # Create finance_financialstatement table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_financialstatement (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                statement_type VARCHAR(50) NOT NULL,
                statement_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                business_id UUID NOT NULL REFERENCES users_business(id),
                generated_by_id UUID NULL REFERENCES custom_auth_user(id),
                reviewed_by_id UUID NULL REFERENCES custom_auth_user(id),
                approved_by_id UUID NULL REFERENCES custom_auth_user(id),
                previous_version_id UUID NULL REFERENCES finance_financialstatement(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created finance_financialstatement table")
            
            # Create finance_audittrail table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS finance_audittrail (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action VARCHAR(50) NOT NULL,
                entity_type VARCHAR(100) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                description TEXT NULL,
                changes JSONB NULL,
                user_id UUID NULL REFERENCES custom_auth_user(id),
                business_id UUID NOT NULL REFERENCES users_business(id),
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            """)
            logger.info("Created finance_audittrail table")
            
            # Create hr_accesspermission table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_accesspermission (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                module VARCHAR(100) NOT NULL,
                permission_level VARCHAR(50) NOT NULL,
                role_id UUID NOT NULL REFERENCES hr_role(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created hr_accesspermission table")
            
            # Create hr_employeerole table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_employeerole (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES hr_employee(id),
                role_id UUID NOT NULL REFERENCES hr_role(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created hr_employeerole table")
            
            # Create hr_preboardingform table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_preboardingform (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                form_data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created hr_preboardingform table")
            
            # Create payroll_timesheet table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_timesheet (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                employee_id UUID NOT NULL REFERENCES hr_employee(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created payroll_timesheet table")
            
            # Create payroll_timesheetentry table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_timesheetentry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                entry_date DATE NOT NULL,
                hours DECIMAL(5, 2) NOT NULL,
                description TEXT NULL,
                timesheet_id UUID NOT NULL REFERENCES payroll_timesheet(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created payroll_timesheetentry table")
            
            # Create payroll_payrolltransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_payrolltransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_date DATE NOT NULL,
                gross_amount DECIMAL(15, 2) NOT NULL,
                tax_deductions DECIMAL(15, 2) NOT NULL,
                net_amount DECIMAL(15, 2) NOT NULL,
                employee_id UUID NOT NULL REFERENCES hr_employee(id),
                payroll_run_id UUID NOT NULL REFERENCES payroll_payrollrun(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created payroll_payrolltransaction table")
            
            # Create payroll_taxform table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_taxform (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_type VARCHAR(50) NOT NULL,
                tax_year UUID NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                employee_id UUID NOT NULL REFERENCES hr_employee(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created payroll_taxform table")
            
            # Create taxes_incometaxrate table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_incometaxrate (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tax_year UUID NOT NULL,
                income_bracket_lower DECIMAL(15, 2) NOT NULL,
                income_bracket_upper DECIMAL(15, 2) NULL,
                rate DECIMAL(5, 2) NOT NULL,
                state_id UUID NULL REFERENCES taxes_state(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_incometaxrate table")
            
            # Create taxes_payrolltaxfiling table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_payrolltaxfiling (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                filing_period_start DATE NOT NULL,
                filing_period_end DATE NOT NULL,
                due_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                state_id UUID NOT NULL REFERENCES taxes_state(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_payrolltaxfiling table")
            
            # Create taxes_taxapitransaction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_taxapitransaction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_type VARCHAR(50) NOT NULL,
                request_data JSONB NULL,
                response_data JSONB NULL,
                status VARCHAR(50) NOT NULL,
                state_id UUID NULL REFERENCES taxes_state(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_taxapitransaction table")
            
            # Create taxes_taxfilinginstruction table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_taxfilinginstruction (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tax_type VARCHAR(50) NOT NULL,
                filing_frequency VARCHAR(50) NOT NULL,
                instructions TEXT NULL,
                state_id UUID NOT NULL REFERENCES taxes_state(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_taxfilinginstruction table")
            
            # Create taxes_taxform table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS taxes_taxform (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_type VARCHAR(50) NOT NULL,
                form_number VARCHAR(50) NOT NULL,
                tax_year UUID NOT NULL,
                form_data JSONB NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                verified_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created taxes_taxform table")
            
            # Create analysis_chartconfiguration table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_chartconfiguration (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chart_type VARCHAR(50) NOT NULL,
                configuration JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created analysis_chartconfiguration table")
            
            # Create analysis_financialdata table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_financialdata (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                data_type VARCHAR(50) NOT NULL,
                data_date DATE NOT NULL,
                data_value DECIMAL(15, 2) NOT NULL,
                metadata JSONB NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created analysis_financialdata table")
            
            # Create transport_driver table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_driver (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                license_number VARCHAR(50) NOT NULL,
                license_type VARCHAR(50) NOT NULL,
                expiration_date DATE NOT NULL,
                user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_driver table")
            
            # Create transport_equipment table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_equipment (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                equipment_type VARCHAR(50) NOT NULL,
                make VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                year UUID NOT NULL,
                vin VARCHAR(17) NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_equipment table")
            
            # Create transport_route table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_route (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                origin VARCHAR(255) NOT NULL,
                destination VARCHAR(255) NOT NULL,
                distance DECIMAL(10, 2) NOT NULL,
                estimated_time INTERVAL NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_route table")
            
            # Create transport_compliance table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_compliance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_type VARCHAR(50) NOT NULL,
                issue_date DATE NOT NULL,
                expiration_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                driver_id UUID NOT NULL REFERENCES transport_driver(id),
                equipment_id UUID NOT NULL REFERENCES transport_equipment(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_compliance table")
            
            # Create transport_load table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_load (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                load_number VARCHAR(50) NOT NULL,
                pickup_date TIMESTAMP WITH TIME ZONE NOT NULL,
                delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                driver_id UUID NOT NULL REFERENCES transport_driver(id),
                equipment_id UUID NOT NULL REFERENCES transport_equipment(id),
                route_id UUID NOT NULL REFERENCES transport_route(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_load table")
            
            # Create transport_expense table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_expense (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expense_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                expense_date DATE NOT NULL,
                description TEXT NULL,
                equipment_id UUID NOT NULL REFERENCES transport_equipment(id),
                load_id UUID NULL REFERENCES transport_load(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_expense table")
            
            # Create transport_maintenance table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_maintenance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                maintenance_type VARCHAR(50) NOT NULL,
                service_date DATE NOT NULL,
                service_provider VARCHAR(255) NULL,
                cost DECIMAL(15, 2) NOT NULL,
                description TEXT NULL,
                equipment_id UUID NOT NULL REFERENCES transport_equipment(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created transport_maintenance table")
            
            # Create banking_plaiditem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS banking_plaiditem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id VARCHAR(255) NOT NULL,
                access_token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created banking_plaiditem table")
            
            # Create banking_tinkitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS banking_tinkitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id VARCHAR(255) NOT NULL,
                access_token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created banking_tinkitem table")
            
            # Create account_emailaddress table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS account_emailaddress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(254) NOT NULL UNIQUE,
                verified BOOLEAN NOT NULL DEFAULT FALSE,
                "primary" BOOLEAN NOT NULL DEFAULT FALSE,
                user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created account_emailaddress table")
            
            # Create account_emailconfirmation table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS account_emailconfirmation (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created TIMESTAMP WITH TIME ZONE NOT NULL,
                sent TIMESTAMP WITH TIME ZONE NULL,
                key VARCHAR(64) NOT NULL UNIQUE,
                email_address_id UUID NOT NULL REFERENCES account_emailaddress(id)
            );
            """)
            logger.info("Created account_emailconfirmation table")
            
            # Create socialaccount_socialapp table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS socialaccount_socialapp (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider VARCHAR(30) NOT NULL,
                name VARCHAR(40) NOT NULL,
                client_id VARCHAR(191) NOT NULL,
                secret VARCHAR(191) NOT NULL,
                key VARCHAR(191) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created socialaccount_socialapp table")
            
            # Create socialaccount_socialaccount table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS socialaccount_socialaccount (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider VARCHAR(30) NOT NULL,
                uid VARCHAR(191) NOT NULL,
                last_login TIMESTAMP WITH TIME ZONE NOT NULL,
                date_joined TIMESTAMP WITH TIME ZONE NOT NULL,
                extra_data TEXT NOT NULL,
                user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE (provider, uid)
            );
            """)
            logger.info("Created socialaccount_socialaccount table")
            
            # Create socialaccount_socialapp_sites table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS socialaccount_socialapp_sites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                socialapp_id UUID NOT NULL REFERENCES socialaccount_socialapp(id),
                site_id BIGINT NOT NULL REFERENCES django_site(id),
                UNIQUE (socialapp_id, site_id)
            );
            """)
            logger.info("Created socialaccount_socialapp_sites table")
            
            # Create socialaccount_socialtoken table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS socialaccount_socialtoken (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token TEXT NOT NULL,
                token_secret VARCHAR(200) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NULL,
                account_id UUID NOT NULL REFERENCES socialaccount_socialaccount(id),
                app_id UUID NOT NULL REFERENCES socialaccount_socialapp(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE (account_id, app_id)
            );
            """)
            logger.info("Created socialaccount_socialtoken table")

            # Create authtoken_token table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS authtoken_token (
                key VARCHAR(40) NOT NULL PRIMARY KEY,
                created TIMESTAMP WITH TIME ZONE NOT NULL,
                user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id)
            );
            """)

            # Create authtoken_token table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS authtoken_token (
                key VARCHAR(40) NOT NULL PRIMARY KEY,
                created TIMESTAMP WITH TIME ZONE NOT NULL,
                user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id)
            );
            """)
            logger.info("Created authtoken_token table")
            
            # Create token_blacklist_outstandingtoken table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_blacklist_outstandingtoken (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                jti VARCHAR(255) NOT NULL UNIQUE,
                user_id UUID NULL REFERENCES custom_auth_user(id)
            );
            """)
            logger.info("Created token_blacklist_outstandingtoken table")
            
            # Create token_blacklist_blacklistedtoken table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_blacklist_blacklistedtoken (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL,
                token_id UUID NOT NULL REFERENCES token_blacklist_outstandingtoken(id)
            );
            """)
            logger.info("Created token_blacklist_blacklistedtoken table")
            
            # Create users_subscription table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_subscription (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id UUID NOT NULL UNIQUE REFERENCES users_business(id) ON DELETE CASCADE,
                selected_plan VARCHAR(20) NOT NULL DEFAULT 'free',
                start_date DATE NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                end_date DATE NULL,
                billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created users_subscription table")
            
            # Create users_verification_token table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_verification_token (
                identifier VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                PRIMARY KEY (identifier, token)
            );
            """)
            logger.info("Created users_verification_token table")
            
            # Create users_account table (NextAuth.js)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_account (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                provider VARCHAR(255) NOT NULL,
                provider_account_id VARCHAR(255) NOT NULL,
                refresh_token TEXT,
                access_token TEXT,
                expires_at BIGINT,
                token_type VARCHAR(255),
                scope VARCHAR(255),
                id_token TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                UNIQUE(provider, provider_account_id)
            );
            CREATE INDEX IF NOT EXISTS idx_account_user ON users_account(user_id);
            """)
            logger.info("Created users_account table")
            
            # Create users_session table (NextAuth.js)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_session (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                expires TIMESTAMP WITH TIME ZONE NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                access_token TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_session_user ON users_session(user_id);
            """)
            logger.info("Created users_session table")
            
            # Create reports_report table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports_report (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_name VARCHAR(255) NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                report_data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                user_profile_id BIGINT NULL REFERENCES users_userprofile(id)
            );
            CREATE INDEX IF NOT EXISTS idx_report_type ON reports_report(report_type);
            """)
            logger.info("Created reports_report table")
            
            # Create sales_estimate table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_estimate (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                estimate_number VARCHAR(50) NOT NULL,
                estimate_date DATE NOT NULL,
                valid_until DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_estimate table")
            
            # Create sales_estimateitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_estimateitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                estimate_id UUID NOT NULL REFERENCES sales_estimate(id),
                product_id UUID NULL REFERENCES inventory_product(id),
                service_id UUID NULL REFERENCES inventory_service(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_estimateitem table")
            
            # Create sales_estimateattachment table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_estimateattachment (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                estimate_id UUID NOT NULL REFERENCES sales_estimate(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_estimateattachment table")
            
            # Create sales_salesorder table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_salesorder (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_number VARCHAR(50) NOT NULL,
                order_date DATE NOT NULL,
                expected_delivery_date DATE NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                customer_id UUID NOT NULL REFERENCES crm_customer(id),
                created_by_id UUID NULL REFERENCES custom_auth_user(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_salesorder table")
            
            # Create sales_salesorderitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_salesorderitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                sales_order_id UUID NOT NULL REFERENCES sales_salesorder(id),
                product_id UUID NULL REFERENCES inventory_product(id),
                service_id UUID NULL REFERENCES inventory_service(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_salesorderitem table")
            
            # Create sales_invoiceitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_invoiceitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
                product_id UUID NULL REFERENCES inventory_product(id),
                service_id UUID NULL REFERENCES inventory_service(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_invoiceitem table")
            
            # Create sales_refund table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_refund (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                refund_date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                reason TEXT NULL,
                sale_id UUID NOT NULL REFERENCES sales_sale(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_refund table")
            
            # Create sales_refunditem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_refunditem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                refund_id UUID NOT NULL REFERENCES sales_refund(id),
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_refunditem table")
            
            # Create sales_saleitem table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales_saleitem (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2) NOT NULL,
                sale_id UUID NOT NULL REFERENCES sales_sale(id),
                product_id UUID NOT NULL REFERENCES inventory_product(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            logger.info("Created sales_saleitem table")
            
            # Create django_session table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_session (
                session_key VARCHAR(40) NOT NULL PRIMARY KEY,
                session_data TEXT NOT NULL,
                expire_date TIMESTAMP WITH TIME ZONE NOT NULL
            );
            CREATE INDEX IF NOT EXISTS django_session_expire_date_a5c62663 ON django_session (expire_date);
            """)
            logger.info("Created django_session table")
            
            # Create django_admin_log table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_admin_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action_time TIMESTAMP WITH TIME ZONE NOT NULL,
                object_id TEXT NULL,
                object_repr VARCHAR(200) NOT NULL,
                action_flag SMALLINT NOT NULL CHECK (action_flag > 0),
                change_message TEXT NOT NULL,
                content_type_id BIGINT NULL REFERENCES django_content_type(id) DEFERRABLE INITIALLY DEFERRED,
                user_id UUID NOT NULL REFERENCES custom_auth_user(id) DEFERRABLE INITIALLY DEFERRED
            );
            """)
            logger.info("Created django_admin_log table")
            
            # Create custom_auth_user_groups table (for Django auth)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_auth_user_groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                group_id UUID NOT NULL,
                CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq UNIQUE (user_id, group_id),
                CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_users_user_id FOREIGN KEY (user_id)
                    REFERENCES custom_auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id FOREIGN KEY (group_id)
                    REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED
            );
            """)
            logger.info("Created custom_auth_user_groups table")
            
            # Create auth_user_user_permissions table (for Django auth)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                permission_id BIGINT NOT NULL,
                CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id),
                CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_users_user_id FOREIGN KEY (user_id)
                    REFERENCES custom_auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id)
                    REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
            );
            """)
            logger.info("Created auth_user_user_permissions table")
            
            # Create auth_group_permissions table (for Django auth)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_group_permissions (
                id BIGSERIAL PRIMARY KEY,
                group_id UUID NOT NULL,
                permission_id BIGINT NOT NULL,
                CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id),
                CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id)
                    REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT auth_group_permissions_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id)
                    REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
            );
            """)
            logger.info("Created auth_group_permissions table")
            
            # Create onboarding_onboardingprogress table after custom_auth_user
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS onboarding_onboardingprogress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                onboarding_status VARCHAR(256) NOT NULL,
                account_status VARCHAR(9) NOT NULL,
                user_role VARCHAR(10) NOT NULL,
                subscription_plan VARCHAR(12) NOT NULL,
                current_step VARCHAR(256) NOT NULL,
                next_step VARCHAR(256) NULL,
                completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
                last_active_step VARCHAR(256) NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                last_login TIMESTAMP WITH TIME ZONE NULL,
                access_token_expiration TIMESTAMP WITH TIME ZONE NULL,
                completed_at TIMESTAMP WITH TIME ZONE NULL,
                attribute_version VARCHAR(10) NOT NULL DEFAULT '1.0',
                preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
                setup_error TEXT NULL,
                selected_plan VARCHAR(12) NOT NULL DEFAULT 'free',
                business_id UUID NULL REFERENCES users_business(id) ON DELETE SET NULL,
                user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                payment_completed BOOLEAN DEFAULT FALSE,
                payment_method VARCHAR(50) NULL,
                payment_reference VARCHAR(255) NULL,
                last_payment_attempt TIMESTAMP WITH TIME ZONE NULL,
                database_setup_task_id VARCHAR(255) NULL,
                setup_progress INTEGER DEFAULT 0,
                database_provisioning_status VARCHAR(50) DEFAULT 'not_started',
                technical_setup_status VARCHAR(50) DEFAULT 'not_started',
                setup_started_at TIMESTAMP WITH TIME ZONE NULL,
                setup_retries INTEGER DEFAULT 0
            );
            """)
            logger.info("Created onboarding_onboardingprogress table")
            
            # Update custom_auth_tenant with the owner_id foreign key
            cursor.execute("""
            ALTER TABLE custom_auth_tenant 
            ADD CONSTRAINT auth_tenant_owner_id_fk 
            FOREIGN KEY (owner_id) REFERENCES custom_auth_user(id);
            """)
            logger.info("Updated custom_auth_tenant with FK to custom_auth_user")
            
            # Fill in the django_content_type table with default content types
            cursor.execute("""
            INSERT INTO django_content_type (app_label, model) VALUES
            ('admin', 'logentry'),
            ('auth', 'permission'),
            ('auth', 'group'),
            ('contenttypes', 'contenttype'),
            ('sessions', 'session'),
            ('sites', 'site'),
            ('users', 'user'),
            ('users', 'business'),
            ('users', 'businessdetails'),
            ('users', 'userprofile'),
            ('users', 'subscription'),
            ('finance', 'account'),
            ('finance', 'accounttype'),
            ('finance', 'transaction'),
            ('inventory', 'product'),
            ('inventory', 'service'),
            ('inventory', 'category'),
            ('inventory', 'supplier'),
            ('custom_auth', 'tenant'),
            ('onboarding', 'onboardingprogress')
            ON CONFLICT DO NOTHING;
            """)
            logger.info("Populated django_content_type table")
            
            # Record migrations in explicit chronological order with wide time gaps
            cursor.execute("""
            INSERT INTO django_migrations (app, name, applied) VALUES
            -- Sites app first
            ('sites', '0001_initial', NOW() - INTERVAL '80 minutes'),
            ('sites', '0002_alter_domain_unique', NOW() - INTERVAL '79 minutes'),

            -- Content Types next
            ('contenttypes', '0001_initial', NOW() - INTERVAL '75 minutes'),
            ('contenttypes', '0002_remove_content_type_name', NOW() - INTERVAL '74 minutes'),
            ('contenttypes', '0003_initial_structure', NOW() - INTERVAL '73 minutes'),

            -- Auth migrations
            ('auth', '0001_initial', NOW() - INTERVAL '70 minutes'),
            ('auth', '0002_alter_permission_name_max_length', NOW() - INTERVAL '69 minutes'),
            ('auth', '0003_alter_user_email_max_length', NOW() - INTERVAL '68 minutes'),
            ('auth', '0004_alter_user_username_opts', NOW() - INTERVAL '67 minutes'),
            ('auth', '0005_alter_user_last_login_null', NOW() - INTERVAL '66 minutes'),
            ('auth', '0006_require_contenttypes_0002', NOW() - INTERVAL '65 minutes'),
            ('auth', '0007_alter_validators_add_error_messages', NOW() - INTERVAL '64 minutes'),
            ('auth', '0008_alter_user_username_max_length', NOW() - INTERVAL '63 minutes'),
            ('auth', '0009_alter_user_last_name_max_length', NOW() - INTERVAL '62 minutes'),
            ('auth', '0010_alter_group_name_max_length', NOW() - INTERVAL '61 minutes'),
            ('auth', '0011_update_proxy_permissions', NOW() - INTERVAL '60 minutes'),
            ('auth', '0012_alter_user_first_name_max_length', NOW() - INTERVAL '59 minutes'),
            ('auth', '0013_initial_structure', NOW() - INTERVAL '58 minutes'),

            -- Admin and sessions
            ('admin', '0001_initial', NOW() - INTERVAL '55 minutes'),
            ('admin', '0002_logentry_remove_auto_add', NOW() - INTERVAL '54 minutes'),
            ('admin', '0003_logentry_add_action_flag_choices', NOW() - INTERVAL '53 minutes'),
            ('sessions', '0001_initial', NOW() - INTERVAL '52 minutes'),
            ('sessions', '0002_initial_structure', NOW() - INTERVAL '51 minutes'),

            -- Core custom apps (with greater time gaps to ensure proper ordering)
            ('custom_auth', '0001_initial', NOW() - INTERVAL '45 minutes'),
            ('users', '0001_initial', NOW() - INTERVAL '40 minutes'),
            ('onboarding', '0001_initial', NOW() - INTERVAL '35 minutes'),

            -- Other apps
            ('finance', '0001_initial', NOW() - INTERVAL '30 minutes'),
            ('inventory', '0001_initial', NOW() - INTERVAL '29 minutes'),
            ('crm', '0001_initial', NOW() - INTERVAL '28 minutes'),
            ('sales', '0001_initial', NOW() - INTERVAL '27 minutes'),
            ('purchases', '0001_initial', NOW() - INTERVAL '26 minutes'),
            ('taxes', '0001_initial', NOW() - INTERVAL '25 minutes'),
            ('hr', '0001_initial', NOW() - INTERVAL '24 minutes'),
            ('payroll', '0001_initial', NOW() - INTERVAL '23 minutes'),
            ('banking', '0001_initial', NOW() - INTERVAL '22 minutes'),
            ('reports', '0001_initial', NOW() - INTERVAL '21 minutes'),
            ('transport', '0001_initial', NOW() - INTERVAL '20 minutes'),
            ('finance', '0002_initial', NOW() - INTERVAL '19 minutes'),
            ('crm', '0002_initial', NOW() - INTERVAL '18 minutes'),
            ('banking', '0002_initial', NOW() - INTERVAL '17 minutes')
            ON CONFLICT DO NOTHING;
            """)
            logger.info("Recorded core migrations in django_migrations table")
            
            # Apply remaining migrations with --fake
            os.environ['ALLOW_TENANT_MIGRATIONS_IN_PUBLIC'] = 'True'
            try:
                logger.info("Applying all migrations with --fake...")
                # Use safe_migrate with disconnected permission signals and create permissions
                django.core.management.call_command('safe_migrate', '--fake', '--create-permissions')
                using_fake = True
            finally:
                # Reset the environment variable
                os.environ.pop('ALLOW_TENANT_MIGRATIONS_IN_PUBLIC', None)
            
            # Add indexes after migrations
            logger.info("Adding indexes...")
            with connection.cursor() as cursor:
                try:
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS idx_inventory_item_sku ON inventory_inventoryitem(sku);
                        CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory_inventoryitem(name);
                        CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON custom_auth_tenant(schema_name);
                        CREATE INDEX IF NOT EXISTS idx_user_email ON custom_auth_user(email);
                        CREATE INDEX IF NOT EXISTS idx_user_tenant ON custom_auth_user(tenant_id);
                    """)
                except Exception as e:
                    logger.warning(f"Error creating indexes: {e}")
            
            return using_fake  # Return True to indicate we used fake migrations
            
        

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
        django.core.management.call_command('safe_migrate', '--create-permissions')
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
        logger.info("Verifying NextAuth.js tables and extensions")
        
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    # Only create the UUID extension - tables are already created in recreate_and_apply_migrations
                    cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
                    logger.info("UUID extension created or verified")
                    
                    # Verify tables exist
                    tables_to_check = [
                        'custom_auth_tenant', 'custom_auth_user', 'users_account',
                        'users_session', 'users_verification_token'
                    ]
                    
                    for table in tables_to_check:
                        cur.execute(f"""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables
                                WHERE table_schema = 'public'
                                AND table_name = '{table}'
                            );
                        """)
                        exists = cur.fetchone()[0]
                        if exists:
                            logger.info(f"Table {table} exists")
                        else:
                            logger.warning(f"Table {table} does not exist - this may cause issues")
                    
                    # Verify indexes exist
                    indexes_to_check = [
                        'idx_tenant_schema_name', 'idx_user_email',
                        'idx_user_tenant', 'idx_account_user', 'idx_session_user'
                    ]
                    
                    for index in indexes_to_check:
                        cur.execute(f"""
                            SELECT EXISTS (
                                SELECT FROM pg_indexes
                                WHERE schemaname = 'public'
                                AND indexname = '{index}'
                            );
                        """)
                        exists = cur.fetchone()[0]
                        if exists:
                            logger.info(f"Index {index} exists")
                        else:
                            logger.warning(f"Index {index} does not exist - this may cause performance issues")

                logger.info("NextAuth.js tables verification completed")
                self.stdout.write(self.style.SUCCESS("NextAuth.js tables verification completed"))
                
        except Exception as e:
            logger.error(f"An error occurred while verifying NextAuth.js tables: {e}")
            self.stdout.write(self.style.ERROR(f"Failed to verify NextAuth.js tables: {e}"))

    def reset_migrations(self):
        logger.info("Resetting all migrations...")
        # Delete all migration files
        migration_files = self.find_migration_files()
        if migration_files:
            self.delete_files(migration_files)
            logger.info("All migration files deleted.")
        
        # Reset migration records in the database
        with connection.cursor() as cursor:
            try:
                # Ensure the content_type table has the name column for compatibility
                try:
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'django_content_type' 
                        AND column_name = 'name';
                    """)
                    has_name_column = bool(cursor.fetchone())
                    
                    if not has_name_column:
                        # Add the name column if it doesn't exist
                        logger.info("Adding 'name' column to django_content_type table for migration compatibility")
                        cursor.execute("""
                            ALTER TABLE django_content_type ADD COLUMN name VARCHAR(100) NULL;
                        """)
                except Exception as e:
                    logger.warning(f"Error checking/modifying content_type table: {e}")
                
                # Now clear the migrations table
                cursor.execute("TRUNCATE django_migrations;")
                logger.info("Migration records cleared from database.")
                    
            except Exception as e:
                logger.error(f"Error clearing migration records: {e}")
        
        # Create new migration files in correct order
        logger.info("Creating migrations for core apps in correct order...")
        
        # First create migrations for Django built-in apps
        django.core.management.call_command('makemigrations', 'contenttypes')
        django.core.management.call_command('makemigrations', 'auth')
        
        # Then create migrations for custom_auth (must come before users)
        django.core.management.call_command('makemigrations', 'custom_auth')
        
        # Then create migrations for users (depends on custom_auth)
        django.core.management.call_command('makemigrations', 'users')
        
        # Then create migrations for onboarding
        django.core.management.call_command('makemigrations', 'onboarding')
        
        # Then create remaining migrations for all other apps
        logger.info("Creating migrations for remaining apps...")
        django.core.management.call_command('makemigrations')
        
        try:
            # Apply migrations in controlled order
            logger.info("Applying migrations in controlled order...")
            
            # First apply contenttype and auth migrations
            logger.info("1. Applying contenttype migrations...")
            django.core.management.call_command('migrate', 'contenttypes', '--fake')
            
            logger.info("2. Applying auth migrations...")
            django.core.management.call_command('migrate', 'auth', '--fake')
            
            # Then apply custom_auth migrations before any user-related migrations
            logger.info("3. Applying custom_auth migrations...")
            django.core.management.call_command('migrate', 'custom_auth', '--fake')
            
            # Then apply users migrations
            logger.info("4. Applying users migrations...")
            django.core.management.call_command('migrate', 'users', '--fake')
            
            # Then apply onboarding migrations
            logger.info("5. Applying onboarding migrations...")
            django.core.management.call_command('migrate', 'onboarding', '--fake')
            
            # Then fake apply all other migrations
            logger.info("6. Applying remaining migrations with --fake...")
            django.core.management.call_command('safe_migrate', '--fake')
            
            # Finally apply real migrations
            logger.info("7. Applying all migrations normally with safe migrate...")
            django.core.management.call_command('safe_migrate', '--create-permissions')
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            logger.info("Attempting alternative migration approach...")
            
            # Try another approach - fake each app individually in correct order
            apps = [
                'contenttypes', 
                'auth', 
                'custom_auth',  # custom_auth must come before users
                'users',
                'onboarding',
                'admin', 
                'sessions', 
                'finance', 
                'inventory', 
                'sales',
                # Add other apps as needed
            ]
            
            for app in apps:
                try:
                    logger.info(f"Fake migrating {app}...")
                    django.core.management.call_command('migrate', app, '--fake')
                except Exception as app_error:
                    logger.error(f"Error fake migrating {app}: {app_error}")
            
            # Try a regular migrate to apply any remaining migrations
            try:
                logger.info("Applying all migrations normally with safe migrate...")
                django.core.management.call_command('safe_migrate', '--create-permissions')
            except Exception as migrate_error:
                logger.error(f"Error during final migration: {migrate_error}")
        
        logger.info("Migration reset completed successfully.")

    def clean_tenant_data(self):
        """
        Cleans all tenant-related data from public tables while preserving essential system data.
        """
        self.stdout.write("Starting tenant data cleanup...")
        
        with connection.cursor() as cursor:
            try:
                # Start a transaction
                cursor.execute("BEGIN;")
                
                # Check if each table exists before trying to delete from it
                def table_exists(table_name):
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        );
                    """, [table_name])
                    return cursor.fetchone()[0]
                
                # Delete data in the correct order to respect foreign key constraints
                
                # 1. First clear leaf tables (those with no dependencies)
                self.stdout.write("Cleaning leaf tables...")
                
                # Token blacklist tables
                if table_exists("token_blacklist_blacklistedtoken"):
                    cursor.execute("DELETE FROM token_blacklist_blacklistedtoken;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from token_blacklist_blacklistedtoken")
                
                # Clear line items and transaction details first
                for table in [
                    "finance_journalentryline", "finance_reconciliationitem",
                    "payroll_timesheetentry", "sales_invoiceitem", "sales_estimateitem",
                    "sales_saleitem", "sales_refunditem", "sales_salesorderitem",
                    "purchases_billitem", "purchases_procurementitem", "purchases_purchaseorderitem",
                    "purchases_purchasereturnitem", "inventory_product_custom_charge_plans",
                    "inventory_service_custom_charge_plans", "sales_estimateattachment",
                    "finance_budgetitem", "hr_employeerole", "crm_campaignmember",
                    "crm_activity", "finance_monthendtask"
                ]:
                    if table_exists(table):
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"Deleted {cursor.rowcount} records from {table}")
                
                # 2. Clear tables with foreign keys to other business tables
                self.stdout.write("Cleaning transaction tables...")
                
                # Banking and transaction tables
                for table in [
                    "banking_banktransaction", "sales_refund", "finance_generalledgerentry",
                    "sales_sale", "sales_invoice", "sales_estimate", "sales_salesorder",
                    "finance_financetransaction", "finance_income", "finance_revenueaccount",
                    "finance_salestaxaccount", "finance_cashaccount", "finance_costallocation",
                    "transport_expense", "transport_maintenance", "transport_compliance",
                    "transport_load", "purchases_purchasereturn", "purchases_purchaseorder",
                    "purchases_procurement", "purchases_bill", "payroll_payrolltransaction",
                    "payroll_timesheet", "payroll_taxform", "reports_report"
                ]:
                    if table_exists(table):
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"Deleted {cursor.rowcount} records from {table}")
                
                # 3. Delete mid-level tables
                self.stdout.write("Cleaning mid-level tables...")
                
                for table in [
                    "payroll_payrollrun", "finance_journalentry", "finance_fixedasset",
                    "finance_intercompanytransaction", "finance_accountreconciliation",
                    "finance_monthendclosing", "finance_budget", "finance_costentry",
                    "finance_financialstatement", "crm_opportunity", "crm_deal",
                    "crm_lead", "inventory_inventorytransaction", "inventory_inventoryitem",
                    "inventory_product", "inventory_service", "purchases_vendor",
                    "banking_bankaccount", "banking_plaiditem", "banking_tinkitem",
                    "crm_contact", "crm_customer", "crm_campaign", "transport_driver",
                    "transport_equipment", "transport_route", "hr_employee", "hr_role",
                    "hr_accesspermission", "hr_preboardingform", "taxes_incometaxrate",
                    "taxes_payrolltaxfiling", "taxes_taxapitransaction", 
                    "taxes_taxfilinginstruction", "taxes_taxform", "taxes_state",
                    "analysis_chartconfiguration", "analysis_financialdata",
                    "onboarding_onboardingprogress", "token_blacklist_outstandingtoken"
                ]:
                    if table_exists(table):
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"Deleted {cursor.rowcount} records from {table}")
                
                # 4. Delete base system/configuration tables
                self.stdout.write("Cleaning configuration tables...")
                
                for table in [
                    "finance_account", "finance_intercompanyaccount", "finance_costcategory",
                    "finance_chartofaccount", "finance_accounttype", "finance_accountcategory",
                    "inventory_supplier", "inventory_location", "inventory_department",
                    "inventory_category", "inventory_customchargeplan",
                    "inventory_producttypefields", "inventory_servicetypefields",
                    "finance_audittrail"
                ]:
                    if table_exists(table):
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"Deleted {cursor.rowcount} records from {table}")
                
                # 5. Finally clear user data
                self.stdout.write("Cleaning user data...")
                
                # Clear user data in the correct order
                if table_exists("users_subscription"):
                    cursor.execute("DELETE FROM users_subscription;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from users_subscription")
                
                if table_exists("users_userprofile"):
                    cursor.execute("DELETE FROM users_userprofile;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from users_userprofile")
                
                if table_exists("users_business_details"):
                    cursor.execute("DELETE FROM users_business_details;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from users_business_details")
                
                if table_exists("users_business"):
                    cursor.execute("DELETE FROM users_business;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from users_business")
                
                if table_exists("django_session"):
                    cursor.execute("DELETE FROM django_session;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from django_session")
                
                if table_exists("custom_auth_tenant"):
                    cursor.execute("DELETE FROM custom_auth_tenant;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from custom_auth_tenant")
                
                # Only delete non-superuser users
                if table_exists("custom_auth_user"):
                    cursor.execute("DELETE FROM custom_auth_user WHERE is_superuser = FALSE;")
                    self.stdout.write(f"Deleted {cursor.rowcount} records from custom_auth_user")
                
                # Commit the transaction
                cursor.execute("COMMIT;")
                self.stdout.write(self.style.SUCCESS("Successfully cleaned all tenant data!"))
                
            except Exception as e:
                cursor.execute("ROLLBACK;")
                self.stderr.write(self.style.ERROR(f"Error cleaning tenant data: {str(e)}"))
                raise

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
