#!/usr/bin/env python
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()

from django.conf import settings

def get_db_connection_details():
    default_db = settings.DATABASES['default']
    return {
        'dbname': default_db['NAME'],
        'user': default_db['USER'],
        'password': default_db['PASSWORD'],
        'host': default_db['HOST'],
        'port': default_db['PORT']
    }

def reset_database_schema():
    """Reset the database schema by dropping and recreating the public schema"""
    conn_details = get_db_connection_details()
    
    print(f"Connecting to database: {conn_details['dbname']} on {conn_details['host']}")
    
    try:
        with psycopg2.connect(**conn_details) as conn:
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            with conn.cursor() as cur:
                print("Dropping public schema...")
                cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
                
                print("Creating public schema...")
                cur.execute("CREATE SCHEMA public;")
                
                print("Granting privileges...")
                cur.execute("GRANT ALL ON SCHEMA public TO dott_admin;")
                cur.execute("GRANT ALL ON SCHEMA public TO public;")
                
        print("Database schema reset successfully!")
        return True
    except Exception as e:
        print(f"Error resetting database schema: {e}")
        return False

if __name__ == "__main__":
    if reset_database_schema():
        print("\nNow you can run the migration_order.py script to apply migrations in the correct order.")
        print("python scripts/migration_order.py")
    else:
        print("\nFailed to reset database schema. Please check the error message above.")