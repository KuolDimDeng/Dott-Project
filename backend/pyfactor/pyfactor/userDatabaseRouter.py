import re
import time
import psycopg2
from django.conf import settings
from django.db import connections, OperationalError
import logging
from users.models import UserProfile
from django.core.management import call_command
from django.apps import apps
from asgiref.sync import sync_to_async
from .db.utils import get_connection, return_connection, initialize_database_pool
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class UserDatabaseRouter:
    def __init__(self):
        from .db.utils import DatabasePool
        self.pool = DatabasePool.get_instance()

    def sanitize_database_name(self, database_name):
        """Sanitize database name"""
        return re.sub(r'[^a-zA-Z0-9_]', '', database_name)

    @contextmanager
    def get_db_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = get_connection()
            yield conn
        finally:
            if conn:
                return_connection(conn)

    @sync_to_async
    def create_dynamic_database(self, database_name):
        """Creates a dynamic database with pool configuration"""
        safe_database_name = self.sanitize_database_name(database_name)
        
        if safe_database_name not in settings.DATABASES:
            database_config = settings.DATABASES['default'].copy()
            database_config.update({
                'NAME': safe_database_name,
                'ENGINE': 'django.db.backends.postgresql',
                'ATOMIC_REQUESTS': False,
                'TIME_ZONE': settings.TIME_ZONE,
                'CONN_HEALTH_CHECKS': True,
                'AUTOCOMMIT': True,
                'CONN_MAX_AGE': 0,
                'OPTIONS': {
                    'connect_timeout': 10,
                    'keepalives': 1,
                    'keepalives_idle': 30,
                    'keepalives_interval': 10,
                    'keepalives_count': 5,
                    'client_encoding': 'UTF8',
                }
            })

            settings.DATABASES[safe_database_name] = database_config
            connections.databases[safe_database_name] = database_config

            try:
                with self.get_db_connection() as conn:
                    self.ensure_database_exists(safe_database_name)
                    self.check_database_readiness(safe_database_name)
                    
                    logger.info(f"Running migrations for database: {safe_database_name}")
                    call_command('migrate', database=safe_database_name)
                    
                    return safe_database_name

            except Exception as e:
                logger.error(f"Error creating database {safe_database_name}: {str(e)}")
                if safe_database_name in settings.DATABASES:
                    del settings.DATABASES[safe_database_name]
                if safe_database_name in connections.databases:
                    del connections.databases[safe_database_name]
                raise

    @sync_to_async
    def ensure_database_exists(self, database_name):
        """Create database using connection pool"""
        with self.get_db_connection() as conn:
            conn.autocommit = True
            
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
                    (database_name,)
                )
                exists = cursor.fetchone()
                
                if not exists:
                    cursor.execute("""
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE datname = %s AND pid != pg_backend_pid()
                    """, [database_name])
                    
                    logger.debug(f"Creating database {database_name}")
                    cursor.execute(f'CREATE DATABASE "{database_name}"')
                    logger.info(f"Database {database_name} created successfully")
                else:
                    logger.info(f"Database {database_name} already exists")

    @sync_to_async
    def check_database_readiness(self, database_name, max_retries=10, retry_delay=0.5):
        """Check database readiness"""
        logger.debug(f"Checking readiness of database: {database_name}")
        
        for attempt in range(max_retries):
            with self.get_db_connection() as conn:
                try:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    logger.info(f"Database {database_name} is ready (attempt {attempt + 1})")
                    return True
                except Exception as e:
                    logger.warning(
                        f"Database {database_name} not ready (attempt {attempt + 1}): {str(e)}"
                    )
                    time.sleep(retry_delay)
        
        raise OperationalError(
            f"Database {database_name} not ready after {max_retries} attempts"
        )

    @sync_to_async
    def db_for_read(self, model, **hints):
        """Database routing for read operations"""
        if 'instance' in hints:
            instance = hints['instance']
            if instance.__class__.__name__ == 'UserProfile':
                try:
                    UserProfile = apps.get_model('users', 'UserProfile')
                    user_profile = UserProfile.objects.using('default').get(pk=instance.pk)
                    return user_profile.database_name
                except UserProfile.DoesNotExist:
                    logger.warning("UserProfile does not exist")
        return None

    @sync_to_async
    def db_for_write(self, model, **hints):
        """Database routing for write operations"""
        if model._meta.app_label in ['django_celery_beat', 'django_celery_results']:
            return 'celery'
        if 'instance' in hints:
            instance = hints['instance']
            if instance.__class__.__name__ == 'UserProfile':
                try:
                    UserProfile = apps.get_model('users', 'UserProfile')
                    user_profile = UserProfile.objects.using('default').get(pk=instance.pk)
                    return user_profile.database_name
                except UserProfile.DoesNotExist:
                    logger.warning("UserProfile does not exist")
        if model._meta.app_label == 'users':
            return 'default'
        return None

    @sync_to_async
    def allow_relation(self, obj1, obj2, **hints):
        """Check if relations are allowed"""
        if obj1._state.db == obj2._state.db:
            return True
        if isinstance(obj1, UserProfile) or isinstance(obj2, UserProfile):
            return True
        return False

    @sync_to_async
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Check if migrations are allowed"""
        if app_label in ['django_celery_beat', 'django_celery_results']:
            return db == 'celery'
        return True