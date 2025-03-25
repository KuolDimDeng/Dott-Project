"""
Enhanced Connection Pool Manager

This module provides efficient database connection pooling with:
1. Proper connection lifecycle management with reduced connection counts
2. Detailed connection metrics and monitoring
3. Automatic connection cleanup and resource management
4. Tenant-aware connection handling with isolation
5. Connection recycling based on age and usage patterns
"""
import logging
import threading
import time
import queue
from collections import defaultdict
from django.db import connections
from django.conf import settings
from custom_auth.tenant_metadata import TenantMetadataService

logger = logging.getLogger(__name__)

# Thread-local storage for connection tracking
_thread_local = threading.local()

# Connection stats with more detailed metrics
_connection_stats = {
    'active_connections': 0,
    'peak_connections': 0,
    'total_requests': 0,
    'connection_errors': 0,
    'connection_timeouts': 0,
    'avg_connection_lifetime': 0,
    'connection_reuse_count': 0,
    'longest_running_connection': 0,
    'last_reset_time': time.time(),
    'tenant_connections': defaultdict(int),
    # Connection age tracking
    'connection_ages': [],
    # Connection wait times
    'connection_wait_times': [],
}

# Lock for thread-safe access to connection stats
_stats_lock = threading.Lock()

# Improved default connection pool configuration with lower limits
DEFAULT_POOL_CONFIG = {
    'max_connections': 20,        # Reduced from 50 to 20
    'min_connections': 3,         # Reduced from 5 to 3
    'connection_lifetime': 300,   # 5 minutes max lifetime
    'idle_timeout': 60,           # 1 minute idle timeout
    'max_usage_count': 1000,      # Maximum number of operations per connection
    'connection_timeout': 5,      # 5 second connection timeout
    'monitor_interval': 60,       # 1 minute monitoring interval
    'critical_connection_threshold': 15,  # Alert when connections exceed this number
}

# Get connection pool configuration from settings or use default
POOL_CONFIG = getattr(settings, 'CONNECTION_POOL_CONFIG', DEFAULT_POOL_CONFIG)

# Last time connections were checked for cleanup
_last_cleanup_time = time.time()


