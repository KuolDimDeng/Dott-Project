import re
import time
import uuid
import psycopg2
import asyncpg
import asyncio
import atexit
import threading
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
from django.conf import settings
from django.db import connections, OperationalError
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction
from celery import shared_task, chain
from asgiref.sync import sync_to_async
from pyfactor.logging_config import get_logger
from django.contrib.auth import get_user_model
from .models import Business
from .exceptions import DatabaseError, ValidationError, ServiceUnavailableError
from onboarding.models import OnboardingProgress
from .models import UserProfile
from onboarding.utils import generate_unique_schema_name

logger = get_logger()

def get_connection():
    """Get database connection from pool with timeout"""
    return psycopg2.connect(
        dbname=settings.DATABASES['default']['NAME'],
        user=settings.DATABASES['default']['USER'],
        password=settings.DATABASES['default']['PASSWORD'],
        host=settings.DATABASES['default']['HOST'],
        port=settings.DATABASES['default']['PORT'],
        connect_timeout=10,
        options='-c statement_timeout=30000'  # 30 second query timeout
    )
def return_connection(conn):
    """Return connection to pool"""
    if conn:
        conn.close()

# Add the missing function
async def check_database_exists(database_name: str, user_profile=None) -> bool:
    try:
        pool = await SchemaPool.get_instance().get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                database_name
            )
            exists = bool(result)
            
            # Update profile and reset if database doesn't exist
            if not exists and user_profile:
                logger.info(f"Database {database_name} does not exist, resetting profile")
                user_profile.database_status = 'inactive'
                user_profile.database_name = None
                user_profile.setup_status = 'step1'  # Reset to step1
                await sync_to_async(user_profile.save)(
                    update_fields=['database_status', 'database_name', 'setup_status']
                )
                
            return exists
    except Exception as e:
        logger.error(f"Error checking database existence: {str(e)}")
        return False

