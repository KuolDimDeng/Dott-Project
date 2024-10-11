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

            # Step 4: Custom flush
            table_status = self.custom_flush()

            # Step 5: Drop all sequences
            self.drop_all_sequences()

            # Step 6: Recreate and apply migrations
            self.recreate_and_apply_migrations()

            # Step 7: Check for lingering data
            self.check_and_clear_lingering_data()

            # Step 8: Recreate account types
            self.recreate_account_types()

            # Step 9: Check for any remaining model changes
            self.check_and_apply_remaining_changes()

            # Step 10: Create NextAuth.js tables
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
            'port': default_db['PORT']
        }
        
    def drop_all_user_databases(self, conn_details):
        database_status = {}
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    # Get all databases owned by the current user, excluding default ones
                    cur.execute("""
                        SELECT datname FROM pg_database 
                        WHERE datistemplate = false 
                        AND datname NOT IN ('postgres', 'template0', 'template1', 'rdsadmin');
                    """)
                    databases = cur.fetchall()

                    for db in databases:
                        db_name = db[0]
                        try:
                            # Terminate existing connections to the database
                            cur.execute(f"""
                                SELECT pg_terminate_backend(pid)
                                FROM pg_stat_activity
                                WHERE datname = %s AND pid <> pg_backend_pid()
                            """, (db_name,))
                            
                            # Drop the database
                            cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                            database_status[db_name] = "Dropped"
                            logger.info(f"Database {db_name} dropped successfully.")
                        except Exception as e:
                            database_status[db_name] = f"Error: {str(e)}"
                            logger.error(f"Error dropping database {db_name}: {e}")

            logger.info("\nDatabase Status:")
            for db, status in database_status.items():
                logger.info(f"{db}: {status}")

        except Exception as e:
            logger.error(f"Error in drop_all_user_databases: {e}")
        
        return database_status


    def recreate_main_database(self, conn_details):
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    main_db_name = settings.DATABASES['default']['NAME']
                    cur.execute(f'CREATE DATABASE "{main_db_name}";')
                    logger.info(f"Main database '{main_db_name}' recreated successfully.")

                    # Set the owner of the new database to the current user
                    cur.execute("SELECT current_user;")
                    current_user = cur.fetchone()[0]
                    cur.execute(f'ALTER DATABASE "{main_db_name}" OWNER TO {current_user};')
                    logger.info(f"Ownership of '{main_db_name}' transferred to {current_user}.")
        except Exception as e:
            logger.error(f"Error recreating main database: {e}")


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
        try:
            cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
            cursor.execute("CREATE SCHEMA public;")
            cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
            cursor.execute("GRANT ALL ON SCHEMA public TO public;")
            logger.info("Public schema dropped and recreated successfully.")
        except Exception as e:
            logger.error(f"Error dropping public schema: {e}")

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
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
                    databases = cur.fetchall()

            for db in databases:
                db_name = db[0]
                if db_name not in ['postgres', 'template0', 'template1', settings.DATABASES['default']['NAME']]:
                    try:
                        with psycopg2.connect(**conn_details) as conn:
                            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                            with conn.cursor() as cur:
                                cur.execute(f"""
                                    SELECT pg_terminate_backend(pid)
                                    FROM pg_stat_activity
                                    WHERE datname = %s AND pid <> pg_backend_pid()
                                """, (db_name,))
                                cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                        database_status[db_name] = "Dropped"
                        logger.info(f"Database {db_name} dropped successfully.")
                    except Exception as e:
                        database_status[db_name] = f"Error: {str(e)}"
                        logger.error(f"Error dropping database {db_name}: {e}")

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

        logger.info("Migrations recreated and applied.")

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
            "Current Asset", "Current Liability", "Equity", "Revenue",
            "Operating Expense", "Cost of Goods Sold", "Non-Operating Expense"
        ]
        for account_type in account_types:
            AccountType.objects.create(name=account_type)
        logger.info("Account types recreated.")

    def check_and_apply_remaining_changes(self):
        logger.info("Checking for any remaining model changes...")
        django.core.management.call_command('makemigrations')
        django.core.management.call_command('migrate')
        logger.info("Any remaining changes have been captured and applied.")

    def create_nextauth_tables(self, conn_details):
        logger.info("Starting to create NextAuth.js tables")
        
        try:
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    commands = (
                        """
                        CREATE TABLE IF NOT EXISTS users (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255),
                            email VARCHAR(255) UNIQUE NOT NULL,
                            email_verified TIMESTAMP,
                            image VARCHAR(255),
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """,
                        """
                        CREATE TABLE IF NOT EXISTS accounts (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
                        )
                        """,
                        """
                        CREATE TABLE IF NOT EXISTS sessions (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            expires TIMESTAMP NOT NULL,
                            session_token VARCHAR(255) UNIQUE NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """,
                        """
                        CREATE TABLE IF NOT EXISTS verification_tokens (
                            identifier VARCHAR(255) NOT NULL,
                            token VARCHAR(255) NOT NULL,
                            expires TIMESTAMP NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (identifier, token)
                        )
                        """
                    )

                    for i, command in enumerate(commands, 1):
                        logger.info(f"Executing NextAuth.js table creation command {i} of {len(commands)}")
                        cur.execute(command)
                        logger.info(f"NextAuth.js table creation command {i} executed successfully")

            logger.info("NextAuth.js tables created successfully.")
            self.stdout.write(self.style.SUCCESS("NextAuth.js tables created successfully."))
        except Exception as e:
            logger.error(f"An error occurred while creating NextAuth.js tables: {e}")
            self.stdout.write(self.style.ERROR(f"Failed to create NextAuth.js tables: {e}"))

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