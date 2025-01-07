import re
import time
import psycopg2
import asyncio
from django.conf import settings
from django.db import connections, OperationalError
import logging
from users.models import UserProfile
from django.core.management import call_command
from django.apps import apps
from asgiref.sync import sync_to_async
from .db.utils import get_connection, return_connection, initialize_database_pool
from contextlib import contextmanager
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class UserDatabaseRouter:
    """Router for handling dynamic user databases"""
    _instance = None
    
    def __init__(self):
        from .db.utils import DatabasePool
        self.pool = DatabasePool.get_instance()
        self.connection_pools: Dict[str, Any] = {}
        self.connection_limit = settings.DATABASE_RESOURCE_LIMITS['MAX_CONNECTIONS_PER_DB']
        self._lock = asyncio.Lock()

    @classmethod
    def initialize(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise RuntimeError("UserDatabaseRouter not initialized")
        return cls._instance

    def sanitize_database_name(self, database_name: str) -> str:
        """Sanitize database name for safety"""
        sanitized = re.sub(r'[^a-zA-Z0-9_]', '', database_name)
        return sanitized[:63]  # PostgreSQL limit

    @contextmanager
    def get_db_connection(self):
        """Get database connection from pool"""
        conn = None
        try:
            conn = get_connection()
            yield conn
        finally:
            if conn:
                return_connection(conn)

    async def get_connection_pool(self, database_name: str):
        """Get or create connection pool for database"""
        async with self._lock:
            if database_name not in self.connection_pools:
                pool = await self.create_pool(database_name)
                self.connection_pools[database_name] = pool
            return self.connection_pools[database_name]

    async def create_pool(self, database_name: str):
        """Create new connection pool for database"""
        db_settings = settings.DATABASES[database_name]
        return await self.pool.create_pool(
            database=database_name,
            min_size=settings.DB_POOL_OPTIONS['MIN_CONNS'],
            max_size=settings.DB_POOL_OPTIONS['MAX_CONNS'],
            **db_settings
        )

    async def create_dynamic_database(self, database_name: str):
        """Create new dynamic database with proper configuration"""
        safe_database_name = self.sanitize_database_name(database_name)
        
        if safe_database_name not in settings.DATABASES:
            database_config = self.get_database_config(safe_database_name)
            settings.DATABASES[safe_database_name] = database_config
            connections.databases[safe_database_name] = database_config

            try:
                async with self._lock:
                    await self.create_database(safe_database_name)
                    await self.setup_database_limits(safe_database_name)
                    await self.check_database_readiness(safe_database_name)
                    await self.run_migrations(safe_database_name)
                return safe_database_name

            except Exception as e:
                logger.error(f"Error creating database {safe_database_name}: {str(e)}")
                await self.cleanup_database(safe_database_name)
                raise

    def get_database_config(self, database_name: str) -> dict:
        """Get database configuration"""
        return {
            'NAME': database_name,
            'ENGINE': 'django.db.backends.postgresql',
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'ATOMIC_REQUESTS': False,
            'TIME_ZONE': settings.TIME_ZONE,
            'CONN_HEALTH_CHECKS': False,
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

    async def create_database(self, database_name: str):
        """Create database from template"""
        with self.get_db_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
                    (database_name,)
                )
                exists = cursor.fetchone()
                
                if not exists:
                    cursor.execute(f'CREATE DATABASE "{database_name}" TEMPLATE template0')
                    logger.info(f"Database {database_name} created successfully")

    async def setup_database_limits(self, database_name: str):
        with self.get_db_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                cursor.execute(f'ALTER DATABASE "{database_name}" SET maintenance_work_mem = \'64MB\'')
                cursor.execute(f'ALTER DATABASE "{database_name}" SET work_mem = \'4MB\'')
                cursor.execute(f'ALTER DATABASE "{database_name}" SET temp_file_limit = \'1GB\'')
                cursor.execute(f'ALTER DATABASE "{database_name}" SET connection_limit = {self.connection_limit}')

    async def check_database_readiness(self, database_name: str, max_retries: int = 10):
        """Check if database is ready"""
        for attempt in range(max_retries):
            try:
                pool = await self.get_connection_pool(database_name)
                async with pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                return True
            except Exception as e:
                if attempt == max_retries - 1:
                    raise OperationalError(f"Database not ready after {max_retries} attempts")
                await asyncio.sleep(0.5 * (2 ** attempt))

    async def run_migrations(self, database_name: str):
        """Run database migrations"""
        try:
            await sync_to_async(call_command)('migrate', database=database_name)
        except Exception as e:
            logger.error(f"Migration failed for {database_name}: {str(e)}")
            raise

    async def cleanup_database(self, database_name: str):
        """Clean up failed database creation"""
        try:
            if database_name in self.connection_pools:
                pool = self.connection_pools[database_name]
                await pool.close()
                del self.connection_pools[database_name]

            if database_name in settings.DATABASES:
                del settings.DATABASES[database_name]
            if database_name in connections.databases:
                del connections.databases[database_name]

            with self.get_db_connection() as conn:
                conn.autocommit = True
                with conn.cursor() as cursor:
                    cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')

        except Exception as e:
            logger.error(f"Error cleaning up database {database_name}: {str(e)}")
            raise

    # Synchronous routing methods that Django expects
    def db_for_read(self, model, **hints):
        """Get database for read operations"""
        if 'instance' in hints:
            instance = hints['instance']
            # Use model's Meta class instead of direct attribute
            if isinstance(instance, apps.get_model('users', 'UserProfile')):
                return instance.database_name
        return None

    def db_for_write(self, model, **hints):
        """Get database for write operations"""
        if model._meta.app_label in ['django_celery_beat', 'django_celery_results']:
            return 'celery'
        # Use model's Meta class instead of direct attribute
        if model == apps.get_model('users', 'UserProfile'):
            return 'default'
        if 'instance' in hints:
            instance = hints['instance']
            if isinstance(instance, apps.get_model('users', 'UserProfile')):
                return instance.database_name
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Check if database relation is allowed"""
        UserProfile = apps.get_model('users', 'UserProfile')
        return (
            obj1._state.db == obj2._state.db or
            isinstance(obj1, UserProfile) or 
            isinstance(obj2, UserProfile)
        )

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in ['django_celery_beat', 'django_celery_results']:
            return db == 'celery'
        return True

    async def close_all_pools(self):
        """Close all connection pools"""
        async with self._lock:
            for pool in self.connection_pools.values():
                await pool.close()
            self.connection_pools.clear()