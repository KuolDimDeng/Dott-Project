import time
import psycopg2
from django.conf import settings
from django.db import connections, OperationalError

import logging

from users.models import UserProfile

logger = logging.getLogger(__name__)

class UserDatabaseRouter:

    class UserDatabaseRouter:
        def create_dynamic_database(self, database_name):
            logger.debug(f"Attempting to create dynamic database: {database_name}")

            if database_name not in settings.DATABASES:
                logger.info(f"Creating dynamic database configuration: {database_name}")

                database_config = {
                    'ENGINE': 'django.db.backends.postgresql',
                    'NAME': database_name,
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

                logger.debug(f"Adding database configuration for {database_name}")
                settings.DATABASES[database_name] = database_config
                connections.databases[database_name] = database_config

                # Check if the database exists
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

                    logger.debug(f"Checking if database {database_name} exists")
                    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{database_name}'")
                    exists = cursor.fetchone()
                    if not exists:
                        logger.debug(f"Database {database_name} does not exist. Creating it now.")
                        cursor.execute(f"CREATE DATABASE {database_name}")
                        logger.info(f"Database {database_name} created successfully")
                    else:
                        logger.info(f"Database {database_name} already exists")
                except psycopg2.Error as e:
                    logger.error(f"Error checking/creating database {database_name}: {str(e)}")
                    raise
                finally:
                    cursor.close()
                    conn.close()

                # Adding a delay to ensure the database is fully ready
                logger.debug(f"Sleeping for 5 seconds to ensure database {database_name} is fully ready")
                time.sleep(5)
            else:
                logger.warning(f"Database '{database_name}' already exists in DATABASES")

        def db_for_read(self, model, **hints):
            logger.debug(f"db_for_read called for model: {model.__name__}")
            if 'instance' in hints:
                instance = hints['instance']
                logger.debug(f"instance type: {type(instance).__name__}, id: {instance.pk}")
                if isinstance(instance, UserProfile):
                    try:
                        user_profile = UserProfile.objects.select_related('user').get(pk=instance.pk)
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
                if isinstance(instance, UserProfile):
                    try:
                        user_profile = UserProfile.objects.select_related('user').get(pk=instance.pk)
                        logger.debug(f"user_profile: {user_profile}")
                        return user_profile.database_name
                    except UserProfile.DoesNotExist:
                        logger.warning("UserProfile does not exist")
            if model._meta.app_label == 'users':
                return 'default'
            return None

        def allow_relation(self, obj1, obj2, **hints):
            logger.debug(f"allow_relation called with obj1: {obj1}, obj2: {obj2}")
            return True

        def allow_migrate(self, db, app_label, model_name=None, **hints):
            logger.debug(f"allow_migrate called with db: {db}, app_label: {app_label}, model_name: {model_name}")
            if app_label in ['django_celery_beat', 'django_celery_results']:
                return db == 'celery'
            if model_name == 'user_chatbot_message':
                return True
            return True

    def create_dynamic_database(self, database_name):
        if database_name not in settings.DATABASES:
            logger.info(f"Creating dynamic database configuration: {database_name}")
            
            database_config = {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': database_name,
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

            settings.DATABASES[database_name] = database_config
            connections.databases[database_name] = database_config

            logger.debug(f"Added {database_name} to DATABASES setting and connections")

            # Check if the database exists
            conn = psycopg2.connect(
                dbname=settings.DATABASES['default']['NAME'],
                user=settings.DATABASES['default']['USER'],
                password=settings.DATABASES['default']['PASSWORD'],
                host=settings.DATABASES['default']['HOST'],
                port=settings.DATABASES['default']['PORT']
            )
            conn.autocommit = True
            cursor = conn.cursor()
            
            try:
                cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{database_name}'")
                exists = cursor.fetchone()
                if not exists:
                    cursor.execute(f"CREATE DATABASE {database_name}")
                    logger.info(f"Database {database_name} created successfully")
                else:
                    logger.info(f"Database {database_name} already exists")
            except psycopg2.Error as e:
                logger.error(f"Error checking/creating database {database_name}: {str(e)}")
                raise
            finally:
                cursor.close()
                conn.close()
        else:
            logger.warning(f"Database '{database_name}' already exists in DATABASES")