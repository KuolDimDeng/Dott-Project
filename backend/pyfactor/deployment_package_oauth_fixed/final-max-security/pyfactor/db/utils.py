# pyfactor/db/utils.py
import psycopg2
import psycopg2.pool
from django.conf import settings
import logging
import threading
from contextlib import contextmanager
import time
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

class DatabasePool:
    _instance = None
    _lock = threading.Lock()
    _pools = {}

    def __init__(self):
        pass

    def get_or_create_pool(self, database_name):
        """Get or create connection pool for database"""
        if database_name not in self._pools:
            with self._lock:
                if database_name not in self._pools:
                    self._pools[database_name] = self.create_pool(database_name)
        return self._pools[database_name]

    def create_pool(self, database_name):
        """Create new connection pool with better options"""
        try:
            db_settings = settings.DATABASES.get('default', {})
            required_keys = ['USER', 'PASSWORD', 'HOST', 'PORT']
            missing_keys = [key for key in required_keys if key not in db_settings]
            if missing_keys:
                raise ValueError(f"Missing required database settings: {', '.join(missing_keys)}")

            pool_options = getattr(settings, 'DB_POOL_OPTIONS', {})
            # For initial connections, always use postgres database
            actual_database = 'postgres' if database_name in ['default', 'postgres'] else database_name
            
            pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=pool_options.get('MIN_CONNS', 5),
                maxconn=pool_options.get('MAX_CONNS', 20),
                database=actual_database,
                user=settings.DATABASES['default']['USER'],
                password=settings.DATABASES['default']['PASSWORD'],
                host=settings.DATABASES['default']['HOST'],
                port=settings.DATABASES['default']['PORT'],
                connect_timeout=30,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5
            )
            logger.info(f"Created connection pool for database {database_name}")
            return pool
        except Exception as e:
            logger.error(f"Failed to create pool for {database_name}: {e}")
            raise

    def cleanup_pool(self, database_name):
        """Clean up a specific database pool"""
        if database_name in self._pools:
            try:
                self._pools[database_name].closeall()
                del self._pools[database_name]
                logger.info(f"Cleaned up pool for {database_name}")
            except Exception as e:
                logger.error(f"Error cleaning up pool for {database_name}: {e}")

    def check_pool_health(self, database_name):
        """Check if pool is healthy and reset if needed"""
        if database_name in self._pools:
            try:
                conn = self._pools[database_name].getconn()
                if conn:
                    self._pools[database_name].putconn(conn)
                    return True
            except:
                logger.warning(f"Pool for {database_name} appears unhealthy, recreating")
                self.cleanup_pool(database_name)
                self._pools[database_name] = self.create_pool(database_name)
        return False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_pool(self, db_key='postgres'):  # Changed default from 'default' to 'postgres'
        """Get pool for specified database"""
        return self.get_or_create_pool(db_key)


    @classmethod
    def database_exists_and_accessible(cls, cursor, database_name):
        """Verify database exists and is accessible"""
        try:
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", 
                (database_name,)
            )
            exists = cursor.fetchone()
            
            if not exists:
                logger.warning(f"Database {database_name} does not exist")
                return False, "Database does not exist"
                
            # Try to create a pool connection
            pool = cls.get_instance()
            pool.get_or_create_pool(database_name)
            return True, "Database exists and is accessible"
            
        except Exception as e:
            logger.error(f"Error verifying database {database_name}: {e}")
            return False, str(e)

def get_connection():
    """Get a connection from the pool with retry logic"""
    max_retries = 3
    retry_delay = 0.5
    last_error = None

    for attempt in range(max_retries):
        try:
            pool = DatabasePool.get_instance().get_pool('postgres')  # Use 'postgres' instead of default
            conn = pool.getconn()
            if conn is None:
                raise Exception("No connection available in the pool")
            return conn
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Connection attempt {attempt + 1} failed, retrying: {e}")
                time.sleep(retry_delay * (2 ** attempt))
                continue
            logger.error(f"All connection attempts failed: {e}")
            raise last_error



def return_connection(conn):
    """Return a connection to the pool"""
    if conn is not None:
        try:
            pool = DatabasePool.get_instance().get_pool('postgres')  # Changed from default to postgres
            pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error returning connection to pool: {e}")
            raise

@contextmanager
def get_db_connection(max_retries=3, retry_delay=0.5):
    """Get database connection with retries"""
    conn = None
    try:
        for attempt in range(max_retries):
            try:
                conn = psycopg2.connect(
                    dbname='postgres',
                    user=settings.DATABASES['default']['USER'],
                    password=settings.DATABASES['default']['PASSWORD'],
                    host=settings.DATABASES['default']['HOST'],
                    port=settings.DATABASES['default']['PORT']
                )
                conn.autocommit = True
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(retry_delay * (2 ** attempt))
        yield conn
    finally:
        if conn is not None:
            conn.close()

def initialize_database_pool():
    """Initialize the database pool"""
    return DatabasePool.get_instance()


