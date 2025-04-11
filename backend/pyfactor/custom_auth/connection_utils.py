"""
Connection utilities for optimizing database connections in a multi-tenant environment.
"""
import logging
import threading
import time
from django.db import connections
from django.conf import settings

logger = logging.getLogger(__name__)

# Thread-local storage for tenant context
_thread_local = threading.local()

# Connection pool with schema-specific connections
# Format: {schema_name: {'connection': connection_obj, 'last_used': timestamp}}
_connection_pool = {}
_pool_lock = threading.Lock()

# Maximum number of connections to keep in the pool
MAX_POOL_SIZE = getattr(settings, 'DATABASE_CONNECTION_POOL', {}).get('MAX_CONNS', 50)

# Maximum age of a connection in seconds before recycling
MAX_CONN_AGE = getattr(settings, 'DATABASE_CONNECTION_POOL', {}).get('CONN_LIFETIME', 300)

def get_current_schema():
    """Get the current schema from thread-local storage."""
    return getattr(_thread_local, 'schema_name', 'public')

def set_current_schema(tenant_id: uuid.UUID:
    """Set the current schema in thread-local storage."""
    setattr(_thread_local, 'schema_name', schema_name)
    logger.debug(f"Set current schema to {schema_name}")

def get_connection_for_schema(tenant_id: uuid.UUID:
    """
    Get a database connection for the specified schema.
    
    Args:
        schema_name: The name of the schema to use
        force_new: If True, create a new connection instead of using the pool
        
    Returns:
        A database connection with the schema set
    """
    if not schema_name:
        schema_name = 'public'
    
    # Clean up old connections periodically
    _cleanup_old_connections()
    
    # Return a new connection if requested
    if force_new:
        return _create_new_connection(schema_name)
    
    # Try to get a connection from the pool
    with _pool_lock:
        if schema_name in _connection_pool:
            conn_info = _connection_pool[schema_name]
            conn = conn_info['connection']
            
            # Update last used timestamp
            conn_info['last_used'] = time.time()
            
            logger.debug(f"Reusing pooled connection for schema {schema_name}")
            return conn
    
    # No pooled connection available, create a new one
    return _create_new_connection(schema_name)

def _create_new_connection(tenant_id: uuid.UUID:
    """Create a new connection with the specified schema."""
    start_time = time.time()
    
    # Get the default connection
    connection = connections['default']
    
    # Set the search path for this connection
    with connection.cursor() as cursor:
        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id),public')
    
    # Add to the connection pool if not full
    with _pool_lock:
        if len(_connection_pool) < MAX_POOL_SIZE:
            _connection_pool[schema_name] = {
                'connection': connection,
                'last_used': time.time()
            }
            logger.debug(f"Added new connection for schema {schema_name} to pool")
    
    logger.debug(f"Created new connection for schema {schema_name} in {time.time() - start_time:.4f}s")
    return connection

def _cleanup_old_connections():
    """Remove old connections from the pool."""
    current_time = time.time()
    
    with _pool_lock:
        schemas_to_remove = []
        
        # Find old connections
        for schema_name, conn_info in _connection_pool.items():
            if current_time - conn_info['last_used'] > MAX_CONN_AGE:
                schemas_to_remove.append(schema_name)
        
        # Remove old connections
        for schema_name in schemas_to_remove:
            del _connection_pool[schema_name]
            logger.debug(f"Removed old connection for schema {schema_name} from pool")

def release_connections():
    """Release all connections in the pool."""
    with _pool_lock:
        _connection_pool.clear()
        logger.debug("Released all connections from pool")

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

def get_pool_stats():
    """Get statistics about the connection pool."""
    with _pool_lock:
        return {
            'pool_size': len(_connection_pool),
            'max_pool_size': MAX_POOL_SIZE,
            'schemas': list(_connection_pool.keys())
        }