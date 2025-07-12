#!/usr/bin/env python
"""
Database Tenant Synchronization Script
--------------------------------------
Synchronizes tenant data between Django (AWS RDS) and Next.js (local) databases.
This helps maintain consistency between the two database environments.
"""

import os
import sys
import uuid
import json
import psycopg2
import datetime
from psycopg2.extras import DictCursor, Json

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Use Django settings if available
try:
    import django
    django.setup()
    from django.conf import settings
    from django.db import connections
    from custom_auth.models import Tenant
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False

# Database configuration
LOCAL_DB = {
    'dbname': 'dott_main',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost',
    'port': 5432,
}

# Get AWS RDS settings from Django if available
if DJANGO_AVAILABLE and hasattr(settings, 'DATABASES') and 'default' in settings.DATABASES:
    DJANGO_DB = {
        'dbname': settings.DATABASES['default'].get('NAME', 'dott_main'),
        'user': settings.DATABASES['default'].get('USER', 'postgres'),
        'password': settings.DATABASES['default'].get('PASSWORD', 'postgres'),
        'host': settings.DATABASES['default'].get('HOST', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
        'port': settings.DATABASES['default'].get('PORT', 5432),
    }
else:
    # Fallback settings
    DJANGO_DB = {
        'dbname': 'dott_main',
        'user': 'postgres',
        'password': 'postgres',
        'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
        'port': 5432,
    }


def get_connection(db_config, cursor_factory=None):
    """Get a database connection with the given configuration"""
    conn_params = db_config.copy()
    if cursor_factory:
        return psycopg2.connect(**conn_params, cursor_factory=cursor_factory)
    return psycopg2.connect(**conn_params)


def get_tenants_from_db(db_config, as_dict=False):
    """Fetch all tenants from a database"""
    cursor_factory = DictCursor if as_dict else None
    
    with get_connection(db_config, cursor_factory) as conn:
        with conn.cursor() as cursor:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'custom_auth_tenant'
                );
            """)
            
            if not cursor.fetchone()[0]:
                print(f"Table 'custom_auth_tenant' doesn't exist in {db_config['host']}")
                return []
            
            # Fetch all tenant records
            cursor.execute("""
                SELECT id, name, owner_id, schema_name, created_at, updated_at, 
                       rls_enabled, rls_setup_date, is_active
                FROM custom_auth_tenant
                ORDER BY created_at;
            """)
            
            return cursor.fetchall()


def create_tenant_table(db_config):
    """Create tenant table if it doesn't exist"""
    with get_connection(db_config) as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
                    id UUID PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    owner_id VARCHAR(255),
                    schema_name VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    rls_enabled BOOLEAN DEFAULT TRUE,
                    rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
                    is_active BOOLEAN DEFAULT TRUE
                );
            """)
            conn.commit()
            print(f"Ensured tenant table exists in {db_config['host']}")


def sync_tenant(tenant, target_db):
    """Sync a single tenant to the target database"""
    with get_connection(target_db) as conn:
        with conn.cursor() as cursor:
            # Check if tenant exists by ID
            cursor.execute("SELECT id FROM custom_auth_tenant WHERE id = %s", (tenant[0],))
            exists = cursor.fetchone()
            
            if exists:
                # Update existing tenant
                cursor.execute("""
                    UPDATE custom_auth_tenant
                    SET name = %s, owner_id = %s, schema_name = %s, updated_at = %s,
                        rls_enabled = %s, rls_setup_date = %s, is_active = %s
                    WHERE id = %s
                """, (
                    tenant[1],  # name
                    tenant[2],  # owner_id
                    tenant[3],  # schema_name
                    tenant[5],  # updated_at
                    tenant[6],  # rls_enabled
                    tenant[7],  # rls_setup_date
                    tenant[8],  # is_active
                    tenant[0],  # id
                ))
                action = "Updated"
            else:
                # Insert new tenant
                cursor.execute("""
                    INSERT INTO custom_auth_tenant
                    (id, name, owner_id, schema_name, created_at, updated_at, 
                     rls_enabled, rls_setup_date, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, tenant)
                action = "Inserted"
            
            conn.commit()
            return action


def sync_databases(direction='both'):
    """Synchronize tenant data between databases"""
    print("\n=== Database Tenant Synchronization ===")
    print(f"Mode: {direction.upper()}")
    
    # Ensure tables exist in both databases
    create_tenant_table(LOCAL_DB)
    create_tenant_table(DJANGO_DB)
    
    # Get tenants from both databases
    local_tenants = get_tenants_from_db(LOCAL_DB)
    django_tenants = get_tenants_from_db(DJANGO_DB)
    
    print(f"\nFound {len(local_tenants)} tenants in local database")
    print(f"Found {len(django_tenants)} tenants in Django database")
    
    # Convert to dictionaries for easier comparison
    local_dict = {str(t[0]): t for t in local_tenants}
    django_dict = {str(t[0]): t for t in django_tenants}
    
    # Find tenants in each database but not the other
    local_only = set(local_dict.keys()) - set(django_dict.keys())
    django_only = set(django_dict.keys()) - set(local_dict.keys())
    
    print(f"\nTenants in local only: {len(local_only)}")
    print(f"Tenants in Django only: {len(django_only)}")
    
    # Synchronize based on direction
    changes = 0
    
    if direction in ['both', 'to-django']:
        print("\nSynchronizing local → Django...")
        for tenant_id in local_only:
            action = sync_tenant(local_dict[tenant_id], DJANGO_DB)
            print(f"  {action} tenant {tenant_id} in Django database")
            changes += 1
    
    if direction in ['both', 'to-local']:
        print("\nSynchronizing Django → local...")
        for tenant_id in django_only:
            action = sync_tenant(django_dict[tenant_id], LOCAL_DB)
            print(f"  {action} tenant {tenant_id} in local database")
            changes += 1
    
    print(f"\nSynchronization complete: {changes} changes made")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Synchronize tenant data between databases")
    parser.add_argument('--direction', choices=['both', 'to-django', 'to-local'], 
                        default='both', help="Direction of synchronization")
    
    args = parser.parse_args()
    sync_databases(args.direction)