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


class DatabaseSetupState:
    """
    Manages persistent state tracking for database setup operations.
    
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
        - database_name: Name of database being created
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

def get_database_settings(database_name: str) -> dict:
    """Creates a comprehensive database configuration."""
    # Start with a safe copy of essential settings
    base_settings = {
        'ENGINE': settings.DATABASES['default'].get('ENGINE', 'django.db.backends.postgresql'),
        'USER': settings.DATABASES['default'].get('USER', ''),
        'PASSWORD': settings.DATABASES['default'].get('PASSWORD', ''),
        'HOST': settings.DATABASES['default'].get('HOST', 'localhost'),
        'PORT': settings.DATABASES['default'].get('PORT', '5432'),
        'NAME': database_name,
        
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
        'application_name': f'pyfactor_{database_name}',
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
    }
    
    return base_settings
    
def setup_database_parameters(database_name: str, conn) -> None:
    """
    Configures PostgreSQL runtime parameters for a newly created database. These settings
    cannot be included in the connection string but are essential for proper operation.
    """
    try:
        with conn.cursor() as cursor:
            # Acquire advisory lock
            cursor.execute("SELECT pg_advisory_lock(%s::regclass::oid)", [database_name])
            try:
                # Execute setup statements
                statements = [
                    f"ALTER DATABASE {database_name} SET maintenance_work_mem = '64MB'",
                    f"ALTER DATABASE {database_name} SET work_mem = '4MB'",
                    # Add statement timeout to prevent hanging operations
                    f"ALTER DATABASE {database_name} SET statement_timeout = '30s'",
                    f"ALTER DATABASE {database_name} SET idle_in_transaction_session_timeout = '60s'"
                ]
            
                for statement in statements:
                    cursor.execute(statement)
            finally:
                    cursor.execute("SELECT pg_advisory_unlock(%s::regclass::oid)", [database_name])
    except Exception as e:
        logger.error(f"Database parameter setup failed: {str(e)}")
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
def get_db_connection(database_name: Optional[str] = None, 
                     autocommit: Optional[bool] = None) -> psycopg2.extensions.connection:
    """
    Manages database connections with comprehensive error handling and automatic cleanup.
    Ensures connections are properly closed even if errors occur during operations.
    """
    conn = None
    try:
        # Build connection parameters with proper defaults
        conn_params = {
            'dbname': database_name or settings.DATABASES['default']['NAME'],
            'user': settings.DATABASES['default']['USER'],
            'password': settings.DATABASES['default']['PASSWORD'],
            'host': settings.DATABASES['default']['HOST'],
            'port': settings.DATABASES['default']['PORT'],
            'connect_timeout': 10,
            'application_name': f'pyfactor_connection_{database_name or "default"}'
        }
        
        conn = psycopg2.connect(**conn_params)
        
        # Configure connection properties
        if autocommit is not None:
            conn.autocommit = autocommit
            
        # Set session parameters for better reliability
        with conn.cursor() as cursor:
            cursor.execute("SET statement_timeout = '30s'")
            cursor.execute("SET lock_timeout = '5s'")
        
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

def check_database_health(database_name: str) -> Tuple[bool, str]:
    """
    Performs a comprehensive health check on the specified database, testing multiple
    aspects of database functionality to ensure it's properly set up and accessible.
    
    Returns a tuple of (is_healthy, message) where message explains any failures.
    """
    try:
        with transaction.atomic(using=database_name):
            with connections[database_name].cursor() as cursor:
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