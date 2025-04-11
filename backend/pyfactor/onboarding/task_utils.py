# onboarding/task_utils.py
import signal
import asyncio
import psycopg2
from django.utils import timezone  # Add this at the top
from django.conf import settings
from django.db import connections, transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from contextlib import contextmanager
from pyfactor.logging_config import get_logger
from typing import Optional, Dict, Any, Tuple, Generator, Iterator
from django.core.cache import cache
import re
import time
import logging
import uuid
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Import tenant context functions properly
from custom_auth.rls import set_current_tenant_id

logger = logging.getLogger(__name__)


class SchemaSetupState:
    """
    Manages schema setup state across multiple steps using Redis cache.
    This provides resumability of setup tasks and progress tracking.
    """
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_key = f'schema_setup:{user_id}'
        
    async def save_state(self, state: dict) -> None:
        """
        Saves the current setup state to the cache with expiry.
        """
        await asyncio.to_thread(cache.set, self.cache_key, state, timeout=3600)
        logger.debug(f"Saved setup state for user {self.user_id}: {state}")
        
    async def get_state(self) -> Optional[dict]:
        """
        Retrieves the current setup state if it exists.
        Returns None if no state is found.
        """
        state = await asyncio.to_thread(cache.get, self.cache_key)
        logger.debug(f"Retrieved setup state for user {self.user_id}: {state}")
        return state
        
    async def clear_state(self) -> None:
        """Removes the setup state, typically called after successful completion"""
        await asyncio.to_thread(cache.delete, self.cache_key)
        logger.debug(f"Cleared setup state for user {self.user_id}")

def get_schema_settings(tenant_id: uuid.UUID) -> dict:
    """Creates a comprehensive schema configuration."""
    # Generate schema name from tenant ID for backward compatibility
    schema_name = f"tenant_{str(tenant_id).replace('-', '_')}"
    
    # Start with a safe copy of essential settings
    base_settings = {
        'ENGINE': settings.DATABASES['default'].get('ENGINE', 'django.db.backends.postgresql'),
        'USER': settings.DATABASES['default'].get('USER', ''),
        'PASSWORD': settings.DATABASES['default'].get('PASSWORD', ''),
        'HOST': settings.DATABASES['default'].get('HOST', 'localhost'),
        'PORT': settings.DATABASES['default'].get('PORT', '5432'),
        'NAME': settings.DATABASES['default'].get('NAME', ''),
        'TENANT_ID': tenant_id,
        'SCHEMA': schema_name,  # Keep for backward compatibility
        
        # Django-specific settings with safe defaults
        'ATOMIC_REQUESTS': True,
        'TIME_ZONE': getattr(settings, 'TIME_ZONE', 'UTC'),
        'CONN_MAX_AGE': 60,
        'AUTOCOMMIT': True,
        'CONN_HEALTH_CHECKS': False,
    }
    
    # Add options safely
    base_settings['OPTIONS'] = {
        'connect_timeout': 10,
        'client_encoding': 'UTF8',
        'application_name': f'pyfactor_{tenant_id}',
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
        'options': f'-c search_path=public'
    }
    
    return base_settings
    
def setup_schema_parameters(tenant_id: uuid.UUID) -> None:
    """
    Configures PostgreSQL runtime parameters for a tenant.
    These settings ensure proper operation and isolation.
    """
    schema_name = f"tenant_{str(tenant_id).replace('-', '_')}"
    try:
        # Create a connection for this operation
        with get_db_connection(tenant_id=tenant_id, autocommit=True) as conn:
            with conn.cursor() as cursor:
                # Set tenant context instead of search path
                set_current_tenant_id(tenant_id)
                
                # Grant necessary privileges if still using schemas
                cursor.execute(f'GRANT USAGE ON SCHEMA "public" TO {settings.DATABASES["default"]["USER"]}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" TO {settings.DATABASES["default"]["USER"]}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO {settings.DATABASES["default"]["USER"]}')
                
    except Exception as e:
        logger.error(f"Schema parameter setup failed: {str(e)}")
        raise

