import django
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import connection, transaction, connections
from business.models import Business
from users.models import User, UserProfile
from finance.models import AccountType, Account, Transaction
from django.conf import settings
import logging
import pytz
import traceback
import psycopg2
from psycopg2 import sql
from pyfactor.logging_config import get_logger
from finance.account_types import ACCOUNT_TYPES

logger = get_logger()

def initial_user_registration(user_data):
    logger.info("Starting initial user registration")
    try:
        # Create user without associating a database
        user = User.objects.create_user(
            email=user_data['email'],
            password=user_data['password1'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name']
        )
        logger.info(f"User created: {user.email}")
        
        # Create a temporary UserProfile without a database
        user_profile = UserProfile.objects.create(
            user=user,
            occupation=user_data['occupation'],
            phone_number=user_data.get('phone_number', ''),
            # Add other fields as necessary
        )
        logger.info(f"Temporary UserProfile created for: {user.email}")
        
        return user
    except Exception as e:
        logger.error(f"Error in initial user registration: {str(e)}")
        raise

def create_user_database(user, business_data):
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    business_name = business_data['name'].lower().replace(' ', '_').replace('.', '')
    database_name = f"{business_name}_{timestamp}"
    logger.info(f"Creating user database: {database_name}")

    try:
        logger.info("Connecting to default database...")
        conn = psycopg2.connect(
            dbname=settings.DATABASES['default']['NAME'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            host=settings.DATABASES['default']['HOST'],
            port=settings.DATABASES['default']['PORT']
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        logger.info("Connected to default database.")

        with conn.cursor() as cursor:
            logger.info(f"Creating new database: {database_name}")
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
            logger.info(f"User Database created: {database_name}")

        conn.close()
        logger.info("Closed connection to default database.")

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

    logger.info(f"Initial database setup completed for: {database_name}")
    return database_name

def setup_user_database(database_name, user_data, user):
    try:
        logger.debug(f"Setting up user database: {database_name}")
        
        # Run migrations for the user's database
        logger.info("Running migrations for the user's database")
        call_command('migrate', database=database_name)

        with transaction.atomic(using=database_name):
            # Create initial data
            logger.info("Creating initial data...")
            populate_account_types(database_name)
            
            # Fetch the account type after populating
            logger.info("Fetching the account type after populating...")
            account_type = AccountType.objects.using(database_name).get(account_type_id=0)

            # Create Cash Account
            logger.info("Creating Cash Account...")
            cash_account = Account.objects.using(database_name).create(
                account_number='1', 
                name='Cash on Hand', 
                account_type=account_type
            )

            # Create Initial Transaction
            logger.info("Creating initial transaction...")
            Transaction.objects.using(database_name).create(
                date=timezone.now().astimezone(pytz.timezone(settings.TIME_ZONE)).date(),
                description='Initial Transaction',
                account=cash_account,
                type='Deposit',
                amount=0,
                notes='Initial transaction',
                receipt=None
            )

        logger.debug(f"Initial tables and data created successfully in user's database: {database_name}")

        # Update UserProfile with the new database name
        user_profile = UserProfile.objects.get(user=user)
        user_profile.database_name = database_name
        user_profile.save()

        logger.info(f"Database {database_name} setup completed successfully")
        return database_name

    except Exception as e:
        logger.error(f"Error during user database setup: {str(e)}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
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
