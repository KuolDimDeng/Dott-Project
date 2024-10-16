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
from asgiref.sync import sync_to_async
import logging

# Configure logger
logger = logging.getLogger(__name__)

class UserDatabaseRouter:
    def sanitize_database_name(self, database_name):
        safe_database_name = re.sub(r'[^a-zA-Z0-9_]', '', database_name)
        if safe_database_name != database_name:
            logger.warning(f"Unsafe characters removed from database name: {database_name}")
        return safe_database_name

    def create_dynamic_database(self, database_name):
        safe_database_name = self.sanitize_database_name(database_name)
        if safe_database_name not in settings.DATABASES:
            settings.DATABASES[safe_database_name] = self.build_database_config(safe_database_name)
            connections.databases[safe_database_name] = settings.DATABASES[safe_database_name]
            self.ensure_database_exists(safe_database_name)
            self.check_database_readiness(safe_database_name)
            call_command('migrate', database=safe_database_name)
        else:
            logger.warning(f"Database '{safe_database_name}' already exists in DATABASES")

    def build_database_config(self, database_name):
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': database_name,
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'OPTIONS': settings.DATABASES['default'].get('OPTIONS', {}),
            'ATOMIC_REQUESTS': settings.DATABASES['default'].get('ATOMIC_REQUESTS', True),
            'CONN_HEALTH_CHECKS': settings.DATABASES['default'].get('CONN_HEALTH_CHECKS', True),
            'CONN_MAX_AGE': settings.DATABASES['default'].get('CONN_MAX_AGE', 600),
            'TIME_ZONE': settings.TIME_ZONE,
            'AUTOCOMMIT': settings.DATABASES['default'].get('AUTOCOMMIT', True),
        }

    def ensure_database_exists(self, database_name):
        try:
            conn = psycopg2.connect(
                dbname=settings.DATABASES['default']['NAME'],
                user=settings.DATABASES['default']['USER'],
                password=settings.DATABASES['default']['PASSWORD'],
                host=settings.DATABASES['default']['HOST'],
                port=settings.DATABASES['default']['PORT']
            )
            conn.autocommit = True
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
            if not cursor.fetchone():
                cursor.execute(f'CREATE DATABASE "{database_name}"')
                logger.info(f"Database {database_name} created successfully")
        except psycopg2.Error as e:
            logger.error(f"Error creating database {database_name}: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

def check_database_readiness(self, database_name, max_retries=10, retry_delay=0.5):
    for attempt in range(max_retries):
        try:
            with connections[database_name].cursor() as cursor:
                cursor.execute("SELECT 1")
            logger.info(f"Database {database_name} is ready (attempt {attempt + 1})")
            return
        except OperationalError:
            logger.warning(f"Database {database_name} not ready, retrying... (attempt {attempt + 1})")
            time.sleep(retry_delay)
    raise OperationalError(f"Database {database_name} not ready after {max_retries} attempts")

# Async database creation function using asyncpg
async def create_database(database_name):
    conn_info = {
        "database": settings.DATABASES['default']['NAME'],
        "user": settings.DATABASES['default']['USER'],
        "password": settings.DATABASES['default']['PASSWORD'],
        "host": settings.DATABASES['default']['HOST'],
        "port": settings.DATABASES['default']['PORT'],
    }
    try:
        conn = await asyncpg.connect(**conn_info)
        try:
            await conn.execute(f'CREATE DATABASE "{database_name}"')
            logger.info(f"Database {database_name} created successfully.")
        finally:
            await conn.close()
    except Exception as e:
        logger.error(f"Error creating database: {e}")
        raise

@shared_task
def run_migrations(database_name):
    logger.info(f"Running migrations for database: {database_name}")
    call_command('migrate', database=database_name)

@shared_task
def populate_account_types(database_name):
    AccountType = apps.get_model('finance', 'AccountType')
    for account_type_name, account_type_id in ACCOUNT_TYPES.items():
        AccountType.objects.using(database_name).get_or_create(
            account_type_id=account_type_id,
            defaults={'name': account_type_name}
        )
    logger.info(f"Account types populated for database: {database_name}")

@shared_task
def generate_financial_statements_task(database_name):
    generate_financial_statements(database_name)
    logger.info(f"Financial statements generated for database: {database_name}")

def generate_database_name(user, uuid_length=8, email_prefix_length=10):
    unique_id = str(uuid.uuid4()).replace('-', '_')[:uuid_length]
    email_prefix = user.email.split('@')[0].lower()[:email_prefix_length]
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    return f"{unique_id}_{email_prefix}_{timestamp}"[:63]

async def create_user_database(user, business):
    database_name = generate_database_name(user)
    await create_database(database_name)
    settings.DATABASES[database_name] = UserDatabaseRouter().build_database_config(database_name)
    connections.databases[database_name] = settings.DATABASES[database_name]
    run_migrations.apply_async((database_name,))
    return database_name

async def initial_user_registration(user_data):
    User = apps.get_model('users', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')
    user = await sync_to_async(User.objects.create_user)(
        email=user_data['email'],
        password=user_data['password1'],
        first_name=user_data['first_name'],
        last_name=user_data['last_name']
    )
    await sync_to_async(UserProfile.objects.create)(
        user=user,
        occupation=user_data['occupation'],
        phone_number=user_data.get('phone_number', ''),
    )
    return user

async def setup_user_database(database_name, user, business):
    try:
        # Run migrations for all apps
        await sync_to_async(call_command)('migrate', database=database_name)

        # Get or create UserProfile
        UserProfile = apps.get_model('users', 'UserProfile')
        user_profile = await sync_to_async(UserProfile.objects.get)(user=user)
        
        # Update UserProfile
        user_profile.database_name = database_name
        user_profile.database_status = 'active'
        await sync_to_async(user_profile.save)()


        logger.info(f"User database setup completed for: {database_name}")
    except Exception as e:
        logger.error(f"Error setting up database {database_name}: {str(e)}")
        raise

        # Synchronous wrapper for setup_user_database
def sync_setup_user_database(database_name, user, business):
    return async_to_sync(setup_user_database)(database_name, user, business)


async def main(user_data, business):
    try:
        user = await initial_user_registration(user_data)
        database_name = await create_user_database(user, business)
        await setup_user_database(database_name, user, business)
    except Exception as e:
        logger.error(f"Error in main registration process: {str(e)}")
        raise

if __name__ == "__main__":
    user_data = {
        "email": "example@example.com",
        "password1": "password",
        "first_name": "John",
        "last_name": "Doe",
        "occupation": "Accountant"
    }
    business = {"name": "Example Business"}
    asyncio.run(main(user_data, business))
