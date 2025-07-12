#!/usr/bin/env python
"""
Script to optimize database connection handling.

This script:
1. Adds connection pooling optimizations
2. Adds connection cleanup
3. Limits the number of concurrent connections
4. Adds connection timeout settings

Usage:
python scripts/optimize_connection_handling.py
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

def update_connection_limiter():
    """Update the connection limiter middleware to reduce max connections"""
    try:
        limiter_path = os.path.join(os.path.dirname(__file__), '..', 'custom_auth', 'connection_limiter.py')
        
        with open(limiter_path, 'r') as f:
            content = f.read()
        
        # Update MAX_CONNECTIONS
        if 'MAX_CONNECTIONS = getattr(settings, \'MAX_DB_CONNECTIONS\', 50)' in content:
            new_content = content.replace(
                'MAX_CONNECTIONS = getattr(settings, \'MAX_DB_CONNECTIONS\', 50)',
                'MAX_CONNECTIONS = getattr(settings, \'MAX_DB_CONNECTIONS\', 20)  # Reduced from 50 to prevent connection exhaustion'
            )
            
            with open(limiter_path, 'w') as f:
                f.write(new_content)
            
            logger.info("Updated MAX_CONNECTIONS in connection_limiter.py")
            return True
        else:
            logger.warning("Could not find MAX_CONNECTIONS in connection_limiter.py")
            return False
    except Exception as e:
        logger.error(f"Error updating connection limiter: {str(e)}")
        return False

def update_connection_pool():
    """Update the connection pool to optimize connection handling"""
    try:
        pool_path = os.path.join(os.path.dirname(__file__), '..', 'custom_auth', 'connection_pool.py')
        
        with open(pool_path, 'r') as f:
            content = f.read()
        
        # Update DEFAULT_POOL_CONFIG
        if 'DEFAULT_POOL_CONFIG = {' in content:
            start_idx = content.find('DEFAULT_POOL_CONFIG = {')
            if start_idx != -1:
                # Find the end of the dictionary
                end_idx = content.find('}', start_idx)
                if end_idx != -1:
                    # Extract the dictionary
                    pool_config = content[start_idx:end_idx+1]
                    
                    # Create updated config
                    updated_config = """DEFAULT_POOL_CONFIG = {
    'max_connections': 20,  # Reduced from 50 to prevent connection exhaustion
    'min_connections': 5,
    'connection_lifetime': 60,  # Reduced to 1 minute to recycle connections more frequently
    'idle_timeout': 30,  # Reduced to 30 seconds
}"""
                    
                    # Replace the old config with the new one
                    new_content = content.replace(pool_config, updated_config)
                    
                    # Write the updated content back to the file
                    with open(pool_path, 'w') as f:
                        f.write(new_content)
                    
                    logger.info("Updated DEFAULT_POOL_CONFIG in connection_pool.py")
                    return True
        
        logger.warning("Could not find DEFAULT_POOL_CONFIG in connection_pool.py")
        return False
    except Exception as e:
        logger.error(f"Error updating connection pool: {str(e)}")
        return False

def add_connection_cleanup_to_middleware():
    """Add connection cleanup to middleware to prevent connection leaks"""
    try:
        middleware_path = os.path.join(os.path.dirname(__file__), '..', 'custom_auth', 'middleware.py')
        
        with open(middleware_path, 'r') as f:
            content = f.read()
        
        # Check if the file contains the TenantMiddleware class
        if 'class TenantMiddleware:' in content:
            # Find the __call__ method
            call_idx = content.find('def __call__(self, request):')
            if call_idx != -1:
                # Find the finally block or create one if it doesn't exist
                finally_idx = content.find('finally:', call_idx)
                
                if finally_idx != -1:
                    # Find where to insert the cleanup code
                    indent = content[finally_idx-4:finally_idx]  # Get the indentation
                    
                    # Add connection cleanup code
                    cleanup_code = f"""
{indent}    # Close all database connections to prevent connection leaks
{indent}    from django.db import connections
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
                        
                        logger.info("Added connection cleanup to TenantMiddleware")
                        return True
                else:
                    # Find the end of the __call__ method to add a finally block
                    # This is more complex and would require parsing the Python code structure
                    logger.warning("Could not find finally block in TenantMiddleware.__call__")
                    return False
            else:
                logger.warning("Could not find __call__ method in TenantMiddleware")
                return False
        else:
            logger.warning("Could not find TenantMiddleware class in middleware.py")
            return False
    except Exception as e:
        logger.error(f"Error adding connection cleanup to middleware: {str(e)}")
        return False

def optimize_db_router():
    """Optimize the database router to reduce connection cache size"""
    try:
        router_path = os.path.join(os.path.dirname(__file__), '..', 'pyfactor', 'db_routers.py')
        
        with open(router_path, 'r') as f:
            content = f.read()
        
        # Add a cache size limit to the connection cache
        if 'connection_cache = {}' in content:
            new_content = content.replace(
                'connection_cache = {}',
                '# Limit connection cache size to prevent memory issues\nconnection_cache = {}\nMAX_CACHE_SIZE = 10'
            )
            
            # Also modify the _get_optimized_connection method to check cache size
            if '_get_optimized_connection' in content:
                method_idx = content.find('def _get_optimized_connection')
                if method_idx != -1:
                    # Find where the connection is cached
                    cache_idx = content.find('connection_cache[cache_key] = connection', method_idx)
                    if cache_idx != -1:
                        # Get the indentation
                        indent = content[cache_idx-8:cache_idx]  # Get the indentation
                        
                        # Add cache size check code
                        cache_check_code = f"""
{indent}# Check if cache is too large and remove oldest entries if needed
{indent}if len(connection_cache) >= MAX_CACHE_SIZE:
{indent}    # Remove the first item (oldest) from the cache
{indent}    oldest_key = next(iter(connection_cache))
{indent}    del connection_cache[oldest_key]
{indent}    logger.debug(f"Removed oldest connection from cache: {{oldest_key}}")
{indent}"""
                        
                        # Insert the cache check code before caching the connection
                        new_content = new_content[:cache_idx] + cache_check_code + new_content[cache_idx:]
                        
                        # Write the updated content back to the file
                        with open(router_path, 'w') as f:
                            f.write(new_content)
                        
                        logger.info("Optimized connection cache in db_routers.py")
                        return True
        
        logger.warning("Could not find connection_cache in db_routers.py")
        return False
    except Exception as e:
        logger.error(f"Error optimizing db router: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting connection handling optimization...")
    
    # Step 1: Update connection limiter
    logger.info("Step 1: Updating connection limiter...")
    update_connection_limiter()
    
    # Step 2: Update connection pool
    logger.info("Step 2: Updating connection pool...")
    update_connection_pool()
    
    # Step 3: Add connection cleanup to middleware
    logger.info("Step 3: Adding connection cleanup to middleware...")
    add_connection_cleanup_to_middleware()
    
    # Step 4: Optimize database router
    logger.info("Step 4: Optimizing database router...")
    optimize_db_router()
    
    logger.info("Connection handling optimization completed successfully")
    logger.info("Please restart the server for changes to take effect")

if __name__ == "__main__":
    main()
