import re
import time
import uuid
import psycopg2
import asyncpg
import asyncio
from django.conf import settings
from django.db import connections, OperationalError
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction
from celery import shared_task, chain
from asgiref.sync import async_to_sync, sync_to_async
from pyfactor.logging_config import get_logger

# Configure logger
logger = get_logger()

def initial_user_registration(user_data):
    """
    Synchronous function to handle initial user registration
    """
    try:
        from django.contrib.auth import get_user_model
        from users.models import UserProfile
        
        User = get_user_model()

        # Create the user
        user = User.objects.create_user(
            email=user_data['email'],
            password=user_data.get('password1'),
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', '')
        )

        # Create the user profile
        UserProfile.objects.create(
            user=user,
            occupation=user_data.get('occupation', ''),
            phone_number=user_data.get('phone_number', ''),
            is_business_owner=user_data.get('is_business_owner', True)
        )

        logger.info(f"User registration completed for: {user.email}")
        return user

    except Exception as e:
        logger.error(f"Error in initial user registration: {str(e)}")
        raise

def generate_database_name(user, uuid_length=8, email_prefix_length=10):
    """Generate a unique database name for the user"""
    unique_id = str(uuid.uuid4()).replace('-', '_')[:uuid_length]
    email_prefix = user.email.split('@')[0].lower()[:email_prefix_length]
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    db_name = f"{unique_id}_{email_prefix}_{timestamp}"[:63]
    return re.sub(r'[^a-zA-Z0-9_]', '', db_name)

def create_user_database(user_id, business_id):
    """Synchronous function to create user database"""
    from django.contrib.auth import get_user_model
    from business.models import Business
    from django.conf import settings
    
    User = get_user_model()
    user = User.objects.get(id=user_id)
    business = Business.objects.get(id=business_id)
    
    database_name = generate_database_name(user)
    
    try:
        # Create database using psycopg2
        conn = psycopg2.connect(
            dbname=settings.DATABASES['default']['NAME'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            host=settings.DATABASES['default']['HOST'],
            port=settings.DATABASES['default']['PORT']
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
        if not cursor.fetchone():
            cursor.execute(f'CREATE DATABASE "{database_name}"')
            logger.info(f"Database {database_name} created successfully")
        
        cursor.close()
        conn.close()
        
        # Update Django's database configurations with all required settings
        database_config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': database_name,
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'OPTIONS': settings.DATABASES['default'].get('OPTIONS', {}),
            'ATOMIC_REQUESTS': True,
            'AUTOCOMMIT': True,
            'CONN_MAX_AGE': 600,
            'TIME_ZONE': settings.TIME_ZONE,  # Add TIME_ZONE from settings
            'USE_TZ': settings.USE_TZ,        # Add USE_TZ from settings
            'CONN_HEALTH_CHECKS': True,

        }
        
        # Update Django's database configurations
        settings.DATABASES[database_name] = database_config
        connections.databases[database_name] = database_config
        
        logger.info(f"Database {database_name} created successfully")
        return database_name
        
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        raise

def setup_user_database(database_name, user, business):
    """Synchronous function to setup user database"""
    try:
        # Run migrations
        call_command('migrate', database=database_name)
        
        # Update UserProfile
        UserProfile = apps.get_model('users', 'UserProfile')
        user_profile = UserProfile.objects.get(user=user)
        user_profile.database_name = database_name
        user_profile.database_status = 'active'
        user_profile.save()
        
        logger.info(f"Database setup completed for: {database_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error setting up database {database_name}: {str(e)}")
        raise

def check_database_readiness(database_name, max_retries=10, retry_delay=0.5):
    """Check if the database is ready to use"""
    for attempt in range(max_retries):
        try:
            with connections[database_name].cursor() as cursor:
                cursor.execute("SELECT 1")
            logger.info(f"Database {database_name} is ready (attempt {attempt + 1})")
            return True
        except OperationalError:
            logger.warning(f"Database {database_name} not ready, retrying... (attempt {attempt + 1})")
            time.sleep(retry_delay)
        except Exception as e:
            logger.error(f"Error checking database readiness: {str(e)}")
            raise
    
    raise OperationalError(f"Database {database_name} not ready after {max_retries} attempts")

def populate_initial_data(database_name):
    """Populate initial data in the new database"""
    try:
        AccountType = apps.get_model('finance', 'AccountType')
        
        # Add basic account types
        default_types = {
            'Assets': 1,
            'Liabilities': 2,
            'Equity': 3,
            'Income': 4,
            'Expenses': 5
        }
        
        for name, type_id in default_types.items():
            AccountType.objects.using(database_name).get_or_create(
                account_type_id=type_id,
                defaults={'name': name}
            )
        
        logger.info(f"Initial data populated for database: {database_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error populating initial data: {str(e)}")
        raise


def cleanup_database(database_name):
    """
    Clean up a partially created database
    """
    try:
        # Get existing connections
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
            # Terminate existing connections to the database
            cursor.execute("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = %s
                AND pid <> pg_backend_pid()
            """, [database_name])

            # Drop the database
            cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
            logger.info(f"Database {database_name} cleaned up successfully")

        finally:
            cursor.close()
            conn.close()

        # Remove database from Django's connection handler
        if database_name in connections.databases:
            del connections.databases[database_name]

        if hasattr(connections, database_name):
            delattr(connections, database_name)

        logger.info(f"Removed database {database_name} from Django connections")

    except Exception as e:
        logger.error(f"Error cleaning up database {database_name}: {str(e)}", exc_info=True)
        raise