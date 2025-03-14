#!/usr/bin/env python
"""
Script to fix memory issues with tenant schema creation.

This script:
1. Optimizes database connection handling
2. Limits the number of concurrent connections
3. Cleans up any incomplete/corrupted schemas
4. Adds proper connection pooling configuration

Usage:
python scripts/fix_memory_issue.py
"""

import os
import sys
import logging
import psycopg2
import time
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings
from django.db import connections
from custom_auth.models import Tenant
from users.models import UserProfile

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
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn

def list_tenant_schemas():
    """List all tenant schemas in the database"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name LIKE 'tenant_%'
            """)
            schemas = [row[0] for row in cursor.fetchall()]
            return schemas
    except Exception as e:
        logger.error(f"Error listing tenant schemas: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def check_schema_health(schema_name):
    """Check if a schema is healthy (has required tables)"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to the schema
            cursor.execute(f'SET search_path TO "{schema_name}"')
            
            # Check if essential tables exist
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_name IN ('inventory_product', 'inventory_category')
            """, [schema_name])
            
            table_count = cursor.fetchone()[0]
            return table_count >= 2  # At least 2 essential tables should exist
    except Exception as e:
        logger.error(f"Error checking schema health for {schema_name}: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def drop_schema(schema_name):
    """Drop a schema from the database"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            logger.info(f"Dropped schema: {schema_name}")
            return True
    except Exception as e:
        logger.error(f"Error dropping schema {schema_name}: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def clean_up_corrupted_schemas():
    """Clean up corrupted or incomplete schemas"""
    schemas = list_tenant_schemas()
    logger.info(f"Found {len(schemas)} tenant schemas")
    
    corrupted_count = 0
    for schema in schemas:
        if not check_schema_health(schema):
            logger.warning(f"Schema {schema} appears to be corrupted or incomplete")
            if drop_schema(schema):
                corrupted_count += 1
    
    logger.info(f"Cleaned up {corrupted_count} corrupted schemas")
    return corrupted_count

def update_connection_pool_settings():
    """Update connection pool settings in settings.py"""
    try:
        settings_path = os.path.join(os.path.dirname(__file__), '..', 'pyfactor', 'settings.py')
        
        with open(settings_path, 'r') as f:
            content = f.read()
        
        # Update connection pool settings
        if 'DATABASE_CONNECTION_POOL' in content:
            # Find the DATABASE_CONNECTION_POOL section
            start_idx = content.find('DATABASE_CONNECTION_POOL = {')
            if start_idx != -1:
                # Find the end of the dictionary
                end_idx = content.find('}', start_idx)
                if end_idx != -1:
                    # Extract the dictionary
                    pool_settings = content[start_idx:end_idx+1]
                    
                    # Create updated settings
                    updated_settings = """DATABASE_CONNECTION_POOL = {
    'MAX_CONNS': 20,          # Reduced to prevent connection exhaustion
    'MIN_CONNS': 5,           # Reduced to match MAX_CONNS reduction
    'CONN_LIFETIME': 60,      # Reduced to 1 minute to recycle connections more frequently
    'CONN_TIMEOUT': 10,       # Reduced timeout
    'MAX_QUERIES_PER_CONN': 500,
    'SCHEMA_CACHE_TTL': 300,  # 5 minutes cache for schema names
}"""
                    
                    # Replace the old settings with the new ones
                    new_content = content.replace(pool_settings, updated_settings)
                    
                    # Write the updated content back to the file
                    with open(settings_path, 'w') as f:
                        f.write(new_content)
                    
                    logger.info("Updated DATABASE_CONNECTION_POOL settings")
        
        # Update MAX_DB_CONNECTIONS
        if 'MAX_DB_CONNECTIONS = ' in content:
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.strip().startswith('MAX_DB_CONNECTIONS = '):
                    lines[i] = 'MAX_DB_CONNECTIONS = 20  # Reduced from 50 to prevent connection exhaustion'
                    break
            
            # Write the updated content back to the file
            with open(settings_path, 'w') as f:
                f.write('\n'.join(lines))
            
            logger.info("Updated MAX_DB_CONNECTIONS setting")
        
        return True
    except Exception as e:
        logger.error(f"Error updating connection pool settings: {str(e)}")
        return False

def optimize_tenant_middleware():
    """Optimize the tenant middleware to reduce memory usage"""
    try:
        middleware_path = os.path.join(os.path.dirname(__file__), '..', 'custom_auth', 'tenant_middleware.py')
        
        with open(middleware_path, 'r') as f:
            content = f.read()
        
        # Add connection cleanup to the middleware
        if 'def __call__(self, request):' in content and 'finally:' in content:
            # Find the finally block
            finally_idx = content.find('finally:')
            if finally_idx != -1:
                # Find the end of the finally block
                indent = content[finally_idx-4:finally_idx]  # Get the indentation
                
                # Add connection cleanup code
                cleanup_code = f"""
{indent}    # Close all database connections to prevent connection leaks
{indent}    for conn in connections.all():
{indent}        conn.close()
{indent}    logger.debug("Closed all database connections")
"""
                
                # Find where to insert the cleanup code
                insert_idx = content.find('\n', finally_idx + 10)  # Skip the 'finally:' line
                if insert_idx != -1:
                    # Insert the cleanup code
                    new_content = content[:insert_idx] + cleanup_code + content[insert_idx:]
                    
                    # Write the updated content back to the file
                    with open(middleware_path, 'w') as f:
                        f.write(new_content)
                    
                    logger.info("Added connection cleanup to tenant middleware")
        
        return True
    except Exception as e:
        logger.error(f"Error optimizing tenant middleware: {str(e)}")
        return False

def optimize_schema_creation():
    """Optimize the schema creation process in onboarding/utils.py"""
    try:
        utils_path = os.path.join(os.path.dirname(__file__), '..', 'onboarding', 'utils.py')
        
        with open(utils_path, 'r') as f:
            content = f.read()
        
        # Add memory optimization to create_tenant_schema function
        if 'def create_tenant_schema(' in content:
            # Find the function
            func_idx = content.find('def create_tenant_schema(')
            if func_idx != -1:
                # Find the try block
                try_idx = content.find('try:', func_idx)
                if try_idx != -1:
                    # Get the indentation
                    indent = content[try_idx-4:try_idx]
                    
                    # Add memory optimization code
                    optimization_code = f"""
{indent}    # Memory optimization: Close all connections before starting schema creation
{indent}    from django.db import connections
{indent}    connections.close_all()
{indent}    logger.debug("Closed all connections before schema creation")
{indent}    
{indent}    # Set a statement timeout to prevent long-running queries
{indent}    cursor.execute("SET statement_timeout = '30s'")
"""
                    
                    # Find where to insert the optimization code
                    insert_idx = content.find('\n', try_idx + 5)  # Skip the 'try:' line
                    if insert_idx != -1:
                        # Insert the optimization code
                        new_content = content[:insert_idx] + optimization_code + content[insert_idx:]
                        
                        # Write the updated content back to the file
                        with open(utils_path, 'w') as f:
                            f.write(new_content)
                        
                        logger.info("Added memory optimization to create_tenant_schema function")
        
        return True
    except Exception as e:
        logger.error(f"Error optimizing schema creation: {str(e)}")
        return False

def fix_tenant_model():
    """Fix the Tenant model to properly handle schema creation"""
    try:
        # Update all tenants with setup_status='error' to 'pending'
        tenants = Tenant.objects.filter(setup_status='error')
        count = tenants.count()
        
        if count > 0:
            tenants.update(setup_status='pending', setup_error_message='Reset by fix_memory_issue.py')
            logger.info(f"Reset {count} tenants from 'error' to 'pending' status")
        
        # Update all tenants with database_status='not_created' to ensure they have a schema_name
        tenants = Tenant.objects.filter(database_status='not_created', schema_name='')
        for tenant in tenants:
            if not tenant.schema_name:
                tenant.schema_name = f"tenant_{str(tenant.id).replace('-', '_')}"
                tenant.save(update_fields=['schema_name'])
                logger.info(f"Set schema_name for tenant {tenant.id} to {tenant.schema_name}")
        
        return True
    except Exception as e:
        logger.error(f"Error fixing tenant model: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting memory issue fix...")
    
    # Step 1: Clean up corrupted schemas
    logger.info("Step 1: Cleaning up corrupted schemas...")
    clean_up_corrupted_schemas()
    
    # Step 2: Update connection pool settings
    logger.info("Step 2: Updating connection pool settings...")
    update_connection_pool_settings()
    
    # Step 3: Optimize tenant middleware
    logger.info("Step 3: Optimizing tenant middleware...")
    optimize_tenant_middleware()
    
    # Step 4: Optimize schema creation
    logger.info("Step 4: Optimizing schema creation...")
    optimize_schema_creation()
    
    # Step 5: Fix tenant model
    logger.info("Step 5: Fixing tenant model...")
    fix_tenant_model()
    
    logger.info("Memory issue fix completed successfully")
    logger.info("Please restart the server for changes to take effect")

if __name__ == "__main__":
    main()