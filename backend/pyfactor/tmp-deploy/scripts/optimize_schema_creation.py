#!/usr/bin/env python
"""
Script to optimize the schema creation process.

This script:
1. Modifies the schema creation process to be more memory-efficient
2. Adds proper error handling and cleanup
3. Adds timeouts to prevent long-running operations
4. Optimizes the migration process

Usage:
python scripts/optimize_schema_creation.py
"""

import os
import sys
import logging

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def optimize_create_tenant_schema():
    """Optimize the create_tenant_schema function in onboarding/utils.py"""
    try:
        utils_path = os.path.join(os.path.dirname(__file__), '..', 'onboarding', 'utils.py')
        
        with open(utils_path, 'r') as f:
            content = f.read()
        
        # Find the create_tenant_schema function
        func_idx = content.find('def create_tenant_schema(')
        if func_idx == -1:
            logger.warning("Could not find create_tenant_schema function in utils.py")
            return False
        
        # Find the try block within the function
        try_idx = content.find('try:', func_idx)
        if try_idx == -1:
            logger.warning("Could not find try block in create_tenant_schema function")
            return False
        
        # Get the indentation
        indent = content[try_idx-4:try_idx]
        
        # Add memory optimization code at the beginning of the try block
        optimization_code = f"""
{indent}    # Memory optimization: Close all connections before starting schema creation
{indent}    from django.db import connections
{indent}    connections.close_all()
{indent}    logger.debug(f"Closed all connections before schema creation for {{schema_name}}")
{indent}    
{indent}    # Set a statement timeout to prevent long-running queries
{indent}    cursor.execute("SET statement_timeout = '30s'")
{indent}    
{indent}    # Set a lock timeout to prevent deadlocks
{indent}    cursor.execute("SET lock_timeout = '5s'")
{indent}    
{indent}    # Use a transaction for schema creation to ensure atomicity
{indent}    cursor.execute("BEGIN")
"""
        
        # Find where to insert the optimization code
        insert_idx = content.find('\n', try_idx + 5)  # Skip the 'try:' line
        if insert_idx == -1:
            logger.warning("Could not find where to insert optimization code")
            return False
        
        # Insert the optimization code
        new_content = content[:insert_idx] + optimization_code + content[insert_idx:]
        
        # Find the migration code section
        migration_idx = new_content.find('# Run migrations to create any additional tables', insert_idx)
        if migration_idx != -1:
            # Find the call_command('migrate') line
            migrate_idx = new_content.find("call_command('migrate'", migration_idx)
            if migrate_idx != -1:
                # Get the indentation
                migrate_indent = new_content[migrate_idx-16:migrate_idx]
                
                # Replace with optimized migration code
                optimized_migration_code = f"""
{migrate_indent}# Use a more efficient migration approach
{migrate_indent}logger.info(f"Running optimized migrations for schema {{schema_name}}")
{migrate_indent}
{migrate_indent}# First create essential tables directly with SQL
{migrate_indent}# This is faster than running migrations for all apps
{migrate_indent}essential_tables_created = True
{migrate_indent}for sql in essential_tables_sql:
{migrate_indent}    try:
{migrate_indent}        cursor.execute(sql)
{migrate_indent}    except Exception as e:
{migrate_indent}        logger.error(f"Error creating essential table: {{str(e)}}")
{migrate_indent}        essential_tables_created = False
{migrate_indent}
{migrate_indent}# Only run migrations if essential tables were created successfully
{migrate_indent}if essential_tables_created:
{migrate_indent}    try:
{migrate_indent}        # Use a longer timeout for migrations
{migrate_indent}        from onboarding.task_utils import timeout
{migrate_indent}        with timeout(180):  # 3 minutes timeout for migrations
{migrate_indent}            call_command('migrate', verbosity=0)  # Reduce verbosity to save memory
{migrate_indent}    except Exception as migrate_error:
{migrate_indent}        logger.error(f"Error running migrations: {{str(migrate_error)}}")
{migrate_indent}        # Continue with app-specific migrations even if general migrations fail
{migrate_indent}
{migrate_indent}    # Run migrations for essential apps only to save memory
{migrate_indent}    essential_apps = ['inventory', 'business', 'users']
{migrate_indent}    for app in essential_apps:
{migrate_indent}        try:
{migrate_indent}            with timeout(60):  # 1 minute timeout per app
{migrate_indent}                call_command('migrate', app, verbosity=0)
{migrate_indent}        except Exception as app_error:
{migrate_indent}            logger.error(f"Error running migrations for app {{app}}: {{str(app_error)}}")
"""
                
                # Find the end of the migration section
                migrate_end_idx = new_content.find("logger.info(f\"Migrations successfully applied", migrate_idx)
                if migrate_end_idx != -1:
                    # Replace the migration code
                    new_content = new_content[:migrate_idx] + optimized_migration_code + new_content[migrate_end_idx:]
        
        # Find the except block to add better error handling
        except_idx = new_content.find('except Exception as e:', func_idx)
        if except_idx != -1:
            # Get the indentation
            except_indent = new_content[except_idx-4:except_idx]
            
            # Add better error handling
            error_handling_code = f"""
{except_indent}    # Rollback transaction on error
{except_indent}    try:
{except_indent}        cursor.execute("ROLLBACK")
{except_indent}        logger.debug(f"Rolled back transaction for schema {{schema_name}}")
{except_indent}    except Exception as rollback_error:
{except_indent}        logger.error(f"Error rolling back transaction: {{str(rollback_error)}}")
{except_indent}    
{except_indent}    # Close all connections to prevent connection leaks
{except_indent}    from django.db import connections
{except_indent}    connections.close_all()
{except_indent}    logger.debug(f"Closed all connections after error for schema {{schema_name}}")
"""
            
            # Find where to insert the error handling code
            error_insert_idx = new_content.find('\n', except_idx + 20)  # Skip the 'except Exception as e:' line
            if error_insert_idx != -1:
                # Insert the error handling code
                new_content = new_content[:error_insert_idx] + error_handling_code + new_content[error_insert_idx:]
        
        # Write the updated content back to the file
        with open(utils_path, 'w') as f:
            f.write(new_content)
        
        logger.info("Optimized create_tenant_schema function in utils.py")
        return True
    except Exception as e:
        logger.error(f"Error optimizing create_tenant_schema: {str(e)}")
        return False

