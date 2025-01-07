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
from business.models import Business
from .exceptions import DatabaseError, ValidationError, ServiceUnavailableError
from onboarding.models import OnboardingProgress
from .models import UserProfile
from onboarding.utils import generate_unique_database_name

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
        pool = await DatabasePool.get_instance().get_pool('default')
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
class DatabasePool:
    """Singleton connection pool manager"""
    _instance = None
    _instance_lock = threading.Lock()
    
    def __init__(self):
        self.pools: Dict[str, asyncpg.Pool] = {}
        self.metrics: Dict[str, Dict] = {}
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
        """Clean up pools on shutdown"""
        for pool in self.pools.values():
            pool.close()
        self.pools.clear()

    async def get_pool(self, database_name: str) -> asyncpg.Pool:
        """Get or create connection pool for database"""
        async with self._lock:
            if database_name not in self.pools:
                self.pools[database_name] = await self.create_pool(database_name)
            return self.pools[database_name]

    async def close_pool(self, database_name: str):
        """Close specific pool"""
        if database_name in self.pools:
            await self.pools[database_name].close()
            del self.pools[database_name]
            
    async def create_pool(self, database_name: str) -> asyncpg.Pool:
        """Create new connection pool"""
        db_settings = settings.DATABASES[database_name]
        return await asyncpg.create_pool(
            min_size=settings.DB_POOL_OPTIONS['MIN_CONNS'],
            max_size=settings.DB_POOL_OPTIONS['MAX_CONNS'],
            host=db_settings['HOST'],
            port=db_settings['PORT'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            database=database_name,
            command_timeout=settings.DB_POOL_OPTIONS.get('COMMAND_TIMEOUT', 60.0),
            max_queries=settings.DB_POOL_OPTIONS.get('MAX_QUERIES', 50000),
            max_inactive_connection_lifetime=settings.DB_POOL_OPTIONS.get('MAX_IDLE_TIME', 300.0),
            setup=lambda conn: conn.execute('SET application_name = "pyfactor"')
        )

    async def close_all(self):
        """Close all connection pools"""
        async with self._lock:
            for pool in self.pools.values():
                await pool.close()
            self.pools.clear()


def cleanup_connections(database_name=None):
    """Clean up database connections"""
    try:
        if database_name and database_name in connections:
            connections[database_name].close()
    except Exception as e:
        logger.error(f"Error cleaning up connections: {str(e)}")

@sync_to_async
def create_user_database(user_id: str, business_id: str) -> str:
    logger.debug(f"Starting database creation for user {user_id}")
    database_name = None
    max_retries = 3
    
    try:
        user = get_user_model().objects.get(id=user_id)
        user_profile = user.profile

        # Return existing database if already set up
        if user_profile.database_name and user_profile.database_status == 'active':
            return user_profile.database_name

        database_name = generate_unique_database_name(user)

        with get_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                # Validate template exists
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [settings.USER_DATABASE_TEMPLATE])
                if not cursor.fetchone():
                    raise DatabaseError(f"Template database {settings.USER_DATABASE_TEMPLATE} does not exist")

                # Create database from template with retries
                for attempt in range(max_retries):
                    try:
                        cursor.execute(f'CREATE DATABASE "{database_name}" TEMPLATE {settings.USER_DATABASE_TEMPLATE}')
                        cursor.execute(f"""
                            ALTER DATABASE "{database_name}" 
                            SET maintenance_work_mem = '64MB'
                            SET work_mem = '4MB'
                            SET temp_file_limit = '1GB'
                            CONNECTION LIMIT {settings.DATABASE_RESOURCE_LIMITS['MAX_CONNECTIONS_PER_DB']}
                        """)
                        break
                    except OperationalError as e:
                        if attempt == max_retries - 1:
                            raise
                        time.sleep(1 * (2 ** attempt))

                # Register database in Django
                settings.DATABASES[database_name] = get_database_config(database_name)
                connections.databases[database_name] = settings.DATABASES[database_name]

                # Update user profile
                with transaction.atomic():
                    user_profile.database_name = database_name
                    user_profile.database_status = 'active'
                    user_profile.setup_status = 'pending'
                    user_profile.save(update_fields=['database_name', 'database_status', 'setup_status'])

                logger.info(f"Database {database_name} created successfully")
                return database_name

    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        if database_name:
            sync_cleanup_database(database_name)
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


