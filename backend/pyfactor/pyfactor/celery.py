# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/celery.py

import os
from celery import Celery, signals
from django.conf import settings
import logging
from celery.signals import after_setup_logger, after_setup_task_logger

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

app = Celery('pyfactor')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

def configure_logger(logger, **kwargs):
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.DEBUG)
    
    logger.addHandler(console_handler)
    logger.setLevel(logging.DEBUG)

    # Suppress propagation to root logger
    logger.propagate = False

    return logger

after_setup_logger.connect(configure_logger)
after_setup_task_logger.connect(configure_logger)

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

def add_database(name):
    from django.conf import settings
    if name not in settings.DATABASES:
        settings.DATABASES[name] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': name,
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'TOzuISAf13KvGVZi4zbd'),
            'HOST': os.getenv('DB_HOST', 'database-2.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
            'PORT': '5432',
            'ATOMIC_REQUESTS': False,
            'CONN_HEALTH_CHECKS': True,
            'CONN_MAX_AGE': 600,
            'AUTOCOMMIT': True,
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }

@signals.task_prerun.connect
def on_task_prerun(task_id, task, *args, **kwargs):
    if task.name == 'integrations.tasks.fetch_shopify_data':
        shop = kwargs.get('kwargs', {}).get('shop')
        if shop:
            try:
                from django.apps import apps
                from django.db import connections
                ShopifyIntegration = apps.get_model('integrations', 'ShopifyIntegration')
                User = apps.get_model('users', 'User')
                UserProfile = apps.get_model('users', 'UserProfile')
                
                integration = ShopifyIntegration.objects.get(shop_url=shop)
                user = User.objects.get(id=integration.user_id)
                user_profile = UserProfile.objects.using('default').get(user=user)
                database_name = user_profile.database_name
                
                add_database(database_name)
                
                # Ensure the database connection is established
                if database_name not in connections.databases:
                    connections.databases[database_name] = settings.DATABASES[database_name]
                
                # Use the UserDatabaseRouter to create the dynamic database if it doesn't exist
                from pyfactor.userDatabaseRouter import UserDatabaseRouter
                router = UserDatabaseRouter()
                router.create_dynamic_database(database_name)
                
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.error(f"Error setting up database for shop {shop}: {str(e)}")

app.conf.update(
    CELERY_TASK_ROUTES={
        'integrations.tasks.fetch_shopify_data': {'queue': 'shopify'},
    },
)