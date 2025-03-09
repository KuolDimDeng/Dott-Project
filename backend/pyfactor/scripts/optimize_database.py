#!/usr/bin/env python
"""
Database Optimization Script

This script performs various database optimizations:
1. Applies migrations to add indexes
2. Analyzes tables for query optimization
3. Configures connection pooling
4. Cleans up stale connections
"""

import os
import sys
import time
import logging
import django
from django.db import connections, connection

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('db_optimizer')

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def apply_migrations():
    """Apply migrations to add indexes"""
    logger.info("Applying migrations...")
    start_time = time.time()
    
    from django.core.management import call_command
    call_command('migrate', 'inventory')
    
    logger.info(f"Migrations applied in {time.time() - start_time:.2f}s")

def analyze_tables():
    """Analyze tables for query optimization"""
    logger.info("Analyzing tables...")
    start_time = time.time()
    
    with connection.cursor() as cursor:
        # Get all tables in the current schema
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = current_schema()
            AND table_type = 'BASE TABLE'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        # Analyze each table
        for table in tables:
            logger.info(f"Analyzing table: {table}")
            cursor.execute(f'ANALYZE "{table}"')
    
    logger.info(f"Tables analyzed in {time.time() - start_time:.2f}s")

def configure_connection_pooling():
    """Configure connection pooling settings"""
    logger.info("Configuring connection pooling...")
    
    with connection.cursor() as cursor:
        # Set statement timeout to prevent long-running queries
        cursor.execute('SET statement_timeout = 30000')  # 30 seconds
        
        # Set work memory for better query performance
        cursor.execute('SET work_mem = "4MB"')
        
        # Set maintenance work memory for faster index creation
        cursor.execute('SET maintenance_work_mem = "64MB"')
        
        # Set effective cache size for query planning
        cursor.execute('SET effective_cache_size = "256MB"')
    
    logger.info("Connection pooling configured")

def clean_stale_connections():
    """Clean up stale connections"""
    logger.info("Cleaning stale connections...")
    
    # Close all connections
    for conn_name in connections:
        connections[conn_name].close()
    
    # Clear connection cache
    from pyfactor.db_routers import TenantSchemaRouter
    TenantSchemaRouter.clear_connection_cache()
    
    logger.info("Stale connections cleaned")

def main():
    """Main function to run all optimizations"""
    logger.info("Starting database optimization...")
    
    try:
        apply_migrations()
        analyze_tables()
        configure_connection_pooling()
        clean_stale_connections()
        logger.info("Database optimization completed successfully")
    except Exception as e:
        logger.error(f"Error during database optimization: {str(e)}", exc_info=True)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())