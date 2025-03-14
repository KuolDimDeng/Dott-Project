#!/bin/bash

# Backend Memory Optimization Script
# This script applies memory optimizations to the Django/FastAPI backend

echo "Starting backend memory optimization..."

# Install memory optimization dependencies
echo "Installing memory optimization dependencies..."
pip install -r memory_requirements.txt

# Make run_server.py executable
echo "Making run_server.py executable..."
chmod +x run_server.py

# Apply Django settings optimizations
echo "Applying Django settings optimizations..."

# Create memory optimization settings file
cat > pyfactor/memory_settings.py << 'EOL'
"""
Memory optimization settings for Django/FastAPI application.
Import this file in your settings.py to apply memory optimizations.
"""

# Database connection pooling settings
DATABASES = {
    'default': {
        **DATABASES['default'],
        'CONN_MAX_AGE': 60,  # Keep connections alive for 60 seconds
        'CONN_HEALTH_CHECKS': True,  # Enable connection health checks
        'OPTIONS': {
            **DATABASES['default'].get('OPTIONS', {}),
            'pool_size': 20,  # Maximum number of connections in the pool
            'max_overflow': 10,  # Maximum number of connections that can be created beyond pool_size
            'pool_timeout': 30,  # Seconds to wait before giving up on getting a connection from the pool
            'pool_recycle': 1800,  # Recycle connections after 30 minutes
        }
    }
}

# Cache settings for better performance
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 minutes
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
            'CULL_FREQUENCY': 3,  # Fraction of entries to cull when max is reached
        }
    }
}

# Session settings to reduce database load
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS = 'default'

# Template settings to improve rendering performance
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]

# Static files settings
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Middleware optimizations
MIDDLEWARE = [
    # Add memory optimization middleware
    'pyfactor.middleware.memory_optimization.MemoryOptimizationMiddleware',
    # Keep existing middleware
    *MIDDLEWARE
]

# Logging settings for memory monitoring
LOGGING['loggers']['pyfactor.memory'] = {
    'handlers': ['console', 'file'],
    'level': 'INFO',
    'propagate': False,
}

# DRF settings for better performance
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ) if not DEBUG else (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 50,
}
EOL

# Create memory optimization middleware
mkdir -p pyfactor/middleware/
cat > pyfactor/middleware/memory_optimization.py << 'EOL'
"""
Memory optimization middleware for Django/FastAPI application.
This middleware monitors memory usage and applies optimizations.
"""

import gc
import logging
import time
import threading
import os
from django.conf import settings

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

logger = logging.getLogger('pyfactor.memory')

# Memory monitoring settings
MEMORY_CHECK_INTERVAL = getattr(settings, 'MEMORY_CHECK_INTERVAL', 60)  # seconds
MEMORY_THRESHOLD = getattr(settings, 'MEMORY_THRESHOLD', 85)  # percent
FORCE_GC_THRESHOLD = getattr(settings, 'FORCE_GC_THRESHOLD', 75)  # percent

class MemoryMonitor:
    """Memory monitoring thread that periodically checks memory usage."""
    
    def __init__(self):
        self.keep_running = True
        self.thread = None
        self.last_gc_time = 0
        
    def start(self):
        """Start the memory monitoring thread."""
        if not PSUTIL_AVAILABLE:
            logger.warning("psutil not available, memory monitoring disabled")
            return
            
        if self.thread is None:
            self.thread = threading.Thread(target=self._monitor_memory, daemon=True)
            self.thread.start()
            logger.info("Memory monitoring thread started")
    
    def stop(self):
        """Stop the memory monitoring thread."""
        self.keep_running = False
        if self.thread:
            self.thread.join(timeout=5)
            self.thread = None
            logger.info("Memory monitoring thread stopped")
    
    def _monitor_memory(self):
        """Monitor memory usage and apply optimizations when needed."""
        while self.keep_running:
            try:
                # Get current memory usage
                process = psutil.Process(os.getpid())
                memory_info = process.memory_info()
                process_memory_mb = memory_info.rss / (1024 * 1024)
                
                system_memory = psutil.virtual_memory()
                system_percent = system_memory.percent
                
                # Log memory usage periodically
                logger.info(f"Memory usage: Process: {process_memory_mb:.2f}MB, System: {system_percent}%")
                
                # Check if memory usage is too high
                if system_percent > MEMORY_THRESHOLD:
                    logger.warning(f"High memory usage detected: {system_percent}%")
                    self._apply_memory_optimizations(severe=True)
                elif system_percent > FORCE_GC_THRESHOLD:
                    # Apply lighter optimizations
                    self._apply_memory_optimizations(severe=False)
                
                # Sleep for the check interval
                time.sleep(MEMORY_CHECK_INTERVAL)
                
            except Exception as e:
                logger.error(f"Error in memory monitoring: {e}")
                time.sleep(MEMORY_CHECK_INTERVAL)
    
    def _apply_memory_optimizations(self, severe=False):
        """Apply memory optimizations based on severity."""
        current_time = time.time()
        
        # Don't run GC too frequently
        if current_time - self.last_gc_time < 60 and not severe:
            return
            
        logger.info("Applying memory optimizations...")
        
        # Force garbage collection
        gc.collect()
        self.last_gc_time = current_time
        
        if severe:
            # More aggressive optimizations for severe memory pressure
            logger.warning("Applying severe memory optimizations")
            
            # Clear caches if available
            if hasattr(settings, 'CACHES'):
                from django.core.cache import cache
                cache.clear()
                logger.info("Cleared Django cache")
            
            # Clear connection pools
            if hasattr(settings, 'DATABASES'):
                from django.db import connections
                for conn in connections.all():
                    conn.close()
                logger.info("Closed all database connections")

# Global memory monitor instance
memory_monitor = MemoryMonitor()

class MemoryOptimizationMiddleware:
    """
    Django middleware that initializes memory monitoring and
    applies optimizations on each request if needed.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Start memory monitoring when middleware is initialized
        memory_monitor.start()
        
        # Enable garbage collection
        gc.enable()
        
        # Initial garbage collection
        gc.collect()
        
        logger.info("Memory optimization middleware initialized")
    
    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        
        # Check if we should apply optimizations after this request
        if PSUTIL_AVAILABLE:
            system_percent = psutil.virtual_memory().percent
            if system_percent > FORCE_GC_THRESHOLD:
                # Run garbage collection if memory usage is high
                gc.collect()
        
        return response
    
    def __del__(self):
        # Stop memory monitoring when middleware is destroyed
        memory_monitor.stop()
EOL

# Make the script executable
chmod +x optimize_backend.sh

echo "Backend memory optimization complete!"
echo "To apply these optimizations, add the following to your settings.py:"
echo "from pyfactor.memory_settings import *"
echo ""
echo "Run the optimized server with:"
echo "./run_server.py"