# Fix DatabasePool class indentation
class SchemaPool:
    """Singleton connection pool manager for schema operations"""
    _instance = None
    _instance_lock = threading.Lock()
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._lock = asyncio.Lock()
        atexit.register(self.cleanup)

    @classmethod
    def get_instance(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    @classmethod
    def initialize(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def cleanup(self):
        """Clean up pool on shutdown"""
        if self.pool:
            self.pool.close()
            self.pool = None

    async def get_pool(self, schema_name: Optional[str] = None) -> asyncpg.Pool:
        """Get or create connection pool for default database"""
        async with self._lock:
            if not self.pool:
                self.pool = await self.create_pool()
            
            if schema_name:
                # Create a proxy pool that sets the search path
                return SchemaPoolProxy(self.pool, schema_name)
            return self.pool

    async def create_pool(self) -> asyncpg.Pool:
        """Create new connection pool for default database"""
        db_settings = settings.DATABASES['default']
        return await asyncpg.create_pool(
            min_size=settings.DB_POOL_OPTIONS['MIN_CONNS'],
            max_size=settings.DB_POOL_OPTIONS['MAX_CONNS'],
            host=db_settings['HOST'],
            port=db_settings['PORT'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            database=db_settings['NAME'],
            command_timeout=settings.DB_POOL_OPTIONS.get('COMMAND_TIMEOUT', 60.0),
            max_queries=settings.DB_POOL_OPTIONS.get('MAX_QUERIES', 50000),
            max_inactive_connection_lifetime=settings.DB_POOL_OPTIONS.get('MAX_IDLE_TIME', 300.0),
            setup=lambda conn: conn.execute('SET application_name = "pyfactor"')
        )

    async def close_all(self):
        """Close the connection pool"""
        async with self._lock:
            if self.pool:
                await self.pool.close()
                self.pool = None

class SchemaPoolProxy:
    """Proxy class that automatically sets schema context for connections"""
    def __init__(self, pool: asyncpg.Pool, schema_name: str):
        self.pool = pool
        self.schema_name = schema_name

    @asynccontextmanager
    async def acquire(self, *args, **kwargs):
        async with self.pool.acquire(*args, **kwargs) as conn:
            await conn.execute(f'SET search_path TO "{self.schema_name}"')
            try:
                yield conn
            finally:
                await conn.execute('SET search_path TO public')


def cleanup_connections(database_name=None):
    """Clean up database connections"""
    try:
        if database_name and database_name in connections:
            connections[database_name].close()
    except Exception as e:
        logger.error(f"Error cleaning up connections: {str(e)}")

@sync_to_async
def create_user_schema(user_id: str, business_id: str) -> str:
    logger.debug(f"Starting schema creation for user {user_id}")
    schema_name = None
    max_retries = 3
    
    try:
        user = get_user_model().objects.get(id=user_id)
        user_profile = user.profile

        # Return existing schema if already set up
        if user_profile.schema_name and user_profile.database_status == 'active':
            return user_profile.schema_name

        schema_name = generate_unique_schema_name(user)

        with get_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                # Create schema with retries
                for attempt in range(max_retries):
                    try:
                        # Create schema
                        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                        
                        # Set up permissions
                        cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
                        cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
                        cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {settings.DATABASES["default"]["USER"]}')
                        
                        # Set search path for this connection
                        cursor.execute(f'SET search_path TO "{schema_name}"')
                        break
                    except OperationalError as e:
                        if attempt == max_retries - 1:
                            raise
                        time.sleep(1 * (2 ** attempt))

                # Update user profile
                with transaction.atomic():
                    user_profile.schema_name = schema_name
                    user_profile.database_status = 'active'
                    user_profile.setup_status = 'pending'
                    user_profile.save(update_fields=['schema_name', 'database_status', 'setup_status'])

                logger.info(f"Schema {schema_name} created successfully")
                return schema_name

    except Exception as e:
        logger.error(f"Error creating schema: {str(e)}")
        if schema_name:
            sync_cleanup_schema(schema_name)
        raise

def get_database_config(database_name: str) -> dict:
    """
    Get complete database configuration with all required settings.
    
    This function creates a comprehensive configuration dictionary that inherits
    from the default database settings while adding necessary customizations
    for user-specific databases.
    """
    # Start with default database settings
    base_settings = settings.DATABASES['default'].copy()
    
    # Update with specific settings for this database
    base_settings.update({
        'NAME': database_name,
        'ATOMIC_REQUESTS': True,  # Changed to True for better transaction safety
        'TIME_ZONE': settings.TIME_ZONE,
        'CONN_MAX_AGE': 60,  # Increased from 0 for better connection reuse
        'AUTOCOMMIT': True,
        'CONN_HEALTH_CHECKS': False,
        
        # Enhanced OPTIONS dictionary
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'application_name': 'pyfactor',
            
            # Add performance and safety settings
            'statement_timeout': 30000,  # 30 seconds
            'idle_in_transaction_session_timeout': 60000,  # 60 seconds
            'lock_timeout': 5000,  # 5 seconds
            
            # Add connection stability settings
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
            
            # Add resource management
            'work_mem': '4MB',
            'maintenance_work_mem': '64MB'
        }
    })
    
    return base_settings


async def populate_initial_data(schema_name: str):
    """Populate initial data in new schema"""
    try:
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire() as conn:
            # Set search path to the schema
            await conn.execute(f'SET search_path TO "{schema_name}"')
            
            # Add your initial data population logic here
            await conn.execute("""
                -- Add your initial data SQL here
                -- Example:
                -- INSERT INTO some_table (column) VALUES ($1)
            """)
    except Exception as e:
        logger.error(f"Error populating initial data: {str(e)}")
        raise
    finally:
        # Reset search path
        if pool:
            async with pool.acquire() as conn:
                await conn.execute('SET search_path TO public')

async def get_user_schema(user):
    """Get user's schema information with proper error handling"""
    try:
        profile = await sync_to_async(
            UserProfile.objects.select_related('user').get
        )(user=user)
        
        if not profile.schema_name:
            logger.error(f"No schema configured for user {user.email}")
            profile.setup_status = 'step1'
            await sync_to_async(profile.save)(update_fields=['setup_status'])
            raise DatabaseError("Schema not configured, reset to step1")
            
        # Check if schema exists
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
                profile.schema_name
            )
            if not result:
                logger.error(f"Schema {profile.schema_name} does not exist")
                profile.setup_status = 'step1'
                profile.schema_name = None
                profile.database_status = 'inactive'
                await sync_to_async(profile.save)(
                    update_fields=['setup_status', 'schema_name', 'database_status']
                )
                raise DatabaseError("Schema does not exist, profile reset to step1")
            
        return profile.schema_name
        
    except UserProfile.DoesNotExist:
        logger.error(f"Profile not found for user {user.email}")
        raise ValidationError("User profile not found")
    except Exception as e:
        logger.error(f"Error retrieving user database: {str(e)}")
        raise DatabaseError(str(e))

async def setup_user_schema(schema_name: str, user: Any, business: Any) -> bool:
    """Setup user schema with migrations and initial data"""
    try:
        # Update setup status
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'in_progress'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])

        # Get default database connection
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire() as conn:
            # Set search path to the schema
            await conn.execute(f'SET search_path TO "{schema_name}"')
            
            # Verify schema is accessible
            await conn.execute('SELECT 1')

        logger.info(f"Running migrations for schema: {schema_name}")
        await sync_to_async(call_command)('migrate', schema=schema_name)

        logger.info(f"Running initial data population for: {schema_name}")
        await populate_initial_data(schema_name)

        # Verify schema setup
        tables_valid = await check_schema_setup(schema_name)
        if not tables_valid:
            raise DatabaseError(f"Schema {schema_name} setup validation failed")

        # Update setup status on success
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'complete'
            user.profile.database_status = 'active'
            await sync_to_async(user.profile.save)(
                update_fields=['setup_status', 'database_status']
            )

        logger.info(f"Schema setup completed successfully for: {schema_name}")
        return True

    except Exception as e:
        logger.error(f"Error setting up schema {schema_name}: {str(e)}")
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'error'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])
        await cleanup_schema(schema_name, user.profile if user else None)
        raise
    finally:
        # Reset search path
        pool = await SchemaPool.get_instance().get_pool()
        async with pool.acquire() as conn:
            await conn.execute('SET search_path TO public')

