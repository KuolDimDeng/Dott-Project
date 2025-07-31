"""
Cache decorators for Django views
"""
import functools
import json
from typing import Optional, Callable, Union
from django.http import JsonResponse, HttpResponse
from django.core.cache import cache
from django.conf import settings
from .cache_service import cache_service, CacheService
import logging

logger = logging.getLogger(__name__)


def cache_view(
    prefix: str,
    ttl: Optional[int] = None,
    key_func: Optional[Callable] = None,
    vary_on_user: bool = True,
    vary_on_business: bool = True
):
    """
    Decorator to cache view responses
    
    Args:
        prefix: Cache key prefix (use CacheService.PREFIX_* constants)
        ttl: Time to live in seconds (defaults to TTL_MEDIUM)
        key_func: Custom function to generate cache key from request
        vary_on_user: Include user ID in cache key
        vary_on_business: Include business ID in cache key
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Skip caching for non-GET requests
            if request.method != 'GET':
                return view_func(request, *args, **kwargs)
            
            # Generate cache key
            cache_key_parts = [prefix]
            
            if vary_on_user and hasattr(request, 'user') and request.user.is_authenticated:
                cache_key_parts.append(str(request.user.id))
            
            if vary_on_business:
                business_id = getattr(request, 'business_id', None)
                if not business_id and hasattr(request, 'session'):
                    business_id = request.session.get('business_id')
                if business_id:
                    cache_key_parts.append(str(business_id))
            
            # Add custom key parts
            if key_func:
                custom_parts = key_func(request, *args, **kwargs)
                if isinstance(custom_parts, (list, tuple)):
                    cache_key_parts.extend(str(p) for p in custom_parts)
                else:
                    cache_key_parts.append(str(custom_parts))
            
            # Add query parameters
            if request.GET:
                sorted_params = sorted(request.GET.items())
                params_str = "&".join([f"{k}={v}" for k, v in sorted_params])
                cache_key_parts.append(params_str)
            
            cache_key = ":".join(cache_key_parts)
            
            # Try to get from cache
            cached_response = cache_service.get(prefix, *cache_key_parts[1:])
            if cached_response is not None:
                logger.debug(f"Cache HIT for view: {view_func.__name__}")
                if isinstance(cached_response, dict):
                    return JsonResponse(cached_response)
                return HttpResponse(cached_response)
            
            # Call the view
            response = view_func(request, *args, **kwargs)
            
            # Cache successful responses only
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                if isinstance(response, JsonResponse):
                    # Extract JSON data for caching
                    content = json.loads(response.content.decode('utf-8'))
                    cache_service.set(prefix, content, ttl or CacheService.TTL_MEDIUM, *cache_key_parts[1:])
                else:
                    # Cache raw content
                    cache_service.set(prefix, response.content, ttl or CacheService.TTL_MEDIUM, *cache_key_parts[1:])
                
                logger.debug(f"Cached response for view: {view_func.__name__}")
            
            return response
        
        return wrapper
    return decorator


def invalidate_on_change(prefixes: Union[str, list], invalidate_user: bool = False, invalidate_business: bool = False):
    """
    Decorator to invalidate cache after successful mutations
    
    Args:
        prefixes: Cache prefix or list of prefixes to invalidate
        invalidate_user: Invalidate all user-related cache
        invalidate_business: Invalidate all business-related cache
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            response = view_func(request, *args, **kwargs)
            
            # Only invalidate on successful mutations
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                if isinstance(prefixes, str):
                    prefix_list = [prefixes]
                else:
                    prefix_list = prefixes
                
                # Invalidate specific patterns
                for prefix in prefix_list:
                    pattern = f"{prefix}:*"
                    deleted = cache_service.delete_pattern(pattern)
                    logger.debug(f"Invalidated {deleted} cache entries for pattern: {pattern}")
                
                # Invalidate user cache if requested
                if invalidate_user and hasattr(request, 'user') and request.user.is_authenticated:
                    cache_service.invalidate_user(request.user.id)
                    logger.debug(f"Invalidated user cache for user: {request.user.id}")
                
                # Invalidate business cache if requested
                if invalidate_business:
                    business_id = getattr(request, 'business_id', None)
                    if not business_id and hasattr(request, 'session'):
                        business_id = request.session.get('business_id')
                    if business_id:
                        cache_service.invalidate_business(business_id)
                        logger.debug(f"Invalidated business cache for business: {business_id}")
            
            return response
        
        return wrapper
    return decorator


def cache_page_view(ttl: int = 300):
    """
    Simple page-level caching decorator
    
    Args:
        ttl: Time to live in seconds (default 5 minutes)
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Skip caching for authenticated users or non-GET requests
            if request.method != 'GET' or (hasattr(request, 'user') and request.user.is_authenticated):
                return view_func(request, *args, **kwargs)
            
            # Generate cache key from URL
            cache_key = f"page:{request.path}:{request.GET.urlencode()}"
            
            # Try to get from cache
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Page cache HIT: {request.path}")
                return HttpResponse(cached_response)
            
            # Call the view
            response = view_func(request, *args, **kwargs)
            
            # Cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response.content, ttl)
                logger.debug(f"Page cached: {request.path}")
            
            return response
        
        return wrapper
    return decorator