"""pyfactor URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from pyfactor.ssl_health import ssl_health_check, domain_health_check
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    """Simple health check endpoint for load balancer"""
    return JsonResponse({
        "status": "healthy", 
        "service": "pyfactor",
        "version": "1.0.0",
        "timestamp": str(request.META.get('HTTP_DATE', 'unknown'))
    })

def home_view(request):
    """Basic home view for root URL"""
    protocol = 'https' if request.is_secure() else 'http'
    return JsonResponse({
        "message": "Pyfactor Django Application",
        "status": "running",
        "protocol": protocol,
        "host": request.get_host(),
        "endpoints": {
            "health": "/health/",
            "ssl_health": "/ssl-health/",
            "domain_health": "/domain-health/",
            "admin": "/admin/"
        }
    })

def database_health_check(request):
    """Database health check view"""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        return JsonResponse({
            "status": "healthy",
            "database": "connected",
            "result": result[0] if result else None,
            "ssl_enabled": request.is_secure()
        })
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JsonResponse({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('ssl-health/', ssl_health_check, name='ssl_health_check'),
    path('domain-health/', domain_health_check, name='domain_health_check'),
    path('db-health/', database_health_check, name='database_health_check'),
    path('', home_view, name='home'),
]
