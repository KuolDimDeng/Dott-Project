#/Users/kuoldeng/projectx/backend/pyfactor/pyfactor/apps.py
from django.apps import AppConfig

class OnboardingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'onboarding'

    def ready(self):
        """
        Import and register tasks when Django starts
        This ensures Celery discovers and registers all tasks
        """
        try:
            # Import tasks module to register tasks
            import onboarding.tasks
            
            # Get the Celery app instance
            from pyfactor.celery import app
            
            # Explicitly register tasks if needed
            app.tasks.register(onboarding.tasks.setup_user_database_task)
            app.tasks.register(onboarding.tasks.send_websocket_notification_task)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error registering Celery tasks: {str(e)}")