class ConnectionPoolManager:
    """
    Enhanced connection pool manager that efficiently manages database connections.
    Features improved connection reuse, lifecycle management, and detailed metrics.
    """
    
    @classmethod
    def get_connection(cls):
        """
        Get a database connection from the pool with improved monitoring and lifecycle.
        
        Returns:
            connection: Database connection
        """
        start_time = time.time()
        
        # Get tenant information from thread-local storage
        tenant_id = TenantMetadataService.get_current_tenant_id()
        schema_name = TenantMetadataService.get_current_schema_name()
        db_alias = TenantMetadataService.get_current_db_alias() or 'default'
        
        # Track connection in thread-local storage
        if not hasattr(_thread_local, 'connections'):
            _thread_local.connections = {}
            _thread_local.connection_usage = {}
            _thread_local.connection_created = {}
        
        # Check if we already have a connection for this db_alias and it's reusable
        if db_alias in _thread_local.connections:
            conn = _thread_local.connections[db_alias]
            
            # Check if connection is still usable
            if conn.is_usable():
                # Increment usage count
                if db_alias not in _thread_local.connection_usage:
                    _thread_local.connection_usage[db_alias] = 0
                
                _thread_local.connection_usage[db_alias] += 1
                
                # Update connection stats
                with _stats_lock:
                    _connection_stats['connection_reuse_count'] += 1
                
                # Check if connection has exceeded max usage or lifetime
                if cls._should_recycle_connection(db_alias):
                    # Create a new connection if needed
                    logger.debug(f"Recycling connection for {db_alias} due to usage or age")
                    cls.release_connection(db_alias)
                else:
                    logger.debug(f"Reusing existing connection for {db_alias}")
                    
                    # Record wait time
                    wait_time = time.time() - start_time
                    with _stats_lock:
                        _connection_stats['connection_wait_times'].append(wait_time)
                        
                    return conn
        
        # Perform cleanup if needed
        global _last_cleanup_time
        now = time.time()
        if now - _last_cleanup_time > POOL_CONFIG['monitor_interval']:
            _last_cleanup_time = now
            cls._cleanup_connections()
        
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
                
                # Log alert if peak is high
                if _connection_stats['peak_connections'] >= POOL_CONFIG['critical_connection_threshold']:
                    logger.warning(f"Critical connection threshold reached: {_connection_stats['peak_connections']} connections active")
        
        # Check if we're at the connection limit with improved handling
        with _stats_lock:
            if _connection_stats['active_connections'] > POOL_CONFIG['max_connections']:
                # Instead of immediately erroring, try to reclaim connections
                cls._reclaim_connections()
                
                # Check again after reclaiming
                if _connection_stats['active_connections'] > POOL_CONFIG['max_connections']:
                    logger.warning(f"Connection limit reached: {_connection_stats['active_connections']}/{POOL_CONFIG['max_connections']}")
                    _connection_stats['connection_errors'] += 1
                    
                    # Record metrics for tenant
                    if tenant_id:
                        TenantMetadataService.record_tenant_metrics(tenant_id, {
                            'connection_errors': _connection_stats['connection_errors'],
                            'active_connections': _connection_stats['tenant_connections'][tenant_id],
                        })
                    
                    raise ConnectionError(f"Connection limit reached, even after reclaiming idle connections")
        
        try:
            # Get connection from Django's connection pool with timeout
            conn = connections[db_alias]
            
            # Apply performance settings to the connection
            cls._apply_connection_settings(conn)
            
            # Set search path for PostgreSQL
            with conn.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Store connection in thread-local storage with metadata
            _thread_local.connections[db_alias] = conn
            _thread_local.connection_usage[db_alias] = 1
            _thread_local.connection_created[db_alias] = time.time()
            
            logger.debug(f"Created new connection for {db_alias} (schema: {schema_name})")
            
            # Record connection age
            with _stats_lock:
                _connection_stats['connection_ages'].append(0)  # New connection
                
                # Limit the size of the arrays to prevent memory growth
                if len(_connection_stats['connection_ages']) > 100:
                    _connection_stats['connection_ages'] = _connection_stats['connection_ages'][-100:]
                if len(_connection_stats['connection_wait_times']) > 100:
                    _connection_stats['connection_wait_times'] = _connection_stats['connection_wait_times'][-100:]
            
            # Record metrics for tenant
            if tenant_id:
                TenantMetadataService.record_tenant_metrics(tenant_id, {
                    'active_connections': _connection_stats['tenant_connections'][tenant_id],
                })
            
            # Record wait time
            wait_time = time.time() - start_time
            with _stats_lock:
                _connection_stats['connection_wait_times'].append(wait_time)
            
            return conn
            
        except Exception as e:
            # Update error stats with more details
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
    
    @classmethod
    def release_connection(cls, db_alias=None):
        """
        Release a database connection back to the pool with improved cleanup.
        
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
                
                # Calculate connection age before closing
                if db_alias in _thread_local.connection_created:
                    age = time.time() - _thread_local.connection_created[db_alias]
                    
                    # Update connection age stats
                    with _stats_lock:
                        _connection_stats['connection_ages'].append(age)
                        
                        # Track longest running connection
                        if age > _connection_stats['longest_running_connection']:
                            _connection_stats['longest_running_connection'] = age
                        
                        # Update average connection lifetime
                        if _connection_stats['connection_ages']:
                            _connection_stats['avg_connection_lifetime'] = sum(_connection_stats['connection_ages']) / len(_connection_stats['connection_ages'])
                
                # Close connection with better error handling
                try:
                    # Reset search path before releasing
                    with conn.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
                    
                    conn.close()
                except Exception as e:
                    logger.warning(f"Error closing connection for {db_alias}: {str(e)}")
                
                # Remove connection from thread-local storage
                del _thread_local.connections[db_alias]
                if db_alias in _thread_local.connection_usage:
                    del _thread_local.connection_usage[db_alias]
                if db_alias in _thread_local.connection_created:
                    del _thread_local.connection_created[db_alias]
                
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
            # Release all connections with better cleanup
            for alias, conn in list(_thread_local.connections.items()):
                # Calculate connection age before closing
                if alias in _thread_local.connection_created:
                    age = time.time() - _thread_local.connection_created[alias]
                    
                    # Update connection age stats
                    with _stats_lock:
                        _connection_stats['connection_ages'].append(age)
                
                # Close connection with better error handling
                try:
                    # Reset search path before releasing
                    try:
                        with conn.cursor() as cursor:
                            cursor.execute('SET search_path TO public')
                    except Exception:
                        # Ignore errors in resetting search path
                        pass
                        
                    conn.close()
                except Exception as e:
                    logger.warning(f"Error closing connection for {alias}: {str(e)}")
                
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
            
            # Clear all thread-local connection data
            _thread_local.connections = {}
            _thread_local.connection_usage = {}
            _thread_local.connection_created = {}
    
    @classmethod
    def _should_recycle_connection(cls, db_alias):
        """
        Check if a connection should be recycled based on usage and age.
        
        Args:
            db_alias: Database alias
            
        Returns:
            bool: True if connection should be recycled
        """
        # Check usage count
        usage_count = _thread_local.connection_usage.get(db_alias, 0)
        if usage_count > POOL_CONFIG['max_usage_count']:
            return True
        
        # Check age
        if db_alias in _thread_local.connection_created:
            age = time.time() - _thread_local.connection_created[db_alias]
            if age > POOL_CONFIG['connection_lifetime']:
                return True
        
        return False
    
    @classmethod
    def _apply_connection_settings(cls, conn):
        """
        Apply performance settings to a database connection.
        
        Args:
            conn: Database connection
        """
        try:
            with conn.cursor() as cursor:
                # Set statement timeout
                cursor.execute(f"SET statement_timeout = {POOL_CONFIG.get('statement_timeout', 30000)}")
                
                # Set lock timeout
                cursor.execute(f"SET lock_timeout = {POOL_CONFIG.get('lock_timeout', 5000)}")
                
                # Set work memory if specified
                work_mem = POOL_CONFIG.get('work_mem')
                if work_mem:
                    cursor.execute(f"SET work_mem = '{work_mem}'")
        except Exception as e:
            logger.warning(f"Error applying connection settings: {str(e)}")
    
    @classmethod
    def _cleanup_connections(cls):
        """
        Perform periodic cleanup of connections.
        """
        logger.debug("Performing connection cleanup")
        
        # Check all connections in thread-local storage
        if hasattr(_thread_local, 'connections'):
            for alias in list(_thread_local.connections.keys()):
                if cls._should_recycle_connection(alias):
                    logger.debug(f"Cleaning up old connection for {alias}")
                    cls.release_connection(alias)
    
    @classmethod
    def _reclaim_connections(cls):
        """
        Attempt to reclaim connections to stay under the connection limit.
        """
        logger.debug("Attempting to reclaim connections")
        
        # Close connections from other threads (if possible using Django's API)
        for conn in connections.all():
            try:
                conn.close()
            except Exception:
                pass
        
        # Force garbage collection to clean up connections
        import gc
        gc.collect()
    
    @classmethod
    def get_detailed_connection_stats(cls):
        """
        Get detailed connection statistics with more metrics.
        
        Returns:
            dict: Detailed connection statistics
        """
        with _stats_lock:
            # Calculate derived statistics
            avg_wait = 0
            if _connection_stats['connection_wait_times']:
                avg_wait = sum(_connection_stats['connection_wait_times']) / len(_connection_stats['connection_wait_times'])
            
            # Build the stats object
            return {
                'active_connections': _connection_stats['active_connections'],
                'peak_connections': _connection_stats['peak_connections'],
                'total_requests': _connection_stats['total_requests'],
                'connection_errors': _connection_stats['connection_errors'],
                'connection_timeouts': _connection_stats['connection_timeouts'],
                'connection_reuse_count': _connection_stats['connection_reuse_count'],
                'avg_connection_lifetime': _connection_stats['avg_connection_lifetime'],
                'longest_running_connection': _connection_stats['longest_running_connection'],
                'avg_wait_time': avg_wait,
                'uptime': time.time() - _connection_stats['last_reset_time'],
                'tenant_connections': dict(_connection_stats['tenant_connections']),
                'pool_config': {
                    'max_connections': POOL_CONFIG['max_connections'],
                    'min_connections': POOL_CONFIG['min_connections'],
                    'connection_lifetime': POOL_CONFIG['connection_lifetime'],
                    'idle_timeout': POOL_CONFIG['idle_timeout'],
                },
            }
    
    @staticmethod
    def reset_connection_stats():
        """
        Reset connection statistics while preserving important values.
        """
        with _stats_lock:
            # Keep track of current active connections
            active = _connection_stats['active_connections']
            tenant_conns = _connection_stats['tenant_connections']
            
            # Reset stats but preserve current connection count
            _connection_stats['peak_connections'] = active
            _connection_stats['total_requests'] = 0
            _connection_stats['connection_errors'] = 0
            _connection_stats['connection_timeouts'] = 0
            _connection_stats['connection_reuse_count'] = 0
            _connection_stats['avg_connection_lifetime'] = 0
            _connection_stats['longest_running_connection'] = 0
            _connection_stats['last_reset_time'] = time.time()
            _connection_stats['connection_ages'] = []
            _connection_stats['connection_wait_times'] = []
            _connection_stats['active_connections'] = active
            _connection_stats['tenant_connections'] = tenant_conns
            
            logger.info("Connection statistics reset")


class ConnectionPoolMiddleware:
    """
    Enhanced middleware that manages database connections for each request.
    Features improved connection tracking, request profiling, and resource management.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_count = 0
        self.request_times = []  # Track recent request times for profiling
        self.slow_request_threshold = 2.0  # Seconds
        
        logger.info("Enhanced ConnectionPoolMiddleware initialized with improved connection management")
    
    def __call__(self, request):
        # Assign a unique request ID for tracking
        self.request_count += 1
        request_id = f"req-{int(time.time())}-{self.request_count}"
        request.connection_request_id = request_id
        
        # Record start time for profiling
        start_time = time.time()
        
        # Process the request
        try:
            # Set tenant context based on request headers
            tenant_id = request.headers.get('X-Tenant-ID')
            schema_name = request.headers.get('X-Schema-Name')
            
            # Capture tenant context
            if tenant_id:
                TenantMetadataService.set_current_tenant(tenant_id, schema_name)
                logger.debug(f"Request {request_id}: Set tenant context to {tenant_id} (schema: {schema_name})")
                
                # Get connection for tenant
                try:
                    conn = ConnectionPoolManager.get_connection()
                    logger.debug(f"Request {request_id}: Got connection for tenant {tenant_id}")
                except Exception as e:
                    logger.error(f"Request {request_id}: Error getting connection for tenant {tenant_id}: {str(e)}")
                    raise
            
            # Process the request with better error handling
            try:
                response = self.get_response(request)
                return response
            except Exception as e:
                logger.error(f"Request {request_id}: Error processing request: {str(e)}")
                # Ensure connections are released on error
                ConnectionPoolManager.release_connection()
                raise
        finally:
            # Always release connections and clear tenant context
            try:
                ConnectionPoolManager.release_connection()
                logger.debug(f"Request {request_id}: Released connections")
            except Exception as e:
                logger.error(f"Request {request_id}: Error releasing connections: {str(e)}")
            
            try:
                TenantMetadataService.clear_current_tenant()
                logger.debug(f"Request {request_id}: Cleared tenant context")
            except Exception as e:
                logger.error(f"Request {request_id}: Error clearing tenant context: {str(e)}")
            
            # Record request time and log slow requests
            elapsed_time = time.time() - start_time
            self.request_times.append(elapsed_time)
            
            # Keep only recent request times to avoid memory growth
            if len(self.request_times) > 100:
                self.request_times = self.request_times[-100:]
            
            # Log slow requests
            if elapsed_time > self.slow_request_threshold:
                logger.warning(
                    f"Request {request_id} was slow: {elapsed_time:.2f}s "
                    f"(tenant: {tenant_id or 'None'}, path: {request.path})"
                )
                
                # For very slow requests, capture more debugging information
                if elapsed_time > 2 * self.slow_request_threshold:
                    logger.warning(
                        f"Request {request_id} details: "
                        f"method={request.method}, "
                        f"content_type={request.content_type}, "
                        f"query_params={request.GET}, "
                        f"tenant_id={tenant_id}"
                    )
                    
                    # Log DB connection stats
                    try:
                        stats = ConnectionPoolManager.get_detailed_connection_stats()
                        logger.warning(
                            f"DB stats during slow request: "
                            f"active={stats['active_connections']}, "
                            f"peak={stats['peak_connections']}, "
                            f"errors={stats['connection_errors']}"
                        )
                    except Exception as e:
                        logger.error(f"Error getting DB stats: {str(e)}")
    
    def get_request_stats(self):
        """Get statistics about recent requests."""
        avg_time = sum(self.request_times) / max(1, len(self.request_times))
        return {
            'request_count': self.request_count,
            'avg_request_time': avg_time,
            'slow_requests': sum(1 for t in self.request_times if t > self.slow_request_threshold),
            'recent_times': self.request_times[-5:],
        }