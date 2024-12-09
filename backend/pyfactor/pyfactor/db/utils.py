# pyfactor/db/utils.py
import psycopg2
import psycopg2.pool
from django.conf import settings
import logging
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabasePool:
    _instance = None
    _lock = threading.Lock()
    _pools = {}
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_pool(self, db_key='default'):
        if db_key not in self._pools:
            with self._lock:
                if db_key not in self._pools:
                    self._initialize_pool(db_key)
        return self._pools[db_key]

    def _initialize_pool(self, db_key):
        db_settings = settings.DATABASES[db_key]
        pool_options = getattr(settings, 'DB_POOL_OPTIONS', {})
        
        # Create DSN with valid PostgreSQL connection parameters
        dsn_params = {
            'dbname': db_settings['NAME'],
            'user': db_settings['USER'],
            'password': db_settings['PASSWORD'],
            'host': db_settings['HOST'],
            'port': db_settings['PORT'],
        }
        
        # Add valid options from db_settings['OPTIONS']
        valid_options = {
            'connect_timeout', 'keepalives', 'keepalives_idle',
            'keepalives_interval', 'keepalives_count', 'client_encoding',
            'application_name'
        }
        
        for key, value in db_settings.get('OPTIONS', {}).items():
            if key in valid_options:
                dsn_params[key] = value
        
        try:
            self._pools[db_key] = psycopg2.pool.ThreadedConnectionPool(
                minconn=pool_options.get('MIN_CONNS', 10),
                maxconn=pool_options.get('MAX_CONNS', 50),
                **dsn_params
            )
            logger.info(f"Database pool initialized for {db_key}")
        except Exception as e:
            logger.error(f"Failed to initialize pool for {db_key}: {e}")
            raise

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        conn = get_connection()
        yield conn
    finally:
        if conn:
            return_connection(conn)

def get_connection():
    """Get a connection from the pool with retry logic"""
    pool = DatabasePool.get_instance().get_pool()
    try:
        conn = pool.getconn()
        if conn is None:
            raise Exception("No connection available in the pool")
        return conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        raise

def return_connection(conn):
    """Return a connection to the pool"""
    if conn is not None:
        try:
            pool = DatabasePool.get_instance().get_pool()
            pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error returning connection to pool: {e}")
            raise

def initialize_database_pool():
    """Initialize the database pool"""
    return DatabasePool.get_instance()