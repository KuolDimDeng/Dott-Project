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
            
        # Import onboarding signals to prevent edge cases
        try:
            from custom_auth.signals import onboarding_signals
            logger.info("✅ Onboarding consistency signals registered")
        except ImportError as e:
            logger.warning(f"Could not import onboarding signals: {e}")
            
        # Import employee sync utilities (signals are disabled - employee creation is now explicit)
        try:
            from . import employee_sync
            logger.info("✅ Employee-User sync utilities loaded")
        except ImportError as e:
            logger.error(f"Error importing employee sync: {e}")
            
        # Note: Removed AWS Cognito client initialization since using Auth0
        logger.info("Auth0 authentication configured - no AWS Cognito client needed")
        
        # Apply session creation fix for Google OAuth users
        try:
            from .session_fix_patch import apply_session_fix
            if apply_session_fix():
                logger.info("✅ Session creation fix applied - Google OAuth users will get correct onboarding status")
            else:
                logger.error("❌ Failed to apply session creation fix")
        except Exception as e:
            logger.error(f"Error applying session fix: {e}")
            
        # Also apply the Google OAuth specific fix to the view
        try:
            from session_manager.google_oauth_fix import apply_google_oauth_fix
            if apply_google_oauth_fix():
                logger.info("✅ Google OAuth session view fix applied")
            else:
                logger.error("❌ Failed to apply Google OAuth view fix")
        except Exception as e:
            logger.error(f"Error applying Google OAuth fix: {e}")
