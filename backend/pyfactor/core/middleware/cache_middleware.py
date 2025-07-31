"""
Cache middleware for automatic response caching
"""
import json
import hashlib
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from ..cache_service import cache_service, CacheService
import logging

logger = logging.getLogger(__name__)


class ResponseCacheMiddleware(MiddlewareMixin):
    """
    Middleware to cache API responses for GET requests
    """
    
    # Paths to cache (add more as needed)
    CACHE_PATHS = [
        '/api/dashboard/',
        '/api/finance/metrics/',
        '/api/analytics/',
        '/api/users/me/',
        '/api/inventory/products/',
        '/api/crm/customers/',
    ]
    
    # Paths to never cache
    EXCLUDE_PATHS = [
        '/api/auth/',
        '/api/sessions/',
        '/api/payments/webhook/',
        '/health/',
        '/api/test-sentry/',
    ]
    
    def should_cache_request(self, request):
        """Determine if request should be cached"""
        if request.method != 'GET':
            return False
        
        # Check excluded paths
        for path in self.EXCLUDE_PATHS:
            if request.path.startswith(path):
                return False
        
        # Check included paths
        for path in self.CACHE_PATHS:
            if request.path.startswith(path):
                return True
        
        return False
    
    def generate_cache_key(self, request):
        """Generate a unique cache key for the request"""
        # Include user and business in cache key
        key_parts = ['api_response', request.path]
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            key_parts.append(f'user:{request.user.id}')
            
            # Try to get business_id
            business_id = getattr(request, 'business_id', None)
            if not business_id and hasattr(request, 'session'):
                business_id = request.session.get('business_id')
            if business_id:
                key_parts.append(f'business:{business_id}')
        
        # Include query parameters
        if request.GET:
            sorted_params = sorted(request.GET.items())
            params_str = "&".join([f"{k}={v}" for k, v in sorted_params])
            key_parts.append(f'params:{params_str}')
        
        # Create key
        cache_key = ":".join(key_parts)
        
        # Hash if too long
        if len(cache_key) > 200:
            hash_suffix = hashlib.md5(cache_key.encode()).hexdigest()[:8]
            cache_key = f"{cache_key[:180]}:{hash_suffix}"
        
        return cache_key
    
    def process_request(self, request):
        """Check cache before processing request"""
        if not self.should_cache_request(request):
            return None
        
        cache_key = self.generate_cache_key(request)
        cached_response = cache_service.get('api_response', cache_key)
        
        if cached_response:
            logger.debug(f"Cache HIT for API: {request.path}")
            
            # Recreate response
            if isinstance(cached_response, dict):
                response = JsonResponse(cached_response)
            else:
                response = HttpResponse(cached_response)
            
            # Add cache headers
            response['X-Cache'] = 'HIT'
            response['Cache-Control'] = 'private, max-age=300'
            
            return response
        
        # Store cache key for use in process_response
        request._cache_key = cache_key
        return None
    
    def process_response(self, request, response):
        """Cache successful responses"""
        # Only cache if we generated a cache key in process_request
        if not hasattr(request, '_cache_key'):
            return response
        
        # Only cache successful responses
        if response.status_code != 200:
            return response
        
        # Don't cache if response has specific headers
        if response.get('Cache-Control') == 'no-cache':
            return response
        
        try:
            # Extract content for caching
            if hasattr(response, 'content'):
                content = response.content
                
                # Try to parse as JSON for JsonResponse
                if response.get('Content-Type', '').startswith('application/json'):
                    try:
                        content = json.loads(content.decode('utf-8'))
                    except:
                        pass
                
                # Cache the response
                cache_service.set('api_response', content, CacheService.TTL_SHORT, request._cache_key)
                logger.debug(f"Cached response for API: {request.path}")
                
                # Add cache headers
                response['X-Cache'] = 'MISS'
                response['Cache-Control'] = 'private, max-age=300'
        
        except Exception as e:
            logger.error(f"Error caching response: {str(e)}")
        
        return response