#!/usr/bin/env python
"""
Script to fix the users_userprofile table in tenant schemas.

This script:
1. Takes a tenant schema name as input
2. Manually creates the users_userprofile table in the schema
3. Verifies that the table exists

Usage:
    python fix_tenant_userprofile.py <schema_name>
"""

import os
import sys
import logging
import argparse
import psycopg2
from psycopg2 import sql

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings
from django.db import connection

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get a direct psycopg2 connection to the database"""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.autocommit = True
    return conn

def schema_exists(schema_name):
    """Check if the schema exists"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Error checking if schema exists: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def table_exists(schema_name, table_name):
    """Check if a table exists in the schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s AND table_name = %s
            """, [schema_name, table_name])
            return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Error checking if table exists: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def create_userprofile_table(schema_name):
    """Create the users_userprofile table in the schema"""
    if not schema_exists(schema_name):
        logger.error(f"Schema {schema_name} does not exist")
        return False
    
    if table_exists(schema_name, 'users_userprofile'):
        logger.info(f"Table users_userprofile already exists in schema {schema_name}")
        return True
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to the tenant schema
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            logger.info(f"Set search path to {schema_name}")
            
            # Create the users_userprofile table
            cursor.execute("""
                CREATE TABLE "users_userprofile" (
                    "id" bigserial NOT NULL PRIMARY KEY,
                    "occupation" varchar(200) NULL,
                    "street" varchar(200) NULL,
                    "city" varchar(200) NULL,
                    "state" varchar(200) NULL,
                    "postcode" varchar(200) NULL,
                    "country" varchar(2) NOT NULL DEFAULT 'US',
                    "phone_number" varchar(200) NULL,
                    "created_at" timestamp with time zone NOT NULL,
                    "modified_at" timestamp with time zone NOT NULL,
                    "is_business_owner" boolean NOT NULL DEFAULT false,
                    "shopify_access_token" varchar(255) NULL,
                    "schema_name" varchar(63) NULL,
                    "metadata" jsonb NULL,
                    "business_id" uuid NULL,
                    "tenant_id" uuid NULL,
                    "user_id" uuid NOT NULL
                )
            """)
            
            # Add constraints and indexes
            cursor.execute("""
                CREATE INDEX "users_userp_tenant__d11818_idx" ON "users_userprofile" ("tenant_id")
            """)
            
            cursor.execute("""
                ALTER TABLE "users_userprofile" ADD CONSTRAINT "unique_user_profile" UNIQUE ("user_id")
            """)
            
            # Add foreign key constraints if the referenced tables exist
            if table_exists(schema_name, 'business_business'):
                cursor.execute("""
                    ALTER TABLE "users_userprofile" ADD CONSTRAINT "users_userprofile_business_id_fk" 
                    FOREIGN KEY ("business_id") REFERENCES "business_business" ("id") 
                    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
                """)
            
            if table_exists(schema_name, 'custom_auth_tenant'):
                cursor.execute("""
                    ALTER TABLE "users_userprofile" ADD CONSTRAINT "users_userprofile_tenant_id_fk" 
                    FOREIGN KEY ("tenant_id") REFERENCES "custom_auth_tenant" ("id") 
                    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
                """)
            
            # Add the migration record
            if table_exists(schema_name, 'django_migrations'):
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('users', '0001_initial', NOW())
                """)
                
                # Also add the 0002_userprofile_metadata migration if it doesn't exist
                cursor.execute("""
                    SELECT id FROM django_migrations 
                    WHERE app = 'users' AND name = '0002_userprofile_metadata'
                """)
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied) 
                        VALUES ('users', '0002_userprofile_metadata', NOW())
                    """)
            
            logger.info(f"Successfully created users_userprofile table in schema {schema_name}")
            return True
    except Exception as e:
        logger.error(f"Error creating users_userprofile table: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Fix the users_userprofile table in a tenant schema')
    parser.add_argument('schema_name', help='Name of the schema to fix (tenant_* or public)')
    args = parser.parse_args()
    
    schema_name = args.schema_name
    
    # Validate schema name format
    if schema_name != 'public' and not schema_name.startswith('tenant_'):
        logger.error(f"Invalid schema name format: {schema_name}. Schema name must be 'public' or start with 'tenant_'")
        sys.exit(1)
    
    # Create the users_userprofile table
    if create_userprofile_table(schema_name):
        logger.info(f"Successfully fixed users_userprofile table in schema {schema_name}")
    else:
        logger.error(f"Failed to fix users_userprofile table in schema {schema_name}")
        sys.exit(1)

if __name__ == "__main__":
    main()