async def check_schema_setup(schema_name: str) -> bool:
    """Check if required tables exist in schema"""
    try:
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire() as conn:
            # Set search path to the schema
            await conn.execute(f'SET search_path TO "{schema_name}"')
            
            # Check for crucial tables
            tables = await conn.fetch("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = $1
            """, schema_name)
            required_tables = {'django_migrations', 'auth_user', 'django_content_type'}
            existing_tables = {table['tablename'] for table in tables}
            return required_tables.issubset(existing_tables)
    except Exception as e:
        logger.error(f"Error checking schema setup: {str(e)}")
        return False
    finally:
        # Reset search path
        if pool:
            async with pool.acquire() as conn:
                await conn.execute('SET search_path TO public')

async def check_schema_health(schema_name: str) -> tuple[bool, dict]:
    """
    Check schema health status with comprehensive checks
    Returns tuple of (is_healthy, details)
    """
    try:
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire(timeout=5.0) as conn:
            # Set search path to the schema
            await conn.execute(f'SET search_path TO "{schema_name}"')
            
            # Basic connectivity check
            await conn.execute('SELECT 1')
            
            # Check required tables exist
            tables_valid = await check_schema_setup(schema_name)
            
            # Check schema size and object count
            size_query = """
                SELECT pg_total_relation_size(quote_ident($1) || '.' || quote_ident(tablename)) as schema_size,
                       count(*) as table_count
                FROM pg_tables
                WHERE schemaname = $1
                GROUP BY schemaname
            """
            result = await conn.fetchrow(size_query, schema_name)
            
            health_status = {
                "status": "healthy" if tables_valid else "unhealthy",
                "schema": schema_name,
                "size_bytes": result['schema_size'] if result else 0,
                "table_count": result['table_count'] if result else 0,
                "tables_valid": tables_valid,
                "last_checked": timezone.now().isoformat()
            }

            return tables_valid, health_status

    except asyncpg.exceptions.CannotConnectNowError:
        logger.error(f"Cannot connect to schema {schema_name}")
        return False, {
            "status": "unavailable",
            "schema": schema_name,
            "error": "Schema temporarily unavailable",
            "last_checked": timezone.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed for schema {schema_name}: {str(e)}")
        return False, {
            "status": "error",
            "schema": schema_name,
            "error": str(e),
            "last_checked": timezone.now().isoformat()
        }
    finally:
        # Reset search path
        if pool:
            async with pool.acquire() as conn:
                await conn.execute('SET search_path TO public')

async def monitor_schema_metrics(schema_name: str):
    """Collect and store schema metrics"""
    try:
        pool = await SchemaPool.get_instance().get_pool(schema_name)
        async with pool.acquire() as conn:
            metrics = await conn.fetch("""
                SELECT schemaname, n_tables, n_live_tup, n_dead_tup,
                       last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = $1
            """, schema_name)
            
            # Store metrics in memory (you might want to store these in a more permanent storage)
            return {
                'timestamp': timezone.now().isoformat(),
                'schema': schema_name,
                'metrics': [dict(m) for m in metrics]
            }
            
    except Exception as e:
        logger.error(f"Schema monitoring failed for {schema_name}: {str(e)}")
        return None

async def cleanup_schema(schema_name: str, user_profile=None, max_retries: int = 3):
    """Clean up schema and reset search path"""
    for attempt in range(max_retries):
        try:
            pool = await SchemaPool.get_instance().get_pool()
            async with pool.acquire() as conn:
                # Reset search path to public
                await conn.execute('SET search_path TO public')
                
                # Drop the schema and all objects within it
                await conn.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')

            if user_profile:
                user_profile.database_status = 'inactive'
                user_profile.schema_name = None
                await sync_to_async(user_profile.save)(update_fields=['database_status', 'schema_name'])
            
            logger.info(f"Schema {schema_name} cleaned up successfully")
            return
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Final cleanup attempt failed: {str(e)}")
                raise
            logger.warning(f"Cleanup attempt {attempt + 1} failed: {str(e)}")
            await asyncio.sleep(1 * (2 ** attempt))  # Exponential backoff


def sync_cleanup_schema(schema_name):
    """Synchronous cleanup that can drop schema"""
    try:
        with get_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                # Reset search path to public
                cursor.execute('SET search_path TO public')
                
                # Drop the schema and all objects within it
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                
    except Exception as e:
        logger.error(f"Error in sync cleanup: {str(e)}")
        raise

@shared_task
def cleanup_stale_schemas():
    """Periodic task to clean up stale schemas"""
    try:
        # Get all schemas with tenant_ prefix
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT schema_name, schema_owner
                    FROM information_schema.schemata
                    WHERE schema_name LIKE 'tenant_%'
                """)
                schemas = cursor.fetchall()

                for schema_name, schema_owner in schemas:
                    # Check if schema is still in use
                    try:
                        profile = UserProfile.objects.filter(schema_name=schema_name).first()
                        if not profile:
                            # No profile using this schema, clean it up
                            logger.info(f"Cleaning up unused schema: {schema_name}")
                            asyncio.run(cleanup_schema(schema_name))
                    except Exception as e:
                        logger.error(f"Error checking schema {schema_name}: {str(e)}")
                        continue

    except Exception as e:
        logger.error(f"Stale schema cleanup failed: {str(e)}")