async def populate_initial_data(database_name: str):
    """Populate initial data in new database"""
    try:
        pool = await DatabasePool.get_instance().get_pool(database_name)
        async with pool.acquire() as conn:
            # Add your initial data population logic here
            await conn.execute("""
                -- Add your initial data SQL here
                -- Example:
                -- INSERT INTO some_table (column) VALUES ($1)
            """)
    except Exception as e:
        logger.error(f"Error populating initial data: {str(e)}")
        raise

async def get_user_database(user):
    """Get user's database information with proper error handling"""
    try:
        profile = await sync_to_async(
            UserProfile.objects.select_related('user').get
        )(user=user)
        
        if not profile.database_name:
            logger.error(f"No database configured for user {user.email}")
            profile.setup_status = 'step1'
            await sync_to_async(profile.save)(update_fields=['setup_status'])
            raise DatabaseError("Database not configured, reset to step1")
            
        # Pass the profile to check_database_exists
        if not await check_database_exists(profile.database_name, profile):
            logger.error(f"Database {profile.database_name} does not exist")
            raise DatabaseError("Database does not exist, profile reset to step1")
            
        return profile.database_name
        
    except UserProfile.DoesNotExist:
        logger.error(f"Profile not found for user {user.email}")
        raise ValidationError("User profile not found")
    except Exception as e:
        logger.error(f"Error retrieving user database: {str(e)}")
        raise DatabaseError(str(e))

async def setup_user_database(database_name: str, user: Any, business: Any) -> bool:
    """Setup user database with migrations and initial data"""
    try:
        # Update setup status
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'in_progress'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])

        # Verify database exists and is accessible
        pool = await DatabasePool.get_instance().get_pool(database_name)
        async with pool.acquire() as conn:
            await conn.execute('SELECT 1')

        logger.info(f"Running migrations for database: {database_name}")
        await sync_to_async(call_command)('migrate', database=database_name)

        logger.info(f"Running initial data population for: {database_name}")
        await populate_initial_data(database_name)

        # Verify database setup
        tables_valid = await check_database_setup(database_name)
        if not tables_valid:
            raise DatabaseError(f"Database {database_name} setup validation failed")

        # Update setup status on success
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'complete'
            user.profile.database_status = 'active'
            await sync_to_async(user.profile.save)(
                update_fields=['setup_status', 'database_status']
            )

        logger.info(f"Database setup completed successfully for: {database_name}")
        return True

    except Exception as e:
        logger.error(f"Error setting up database {database_name}: {str(e)}")
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'error'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])
        await cleanup_database(database_name, user.profile if user else None)
        raise

