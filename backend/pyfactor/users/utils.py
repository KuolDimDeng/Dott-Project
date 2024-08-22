import django
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import connection, transaction, connections
from business.models import Business
from users.models import User, UserProfile
from finance.models import AccountType, Account, FinanceTransaction
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
        logger.debug(f"Starting setup_user_database for: {database_name}")
        
        # Run migrations for the user's database
        logger.info(f"Running migrations for database: {database_name}")
        call_command('migrate', database=database_name)

        with transaction.atomic(using=database_name):
            # Create initial data
            logger.info(f"Creating initial data for database: {database_name}")
            
            # Populate account types
            logger.info(f"Populating account types for database: {database_name}")
            populate_account_types(database_name)
            
            # Ensure necessary accounts exist
            logger.info(f"Ensuring necessary accounts exist for database: {database_name}")
            ensure_accounts_exist(database_name)
            
            # Fetch the Cash account type
            logger.info(f"Fetching the Cash account type for database: {database_name}")
            try:
                cash_account_type = AccountType.objects.using(database_name).get(name='Cash')
                logger.info(f"Cash account type fetched successfully for database: {database_name}")
            except AccountType.DoesNotExist:
                logger.error(f"Cash account type not found in database: {database_name}")
                raise

            # Create Cash Account if it doesn't exist
            logger.info(f"Creating or getting Cash Account for database: {database_name}")
            cash_account, created = Account.objects.using(database_name).get_or_create(
                name='Cash on Hand',
                defaults={
                    'account_number': '1',
                    'account_type': cash_account_type
                }
            )
            if created:
                logger.info(f"Cash Account created for database: {database_name}")
            else:
                logger.info(f"Cash Account already exists for database: {database_name}")

            # Create Initial Transaction
            logger.info(f"Creating initial transaction for database: {database_name}")
            FinanceTransaction.objects.using(database_name).create(
                date=timezone.now().astimezone(pytz.timezone(settings.TIME_ZONE)).date(),
                description='Initial Transaction',
                account=cash_account,
                type='Deposit',
                amount=0,
                notes='Initial transaction',
                receipt=None
            )
            logger.info(f"Initial transaction created successfully for database: {database_name}")

        logger.debug(f"Initial tables and data created successfully in user's database: {database_name}")

        # Update UserProfile with the new database name
        user_profile = UserProfile.objects.get(user=user)
        user_profile.database_name = database_name
        user_profile.save()

        logger.info(f"Database {database_name} setup completed successfully")
        return database_name

    except Exception as e:
        logger.error(f"Error during user database setup for {database_name}: {str(e)}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        raise

def populate_account_types(database_name):
    logger.info(f"Populating account types for database: {database_name}")
    AccountType = apps.get_model('finance', 'AccountType')
    for account_type_name, account_type_id in ACCOUNT_TYPES.items():
        AccountType.objects.using(database_name).get_or_create(
            account_type_id=account_type_id,
            defaults={'name': account_type_name}
        )
    logger.info(f"Account types populated successfully for database: {database_name}")

def ensure_accounts_exist(database_name):
    logger.info(f"Ensuring necessary accounts exist in database: {database_name}")
    Account = apps.get_model('finance', 'Account')
    AccountType = apps.get_model('finance', 'AccountType')
    required_accounts = [
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Sales Revenue', 'Revenue'),
        ('Sales Tax Payable', 'Current Liabilities'),
        ('Cost of Goods Sold', 'Expenses'),
        ('Inventory', 'Current Assets'),
        ('Accounts Payable', 'Current Liabilities'),
        ('Cash', 'Cash')
    ]
    for account_name, account_type_name in required_accounts:
        account_type, _ = AccountType.objects.using(database_name).get_or_create(name=account_type_name)
        Account.objects.using(database_name).get_or_create(
            name=account_name,
            defaults={'account_type': account_type}
        )
    logger.info(f"Necessary accounts ensured for database: {database_name}")

