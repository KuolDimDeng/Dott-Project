from django.apps import AppConfig
import logging
import inspect
import asyncio

logger = logging.getLogger(__name__)

class CustomAuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'custom_auth'
    
    def ready(self):
        """Initialize the app and setup RLS in the database."""
        # Don't perform RLS verification during app initialization
        # This avoids async context errors and database access during app initialization
        logger.info("CustomAuth app initialized - RLS verification deferred to middleware")
        
        # Import signals to ensure they're registered
        try:
            import custom_auth.signals
            logger.debug("Successfully imported custom_auth signals")
        except ModuleNotFoundError:
            logger.warning("No signals module found for custom_auth")
        except ImportError as e:
            logger.error(f"Error importing signals: {e}")
