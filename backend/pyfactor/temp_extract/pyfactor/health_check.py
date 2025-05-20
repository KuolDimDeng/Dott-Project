"""
Health check views for monitoring application status
"""
import os
import json
import logging
from django.http import JsonResponse
from django.db import connections
from django.conf import settings

logger = logging.getLogger(__name__)

def check_database_connection():
    """Check if database connection is working"""
    try:
        # Test database connection by executing a simple query
        conn = connections['default']
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return False

def health_check(request):
    """
    Health check endpoint for AWS Elastic Beanstalk
    Returns status of application components
    """
    # Check database connection
    db_connected = check_database_connection()
    
    # Check environment
    environment = os.environ.get('ENVIRONMENT', 'unknown')
    
    # Basic application status
    status = {
        'status': 'healthy' if db_connected else 'degraded',
        'environment': environment,
        'database_connected': db_connected,
        'debug_enabled': settings.DEBUG,
        'application': 'pyfactor-backend',
        'version': '0.9.0',  # Update this with your application version
        'features': {
            'authentication': 'complete',
            'api': 'in_progress',
            # Add more feature statuses as needed
        }
    }
    
    # Log health check status in development
    if settings.DEBUG:
        logger.info(f"Health check: {json.dumps(status)}")
    
    # Return appropriate HTTP status code
    http_status = 200 if db_connected else 503
    
    return JsonResponse(status, status=http_status) 