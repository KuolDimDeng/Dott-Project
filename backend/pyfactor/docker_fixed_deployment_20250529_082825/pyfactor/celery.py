# /Users/kuoldeng/projectx/backend/pyfactor/celery.py

from celery import Celery
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Create the Celery app
app = Celery('pyfactor')

# Load settings from Django settings object
app.config_from_object('django.conf:settings', namespace='CELERY')

# Configure Celery for reliable database operations
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution settings
    task_acks_late=True,          # Ensure task completion before acknowledgment
    worker_prefetch_multiplier=1,  # Don't prefetch tasks for better reliability
    
    # Queue definitions
    task_queues={
        'default': {'exchange': 'default'},
        'setup': {'exchange': 'setup'},
        'onboarding': {'exchange': 'onboarding'}
    },
    
    # Task routing
    task_routes={
        'setup_user_schema_task': {'queue': 'setup'},
        'send_websocket_notification': {'queue': 'default'},
        'onboarding.*': {'queue': 'onboarding'},
        'users.tasks.check_expired_subscriptions': {'queue': 'default'}
    },
    
    # Start with an empty beat schedule
    # The schedule will be populated in the Django AppConfig's ready() method
    beat_schedule={}
)

# Auto-discover tasks
logger.info("Auto-discovering Celery tasks...")
app.autodiscover_tasks()