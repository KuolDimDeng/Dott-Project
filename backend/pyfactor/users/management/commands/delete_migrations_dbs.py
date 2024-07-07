import os
import shutil
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management import call_command
import django

class Command(BaseCommand):
    help = 'Delete all migration files except __init__.py, and then drop tables and user-specific databases.'

    def find_migration_files(self):
        migration_files = []
        for root, dirs, files in os.walk('.'):
            if 'migrations' in dirs:
                migration_path = os.path.join(root, 'migrations')
                for file in os.listdir(migration_path):
                    if file != '__init__.py':
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
        # Step 1: Ask for confirmation
        if not self.prompt_confirmation():
            self.stdout.write("Operation cancelled by user.")
            return

        # Step 2: Delete migration files
        migration_files = self.find_migration_files()
        if not migration_files:
            self.stdout.write("No migration files found to delete.")
        else:
            self.list_files(migration_files)
            if self.prompt_confirmation():
                self.delete_files(migration_files)
                self.stdout.write("All specified migration files have been deleted.")
            else:
                self.stdout.write("No files were deleted.")
                return

        # Step 3: Drop tables and user-specific databases
        try:
            # Get database connection details from Django settings
            conn_details = self.get_db_connection_details()

            # Connect to PostgreSQL
            conn = psycopg2.connect(**conn_details)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()

            # Drop tables in public schema
            self.drop_public_schema_tables(cur)

            # Close the cursor and connection to default database
            cur.close()
            conn.close()

            # Reconnect to drop non-template databases
            conn = psycopg2.connect(**conn_details)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()

            # Drop non-template databases
            self.drop_non_template_databases(cur)

            cur.close()
            conn.close()
            self.stdout.write("All tables in public schema and non-template databases dropped successfully.")
        except Exception as e:
            self.stdout.write(f"Error connecting to the database: {e}")

        # Step 4: Run makemigrations and migrate
        self.stdout.write("Running makemigrations...")
        call_command('makemigrations')
        self.stdout.write("Running migrate...")
        call_command('migrate')

    def get_db_connection_details(self):
        default_db = settings.DATABASES['default']
        return {
            'dbname': default_db['NAME'],
            'user': default_db['USER'],
            'password': default_db['PASSWORD'],
            'host': default_db['HOST'],
            'port': default_db['PORT']
        }

    def drop_public_schema_tables(self, cursor):
        try:
            # Fetch all tables in the public schema
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
            tables = cursor.fetchall()
            for table in tables:
                table_name = table[0]
                try:
                    cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
                    self.stdout.write(f"Table {table_name} dropped successfully.")
                except Exception as e:
                    self.stdout.write(f"Error dropping table {table_name}: {e}")
        except Exception as e:
            self.stdout.write(f"Error fetching tables: {e}")

    def drop_non_template_databases(self, cursor):
        try:
            # Fetch list of non-template databases
            cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
            databases = cursor.fetchall()

            for db in databases:
                db_name = db[0]
                if db_name not in ['postgres', 'template0', 'template1', 'rdsadmin']:
                    try:
                        # Drop each non-template database
                        cursor.execute(f"DROP DATABASE IF EXISTS {db_name};")
                        self.stdout.write(f"Database {db_name} dropped successfully.")
                    except Exception as e:
                        self.stdout.write(f"Error dropping database {db_name}: {e}")
        except Exception as e:
            self.stdout.write(f"Error fetching databases: {e}")

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