async def check_database_setup(database_name: str) -> bool:
    """Check if required tables exist in database"""
    try:
        pool = await DatabasePool.get_instance().get_pool(database_name)
        async with pool.acquire() as conn:
            # Check for crucial tables
            tables = await conn.fetch("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
            """)
            required_tables = {'django_migrations', 'auth_user', 'django_content_type'}
            existing_tables = {table['tablename'] for table in tables}
            return required_tables.issubset(existing_tables)
    except Exception as e:
        logger.error(f"Error checking database setup: {str(e)}")
        return False

async def check_database_health(database_name: str) -> tuple[bool, dict]:
    """
    Check database health status with comprehensive checks
    Returns tuple of (is_healthy, details)
    """
    try:
        pool = await DatabasePool.get_instance().get_pool(database_name)
        async with pool.acquire(timeout=5.0) as conn:  
            # Basic connectivity check
            await conn.execute('SELECT 1')
            
            # Check required tables exist
            tables_valid = await check_database_setup(database_name)
            
            # Check database size and connections
            size_query = """
                SELECT pg_database_size($1) as db_size,
                       (SELECT count(*) FROM pg_stat_activity 
                        WHERE datname = $1) as connections
            """
            result = await conn.fetchrow(size_query, database_name)
            
            pool_stats = {
                "min_size": pool.get_min_size(),
                "max_size": pool.get_max_size(),
                "current_size": pool.get_size(),
                "free_size": pool.get_free_size()
            }
            
            health_status = {
                "status": "healthy" if tables_valid else "unhealthy",
                "database": database_name,
                "size_bytes": result['db_size'],
                "active_connections": result['connections'],
                "pool_stats": pool_stats,
                "tables_valid": tables_valid,
                "last_checked": timezone.now().isoformat()
            }

            return tables_valid, health_status

    except asyncpg.exceptions.CannotConnectNowError:
        logger.error(f"Cannot connect to database {database_name}")
        return False, {
            "status": "unavailable",
            "database": database_name,
            "error": "Database temporarily unavailable",
            "last_checked": timezone.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed for {database_name}: {str(e)}")
        return False, {
            "status": "error",
            "database": database_name,
            "error": str(e),
            "last_checked": timezone.now().isoformat()
        }

async def monitor_database_metrics(database_name: str):
    """Collect and store database metrics"""
    try:
        pool = await DatabasePool.get_instance().get_pool(database_name)
        async with pool.acquire() as conn:
            metrics = await conn.fetch("""
                SELECT * FROM pg_stat_database 
                WHERE datname = $1
            """, database_name)
            
            DatabasePool.get_instance().metrics[database_name] = {
                'timestamp': timezone.now(),
                'metrics': metrics
            }
            
    except Exception as e:
        logger.error(f"Monitoring failed for {database_name}: {str(e)}")

async def cleanup_database(database_name: str, user_profile=None, max_retries: int = 3):
    """Clean up database and all connections"""
    for attempt in range(max_retries):

        try:
            pool = await DatabasePool.get_instance().get_pool('default')
            async with pool.acquire() as conn:
                await conn.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity 
                    WHERE datname = $1
                """, database_name)
                
                await conn.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
            
            if database_name in DatabasePool.get_instance().pools:
                pool = DatabasePool.get_instance().pools[database_name]
                await pool.close()
                del DatabasePool.get_instance().pools[database_name]

            if database_name in connections.databases:
                del connections.databases[database_name]
            if database_name in settings.DATABASES:
                del settings.DATABASES[database_name]

            if user_profile:
                user_profile.database_status = 'inactive'
                user_profile.database_name = None
                await sync_to_async(user_profile.save)(update_fields=['database_status', 'database_name'])
            
                
            logger.info(f"Database {database_name} cleaned up successfully")
            return
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Final cleanup attempt failed: {str(e)}")
                raise
            logger.warning(f"Cleanup attempt {attempt + 1} failed: {str(e)}")
            await asyncio.sleep(1 * (2 ** attempt))  # Exponential backoff


def sync_cleanup_database(database_name):
    """Synchronous cleanup that can run DROP DATABASE"""
    try:
        with get_connection() as conn:  # using the defined get_connection function
            conn.autocommit = True  # Important: Must be in autocommit mode
            with conn.cursor() as cursor:
                # Terminate existing connections
                cursor.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity 
                    WHERE datname = %s
                """, [database_name])
                
                # Drop the database
                cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
                
    except Exception as e:
        logger.error(f"Error in sync cleanup: {str(e)}")
        raise
    finally:
        cleanup_connections(database_name)

@shared_task
def cleanup_stale_databases():
    """Periodic task to clean up stale databases"""
    try:
        pool = DatabasePool.get_instance()
        for database_name, metrics in pool.metrics.items():
            if (timezone.now() - metrics['timestamp']).days > settings.DATABASE_CLEANUP['MAX_IDLE_DAYS']:
                asyncio.run(cleanup_database(database_name))
    except Exception as e:
        logger.error(f"Stale database cleanup failed: {str(e)}")

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
        
        if not profile.database_name or profile.database_status != 'active':
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step1',
                'reason': 'no_database'
            }
            
        # Check health synchronously
        is_healthy, health_details = check_database_health(profile.database_name)
        if not is_healthy:
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step4/setup',
                'reason': 'unhealthy_database',
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
            'database': {
                'name': profile.database_name,
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