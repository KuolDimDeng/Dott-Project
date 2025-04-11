from django.apps import AppConfig
import logging
import inspect
import asyncio
import sys

logger = logging.getLogger(__name__)

class CustomAuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'custom_auth'
    
    def ready(self):
        """Initialize the app and setup RLS in the database."""
        # Skip initialization during migrations or other management commands
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv or 'shell' in sys.argv:
            logger.info("CustomAuth app initialization skipped during management command")
            return
        
        # Don't perform RLS verification during app initialization
        # This avoids async context errors and database access during app initialization
        logger.info("CustomAuth app initialized - RLS verification deferred to middleware")
        
        # This reduces circular imports by deferring some imports
        # Running this in a separate thread can cause other issues, so we don't do that
        
        # Import signals to ensure they're registered
        try:
            import custom_auth.signals
            logger.debug("Successfully imported custom_auth signals")
        except ModuleNotFoundError:
            logger.warning("No signals module found for custom_auth")
        except ImportError as e:
            logger.error(f"Error importing signals: {e}")
            
        # Defer Cognito initialization to a "ready" signal handler
        # This is better than doing it directly in the ready method 
        # which might be called before all apps are loaded
        
        # We'll set up a simple function to initialize Cognito after a short delay
        from django.db.backends.signals import connection_created
        
        def init_cognito(sender, connection, **kwargs):
            if not hasattr(self, '_cognito_initialized'):
                try:
                    from custom_auth.client import get_cognito_client
                    self.cognito_client = get_cognito_client()
                    logger.info("Successfully initialized Cognito client")
                    self._cognito_initialized = True
                except Exception as e:
                    logger.error(f"Error initializing Cognito client: {e}")
                    self.cognito_client = None
        
        # Connect to a signal that happens later in the Django initialization process
        connection_created.connect(init_cognito)
