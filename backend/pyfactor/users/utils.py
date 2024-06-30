import django
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction, connections
from users.models import UserProfile
from finance.models import AccountType, Account, Transaction
from django.conf import settings
import logging
import pytz
import traceback
import psycopg2
from pyfactor.logging_config import get_logger
from finance.account_types import ACCOUNT_TYPES

logger = get_logger()

def create_user_database(username, user_data, subscription_type):
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    business_name = username.lower().replace(' ', '_').replace('.', '').replace('@', '')
    database_name = f"{business_name}_{timestamp}"

    try:
        conn = psycopg2.connect(
            dbname=settings.DATABASES['default']['NAME'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            host=settings.DATABASES['default']['HOST'],
            port=settings.DATABASES['default']['PORT']
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE {database_name}")
            logger.info("User Database created: %s", database_name)

    except (Exception, psycopg2.DatabaseError) as error:
        logger.error(f"Error creating database: {error}")
        raise

    logger.info("Updating database configuration...")
    if database_name not in settings.DATABASES:
        settings.DATABASES[database_name] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': database_name,
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'OPTIONS': {'connect_timeout': 10},
            'ATOMIC_REQUESTS': False,
            'CONN_HEALTH_CHECKS': True,
            'CONN_MAX_AGE': 600,
            'TIME_ZONE': 'UTC',
            'AUTOCOMMIT': True,
        }
    logger.info("Database configuration updated.")
    
    connections.databases[database_name] = settings.DATABASES[database_name]

    logger.debug("Creating initial tables in user's database via migrate: %s", database_name)
    call_command('migrate', database=database_name)
    
     # Create user_chatbot_message table
    logger.debug("Creating user_chatbot_message table in user's database: %s", database_name)
    with connections[database_name].cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_chatbot_message (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_from_user BOOLEAN NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
    logger.info("user_chatbot_message table created successfully in user's database: %s", database_name)

    
    logger.info("Initial tables created successfully in user's database: %s", database_name)
    return database_name

def setup_user_database(database_name, user_data, user):
    try:
        logger.debug("Attempting to create initial tables in user's database: %s", database_name)
        with transaction.atomic(using=database_name):
            with connections[database_name].cursor() as cursor:
                cursor.execute("SET search_path TO public")

            # Create initial data
            logger.info("Creating initial data...")
            populate_account_types(database_name)
            account_type = AccountType.objects.using(database_name).get(account_type_id=0)
            cash_account = Account.objects.using(database_name).create(account_number='1', name='Cash on Hand', account_type=account_type)
            Transaction.objects.using(database_name).create(
                date=timezone.now().astimezone(pytz.timezone(settings.TIME_ZONE)).date(),
                description='Initial Transaction',
                account=cash_account,
                type='Deposit',
                amount=0,
                notes='Initial transaction',
                receipt=None
            )

        logger.debug("Initial tables created successfully in user's database: %s", database_name)

    except Exception as e:
        logger.error("Error during user database setup: %s", str(e))
        logger.error("Traceback:\n%s", traceback.format_exc())
        raise
    
    logger.debug("Retrieving user profile from default database")
    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        logger.debug("Retrieved UserProfile: %s", user_profile)
        user_profile.database_name = database_name
        user_profile.save(using='default')  # Save changes to the default database
        logger.debug("Updated UserProfile with database_name: %s", user_profile.database_name)
        logger.info("Database %s created successfully", database_name)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        raise
    except Exception as e:
        logger.error("Error updating user profile: %s", str(e))
        logger.error("Traceback:\n%s", traceback.format_exc())
        raise

def populate_account_types(database_name):
    logger.info(f"Populating finance_accounttype table for user database: {database_name}")
    AccountType = apps.get_model('finance', 'AccountType')
    for account_type_name, account_type_id in ACCOUNT_TYPES.items():
        AccountType.objects.using(database_name).update_or_create(
            account_type_id=account_type_id,
            defaults={'name': account_type_name}
        )
    logger.info(f"finance_accounttype table populated successfully for user database: {database_name}")
