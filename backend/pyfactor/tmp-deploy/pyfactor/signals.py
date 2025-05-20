"""
Signal handlers for database operations
"""

import logging
import time
from django.db import connections

logger = logging.getLogger(__name__)

def handle_post_migrate(sender, **kwargs):
    """
    Signal handler for post_migrate signal
    Performs database optimization after migrations
    """
    app_config = kwargs.get('app_config')
    app_label = app_config.label if app_config else None
    
    logger.info(f"Post-migrate signal received for app: {app_label}")
    
    if app_label in ('inventory', 'sales', 'finance'):
        optimize_database_tables(app_label)

def optimize_database_tables(app_label=None):
    """
    Optimize database tables by running ANALYZE
    """
    start_time = time.time()
    connection = connections['default']
    
    try:
        with connection.cursor() as cursor:
            # Get current schema
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Optimizing tables in schema: {current_schema}")
            
            # Get tables for the app
            if app_label:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name LIKE %s
                """, [current_schema, f"{app_label}_%"])
            else:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_type = 'BASE TABLE'
                """, [current_schema])
                
            tables = [row[0] for row in cursor.fetchall()]
            
            # Analyze each table
            for table in tables:
                logger.debug(f"Analyzing table: {table}")
                cursor.execute(f'ANALYZE "{table}"')
                
        logger.info(f"Database tables optimized in {time.time() - start_time:.4f}s")
    except Exception as e:
        logger.error(f"Error optimizing database tables: {str(e)}", exc_info=True)