@transaction.atomic
def initial_user_registration(validated_data):
    """
    Handle initial user registration including creating UserProfile
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        # Create the user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password1'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=False  # User will be activated after email verification
        )
        
        # Create associated UserProfile
        UserProfile.objects.create(
            user=user,
            user_id=user.id,
            joined_date=timezone.now()
        )
        
        return user
        
    except Exception as e:
        raise Exception(f"Failed to register user: {str(e)}")

@transaction.atomic
def validate_user_state(user):
    """Backend equivalent of frontend validateUserState"""
    try:
        profile = UserProfile.objects.select_related('user', 'business').get(user=user)
        progress = OnboardingProgress.objects.get(user=user)
        
        if not profile.schema_name or profile.database_status != 'active':
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step1',
                'reason': 'no_schema'
            }
            
        # Check health synchronously
        is_healthy, health_details = check_schema_health(profile.schema_name)
        if not is_healthy:
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step4/setup',
                'reason': 'unhealthy_schema',
                'details': health_details
            }
            
        if not progress.is_complete or progress.onboarding_status != 'complete':
            return {
                'isValid': False,
                'redirectTo': f'/onboarding/{progress.onboarding_status or "step1"}',
                'reason': 'incomplete_onboarding'
            }
            
        return {
            'isValid': True,
            'redirectTo': '/dashboard',
            'reason': 'all_valid',
            'schema': {
                'name': profile.schema_name,
                'status': profile.database_status,
                'health': health_details
            }
        }
    except UserProfile.DoesNotExist:
        logger.error(f"Profile not found for user: {user.id}")
        return {
            'isValid': False, 
            'redirectTo': '/onboarding/step1',
            'reason': 'profile_not_found'
        }
    except OnboardingProgress.DoesNotExist:
        logger.error(f"Onboarding progress not found for user: {user.id}")
        return {
            'isValid': False,
            'redirectTo': '/onboarding/step1', 
            'reason': 'progress_not_found'
        }
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            'isValid': False,
            'redirectTo': '/error',
            'reason': 'validation_error',
            'error': str(e)
        }

def check_subscription_status(user):
    """
    Check if the user's subscription has expired and update accordingly.
    Returns a tuple of (is_expired, previously_plan) if expired, otherwise (False, current_plan).
    """
    from users.models import Subscription, UserProfile
    from custom_auth.cognito import update_user_attributes
    
    logger.debug(f"Checking subscription status for user {user.email}")
    
    try:
        # Get the user profile with business
        profile = UserProfile.objects.select_related('business').get(user=user)
        
        if not profile.business:
            logger.debug(f"No business found for user {user.email}")
            return False, "free"
            
        # Find the active subscription
        subscription = Subscription.objects.filter(
            business=profile.business,
            is_active=True
        ).first()
        
        if not subscription:
            logger.debug(f"No active subscription found for user {user.email}, assuming free plan")
            return False, "free"
            
        # Check if subscription has an end date and if it has passed
        if subscription.end_date and subscription.end_date < timezone.now().date():
            logger.info(f"Subscription expired for user {user.email}, downgrading from {subscription.selected_plan} to free")
            
            # Remember the previous plan
            previous_plan = subscription.selected_plan
            
            # Update subscription in database
            subscription.is_active = False
            subscription.save()
            
            # Update Cognito attribute
            try:
                update_user_attributes(user.username, {
                    'custom:subplan': 'free'
                })
                logger.info(f"Updated Cognito attributes for user {user.username}")
            except Exception as e:
                logger.error(f"Failed to update Cognito attributes: {str(e)}")
            
            return True, previous_plan
        
        # Subscription is still active
        logger.debug(f"Subscription is active for user {user.email}, plan: {subscription.selected_plan}")
        return False, subscription.selected_plan
        
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user.email}")
        return False, "free"
    except Exception as e:
        logger.error(f"Error checking subscription status: {str(e)}")
        return False, "free"


def get_tenant_database(user):
    """
    Synchronous helper function to get the correct tenant/schema name
    for a user, considering all possible storage locations.
    """
    try:
        if not user:
            return None
            
        from users.models import UserProfile
        
        # Get the user profile
        user_profile = UserProfile.objects.using('default').get(user=user)
        
        # Get the database name from the tenant
        database_name = None
        
        # First try tenant relationship - new approach
        if user_profile.tenant and user_profile.tenant.schema_name:
            database_name = user_profile.tenant.schema_name
            
        # Then try schema_name directly on profile - new approach
        elif user_profile.schema_name:
            database_name = user_profile.schema_name
            
        # Next try database_name - legacy approach
        elif hasattr(user_profile, 'database_name') and user_profile.database_name:
            database_name = user_profile.database_name
            
        # Fallback to a deterministic name based on user ID
        else:
            database_name = f"tenant_{user.id}".replace('-', '_')
            
        # Initialize the database connection
        from django.db import connections
        if database_name and database_name not in connections:
            # Initialize the database connection if not already done
            from django.db.utils import ConnectionRouter
            router = ConnectionRouter()
            db_config = get_database_config(database_name)
            connections.databases[database_name] = db_config
            
        return database_name
            
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return None
    except Exception as e:
        logger.error(f"Error getting tenant database: {str(e)}")
        return None

def get_business_for_user(user):
    """
    Safely retrieve the business associated with a user without using select_related.
    
    This utility function handles the case where UserProfile.business is a property, 
    not a foreign key, and thus can't be used with select_related.
    
    Args:
        user: The user object to retrieve the business for
        
    Returns:
        Business instance if found, None otherwise
    """
    from users.models import UserProfile, Business
    
    try:
        # First try to find through UserProfile
        profile = UserProfile.objects.filter(user=user).first()
        if profile and profile.business_id:
            return Business.objects.get(id=profile.business_id)
            
        # If not found, try OnboardingProgress
        from onboarding.models import OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress and progress.business_id:
            return Business.objects.get(id=progress.business_id)
            
        return None
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting business for user {user.id}: {str(e)}")
        return None