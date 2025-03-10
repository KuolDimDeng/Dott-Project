"""
Connection Pool Manager

This module provides efficient database connection pooling with:
1. Proper connection lifecycle management
2. Connection metrics and monitoring
3. Automatic connection cleanup
4. Tenant-aware connection handling
"""
import logging
import threading
import time
from collections import defaultdict
from django.db import connections
from django.conf import settings
from custom_auth.tenant_metadata import TenantMetadataService

logger = logging.getLogger(__name__)

# Thread-local storage for connection tracking
_thread_local = threading.local()

# Connection stats
_connection_stats = {
    'active_connections': 0,
    'peak_connections': 0,
    'total_requests': 0,
    'connection_errors': 0,
    'last_reset_time': time.time(),
    'tenant_connections': defaultdict(int),
}

# Lock for thread-safe access to connection stats
_stats_lock = threading.Lock()

# Default connection pool configuration
DEFAULT_POOL_CONFIG = {
    'max_connections': 50,
    'min_connections': 5,
    'connection_lifetime': 300,  # 5 minutes
    'idle_timeout': 60,  # 1 minute
}

# Get connection pool configuration from settings or use default
POOL_CONFIG = getattr(settings, 'CONNECTION_POOL_CONFIG', DEFAULT_POOL_CONFIG)


class ConnectionPoolManager:
    """
    Connection pool manager that efficiently manages database connections.
    """
    
    @staticmethod
    def get_connection():
        """
        Get a database connection from the pool.
        
        Returns:
            connection: Database connection
        """
        # Get tenant information from thread-local storage
        tenant_id = TenantMetadataService.get_current_tenant_id()
        schema_name = TenantMetadataService.get_current_schema_name()
        db_alias = TenantMetadataService.get_current_db_alias()
        
        # Track connection in thread-local storage
        if not hasattr(_thread_local, 'connections'):
            _thread_local.connections = {}
        
        # Check if we already have a connection for this db_alias
        if db_alias in _thread_local.connections:
            conn = _thread_local.connections[db_alias]
            logger.debug(f"Reusing existing connection for {db_alias}")
            return conn
        
        # Update connection stats
        with _stats_lock:
            _connection_stats['total_requests'] += 1
            _connection_stats['active_connections'] += 1
            
            # Update tenant-specific connection count
            if tenant_id:
                _connection_stats['tenant_connections'][tenant_id] += 1
            
            # Update peak connections if needed
            if _connection_stats['active_connections'] > _connection_stats['peak_connections']:
                _connection_stats['peak_connections'] = _connection_stats['active_connections']
        
        # Check if we're at the connection limit
        with _stats_lock:
            if _connection_stats['active_connections'] > POOL_CONFIG['max_connections']:
                logger.warning(f"Connection limit reached: {_connection_stats['active_connections']}/{POOL_CONFIG['max_connections']}")
                _connection_stats['connection_errors'] += 1
                
                # Record metrics for tenant
                if tenant_id:
                    TenantMetadataService.record_tenant_metrics(tenant_id, {
                        'connection_errors': _connection_stats['connection_errors'],
                        'active_connections': _connection_stats['tenant_connections'][tenant_id],
                    })
                
                raise ConnectionError(f"Connection limit reached")
        
        try:
            # Get connection from Django's connection pool
            conn = connections[db_alias]
            
            # Set search path for PostgreSQL
            with conn.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Store connection in thread-local storage
            _thread_local.connections[db_alias] = conn
            
            logger.debug(f"Created new connection for {db_alias} (schema: {schema_name})")
            
            # Record metrics for tenant
            if tenant_id:
                TenantMetadataService.record_tenant_metrics(tenant_id, {
                    'active_connections': _connection_stats['tenant_connections'][tenant_id],
                })
            
            return conn
            
        except Exception as e:
            # Update error stats
            with _stats_lock:
                _connection_stats['connection_errors'] += 1
                _connection_stats['active_connections'] -= 1
                
                # Update tenant-specific connection count
                if tenant_id:
                    _connection_stats['tenant_connections'][tenant_id] -= 1
            
            logger.error(f"Error getting connection for {db_alias}: {str(e)}")
            
            # Record metrics for tenant
            if tenant_id:
                TenantMetadataService.record_tenant_metrics(tenant_id, {
                    'connection_errors': _connection_stats['connection_errors'],
                    'active_connections': _connection_stats['tenant_connections'][tenant_id],
                })
            
            raise
    
    @staticmethod
    def release_connection(db_alias=None):
        """
        Release a database connection back to the pool.
        
        Args:
            db_alias: Database alias (optional, if None, releases all connections)
        """
        if not hasattr(_thread_local, 'connections'):
            return
        
        tenant_id = TenantMetadataService.get_current_tenant_id()
        
        if db_alias:
            # Release specific connection
            if db_alias in _thread_local.connections:
                conn = _thread_local.connections[db_alias]
                conn.close()
                del _thread_local.connections[db_alias]
                
                # Update connection stats
                with _stats_lock:
                    _connection_stats['active_connections'] -= 1
                    
                    # Update tenant-specific connection count
                    if tenant_id:
                        _connection_stats['tenant_connections'][tenant_id] -= 1
                
                logger.debug(f"Released connection for {db_alias}")
                
                # Record metrics for tenant
                if tenant_id:
                    TenantMetadataService.record_tenant_metrics(tenant_id, {
                        'active_connections': _connection_stats['tenant_connections'][tenant_id],
                    })
        else:
            # Release all connections
            for alias, conn in _thread_local.connections.items():
                conn.close()
                
                # Update connection stats
                with _stats_lock:
                    _connection_stats['active_connections'] -= 1
                
                logger.debug(f"Released connection for {alias}")
            
            # Update tenant-specific connection count
            if tenant_id:
                with _stats_lock:
                    _connection_stats['tenant_connections'][tenant_id] = 0
                
                # Record metrics for tenant
                TenantMetadataService.record_tenant_metrics(tenant_id, {
                    'active_connections': 0,
                })
            
            # Clear connections
            _thread_local.connections = {}
    
    @staticmethod
    def get_connection_stats():
        """
        Get connection statistics.
        
        Returns:
            dict: Connection statistics
        """
        with _stats_lock:
            return {
                'active_connections': _connection_stats['active_connections'],
                'peak_connections': _connection_stats['peak_connections'],
                'total_requests': _connection_stats['total_requests'],
                'connection_errors': _connection_stats['connection_errors'],
                'uptime': time.time() - _connection_stats['last_reset_time'],
                'tenant_connections': dict(_connection_stats['tenant_connections']),
            }
    
    @staticmethod
    def reset_connection_stats():
        """
        Reset connection statistics.
        """
        with _stats_lock:
            _connection_stats['peak_connections'] = _connection_stats['active_connections']
            _connection_stats['total_requests'] = 0
            _connection_stats['connection_errors'] = 0
            _connection_stats['last_reset_time'] = time.time()
            
            # Keep active connections and tenant_connections as is
            logger.info("Connection statistics reset")


class ConnectionPoolMiddleware:
    """
    Middleware that manages database connections for each request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Process the request
        try:
            # Set tenant context based on request headers
            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                TenantMetadataService.set_current_tenant(tenant_id)
                
                # Get connection for tenant
                ConnectionPoolManager.get_connection()
            
            # Process the request
            response = self.get_response(request)
            
            return response
        finally:
            # Always release connections
            ConnectionPoolManager.release_connection()
            TenantMetadataService.clear_current_tenant()