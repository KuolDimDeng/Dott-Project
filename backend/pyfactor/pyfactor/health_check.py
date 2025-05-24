from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

def health_check(request):
    """
    Simple health check endpoint for AWS Elastic Beanstalk
    """
    return HttpResponse("OK", content_type="text/plain", status=200)

@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def root_health_check(request):
    """
    Root path health check for AWS ELB health checker
    This handles requests to "/" which is what the ELB health checker uses by default
    """
    return HttpResponse("Healthy", content_type="text/plain", status=200)

@csrf_exempt  
def detailed_health_check(request):
    """
    Detailed health check with system information
    """
    try:
        from django.db import connections
        db_status = "healthy"
        
        # Test database connection
        for alias in connections:
            try:
                connections[alias].ensure_connection()
            except Exception as e:
                db_status = f"unhealthy: {str(e)}"
                break
                
        health_data = {
            "status": "healthy",
            "database": db_status,
            "timestamp": "2025-05-23T23:06:00Z"
        }
        
        return JsonResponse(health_data, status=200)
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy", 
            "error": str(e)
        }, status=500)

class HealthCheckMiddleware:
    """
    Middleware to handle ELB health checks at root path
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if this is a health check request from ELB
        if (request.path == '/' and 
            request.method == 'GET' and 
            'ELB-HealthChecker' in request.META.get('HTTP_USER_AGENT', '')):
            return HttpResponse("OK", content_type="text/plain", status=200)
        
        # Continue with normal request processing
        response = self.get_response(request)
        return response