@contextmanager
def timeout(seconds: int) -> Generator[None, None, None]:
    """
    Creates a reliable timeout context for database operations that might hang.
    Uses SIGALRM for consistent timeout management across different operation types.
    Falls back to a simple sleep-based timeout when running in a non-main thread.
    """
    import threading
    import time
    
    # Check if we're in the main thread
    is_main_thread = threading.current_thread() is threading.main_thread()
    logger.debug(f"Timeout context: running in {'main' if is_main_thread else 'non-main'} thread")
    
    if is_main_thread:
        # Use SIGALRM for timeout in main thread
        def timeout_handler(signum, frame):
            raise asyncio.TimeoutError(
                f"Operation timed out after {seconds} seconds. This protects against "
                "hanging database operations."
            )

        previous_handler = signal.getsignal(signal.SIGALRM)
        try:
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            yield
        finally:
            signal.alarm(0)
            # Close all connections to prevent connection leaks on timeout
            try:
                from django.db import connections
                connections.close_all()
                logger.debug(f"Closed all connections after timeout operation")
            except Exception as e:
                logger.error(f"Error closing connections: {str(e)}")

            signal.signal(signal.SIGALRM, previous_handler)
    else:
        # Use a thread-based timeout for non-main threads
        logger.debug(f"Using thread-based timeout in non-main thread (seconds={seconds})")
        start_time = time.time()
        try:
            yield
        finally:
            elapsed = time.time() - start_time
            logger.debug(f"Thread-based timeout: operation took {elapsed:.2f}s (limit: {seconds}s)")
            if elapsed > seconds:
                logger.warning(f"Operation exceeded timeout of {seconds}s (took {elapsed:.2f}s)")

@contextmanager
def get_db_connection(tenant_id=None,
                     schema_name=None,  # Keep for backward compatibility
                     autocommit=None,
                     for_migrations=False) -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Manages database connections with tenant context support and comprehensive error handling.
    
    Args:
        tenant_id: Optional tenant ID to set for RLS
        schema_name: Optional schema name (kept for backward compatibility)
        autocommit: Whether to set autocommit mode
        for_migrations: Set to True when connection will be used for migrations,
                       which increases the statement timeout to 3 minutes
    """
    conn = None
    try:
        # Build connection parameters with proper defaults
        # Memory optimization: Close all Django connections before creating a new one
        from django.db import connections
        connections.close_all()
        logger.debug("Closed all Django connections before creating a new psycopg2 connection")

        # Generate connection name based on tenant ID or schema name
        conn_name = tenant_id or schema_name or "default"
        conn_params = {
            'dbname': settings.DATABASES['default']['NAME'],
            'user': settings.DATABASES['default']['USER'],
            'password': settings.DATABASES['default']['PASSWORD'],
            'host': settings.DATABASES['default']['HOST'],
            'port': settings.DATABASES['default']['PORT'],
            'connect_timeout': 10,
            'application_name': f'pyfactor_connection_{conn_name}'
        }
        
        conn = psycopg2.connect(**conn_params)
        
        # Configure connection properties immediately after connection
        # This must be done before any transaction begins
        if autocommit is not None:
            # Set isolation level directly to avoid transaction issues
            if autocommit:
                conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
            else:
                conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
            
        # Set session parameters for better reliability
        with conn.cursor() as cursor:
            # Use longer timeout for migrations
            if for_migrations:
                cursor.execute("SET statement_timeout = '180s'")  # 3 minutes for migrations
            else:
                cursor.execute("SET statement_timeout = '30s'")   # 30 seconds for regular operations
                
            cursor.execute("SET lock_timeout = '5s'")
            
            # Set tenant context if tenant_id is provided
            if tenant_id:
                set_current_tenant_id(tenant_id)
            
            # Set default search path to public
            cursor.execute('SET search_path TO public')
        
        yield conn
        
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {str(e)}", exc_info=True)
        raise
        
    finally:
        if conn and not conn.closed:
            # Close all Django connections to prevent connection leaks
            try:
                from django.db import connections
                connections.close_all()
                logger.debug("Closed all Django connections after psycopg2 connection operation")
            except Exception as e:
                logger.error(f"Error closing Django connections: {str(e)}")
            
            # Close the psycopg2 connection
            try:
                conn.close()
                logger.debug("Closed psycopg2 connection")
            except Exception as e:
                logger.error(f"Error closing psycopg2 connection: {str(e)}")

def check_schema_health(tenant_id: uuid.UUID) -> Tuple[bool, str]:
    """
    Checks the health of a schema and ensures all essential tables exist.
    
    Args:
        tenant_id: The UUID of the tenant to check
        
    Returns:
        Tuple of (is_healthy, message)
    """
    schema_name = f"tenant_{str(tenant_id).replace('-', '_')}"
    try:
        # Create a connection for this check
        with get_db_connection(tenant_id=tenant_id, autocommit=True) as conn:
            with conn.cursor() as cursor:
                # Check if essential tables exist
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name IN ('users_userprofile', 'users_business', 'onboarding_onboardingprogress')
                """)
                
                rows = cursor.fetchall()
                tables = [row[0] for row in rows]
                
                if len(tables) < 3:
                    missing = set(['users_userprofile', 'users_business', 'onboarding_onboardingprogress']) - set(tables)
                    return False, f"Missing essential tables: {', '.join(missing)}"
                
                # Check if schema_health table exists and has recent healthy record
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'schema_health'
                    )
                """)
                
                result = cursor.fetchone()
                has_health_table = result[0] if result is not None else False
                
                if has_health_table:
                    cursor.execute("""
                        SELECT status, message, checked_at 
                        FROM schema_health
                        ORDER BY checked_at DESC
                        LIMIT 1
                    """)
                    
                    health_record = cursor.fetchone()
                    if health_record:
                        status, message, checked_at = health_record
                        if status == 'healthy':
                            return True, f"Schema is healthy: {message}"
                        else:
                            return False, f"Schema health status: {status} - {message}"
                    else:
                        return False, "No health records found in schema_health table"
                else:
                    # Create health table if it doesn't exist
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS schema_health (
                            id SERIAL PRIMARY KEY,
                            checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            status VARCHAR(50) NOT NULL,
                            message TEXT
                        )
                    """)
                    
                    # Add initial health record
                    cursor.execute("""
                        INSERT INTO schema_health (status, message)
                        VALUES (%s, %s)
                    """, ('checking', 'Initial health check'))
                    
                    return True, "Created schema_health table and initialized health tracking"
    
    except Exception as e:
        logger.error(f"Schema health check failed: {str(e)}", exc_info=True)
        return False, f"Health check error: {str(e)}"

