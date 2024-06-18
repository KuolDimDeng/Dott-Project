from django.conf import settings
from users.models import UserProfile
from pyfactor.logging_config import setup_logging
from django.db import connections
import logging

logger = setup_logging()

class UserDatabaseRouter:
    def db_for_read(self, model, **hints):
        logger.debug("db_for_read called")
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
        return None

    def db_for_write(self, model, **hints):
            logger.debug("db_for_write called")
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
            # Ensure that user-related writes are routed to the default database
            if model._meta.app_label == 'users':
                return 'default'
            return None

    def create_dynamic_database(self, database_name):
        if database_name not in settings.DATABASES:
            logger.info(f"Creating dynamic database: {database_name}")
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
            logger.debug(f"Added {database_name} to DATABASES setting")

            connections.databases[database_name] = database_config

            logger.debug(f"Added {database_name} connection to Django's connections")
        else:
            logger.warning(f"Database '{database_name}' already exists in DATABASES")

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return True
