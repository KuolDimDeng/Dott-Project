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
from typing import Optional, Dict, Any, Tuple
from typing import Optional
from django.core.cache import cache

logger = get_logger()


class SchemaSetupState:
    """
    Manages persistent state tracking for schema setup operations.
    
    This class provides a way to maintain setup progress across task restarts
    or failures, ensuring we can recover and track the setup process reliably.
    """
    def __init__(self, user_id: str):
        self.cache_key = f"setup_state_{user_id}"
        self.user_id = user_id
        
    async def save_state(self, state: dict):
        """
        Saves the current setup state with expiration.
        
        The state includes:
        - current_phase: The setup phase being executed
        - progress: Numerical progress percentage
        - schema_name: Name of schema being created
        - last_updated: Timestamp of last update
        """
        state['last_updated'] = timezone.now().isoformat()
        await cache.set(self.cache_key, state, timeout=3600)
        logger.debug(f"Saved setup state for user {self.user_id}: {state}")
        
    async def get_state(self) -> Optional[dict]:
        """
        Retrieves the current setup state if it exists.
        Returns None if no state is found.
        """
        state = await cache.get(self.cache_key)
        logger.debug(f"Retrieved setup state for user {self.user_id}: {state}")
        return state
        
    async def clear_state(self):
        """Removes the setup state, typically called after successful completion"""
        await cache.delete(self.cache_key)
        logger.debug(f"Cleared setup state for user {self.user_id}")

def get_schema_settings(schema_name: str) -> dict:
    """Creates a comprehensive schema configuration."""
    # Start with a safe copy of essential settings
    base_settings = {
        'ENGINE': settings.DATABASES['default'].get('ENGINE', 'django.db.backends.postgresql'),
        'USER': settings.DATABASES['default'].get('USER', ''),
        'PASSWORD': settings.DATABASES['default'].get('PASSWORD', ''),
        'HOST': settings.DATABASES['default'].get('HOST', 'localhost'),
        'PORT': settings.DATABASES['default'].get('PORT', '5432'),
        'NAME': settings.DATABASES['default'].get('NAME', ''),
        'SCHEMA': schema_name,
        
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
        'application_name': f'pyfactor_{schema_name}',
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
        'options': f'-c search_path={schema_name},public'
    }
    
    return base_settings
    
def setup_schema_parameters(schema_name: str, conn) -> None:
    """
    Configures PostgreSQL runtime parameters for a newly created schema. These settings
    ensure proper schema operation and isolation.
    """
    try:
        with conn.cursor() as cursor:
            # Set search path for the schema
            cursor.execute(f'SET search_path TO "{schema_name}"')
            
            # Grant necessary privileges
            cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
            cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
            cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {settings.DATABASES["default"]["USER"]}')
            
            # Set schema-specific parameters
            cursor.execute(f'ALTER ROLE {settings.DATABASES["default"]["USER"]} SET search_path TO "{schema_name}"')
            
    except Exception as e:
        logger.error(f"Schema parameter setup failed: {str(e)}")
        raise

@contextmanager
def timeout(seconds: int):
    """
    Creates a reliable timeout context for database operations that might hang.
    Uses SIGALRM for consistent timeout management across different operation types.
    """
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
        signal.signal(signal.SIGALRM, previous_handler)

@contextmanager
def get_db_connection(schema_name: Optional[str] = None,
                     autocommit: Optional[bool] = None,
                     for_migrations: bool = False) -> psycopg2.extensions.connection:
    """
    Manages database connections with schema support and comprehensive error handling.
    Ensures connections are properly configured for schema access and cleanup.
    
    Args:
        schema_name: Optional schema name to set in search_path
        autocommit: Whether to set autocommit mode
        for_migrations: Set to True when connection will be used for migrations,
                       which increases the statement timeout to 3 minutes
    """
    conn = None
    try:
        # Build connection parameters with proper defaults
        conn_params = {
            'dbname': settings.DATABASES['default']['NAME'],
            'user': settings.DATABASES['default']['USER'],
            'password': settings.DATABASES['default']['PASSWORD'],
            'host': settings.DATABASES['default']['HOST'],
            'port': settings.DATABASES['default']['PORT'],
            'connect_timeout': 10,
            'application_name': f'pyfactor_connection_{schema_name or "default"}'
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
            if schema_name:
                cursor.execute(f'SET search_path TO "{schema_name}"')
        
        yield conn
        
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {str(e)}", exc_info=True)
        raise
        
    finally:
        if conn and not conn.closed:
            try:
                conn.close()
            except Exception as e:
                logger.error(f"Error closing connection: {str(e)}", exc_info=True)

def check_schema_health(schema_name: str) -> Tuple[bool, str]:
    """
    Performs a comprehensive health check on the specified schema, testing multiple
    aspects of schema functionality to ensure it's properly set up and accessible.
    
    Returns a tuple of (is_healthy, message) where message explains any failures.
    """
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Set schema context
                cursor.execute(f'SET search_path TO "{schema_name}"')
                
                # Test schema existence
                cursor.execute("""
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                if not cursor.fetchone():
                    return False, "Schema does not exist"
                
                # Test basic connectivity
                cursor.execute('SELECT 1')
                if not cursor.fetchone():
                    return False, "Basic connectivity test failed"
                
                # Test temporary table creation
                cursor.execute("""
                    CREATE TEMPORARY TABLE health_check (
                        id serial PRIMARY KEY,
                        created_at timestamp DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Test transaction support
                cursor.execute("INSERT INTO health_check DEFAULT VALUES")
                cursor.execute("SELECT count(*) FROM health_check")
                if cursor.fetchone()[0] != 1:
                    return False, "Transaction test failed"
                    
                return True, "All health checks passed"
            
    except Exception as e:
        error_message = f"Health check failed: {str(e)}"
        logger.error(error_message, exc_info=True)
        return False, error_message

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

async def validate_setup_prerequisites(user_id: str):
    # Check for existing setup
    existing_setup = await cache.get(f"setup_in_progress_{user_id}")
    if existing_setup:
        raise SetupInProgressError("Setup already in progress")
        
    # Verify system resources
    if not await check_system_resources():
        raise InsufficientResourcesError("System resources not available")