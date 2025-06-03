"""
Database connection handlers for applying performance settings
"""

import logging
from django.db import connections
from django.conf import settings

logger = logging.getLogger(__name__)

def apply_database_performance_settings():
    """
    Apply performance settings to database connections after they are established
    """
    try:
        # Get the default connection
        connection = connections['default']
        
        # Ensure the connection is established
        connection.ensure_connection()
        
        # Apply performance settings
        with connection.cursor() as cursor:
            # Apply statement timeout
            if hasattr(settings, 'DATABASE_PERFORMANCE_SETTINGS'):
                for setting, value in settings.DATABASE_PERFORMANCE_SETTINGS.items():
                    # Convert setting name from snake_case to kebab-case for PostgreSQL
                    pg_setting = setting.replace('_', '-')
                    
                    # Log the setting being applied
                    logger.debug(f"Applying database setting: {pg_setting}={value}")
                    
                    # Apply the setting
                    cursor.execute(f"SET {pg_setting} = %s", [str(value)])
            
            # Log success
            logger.info("Database performance settings applied successfully")
            
    except Exception as e:
        logger.error(f"Error applying database performance settings: {str(e)}", exc_info=True)

def initialize_database_connections():
    """
    Initialize database connections and apply performance settings
    """
    try:
        # Apply performance settings to default connection
        apply_database_performance_settings()
        
        # Log success
        logger.info("Database connections initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database connections: {str(e)}", exc_info=True)