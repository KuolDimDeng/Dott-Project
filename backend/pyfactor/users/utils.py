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
from asgiref.sync import sync_to_async  # Changed this line
from pyfactor.logging_config import get_logger
from pyfactor.db.utils import get_connection, return_connection, initialize_database_pool
from django.contrib.auth import get_user_model
from business.models import Business

logger = get_logger()

@sync_to_async
def initial_user_registration(user_data):
    """Async function to handle initial user registration"""
    try:
        from django.contrib.auth import get_user_model
        from users.models import UserProfile
        
        User = get_user_model()
        
        with transaction.atomic():
            user = User.objects.create_user(
                email=user_data['email'],
                password=user_data.get('password1'),
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', '')
            )

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

@sync_to_async
def create_user_database(user_id, business_id):
    """Creates a dynamic database for a user"""
    logger.debug(f"Starting database creation for user {user_id}")

    User = get_user_model()
    user = User.objects.get(id=user_id)
    business = Business.objects.get(id=business_id)
    
    database_name = generate_database_name(user)
    logger.debug(f"Generated database name: {database_name}, type: {type(database_name)}")
    if asyncio.iscoroutine(database_name):
            logger.warning(f"Database name is a coroutine, converting to string")
            database_name = async_to_sync(lambda: database_name)()
    return str(database_name)

    
    try:
        with transaction.atomic():
            conn = get_connection()
            conn.autocommit = True
            
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
                    if not cursor.fetchone():
                        cursor.execute(f'CREATE DATABASE "{database_name}"')
                        logger.info(f"Database {database_name} created successfully")
            finally:
                return_connection(conn)
            
            database_config = {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': database_name,
                'USER': settings.DATABASES['default']['USER'],
                'PASSWORD': settings.DATABASES['default']['PASSWORD'],
                'HOST': settings.DATABASES['default']['HOST'],
                'PORT': settings.DATABASES['default']['PORT'],
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
            }
            
            settings.DATABASES[database_name] = database_config
            connections.databases[database_name] = database_config
            
        logger.debug(f"Database name before return: {database_name}")
        return str(database_name)  # Ensure string conversion        
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        try:
            # Instead of await, call the sync version directly since we're in a sync context
            cleanup_database_sync(database_name)
        except Exception as cleanup_error:
            logger.error(f"Error during cleanup: {str(cleanup_error)}")
        raise

@sync_to_async
def setup_user_database(database_name, user, business):
    """Setup the user database"""
    try:
        with transaction.atomic():
            call_command('migrate', database=database_name)
            
            UserProfile = apps.get_model('users', 'UserProfile')
            user_profile = UserProfile.objects.get(user=user)
            user_profile.database_name = database_name
            user_profile.database_status = 'active'
            user_profile.save()
            
            populate_initial_data(database_name)
            
            logger.info(f"Database setup completed for: {database_name}")
            return True
        
    except Exception as e:
        logger.error(f"Error setting up database {database_name}: {str(e)}")
        cleanup_database(database_name)
        raise

@sync_to_async
def check_database_readiness(database_name, max_retries=10, retry_delay=0.5):
    """Check database readiness"""
    for attempt in range(max_retries):
        try:
            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                logger.info(f"Database {database_name} is ready (attempt {attempt + 1})")
                return True
            finally:
                return_connection(conn)
        except Exception as e:
            logger.warning(f"Database {database_name} not ready, retrying... (attempt {attempt + 1})")
            time.sleep(retry_delay)
    
    raise OperationalError(f"Database {database_name} not ready after {max_retries} attempts")

@sync_to_async
def populate_initial_data(database_name):
    """Populate initial data in the new database"""
    try:
        with transaction.atomic():
            AccountType = apps.get_model('finance', 'AccountType')
            
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

# Add a sync version of cleanup_database
def cleanup_database_sync(database_name):
    """Synchronous version of cleanup_database"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                    AND pid <> pg_backend_pid()
                """, [database_name])

                cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
                logger.info(f"Database {database_name} cleaned up successfully")
        finally:
            return_connection(conn)

        if database_name in connections.databases:
            del connections.databases[database_name]

        if hasattr(connections, database_name):
            delattr(connections, database_name)

        logger.info(f"Removed database {database_name} from Django connections")

    except Exception as e:
        logger.error(f"Error cleaning up database {database_name}: {str(e)}", exc_info=True)
        raise

@sync_to_async
def cleanup_database(database_name):
    """Cleanup database"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                    AND pid <> pg_backend_pid()
                """, [database_name])

                cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
                logger.info(f"Database {database_name} cleaned up successfully")
        finally:
            return_connection(conn)

        if database_name in connections.databases:
            del connections.databases[database_name]

        if hasattr(connections, database_name):
            delattr(connections, database_name)

        logger.info(f"Removed database {database_name} from Django connections")

    except Exception as e:
        logger.error(f"Error cleaning up database {database_name}: {str(e)}", exc_info=True)
        raise