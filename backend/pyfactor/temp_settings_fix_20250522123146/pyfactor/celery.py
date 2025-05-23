"""
Celery configuration for pyfactor project.
This file is kept minimal for Docker deployment compatibility.
"""
import os
from celery import Celery

# Set default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')

# Create a minimal Celery app instance
app = Celery('pyfactor')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