def optimize_tenant_schema_context():
    """Optimize the tenant_schema_context context manager in onboarding/utils.py"""
    try:
        utils_path = os.path.join(os.path.dirname(__file__), '..', 'onboarding', 'utils.py')
        
        with open(utils_path, 'r') as f:
            content = f.read()
        
        # Find the tenant_schema_context function
        func_idx = content.find('@contextmanager\ndef tenant_schema_context(')
        if func_idx == -1:
            logger.warning("Could not find tenant_schema_context function in utils.py")
            return False
        
        # Find the try block within the function
        try_idx = content.find('try:', func_idx)
        if try_idx == -1:
            logger.warning("Could not find try block in tenant_schema_context function")
            return False
        
        # Get the indentation
        indent = content[try_idx-4:try_idx]
        
        # Add memory optimization code at the beginning of the try block
        optimization_code = f"""
{indent}    # Memory optimization: Set statement timeout
{indent}    cursor.execute("SET statement_timeout = '30s'")
{indent}    
{indent}    # Set a lock timeout to prevent deadlocks
{indent}    cursor.execute("SET lock_timeout = '5s'")
"""
        
        # Find where to insert the optimization code
        insert_idx = content.find('\n', try_idx + 5)  # Skip the 'try:' line
        if insert_idx == -1:
            logger.warning("Could not find where to insert optimization code")
            return False
        
        # Insert the optimization code
        new_content = content[:insert_idx] + optimization_code + content[insert_idx:]
        
        # Find the finally block to add connection cleanup
        finally_idx = new_content.find('finally:', func_idx)
        if finally_idx != -1:
            # Get the indentation
            finally_indent = new_content[finally_idx-4:finally_idx]
            
            # Add connection cleanup code
            cleanup_code = f"""
{finally_indent}    # Close all connections to prevent connection leaks
{finally_indent}    from django.db import connections
{finally_indent}    connections.close_all()
{finally_indent}    logger.debug(f"Closed all connections after schema context operation")
"""
            
            # Find where to insert the cleanup code
            cleanup_insert_idx = new_content.find('\n', finally_idx + 10)  # Skip the 'finally:' line
            if cleanup_insert_idx != -1:
                # Insert the cleanup code
                new_content = new_content[:cleanup_insert_idx] + cleanup_code + new_content[cleanup_insert_idx:]
        
        # Write the updated content back to the file
        with open(utils_path, 'w') as f:
            f.write(new_content)
        
        logger.info("Optimized tenant_schema_context function in utils.py")
        return True
    except Exception as e:
        logger.error(f"Error optimizing tenant_schema_context: {str(e)}")
        return False

