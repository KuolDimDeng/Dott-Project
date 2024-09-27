import os
import shutil
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps
import django

class Command(BaseCommand):
    help = 'Delete all migration files except __init__.py, drop tables and user-specific databases, and recreate migrations.'

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

    def prompt_confirmation(self):
        response = input("Are you sure you want to delete migrations and databases? (yes/no): ")
        return response.lower() == 'yes'

    def delete_files(self, files):
        for file in files:
            if os.path.isfile(file):
                os.remove(file)
                self.stdout.write(f"Deleted file: {file}")
            elif os.path.isdir(file):
                shutil.rmtree(file)
                self.stdout.write(f"Deleted directory: {file}")

    def handle(self, *args, **kwargs):
        if not self.prompt_confirmation():
            self.stdout.write("Operation cancelled by user.")
            return

        table_status = {}
        database_status = {}

        # Step 1: Delete migration files
        migration_files = self.find_migration_files()
        if migration_files:
            self.list_files(migration_files)
            if self.prompt_confirmation():
                self.delete_files(migration_files)
                self.stdout.write("All specified migration files have been deleted.")
            else:
                self.stdout.write("No files were deleted.")
                return
        else:
            self.stdout.write("No migration files found to delete.")

        # Step 2: Drop tables and user-specific databases
        try:
            conn_details = self.get_db_connection_details()
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    self.drop_public_schema(cur)
                    self.clear_user_data(cur)

            database_status = self.drop_non_template_databases(conn_details)
            self.stdout.write("All tables in public schema and non-template databases processed.")
        except Exception as e:
            self.stdout.write(f"Error connecting to the database: {e}")

        # Step 3: Custom flush
        table_status = self.custom_flush()

        # Step 4: Drop all sequences
        self.drop_all_sequences()

        # Step 5: Recreate and apply migrations
        self.recreate_and_apply_migrations()
        # Step 5: Check for lingering data
        self.check_and_clear_lingering_data()

        # Step 6: Recreate account types
        self.recreate_account_types()

        # Step 7: Check for any remaining model changes
        self.check_and_apply_remaining_changes()

        self.print_summary(table_status, database_status)

        self.stdout.write("Database reset and migrations recreated successfully.")

    def get_db_connection_details(self):
        default_db = settings.DATABASES['default']
        return {
            'dbname': 'postgres',  # Connect to 'postgres' database for administrative tasks
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
            self.stdout.write("Public schema dropped and recreated successfully.")
        except Exception as e:
            self.stdout.write(f"Error dropping public schema: {e}")

    def clear_user_data(self, cursor):
        try:
            cursor.execute("TRUNCATE TABLE users_user CASCADE;")  # Adjust if your User model table name is different
            self.stdout.write("User data cleared successfully.")
        except Exception as e:
            self.stdout.write(f"Error clearing user data: {e}")

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
                if db_name not in ['postgres', 'template0', 'template1', 'rdsadmin']:
                    try:
                        with psycopg2.connect(**conn_details) as conn:
                            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                            with conn.cursor() as cur:
                                # Terminate existing connections
                                cur.execute(f"""
                                    SELECT pg_terminate_backend(pid)
                                    FROM pg_stat_activity
                                    WHERE datname = %s AND pid <> pg_backend_pid()
                                """, (db_name,))
                                
                                # Drop the database
                                cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                        database_status[db_name] = "Dropped"
                        self.stdout.write(f"Database {db_name} dropped successfully.")
                    except Exception as e:
                        database_status[db_name] = f"Error: {str(e)}"
                        self.stdout.write(f"Error dropping database {db_name}: {e}")

            self.stdout.write("\nDatabase Status:")
            for db, status in database_status.items():
                self.stdout.write(f"{db}: {status}")

        except Exception as e:
            self.stdout.write(f"Error in drop_non_template_databases: {e}")
        
        return database_status

    def custom_flush(self):
        self.stdout.write("Flushing database...")
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
                    self.stdout.write(f"Error dropping table {table[0]}: {e}")
        
        self.stdout.write("Database flush attempt completed.")
        self.stdout.write("\nTable Status:")
        for table, status in table_status.items():
            self.stdout.write(f"{table}: {status}")
        return table_status
    
    def drop_all_sequences(self):
        self.stdout.write("Dropping all sequences...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';")
            sequences = cursor.fetchall()
            for seq in sequences:
                try:
                    cursor.execute(f'DROP SEQUENCE IF EXISTS "{seq[0]}" CASCADE;')
                    self.stdout.write(f"Dropped sequence: {seq[0]}")
                except Exception as e:
                    self.stdout.write(f"Error dropping sequence {seq[0]}: {e}")

    def recreate_and_apply_migrations(self):
        self.stdout.write("Making new migrations...")
        django.core.management.call_command('makemigrations')

        self.stdout.write("Applying migrations...")
        django.core.management.call_command('migrate')

        self.stdout.write("Migrations recreated and applied.")

    def check_and_clear_lingering_data(self):
        self.stdout.write("Checking for lingering data...")
        with connection.cursor() as cursor:
            for model in apps.get_models():
                if model._meta.managed:
                    table_name = model._meta.db_table
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                        count = cursor.fetchone()[0]
                        if count > 0:
                            self.stdout.write(f"Clearing {count} records from {table_name}")
                            cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE;")
                    except Exception as e:
                        self.stdout.write(f"Error checking table {table_name}: {e}")
        self.stdout.write("Lingering data check and clear complete.")

    def recreate_account_types(self):
        from finance.models import AccountType
        AccountType.objects.all().delete()
        account_types = [
            "Current Asset", "Current Liability", "Equity", "Revenue",
            "Operating Expense", "Cost of Goods Sold", "Non-Operating Expense"
        ]
        for account_type in account_types:
            AccountType.objects.create(name=account_type)
        self.stdout.write("Account types recreated.")

    def check_and_apply_remaining_changes(self):
        self.stdout.write("Checking for any remaining model changes...")
        django.core.management.call_command('makemigrations')
        django.core.management.call_command('migrate')
        self.stdout.write("Any remaining changes have been captured and applied.")

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