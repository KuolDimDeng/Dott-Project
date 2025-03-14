#!/usr/bin/env python
"""
Script to create a tenant record for an existing schema.

This script will:
1. Check if the schema exists
2. Create a tenant record if it doesn't exist
3. Run migrations on the schema

Usage:
python scripts/create_tenant_for_schema.py <schema_name> [--owner-email <email>]

Example:
python scripts/create_tenant_for_schema.py tenant_a5d09fbf-796e-48f5-b7c7-06b48a9ea119 --owner-email admin@example.com
"""

import os
import sys
import logging
import argparse
import uuid
import psycopg2
from psycopg2 import sql

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.core.management import call_command
from django.db import connections, connection, transaction
from django.conf import settings
from custom_auth.models import Tenant, User
from custom_auth.tasks import migrate_tenant_schema

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

def count_tables_in_schema(schema_name):
    """Count tables in the schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = %s
            """, [schema_name])
            return cursor.fetchone()[0]
    except Exception as e:
        logger.error(f"Error counting tables: {str(e)}")
        return 0
    finally:
        if conn:
            conn.close()

def create_tenant_for_schema(schema_name, owner_email=None):
    """Create a tenant record for an existing schema"""
    try:
        # Check if schema exists
        if not schema_exists(schema_name):
            logger.error(f"Schema {schema_name} does not exist")
            return False
        
        # Check if schema name follows the expected pattern
        if not schema_name.startswith('tenant_'):
            logger.error(f"Schema name {schema_name} does not start with 'tenant_'")
            return False
        
        # Extract tenant ID from schema name
        tenant_id_str = schema_name[7:]  # Remove 'tenant_' prefix
        tenant_id_str = tenant_id_str.replace('_', '-')  # Replace underscores with hyphens
        
        try:
            tenant_id = uuid.UUID(tenant_id_str)
            logger.info(f"Extracted tenant ID: {tenant_id}")
        except ValueError:
            logger.error(f"Invalid tenant ID format: {tenant_id_str}")
            return False
        
        # Check if tenant already exists
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            logger.info(f"Tenant already exists: {tenant.name} (ID: {tenant.id})")
            return True
        except Tenant.DoesNotExist:
            logger.info(f"Tenant with ID {tenant_id} does not exist, creating it")
        
        # Find or create owner
        owner = None
        if owner_email:
            try:
                owner = User.objects.get(email=owner_email)
                logger.info(f"Found owner: {owner.email} (ID: {owner.id})")
            except User.DoesNotExist:
                logger.warning(f"User with email {owner_email} does not exist")
                logger.info("Looking for any admin user to set as owner")
                
                # Try to find an admin user
                admin_users = User.objects.filter(is_staff=True)
                if admin_users.exists():
                    owner = admin_users.first()
                    logger.info(f"Using admin user as owner: {owner.email} (ID: {owner.id})")
                else:
                    # Try to find any user
                    users = User.objects.all()
                    if users.exists():
                        owner = users.first()
                        logger.info(f"Using first available user as owner: {owner.email} (ID: {owner.id})")
                    else:
                        logger.error("No users found in the database")
                        return False
        else:
            # Try to find an admin user
            admin_users = User.objects.filter(is_staff=True)
            if admin_users.exists():
                owner = admin_users.first()
                logger.info(f"Using admin user as owner: {owner.email} (ID: {owner.id})")
            else:
                # Try to find any user
                users = User.objects.all()
                if users.exists():
                    owner = users.first()
                    logger.info(f"Using first available user as owner: {owner.email} (ID: {owner.id})")
                else:
                    logger.error("No users found in the database")
                    return False
        
        # Create tenant record
        with transaction.atomic():
            tenant = Tenant.objects.create(
                id=tenant_id,
                schema_name=schema_name,
                name=f"{owner.email}'s Workspace",
                owner=owner,
                database_status='pending',
                setup_status='in_progress',
                is_active=True
            )
            logger.info(f"Created tenant record: {tenant.name} (ID: {tenant.id})")
            
            # Associate tenant with owner
            owner.tenant = tenant
            owner.save(update_fields=['tenant'])
            logger.info(f"Associated tenant with owner: {owner.email}")
        
        # Count tables in schema
        table_count = count_tables_in_schema(schema_name)
        logger.info(f"Schema {schema_name} has {table_count} tables")
        
        # Run migrations if schema has no tables
        if table_count == 0:
            logger.info(f"Running migrations for schema {schema_name}")
            
            # Trigger async migration
            migrate_tenant_schema.delay(str(tenant_id))
            logger.info(f"Migration task triggered for tenant {tenant_id}")
        else:
            # Update tenant status
            tenant.database_status = 'active'
            tenant.save(update_fields=['database_status'])
            logger.info(f"Updated tenant status to 'active'")
        
        return True
    except Exception as e:
        logger.error(f"Error creating tenant for schema {schema_name}: {str(e)}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Create a tenant record for an existing schema')
    parser.add_argument('schema_name', help='Name of the schema to create a tenant for')
    parser.add_argument('--owner-email', help='Email of the user to set as owner')
    args = parser.parse_args()
    
    schema_name = args.schema_name
    owner_email = args.owner_email
    
    # Create tenant for schema
    if create_tenant_for_schema(schema_name, owner_email):
        logger.info(f"Successfully created tenant for schema {schema_name}")
    else:
        logger.error(f"Failed to create tenant for schema {schema_name}")
        sys.exit(1)

if __name__ == "__main__":
    main()