async def send_async_notification(user_id: str, event_type: str, data: Dict[str, Any]) -> bool:
    """
    Sends asynchronous notifications through WebSocket with proper error handling.
    
    Args:
        user_id: ID of user to notify
        event_type: Type of notification event
        data: Dictionary containing notification data
        
    Returns:
        Boolean indicating if notification was sent successfully
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.error("Channel layer not available")
            return False
            
        await channel_layer.group_send(
            f"user_{user_id}",
            {
                "type": event_type,
                "data": {
                    **data,
                    'timestamp': timezone.now().isoformat()
                }
            }
        )
        return True
        
    except Exception as e:
        logger.error(f"WebSocket notification error: {str(e)}")
        return False

class SetupInProgressError(Exception):
    """Raised when setup is already in progress for a user."""
    pass

class InsufficientResourcesError(Exception):
    """Raised when system resources are insufficient for setup."""
    pass

def check_system_resources() -> Tuple[bool, str]:
    """
    Checks if system has sufficient resources for setup.
    Returns (is_sufficient, message).
    """
    # Implement system resource checks here
    return True, "System resources sufficient"

async def validate_setup_prerequisites(user_id: str) -> None:
    """
    Validates prerequisites for setup process.
    Raises SetupInProgressError if setup is already in progress.
    Raises InsufficientResourcesError if system resources are insufficient.
    """
    # Check for existing setup
    state_manager = SchemaSetupState(user_id)
    current_state = await state_manager.get_state()
    
    if current_state:
        raise SetupInProgressError("Setup is already in progress")
    
    # Check system resources
    is_sufficient, message = check_system_resources()
    if not is_sufficient:
        raise InsufficientResourcesError(message)