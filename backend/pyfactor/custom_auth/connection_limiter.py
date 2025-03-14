"""
Connection limiter middleware to prevent too many database connections.
"""
import logging
import threading
from django.db import connections
from django.http import HttpResponse
from django.conf import settings

logger = logging.getLogger(__name__)

# Global connection counter with lock for thread safety
_connection_count = 0
_connection_lock = threading.Lock()

# Maximum allowed connections (set lower than PostgreSQL's max_connections)
MAX_CONNECTIONS = getattr(settings, 'MAX_DB_CONNECTIONS', 50)

# Endpoints that should have higher connection limits
HIGH_LIMIT_ENDPOINTS = [
    '/api/onboarding/setup/status/',
    '/api/onboarding/setup/status',
]

# Higher connection limit for specific endpoints
HIGH_LIMIT_CONNECTIONS = getattr(settings, 'HIGH_LIMIT_CONNECTIONS', 100)

class ConnectionLimiterMiddleware:
    """
    Middleware that limits the number of concurrent database connections.
    If the connection limit is reached, it returns a 503 Service Unavailable response.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        logger.info(f"ConnectionLimiterMiddleware initialized with max connections: {MAX_CONNECTIONS}")
    
    def __call__(self, request):
        global _connection_count
        
        # Determine if this is a high-limit endpoint
        path = request.path
        is_high_limit = any(path.endswith(endpoint) for endpoint in HIGH_LIMIT_ENDPOINTS)
        connection_limit = HIGH_LIMIT_CONNECTIONS if is_high_limit else MAX_CONNECTIONS
        
        # Check if we're already at the connection limit
        with _connection_lock:
            if _connection_count >= connection_limit:
                logger.warning(f"Connection limit reached: {_connection_count}/{connection_limit} for path {path}")
                return HttpResponse(
                    "Database connection limit reached. Please try again later.",
                    status=429,  # Changed from 503 to 429 (Too Many Requests) for better client handling
                    content_type="text/plain"
                )
            
            # Increment connection counter
            _connection_count += 1
            current_count = _connection_count
        
        logger.debug(f"Connection acquired: {current_count}/{connection_limit} for path {path}")
        
        try:
            # Process the request
            response = self.get_response(request)
            return response
        finally:
            # Determine if this is a high-limit endpoint
            path = request.path
            is_high_limit = any(path.endswith(endpoint) for endpoint in HIGH_LIMIT_ENDPOINTS)
            connection_limit = HIGH_LIMIT_CONNECTIONS if is_high_limit else MAX_CONNECTIONS
            
            # Always decrement the counter and close connections
            with _connection_lock:
                _connection_count -= 1
                current_count = _connection_count
            
            # Force close all connections to ensure they're returned to the pool
            for conn in connections.all():
                conn.close()
                
            logger.debug(f"Connection released: {current_count}/{connection_limit} for path {path}")