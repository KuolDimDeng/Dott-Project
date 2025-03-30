"""
Pyfactor Django application configuration.
This sets up logging, database connection pools, and other application-wide settings.
"""

import logging
from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)

class PyFactorConfig(AppConfig):
    """
    Main application configuration for PyFactor.
    Initializes connections and sets up middleware.
    """
    name = 'pyfactor'
    verbose_name = 'PyFactor Application'
    
    def ready(self):
        """
        Perform final application initialization.
        This runs when Django is ready to handle requests.
        """
        logger.info("Initializing PyFactor application")
        
        # Initialize database connection pools if needed
        if 'dj_db_conn_pool' in settings.DATABASES['default']['ENGINE']:
            logger.info("Initializing database connection pool")
            try:
                from django.db import connections
                for alias in connections:
                    connections[alias].ensure_connection()
                logger.info("Database connection pool initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize database connection pool: {e}")
        
        # Apply database performance settings
        try:
            from pyfactor.db_handlers import apply_database_performance_settings
            apply_database_performance_settings()
            logger.info("Applied database performance settings")
        except Exception as e:
            logger.error(f"Failed to apply database performance settings: {e}")
            
        # Set up signal handlers
        self._setup_signals()
        
        logger.info("PyFactor application initialized successfully")
    
    def _setup_signals(self):
        """Set up signal handlers for the application."""
        try:
            # Import signals to activate them
            import pyfactor.signals
            logger.debug("Signal handlers initialized")
        except Exception as e:
            logger.error(f"Failed to initialize signal handlers: {e}") 