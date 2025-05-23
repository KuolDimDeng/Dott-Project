"""
SSL-specific health check utilities.
"""
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def ssl_health_check(request):
    """SSL-aware health check endpoint"""
    is_secure = request.is_secure()
    protocol = 'https' if is_secure else 'http'
    
    return JsonResponse({
        "status": "healthy",
        "service": "pyfactor",
        "version": "1.0.0",
        "ssl_enabled": is_secure,
        "protocol": protocol,
        "host": request.get_host(),
        "secure_headers": {
            "hsts": getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
            "ssl_redirect": getattr(settings, 'SECURE_SSL_REDIRECT', False),
            "secure_cookies": getattr(settings, 'SESSION_COOKIE_SECURE', False),
        }
    })

def domain_health_check(request):
    """Domain-specific health check"""
    host = request.get_host()
    expected_domains = ['dottapps.com', 'www.dottapps.com']
    
    return JsonResponse({
        "status": "healthy",
        "current_host": host,
        "is_custom_domain": host in expected_domains,
        "protocol": 'https' if request.is_secure() else 'http',
        "expected_domains": expected_domains
    })
