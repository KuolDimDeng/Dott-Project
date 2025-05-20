from django.apps import AppConfig
import logging
import time
import os
import sys

logger = logging.getLogger(__name__)

class PyfactorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pyfactor'

    def ready(self):
        """
        Initialize application components when Django starts
        """
        # Skip initialization during schema migrations and certain management commands
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv or 'manage.py' in sys.argv:
            return
        
        try:
            # Initialize database connection pool
            from pyfactor.db_pool_config import initialize_pool
            start_time = time.time()
            initialize_pool()
            logger.info(f"Database connection pool initialized in {time.time() - start_time:.4f}s")
            
            # Apply database performance settings
            from pyfactor.db_handlers import initialize_database_connections
            initialize_database_connections()
            
            # Register schema migration signal handlers
            from django.db.models.signals import post_migrate
            from pyfactor.signals import handle_post_migrate
            post_migrate.connect(handle_post_migrate)
            
            # Initialize tenant schema cache
            from pyfactor.db_routers import TenantSchemaRouter
            TenantSchemaRouter.clear_connection_cache()
            logger.info("Tenant schema cache initialized")
            
            # Set up periodic connection pool maintenance
            from django.core.signals import request_finished
            from pyfactor.db_pool_config import run_pool_maintenance
            request_finished.connect(lambda **kwargs: run_pool_maintenance())
            
            # Set up connection handler for new connections
            from django.db.backends.signals import connection_created
            from pyfactor.db_handlers import apply_database_performance_settings
            connection_created.connect(lambda **kwargs: apply_database_performance_settings())
            
            # Configure Celery Beat schedule
            self._configure_celery_beat()
            
        except Exception as e:
            logger.error(f"Error initializing Pyfactor app: {str(e)}", exc_info=True)
    
    def _configure_celery_beat(self):
        """Configure Celery Beat schedule after Django is fully loaded"""
        try:
            # Import the Celery app
            from pyfactor.celery import app as celery_app
            
            # Import the task configuration function
            from pyfactor.settings import configure_tasks
            
            # Configure the beat schedule with the task configurations
            celery_app.conf.beat_schedule = configure_tasks()
            
            logger.info("Celery Beat schedule configured successfully")
        except Exception as e:
            logger.error(f"Error configuring Celery Beat schedule: {str(e)}", exc_info=True)


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
            app.tasks.register(onboarding.tasks.setup_user_schema_task)
            app.tasks.register(onboarding.tasks.send_websocket_notification_task)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error registering Celery tasks: {str(e)}")