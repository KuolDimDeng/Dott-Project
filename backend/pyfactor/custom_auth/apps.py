from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class AuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'custom_auth'
    
    def ready(self):
        """
        Initialize the application when Django starts.
        Setup database-level RLS if possible.
        """
        # Import and setup RLS
        try:
            from .rls import setup_tenant_context_in_db
            
            # Setup tenant context in database
            # This is a lightweight operation that just ensures the custom setting exists
            # The actual RLS policies are applied with the management command
            setup_tenant_context_in_db()
            logger.info("Database tenant context initialized for RLS")
            
        except Exception as e:
            # Don't crash the app startup if RLS setup fails
            # We'll log the error and continue
            logger.error(f"Error initializing RLS: {str(e)}")
