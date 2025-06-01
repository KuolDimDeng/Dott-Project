import os
import sys
import logging
import json
from datetime import datetime
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

@csrf_exempt
def health_check(request):
    """Basic health check without database dependency"""
    try:
        health_data = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'pyfactor-backend',
            'version': '1.0.0',
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        }
        
        logger.info("Health check successful")
        return JsonResponse(health_data, status=200)
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status=500)

@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def root_health_check(request):
    """
    Root path health check for AWS ELB health checker
    This handles requests to "/" which is what the ELB health checker uses by default
    """
    try:
        logger.info("Root health check endpoint accessed")
        return HttpResponse("Healthy", content_type="text/plain", status=200)
    except Exception as e:
        logger.error(f"Root health check failed: {str(e)}")
        return HttpResponse("UNHEALTHY", content_type="text/plain", status=500)

@csrf_exempt
def detailed_health_check(request):
    """Detailed health check with all components"""
    health_data = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'pyfactor-backend',
        'version': '1.0.0',
        'checks': {}
    }
    
    try:
        # Basic Django check
        health_data['checks']['django'] = {'status': 'healthy'}
        
        # Database check (optional for basic health)
        try:
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            health_data['checks']['database'] = {'status': 'healthy'}
        except Exception as db_e:
            health_data['checks']['database'] = {
                'status': 'unhealthy',
                'error': str(db_e)
            }
            health_data['status'] = 'degraded'
        
        return JsonResponse(health_data, status=200)
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status=500)

class HealthCheckMiddleware:
    """
    Middleware to handle ELB health checks at root path
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if this is a health check request from ELB
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        if (request.path == '/' and 
            request.method == 'GET' and 
            'ELB-HealthChecker' in user_agent):
            logger.info("ELB health check request detected at root path")
            return HttpResponse("OK", content_type="text/plain", status=200)
        
        # Also handle /health/ requests from ELB
        if (request.path == '/health/' and 
            request.method == 'GET' and 
            'ELB-HealthChecker' in user_agent):
            logger.info("ELB health check request detected at /health/ path")
            return HttpResponse("OK", content_type="text/plain", status=200)
        
        # Continue with normal request processing
        response = self.get_response(request)
        return response
