#!/usr/bin/env python
"""
Script to reset and initialize the main database with all required public tables.

This script will:
1. Connect to the database
2. Drop and recreate all necessary public tables
3. Apply all migrations to ensure proper table structure
4. Set up proper permissions

Usage:
python scripts/reset_db_main.py [database_name] [--force]

Options:
--force: Skip confirmation prompts
"""

import os
import sys
import time
import logging
import argparse
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.core.management import call_command
from django.db import connections, connection
from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection(db_name):
    """Get a connection to the specified database with autocommit enabled"""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn

def database_exists(db_name):
    """Check if the database exists"""
    try:
        # Try to connect to the database
        conn = get_db_connection(db_name)
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        if "does not exist" in str(e):
            return False
        else:
            logger.error(f"Error checking if database exists: {str(e)}")
            raise
    except Exception as e:
        logger.error(f"Error checking if database exists: {str(e)}")
        raise

def drop_all_public_tables(db_name):
    """Drop all tables in the public schema"""
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cursor:
            # Disable foreign key checks temporarily
            cursor.execute("SET session_replication_role = 'replica';")
            
            # Get all tables in public schema
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
                AND tablename != 'spatial_ref_sys'  -- Skip PostGIS system tables
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            if tables:
                logger.info(f"Dropping {len(tables)} tables in public schema")
                
                # Drop all tables
                for table in tables:
                    try:
                        logger.info(f"Dropping table: {table}")
                        cursor.execute(sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                            sql.Identifier('public', table)
                        ))
                    except Exception as e:
                        logger.error(f"Error dropping table {table}: {str(e)}")
            else:
                logger.info("No tables found in public schema")
                
            # Re-enable foreign key checks
            cursor.execute("SET session_replication_role = 'origin';")
            
        return True
    except Exception as e:
        logger.error(f"Error dropping tables: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def recreate_and_apply_migrations(db_name):
    """Recreate all necessary tables and apply migrations"""
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cursor:
            # Create core tables needed for multi-tenant setup
            logger.info("Creating core tables for multi-tenant setup")
            
            # Create auth_tenant table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_tenant (
                    id UUID PRIMARY KEY,
                    schema_name VARCHAR(63) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    owner_id UUID NOT NULL,
                    created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    is_active BOOLEAN DEFAULT TRUE,
                    setup_status VARCHAR(50) DEFAULT 'not_started',
                    database_status VARCHAR(50) DEFAULT 'not_created',
                    last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                    last_health_check TIMESTAMP WITH TIME ZONE NULL,
                    setup_error_message TEXT NULL
                );
                CREATE INDEX IF NOT EXISTS auth_tenant_owner_id_idx ON auth_tenant(owner_id);
                CREATE INDEX IF NOT EXISTS auth_tenant_schema_name_idx ON auth_tenant(schema_name);
            """)
            
            # Create users_user table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users_user (
                    id UUID PRIMARY KEY,
                    password VARCHAR(128) NOT NULL,
                    last_login TIMESTAMP WITH TIME ZONE NULL,
                    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
                    username VARCHAR(150) NULL UNIQUE,
                    first_name VARCHAR(150) NOT NULL,
                    last_name VARCHAR(150) NOT NULL,
                    email VARCHAR(254) NOT NULL UNIQUE,
                    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    tenant_id UUID NULL REFERENCES auth_tenant(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS users_user_email_idx ON users_user(email);
                CREATE INDEX IF NOT EXISTS users_user_tenant_id_idx ON users_user(tenant_id);
            """)
            
            # Create users_userprofile table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users_userprofile (
                    id BIGSERIAL PRIMARY KEY,
                    user_id UUID NOT NULL UNIQUE REFERENCES users_user(id) ON DELETE CASCADE,
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
                    business_id UUID NULL,
                    tenant_id UUID NULL REFERENCES auth_tenant(id) ON DELETE SET NULL,
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
            
            # Create users_business table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users_business (
                    id UUID PRIMARY KEY,
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
                    owner_id UUID NULL REFERENCES users_user(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS users_business_owner_id_idx ON users_business(owner_id);
                CREATE INDEX IF NOT EXISTS users_business_business_num_idx ON users_business(business_num);
            """)
            
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
            
            # Create users_subscription table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users_subscription (
                    id SERIAL PRIMARY KEY,
                    business_id UUID NOT NULL UNIQUE REFERENCES users_business(id) ON DELETE CASCADE,
