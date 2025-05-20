#/Users/kuoldeng/projectx/backend/pyfactor/users/management/commands/reset_db_main.py
import os
import shutil
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
import django
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reset database completely with no data preservation.'

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
            
        if not no_input:
            confirm = input("This will COMPLETELY RESET your database, deleting ALL data. Are you sure? Type 'yes' to confirm: ")
            if confirm.lower() != 'yes':
                self.stdout.write("Operation cancelled by user.")
                return

        # Step 1: Delete all migration files
        migration_files = self.find_migration_files()
        if migration_files:
            self.delete_files(migration_files)
            logger.info("All migration files have been deleted.")
        else:
            logger.info("No migration files found to delete.")

        # Step 2: Drop all database objects
        self.reset_database()

        # Step 3: Create empty migration files for each app
        logger.info("Creating new migrations...")
        call_command('makemigrations')

        # Step 4: Apply migrations
        logger.info("Applying migrations...")
        try:
            # First migrate contenttypes and auth
            call_command('migrate', 'contenttypes', '--no-input')
            call_command('migrate', 'auth', '--no-input')
            
            # Set environment variable to override DB router for all migrations
            os.environ['OVERRIDE_DB_ROUTER'] = 'True'
            
            # Apply banking app migrations first (since it's a dependency)
            logger.info("Migrating banking app...")
            call_command('migrate', 'banking', '--no-input')
            
            # Apply all other migrations
            logger.info("Migrating remaining apps...")
            call_command('migrate', '--no-input')
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            logger.info("Attempting to continue with --fake migrations...")
            
            try:
                # Close connections to ensure clean state
                from django.db import connections
                connections.close_all()
                
                # Apply with --fake
                call_command('migrate', '--fake', '--no-input')
            except Exception as fake_error:
                logger.error(f"Error applying fake migrations: {fake_error}")
        finally:
            # Reset the environment variable
            os.environ.pop('OVERRIDE_DB_ROUTER', None)

        logger.info("Database reset complete!")

    def reset_database(self):
        """Completely reset the database by dropping all objects"""
        logger.info("Resetting database...")
        
        # Get database connection details
        db_settings = settings.DATABASES['default']
        db_name = db_settings['NAME']
        db_user = db_settings['USER']
        db_password = db_settings['PASSWORD']
        db_host = db_settings['HOST']
        db_port = db_settings['PORT']
        
        # Set PGPASSWORD for psql command
        os.environ['PGPASSWORD'] = db_password
        
        # Create SQL to drop all objects
        drop_sql = """
        DO $$ DECLARE
            r RECORD;
        BEGIN
            -- Disable foreign key constraints
            EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
            
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Drop all sequences
            FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all views
            FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all schemas except public
            FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
                EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
            END LOOP;
            
            -- Reset the public schema
            EXECUTE 'DROP SCHEMA public CASCADE';
            EXECUTE 'CREATE SCHEMA public';
            EXECUTE 'GRANT ALL ON SCHEMA public TO public';
        END $$;
        """
        
        # Write SQL to temp file
        temp_sql_file = 'drop_all_objects.sql'
        with open(temp_sql_file, 'w') as f:
            f.write(drop_sql)
        
        # Run the SQL script
        conn_string = f"psql -h {db_host} -p {db_port} -U {db_user} -d {db_name} -f {temp_sql_file}"
        try:
            logger.info("Executing drop all objects SQL...")
            os.system(conn_string)
            
            # Also attempt direct connection and reset
            self.direct_connection_reset()
        except Exception as e:
            logger.error(f"Error during database reset: {e}")
        finally:
            # Clean up
            if os.path.exists(temp_sql_file):
                os.remove(temp_sql_file)
            
            # Remove password from environment
            if 'PGPASSWORD' in os.environ:
                del os.environ['PGPASSWORD']
                
    def direct_connection_reset(self):
        """Use direct psycopg2 connection to reset database objects"""
        try:
            db_settings = settings.DATABASES['default']
            conn = psycopg2.connect(
                dbname=db_settings['NAME'],
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            with conn.cursor() as cursor:
                # Drop and recreate public schema
                cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
                cursor.execute("CREATE SCHEMA public;")
                cursor.execute("GRANT ALL ON SCHEMA public TO public;")
                
                logger.info("Public schema reset via direct connection")
        except Exception as e:
            logger.error(f"Error during direct connection reset: {e}")

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
