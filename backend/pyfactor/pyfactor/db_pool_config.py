"""
Database Connection Pool Configuration

This module provides configuration for database connection pooling
to improve performance and reduce connection overhead.
"""

import logging
import time
from django.db import connections
from django.conf import settings

logger = logging.getLogger(__name__)

# Maximum number of connections to keep in the pool
MAX_CONNECTIONS = 20

# Maximum time (in seconds) a connection can be idle before being closed
MAX_IDLE_TIME = 300  # 5 minutes

# Time (in seconds) between connection pool maintenance runs
MAINTENANCE_INTERVAL = 60  # 1 minute

# Connection pool cache
connection_pool = {}

class ConnectionPoolManager:
    """Manages a pool of database connections for better performance"""
    
    @classmethod
    def get_connection(cls, schema_name=None, using='default'):
        """Get a connection from the pool or create a new one"""
        pool_key = f"{using}_{schema_name or 'public'}"
        
        # Check if we have a connection in the pool
        if pool_key in connection_pool:
            conn_info = connection_pool[pool_key]
            # Check if the connection is still valid
            if time.time() - conn_info['last_used'] < MAX_IDLE_TIME:
                logger.debug(f"Using pooled connection for schema: {schema_name}")
                conn_info['last_used'] = time.time()
                return conn_info['connection']
        
        # Create a new connection
        start_time = time.time()
        connection = connections[using]
        
        # Set the schema if provided
        if schema_name and schema_name != 'public':
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema_name}",public')
        
        # Store in the pool
        connection_pool[pool_key] = {
            'connection': connection,
            'last_used': time.time(),
            'schema_name': schema_name
        }
        
        # Limit pool size
        if len(connection_pool) > MAX_CONNECTIONS:
            cls.cleanup_pool()
            
        logger.debug(f"Created new connection for schema: {schema_name} in {time.time() - start_time:.4f}s")
        return connection
    
    @classmethod
    def cleanup_pool(cls):
        """Remove idle connections from the pool"""
        current_time = time.time()
        keys_to_remove = []
        
        for key, conn_info in connection_pool.items():
            if current_time - conn_info['last_used'] > MAX_IDLE_TIME:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            logger.debug(f"Removing idle connection: {key}")
            del connection_pool[key]
    
    @classmethod
    def clear_pool(cls):
        """Clear all connections from the pool"""
        global connection_pool
        logger.debug(f"Clearing connection pool with {len(connection_pool)} entries")
        connection_pool = {}

# Initialize the connection pool
def initialize_pool():
    """Initialize the connection pool with default connections"""
    logger.info("Initializing database connection pool")
    
    # Pre-create connections for default database
    ConnectionPoolManager.get_connection(schema_name='public', using='default')
    
    # Pre-create connections for tenant schemas if available
    try:
        from custom_auth.models import Tenant
        tenants = Tenant.objects.filter(database_status='active')
        for tenant in tenants[:5]:  # Limit to first 5 active tenants
            ConnectionPoolManager.get_connection(schema_name=tenant.schema_name, using='default')
    except Exception as e:
        logger.warning(f"Could not pre-create tenant connections: {str(e)}")
    
    logger.info(f"Connection pool initialized with {len(connection_pool)} connections")

# Run maintenance on the connection pool periodically
def run_pool_maintenance():
    """Run maintenance on the connection pool"""
    ConnectionPoolManager.cleanup_pool()