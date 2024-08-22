import re
import time
import psycopg2
from django.conf import settings
from django.db import connections, OperationalError
import logging
from users.models import UserProfile
from django.core.management import call_command
from django.apps import apps




logger = logging.getLogger(__name__)

class UserDatabaseRouter:
    def create_dynamic_database(self, database_name):
        logger.debug(f"Attempting to create dynamic database: {database_name}")
        
        safe_database_name = re.sub(r'[^a-zA-Z0-9_]', '', database_name)
        logger.debug(f"Safe database name: {safe_database_name}")
    
        if safe_database_name not in settings.DATABASES:
            logger.info(f"Creating dynamic database configuration: {safe_database_name}")
        
            database_config = {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': safe_database_name,
                'USER': settings.DATABASES['default']['USER'],
                'PASSWORD': settings.DATABASES['default']['PASSWORD'],
                'HOST': settings.DATABASES['default']['HOST'],
                'PORT': settings.DATABASES['default']['PORT'],
                'OPTIONS': settings.DATABASES['default']['OPTIONS'],
                'ATOMIC_REQUESTS': settings.DATABASES['default']['ATOMIC_REQUESTS'],
                'CONN_HEALTH_CHECKS': settings.DATABASES['default']['CONN_HEALTH_CHECKS'],
                'CONN_MAX_AGE': settings.DATABASES['default']['CONN_MAX_AGE'],
                'TIME_ZONE': settings.TIME_ZONE,
                'AUTOCOMMIT': settings.DATABASES['default']['AUTOCOMMIT'],
            }

            logger.debug(f"Adding database configuration for {safe_database_name}")
            settings.DATABASES[safe_database_name] = database_config
            connections.databases[safe_database_name] = database_config

            # Check if the database exists and create if it doesn't
            try:
                logger.debug("Connecting to the default database")
                conn = psycopg2.connect(
                    dbname=settings.DATABASES['default']['NAME'],
                    user=settings.DATABASES['default']['USER'],
                    password=settings.DATABASES['default']['PASSWORD'],
                    host=settings.DATABASES['default']['HOST'],
                    port=settings.DATABASES['default']['PORT']
                )
                conn.autocommit = True
                cursor = conn.cursor()

                logger.debug(f"Checking if database {safe_database_name} exists")
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (safe_database_name,))
                exists = cursor.fetchone()
                if not exists:
                    logger.debug(f"Database {safe_database_name} does not exist. Creating it now.")
                    cursor.execute(f'CREATE DATABASE "{safe_database_name}"')
                    logger.info(f"Database {safe_database_name} created successfully")
                else:
                    logger.info(f"Database {safe_database_name} already exists")
            except psycopg2.Error as e:
                logger.error(f"Error checking/creating database {safe_database_name}: {str(e)}")
                raise
            finally:
                cursor.close()
                conn.close()

            # Check database readiness
            self.check_database_readiness(safe_database_name)

            # Run migrations for the new database
            logger.info(f"Running migrations for database: {safe_database_name}")
            call_command('migrate', database=safe_database_name)

            logger.info(f"Database {safe_database_name} is fully set up and ready")
        else:
            logger.warning(f"Database '{safe_database_name}' already exists in DATABASES")

    def check_database_readiness(self, database_name, max_retries=10, retry_delay=0.5):
        logger.debug(f"Checking readiness of database: {database_name}")
        for attempt in range(max_retries):
            try:
                with connections[database_name].cursor() as cursor:
                    cursor.execute("SELECT 1")
                logger.info(f"Database {database_name} is ready (attempt {attempt + 1})")
                return
            except OperationalError:
                logger.warning(f"Database {database_name} not ready, retrying... (attempt {attempt + 1})")
                time.sleep(retry_delay)
        
        logger.error(f"Database {database_name} not ready after {max_retries} attempts")
        raise OperationalError(f"Database {database_name} not ready after {max_retries} attempts")



    def db_for_read(self, model, **hints):
        logger.debug(f"db_for_read called for model: {model.__name__}")
        if 'instance' in hints:
            instance = hints['instance']
            logger.debug(f"instance type: {type(instance).__name__}, id: {instance.pk}")
            if instance.__class__.__name__ == 'UserProfile':
                UserProfile = apps.get_model('users', 'UserProfile')
                try:
                    user_profile = UserProfile.objects.using('default').get(pk=instance.pk)
                    logger.debug(f"user_profile database_name: {user_profile.database_name}")
                    return user_profile.database_name
                except UserProfile.DoesNotExist:
                    logger.warning("UserProfile does not exist")
        return None

    def db_for_write(self, model, **hints):
        logger.debug("db_for_write called")
        if model._meta.app_label in ['django_celery_beat', 'django_celery_results']:
            return 'celery'
        if 'instance' in hints:
            instance = hints['instance']
            logger.debug(f"instance: {instance}")
            if instance.__class__.__name__ == 'UserProfile':
                UserProfile = apps.get_model('users', 'UserProfile')
                try:
                    user_profile = UserProfile.objects.using('default').get(pk=instance.pk)
                    logger.debug(f"user_profile: {user_profile}")
                    return user_profile.database_name
                except UserProfile.DoesNotExist:
                    logger.warning("UserProfile does not exist")
        if model._meta.app_label == 'users':
            return 'default'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        logger.debug(f"allow_relation called with obj1: {obj1.__class__.__name__} (ID: {obj1.pk}), obj2: {obj2.__class__.__name__} (ID: {obj2.pk})")
        if obj1._state.db == obj2._state.db:
            logger.debug(f"Relation allowed: same database ({obj1._state.db})")
            return True
        logger.debug(f"Relation not allowed: different databases (obj1: {obj1._state.db}, obj2: {obj2._state.db})")
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        logger.debug(f"allow_migrate called with db: {db}, app_label: {app_label}, model_name: {model_name}")
        if app_label in ['django_celery_beat', 'django_celery_results']:
            return db == 'celery'
        if model_name == 'user_chatbot_message':
            return True
        return True