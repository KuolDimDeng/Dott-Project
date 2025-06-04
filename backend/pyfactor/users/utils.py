import re
import time
import uuid
import psycopg2
import asyncpg
import asyncio
import atexit
import threading
from typing import Optional, Dict, Any, Union, Tuple
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
from onboarding.utils import generate_unique_tenant_id

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
            asyncio.run(self.close_pool())
            self.pool = None

    async def close_pool(self):
        if self.pool:
            await self.pool.close()

    async def get_pool(self, tenant_id: Optional[uuid.UUID] = None) -> asyncpg.Pool:
        """Get or create connection pool for default database"""
        async with self._lock:
            if not self.pool:
                self.pool = await self.create_pool()
            
            if tenant_id:
                # Create a proxy pool that sets the tenant context
                return SchemaPoolProxy(self.pool, tenant_id)
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
    def __init__(self, pool: asyncpg.Pool, tenant_id: uuid.UUID):
        self.pool = pool
        self.tenant_id = tenant_id

    @asynccontextmanager
    async def acquire(self, *args, **kwargs):
        from custom_auth.rls import set_current_tenant_id
        
        async with self.pool.acquire(*args, **kwargs) as conn:
            # Set tenant context instead of schema
            await conn.execute(f"SET app.current_tenant = '{self.tenant_id}'")
            try:
                yield conn
            finally:
                await conn.execute('-- RLS: No need to set search_path with tenant-aware context')
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
    tenant_id = None
    max_retries = 3
    
    try:
        user = get_user_model().objects.get(id=user_id)
        user_profile = user.profile

        # Return existing tenant_id if already set up
        if user_profile.tenant_id and user_profile.database_status == 'active':
            return str(user_profile.tenant_id)

        tenant_id = generate_unique_tenant_id(user)

        with get_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                # Set up permissions
                for attempt in range(max_retries):
                    try:
                        # Set tenant context for this connection
                        from custom_auth.rls import set_current_tenant_id
                        set_current_tenant_id(tenant_id)
                        break
                    except OperationalError as e:
                        if attempt == max_retries - 1:
                            raise
                        time.sleep(1 * (2 ** attempt))

                # Update user profile
                with transaction.atomic():
                    user_profile.tenant_id = tenant_id
                    user_profile.database_status = 'active'
                    user_profile.setup_status = 'pending'
                    user_profile.save(update_fields=['tenant_id', 'database_status', 'setup_status'])

                logger.info(f"Tenant {tenant_id} created successfully")
                return str(tenant_id)

    except Exception as e:
        logger.error(f"Error creating tenant: {str(e)}")
        if tenant_id:
            sync_cleanup_schema(tenant_id)
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


async def populate_initial_data(tenant_id: uuid.UUID) -> None:
    """Populate initial data in new schema"""
    try:
        pool = await SchemaPool.get_instance().get_pool(tenant_id)
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

async def get_user_schema(user):
    """Get user's tenant information with proper error handling"""
    try:
        profile = await sync_to_async(
            UserProfile.objects.select_related('user').get
        )(user=user)
        
        if not profile.tenant_id:
            logger.error(f"No tenant configured for user {user.email}")
            profile.setup_status = 'step1'
            await sync_to_async(profile.save)(update_fields=['setup_status'])
            raise DatabaseError("Tenant not configured, reset to step1")
            
        # Set tenant context
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(profile.tenant_id)
            
        return profile.tenant_id
        
    except UserProfile.DoesNotExist:
        logger.error(f"Profile not found for user {user.email}")
        raise ValidationError("User profile not found")
    except Exception as e:
        logger.error(f"Error retrieving user tenant: {str(e)}")
        raise DatabaseError(str(e))

async def setup_user_schema(tenant_id: uuid.UUID) -> bool:
    """Setup user schema with migrations and initial data"""
    try:
        # Update setup status for user if available
        user = None  # This should be passed in or retrieved
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'in_progress'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])

        # Initialize tenant environment with RLS
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)

        # Populate initial data
        await populate_initial_data(tenant_id)

        # Verify tenant setup
        tables_valid = await check_schema_setup(tenant_id)
        if not tables_valid:
            raise DatabaseError(f"Tenant {tenant_id} setup validation failed")

        # Update setup status on success
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'complete'
            user.profile.database_status = 'active'
            await sync_to_async(user.profile.save)(
                update_fields=['setup_status', 'database_status']
            )

        logger.info(f"Tenant setup completed successfully for: {tenant_id}")
        return True

    except Exception as e:
        logger.error(f"Error setting up tenant {tenant_id}: {str(e)}")
        if user and hasattr(user, 'profile'):
            user.profile.setup_status = 'error'
            await sync_to_async(user.profile.save)(update_fields=['setup_status'])
        await cleanup_schema(tenant_id)
        raise

