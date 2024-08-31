import os
import shutil
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management import call_command
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

            self.drop_non_template_databases(conn_details)
            self.stdout.write("All tables in public schema and non-template databases dropped successfully.")
        except Exception as e:
            self.stdout.write(f"Error connecting to the database: {e}")

        # Step 3: Use Django's flush command
        self.stdout.write("Flushing database...")
        call_command('flush', interactive=False, verbosity=0)
        self.stdout.write("Database flushed successfully.")

        # Step 4: Recreate and apply migrations
        self.recreate_and_apply_migrations()

        # Step 5: Check for lingering data
        self.check_and_clear_lingering_data()

        # Step 6: Recreate account types
        self.recreate_account_types()

        # Step 7: Check for any remaining model changes
        self.check_and_apply_remaining_changes()

        self.stdout.write("Database reset and migrations recreated successfully.")

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
            cursor.execute("DROP SCHEMA public CASCADE;")
            cursor.execute("CREATE SCHEMA public;")
            self.stdout.write("Public schema dropped and recreated successfully.")
        except Exception as e:
            self.stdout.write(f"Error dropping public schema: {e}")

    def clear_user_data(self, cursor):
        try:
            cursor.execute("TRUNCATE TABLE auth_user CASCADE;")
            self.stdout.write("User data cleared successfully.")
        except Exception as e:
            self.stdout.write(f"Error clearing user data: {e}")

    def drop_non_template_databases(self, conn_details):
        try:
            # First, get the list of databases to drop
            with psycopg2.connect(**conn_details) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
                    databases = cur.fetchall()

            # Now drop each database in a separate connection
            for db in databases:
                db_name = db[0]
                if db_name not in ['postgres', 'template0', 'template1', 'rdsadmin']:
                    try:
                        # Create a new connection for each DROP DATABASE command
                        with psycopg2.connect(**conn_details) as conn:
                            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                            with conn.cursor() as cur:
                                cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
                        self.stdout.write(f"Database {db_name} dropped successfully.")
                    except Exception as e:
                        self.stdout.write(f"Error dropping database {db_name}: {e}")

        except Exception as e:
            self.stdout.write(f"Error fetching or dropping databases: {e}")

    def recreate_and_apply_migrations(self):
        self.stdout.write("Making new migrations...")
        call_command('makemigrations')

        self.stdout.write("Applying migrations...")
        call_command('migrate')

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
        call_command('makemigrations')
        call_command('migrate')
        self.stdout.write("Any remaining changes have been captured and applied.")

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()