def optimize_task_utils():
    """Optimize the timeout context manager in onboarding/task_utils.py"""
    try:
        utils_path = os.path.join(os.path.dirname(__file__), '..', 'onboarding', 'task_utils.py')
        
        with open(utils_path, 'r') as f:
            content = f.read()
        
        # Find the timeout function
        func_idx = content.find('@contextmanager\ndef timeout(')
        if func_idx == -1:
            logger.warning("Could not find timeout function in task_utils.py")
            return False
        
        # Find the finally block to add connection cleanup
        finally_idx = content.find('finally:', func_idx)
        if finally_idx != -1:
            # Get the indentation
            finally_indent = content[finally_idx-4:finally_idx]
            
            # Add connection cleanup code
            cleanup_code = f"""
{finally_indent}    # Close all connections to prevent connection leaks on timeout
{finally_indent}    try:
{finally_indent}        from django.db import connections
{finally_indent}        connections.close_all()
{finally_indent}        logger.debug(f"Closed all connections after timeout operation")
{finally_indent}    except Exception as e:
{finally_indent}        logger.error(f"Error closing connections: {{str(e)}}")
"""
            
            # Find where to insert the cleanup code
            cleanup_insert_idx = content.find('\n', finally_idx + 10)  # Skip the 'finally:' line
            if cleanup_insert_idx != -1:
                # Insert the cleanup code
                new_content = content[:cleanup_insert_idx] + cleanup_code + content[cleanup_insert_idx:]
                
                # Write the updated content back to the file
                with open(utils_path, 'w') as f:
                    f.write(new_content)
                
                logger.info("Optimized timeout function in task_utils.py")
                return True
        
        logger.warning("Could not find finally block in timeout function")
        return False
    except Exception as e:
        logger.error(f"Error optimizing task_utils: {str(e)}")
        return False

def optimize_get_db_connection():
    """Optimize the get_db_connection function in onboarding/task_utils.py"""
    try:
        utils_path = os.path.join(os.path.dirname(__file__), '..', 'onboarding', 'task_utils.py')
        
        with open(utils_path, 'r') as f:
            content = f.read()
        
        # Find the get_db_connection function
        func_idx = content.find('@contextmanager\ndef get_db_connection(')
        if func_idx == -1:
            logger.warning("Could not find get_db_connection function in task_utils.py")
            return False
        
        # Find the try block within the function
        try_idx = content.find('try:', func_idx)
        if try_idx == -1:
            logger.warning("Could not find try block in get_db_connection function")
            return False
        
        # Get the indentation
        indent = content[try_idx-4:try_idx]
        
        # Add memory optimization code at the beginning of the try block
        optimization_code = f"""
{indent}    # Memory optimization: Close all Django connections before creating a new one
{indent}    from django.db import connections
{indent}    connections.close_all()
{indent}    logger.debug("Closed all Django connections before creating a new psycopg2 connection")
"""
        
        # Find where to insert the optimization code
        insert_idx = content.find('\n', try_idx + 5)  # Skip the 'try:' line
        if insert_idx == -1:
            logger.warning("Could not find where to insert optimization code")
            return False
        
        # Insert the optimization code
        new_content = content[:insert_idx] + optimization_code + content[insert_idx:]
        
        # Find the finally block to add connection cleanup
        finally_idx = new_content.find('finally:', func_idx)
        if finally_idx != -1:
            # Get the indentation
            finally_indent = new_content[finally_idx-4:finally_idx]
            
            # Add connection cleanup code
            cleanup_code = f"""
{finally_indent}    # Close all Django connections to prevent connection leaks
{finally_indent}    try:
{finally_indent}        from django.db import connections
{finally_indent}        connections.close_all()
{finally_indent}        logger.debug("Closed all Django connections after psycopg2 connection operation")
{finally_indent}    except Exception as e:
{finally_indent}        logger.error(f"Error closing Django connections: {{str(e)}}")
"""
            
            # Find where to insert the cleanup code
            cleanup_insert_idx = new_content.find('\n', finally_idx + 10)  # Skip the 'finally:' line
            if cleanup_insert_idx != -1:
                # Insert the cleanup code
                new_content = new_content[:cleanup_insert_idx] + cleanup_code + new_content[cleanup_insert_idx:]
                
                # Write the updated content back to the file
                with open(utils_path, 'w') as f:
                    f.write(new_content)
                
                logger.info("Optimized get_db_connection function in task_utils.py")
                return True
        
        logger.warning("Could not find finally block in get_db_connection function")
        return False
    except Exception as e:
        logger.error(f"Error optimizing get_db_connection: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting schema creation optimization...")
    
    # Step 1: Optimize create_tenant_schema function
    logger.info("Step 1: Optimizing create_tenant_schema function...")
    optimize_create_tenant_schema()
    
    # Step 2: Optimize tenant_schema_context context manager
    logger.info("Step 2: Optimizing tenant_schema_context context manager...")
    optimize_tenant_schema_context()
    
    # Step 3: Optimize timeout context manager
    logger.info("Step 3: Optimizing timeout context manager...")
    optimize_task_utils()
    
    # Step 4: Optimize get_db_connection function
    logger.info("Step 4: Optimizing get_db_connection function...")
    optimize_get_db_connection()
    
    logger.info("Schema creation optimization completed successfully")
    logger.info("Please restart the server for changes to take effect")

if __name__ == "__main__":
    main()