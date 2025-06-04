from django.apps import AppConfig
import logging
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
        logger.info("CustomAuth app initialized - Using Auth0 authentication")
        
        # Import signals to ensure they're registered
        try:
            import custom_auth.signals
            logger.debug("Successfully imported custom_auth signals")
        except ModuleNotFoundError:
            logger.warning("No signals module found for custom_auth")
        except ImportError as e:
            logger.error(f"Error importing signals: {e}")
            
        # Note: Removed AWS Cognito client initialization since using Auth0
        logger.info("Auth0 authentication configured - no AWS Cognito client needed")