async def check_schema_setup(tenant_id: uuid.UUID) -> bool:
    """Check if required tables exist for tenant"""
    try:
        # Set tenant context
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)
        
        pool = await SchemaPool.get_instance().get_pool()
        async with pool.acquire() as conn:
            # Check for crucial tables in public schema with RLS
            tables = await conn.fetch("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
            """)
            required_tables = {'django_migrations', 'auth_user', 'django_content_type'}
            existing_tables = {table['tablename'] for table in tables}
            return required_tables.issubset(existing_tables)
    except Exception as e:
        logger.error(f"Error checking tenant setup: {str(e)}")
        return False

async def check_schema_health(tenant_id: uuid.UUID) -> Tuple[bool, dict]:
    """
    Check tenant health status with comprehensive checks
    Returns tuple of (is_healthy, details)
    """
    try:
        # Set tenant context
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)
        
        pool = await SchemaPool.get_instance().get_pool()
        async with pool.acquire(timeout=5.0) as conn:
            # Basic connectivity check
            await conn.execute('SELECT 1')
            
            # Check required tables exist
            tables_valid = await check_schema_setup(tenant_id)
            
            # Check schema size and object count
            size_query = """
                SELECT SUM(pg_total_relation_size(quote_ident(tablename))) as schema_size,
                       count(*) as table_count
                FROM pg_tables
                WHERE schemaname = 'public'
            """
            result = await conn.fetchrow(size_query)
            
            health_status = {
                "status": "healthy" if tables_valid else "unhealthy",
                "tenant_id": str(tenant_id),
                "size_bytes": result['schema_size'] if result else 0,
                "table_count": result['table_count'] if result else 0,
                "tables_valid": tables_valid,
                "last_checked": timezone.now().isoformat()
            }

            return tables_valid, health_status

    except asyncpg.exceptions.CannotConnectNowError:
        logger.error(f"Cannot connect to tenant {tenant_id}")
        return False, {
            "status": "unavailable",
            "tenant_id": str(tenant_id),
            "error": "Tenant temporarily unavailable",
            "last_checked": timezone.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed for tenant {tenant_id}: {str(e)}")
        return False, {
            "status": "error",
            "tenant_id": str(tenant_id),
            "error": str(e),
            "last_checked": timezone.now().isoformat()
        }

async def monitor_schema_metrics(tenant_id: uuid.UUID) -> Optional[Dict]:
    """Collect and store tenant metrics"""
    try:
        # Set tenant context
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)
        
        pool = await SchemaPool.get_instance().get_pool()
        async with pool.acquire() as conn:
            metrics = await conn.fetch("""
                SELECT 'public' as schemaname, 
                       count(*) as n_tables, 
                       sum(n_live_tup) as n_live_tup, 
                       sum(n_dead_tup) as n_dead_tup,
                       min(last_vacuum) as last_vacuum, 
                       min(last_autovacuum) as last_autovacuum, 
                       min(last_analyze) as last_analyze, 
                       min(last_autoanalyze) as last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
            """)
            
            # Store metrics in memory (you might want to store these in a more permanent storage)
            return {
                'timestamp': timezone.now().isoformat(),
                'tenant_id': str(tenant_id),
                'metrics': [dict(m) for m in metrics]
            }
            
    except Exception as e:
        logger.error(f"Tenant monitoring failed for {tenant_id}: {str(e)}")
        return None

async def cleanup_schema(tenant_id: uuid.UUID, user_profile=None) -> None:
    """Clean up tenant-specific data"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Update user profile if provided
            if user_profile:
                user_profile.database_status = 'inactive'
                user_profile.tenant_id = None
                await sync_to_async(user_profile.save)(update_fields=['database_status', 'tenant_id'])
            
            logger.info(f"Tenant {tenant_id} cleaned up successfully")
            return
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Final cleanup attempt failed: {str(e)}")
                raise
            logger.warning(f"Cleanup attempt {attempt + 1} failed: {str(e)}")
            await asyncio.sleep(1 * (2 ** attempt))  # Exponential backoff


def sync_cleanup_schema(tenant_id: uuid.UUID) -> None:
    """Synchronous cleanup for tenant data"""
    try:
        # Clear tenant from user profile
        UserProfile.objects.filter(tenant_id=tenant_id).update(
            tenant_id=None,
            database_status='inactive'
        )
                
    except Exception as e:
        logger.error(f"Error in sync cleanup: {str(e)}")
        raise

@shared_task
def cleanup_stale_schemas():
    """Periodic task to clean up stale tenants"""
    try:
        # Find orphaned tenant IDs
        from custom_auth.models import Tenant
        
        # Get tenants without associated profiles
        orphaned_tenants = Tenant.objects.filter(owner_id__isnull=True)
        
        for tenant in orphaned_tenants:
            try:
                logger.info(f"Cleaning up orphaned tenant: {tenant.id}")
                # Use synchronous cleanup for each tenant
                sync_cleanup_schema(tenant.id)
                
                # Delete the tenant record
                tenant.delete()
            except Exception as e:
                logger.error(f"Error cleaning up tenant {tenant.id}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Stale tenant cleanup failed: {str(e)}")

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
        
        if not profile.tenant_id or profile.database_status != 'active':
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step1',
                'reason': 'no_tenant'
            }
            
        # Check health synchronously
        is_healthy, health_details = check_schema_health(profile.tenant_id)
        if not is_healthy:
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step4/setup',
                'reason': 'unhealthy_tenant',
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
            'tenant': {
                'id': str(profile.tenant_id),
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
            
            # Log the subscription update (Auth0 attributes handled elsewhere)
            logger.info(f"Subscription updated to free plan for user {user.email}")
            
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
    Synchronous helper function to get the correct tenant ID
    for a user.
    """
    try:
        if not user:
            return None
            
        from users.models import UserProfile
        
        # Get the user profile
        user_profile = UserProfile.objects.using('default').get(user=user)
        
        # Get the tenant ID
        if user_profile.tenant_id:
            return str(user_profile.tenant_id)
            
        # Fallback to a deterministic ID based on user ID
        return None
            
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