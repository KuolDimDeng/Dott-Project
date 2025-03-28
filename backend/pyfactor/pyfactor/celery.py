# /Users/kuoldeng/projectx/backend/pyfactor/celery.py

from celery import Celery
import os
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

app = Celery('pyfactor')
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
    
    # Scheduled tasks
    beat_schedule={
        'check-expired-subscriptions': {
            'task': 'users.tasks.check_expired_subscriptions',
            'schedule': 86400.0,  # Run daily (86400 seconds)
            'options': {'queue': 'default'}
        },
        'cleanup-stale-schemas': {
            'task': 'users.utils.cleanup_stale_schemas',
            'schedule': 604800.0,  # Run weekly (604800 seconds)
            'options': {'queue': 'default'}
        },
        'monitor-tenant-schemas': {
            'task': 'custom_auth.tasks.monitor_tenant_schemas',
            'schedule': crontab(hour='2', minute='0'),  # Run daily at 2:00 AM
            'options': {'queue': 'maintenance'}
        }
    }
)

app.autodiscover_tasks()