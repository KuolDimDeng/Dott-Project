from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """
    Simple health check endpoint for AWS Elastic Beanstalk ALB
    Returns 200 OK for healthy status
    """
    try:
        logger.info("Health check endpoint accessed")
        return HttpResponse("OK", content_type="text/plain", status=200)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HttpResponse("UNHEALTHY", content_type="text/plain", status=500)

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
@require_http_methods(["GET", "HEAD"])
def detailed_health_check(request):
    """
    Detailed health check with system information
    """
    try:
        from django.db import connections
        import time
        
        db_status = "healthy"
        db_errors = []
        
        # Test database connection
        for alias in connections:
            try:
                connections[alias].ensure_connection()
                logger.info(f"Database connection '{alias}' is healthy")
            except Exception as e:
                db_status = "unhealthy"
                db_errors.append(f"{alias}: {str(e)}")
                logger.error(f"Database connection '{alias}' failed: {str(e)}")
                
        health_data = {
            "status": "healthy" if db_status == "healthy" else "unhealthy",
            "database": db_status,
            "database_errors": db_errors if db_errors else None,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "service": "pyfactor-django"
        }
        
        status_code = 200 if db_status == "healthy" else 500
        logger.info(f"Detailed health check completed with status: {health_data['status']}")
        
        return JsonResponse(health_data, status=status_code)
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return JsonResponse({
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "service": "pyfactor-django"
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
