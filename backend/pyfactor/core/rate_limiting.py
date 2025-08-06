"""
Enhanced API Rate Limiting System
Implements flexible rate limiting with Redis backend for distributed systems
"""

import hashlib
import json
import time
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Advanced rate limiting with multiple strategies:
    - Per-user rate limiting
    - Per-IP rate limiting
    - Per-endpoint rate limiting
    - Tenant-aware rate limiting
    """
    
    # Default rate limit configurations
    RATE_LIMITS = {
        # Authentication endpoints - strict limits
        'auth': {
            'login': '5/15m',  # 5 attempts per 15 minutes
            'register': '3/1h',  # 3 registrations per hour
            'password_reset': '3/1h',  # 3 reset attempts per hour
            'mfa': '10/5m',  # 10 MFA attempts per 5 minutes
        },
        # Payment endpoints - moderate limits
        'payments': {
            'process': '10/1h',  # 10 payment attempts per hour
            'refund': '5/1d',  # 5 refunds per day
            'subscription': '10/1h',  # 10 subscription changes per hour
        },
        # Data endpoints - generous limits
        'data': {
            'read': '1000/1h',  # 1000 reads per hour
            'write': '100/1h',  # 100 writes per hour
            'bulk': '10/1h',  # 10 bulk operations per hour
            'export': '5/1d',  # 5 exports per day
        },
        # AI/ML endpoints - expensive operations
        'ai': {
            'analysis': '50/1d',  # 50 AI analyses per day
            'report': '10/1d',  # 10 AI reports per day
            'prediction': '100/1d',  # 100 predictions per day
        },
        # Public endpoints - very strict
        'public': {
            'contact': '5/1h',  # 5 contact form submissions per hour
            'demo': '3/1d',  # 3 demo requests per day
        }
    }
    
    @classmethod
    def parse_rate(cls, rate_string):
        """Parse rate string like '5/15m' into count and seconds"""
        count, period = rate_string.split('/')
        count = int(count)
        
        # Parse period
        multipliers = {
            's': 1,
            'm': 60,
            'h': 3600,
            'd': 86400,
            'w': 604800
        }
        
        period_num = int(period[:-1]) if period[:-1] else 1
        period_unit = period[-1]
        seconds = period_num * multipliers.get(period_unit, 60)
        
        return count, seconds
    
    @classmethod
    def get_cache_key(cls, category, action, identifier):
        """Generate cache key for rate limiting"""
        key_parts = [
            'ratelimit',
            category,
            action,
            str(identifier)
        ]
        return ':'.join(key_parts)
    
    @classmethod
    def check_rate_limit(cls, category, action, identifier, custom_limit=None):
        """
        Check if rate limit is exceeded
        Returns: (allowed, remaining, reset_time)
        """
        # Get rate limit
        if custom_limit:
            limit_str = custom_limit
        else:
            category_limits = cls.RATE_LIMITS.get(category, {})
            limit_str = category_limits.get(action, '100/1h')  # Default
        
        max_requests, window_seconds = cls.parse_rate(limit_str)
        
        # Get cache key
        cache_key = cls.get_cache_key(category, action, identifier)
        
        # Get current window data
        window_data = cache.get(cache_key, {
            'count': 0,
            'window_start': time.time(),
            'requests': []
        })
        
        current_time = time.time()
        window_start = window_data['window_start']
        
        # Check if window has expired
        if current_time - window_start > window_seconds:
            # Reset window
            window_data = {
                'count': 0,
                'window_start': current_time,
                'requests': []
            }
        
        # Clean old requests outside current window
        window_data['requests'] = [
            req_time for req_time in window_data['requests']
            if current_time - req_time < window_seconds
        ]
        
        # Check limit
        current_count = len(window_data['requests'])
        
        if current_count >= max_requests:
            # Rate limit exceeded
            reset_time = window_start + window_seconds
            return False, 0, reset_time
        
        # Add current request
        window_data['requests'].append(current_time)
        window_data['count'] = len(window_data['requests'])
        
        # Save to cache
        cache.set(cache_key, window_data, timeout=window_seconds)
        
        remaining = max_requests - window_data['count']
        reset_time = window_start + window_seconds
        
        return True, remaining, reset_time


def rate_limit(category='data', action='read', get_identifier=None, limit=None):
    """
    Decorator for rate limiting views/viewsets
    
    Usage:
        @rate_limit(category='auth', action='login')
        def login_view(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Determine identifier
            if get_identifier:
                identifier = get_identifier(request)
            elif hasattr(request, 'user') and request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                # Use IP address
                ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0]
                if not ip:
                    ip = request.META.get('REMOTE_ADDR', '')
                identifier = f"ip:{ip}"
            
            # Check rate limit
            allowed, remaining, reset_time = RateLimiter.check_rate_limit(
                category, action, identifier, limit
            )
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {identifier} on {category}/{action}")
                
                # Add rate limit headers
                response = JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Please try again later.',
                    'retry_after': int(reset_time - time.time())
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
                response['X-RateLimit-Limit'] = limit or RateLimiter.RATE_LIMITS.get(category, {}).get(action, '100/1h')
                response['X-RateLimit-Remaining'] = '0'
                response['X-RateLimit-Reset'] = str(int(reset_time))
                response['Retry-After'] = str(int(reset_time - time.time()))
                
                return response
            
            # Add rate limit headers to successful response
            response = func(request, *args, **kwargs)
            
            if hasattr(response, '__setitem__'):
                response['X-RateLimit-Remaining'] = str(remaining)
                response['X-RateLimit-Reset'] = str(int(reset_time))
            
            return response
        
        return wrapper
    return decorator


def tenant_rate_limit(category='data', action='read', limit=None):
    """
    Tenant-aware rate limiting
    Limits are applied per tenant, not per user
    """
    def get_tenant_identifier(request):
        if hasattr(request, 'tenant'):
            return f"tenant:{request.tenant.id}"
        elif hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id'):
                return f"tenant:{request.user.tenant_id}"
        return f"ip:{request.META.get('REMOTE_ADDR', '')}"
    
    return rate_limit(category, action, get_tenant_identifier, limit)


class DynamicRateLimiter:
    """
    Dynamic rate limiting based on user plan/tier
    """
    
    PLAN_MULTIPLIERS = {
        'free': 1.0,
        'basic': 1.0,
        'professional': 2.0,
        'enterprise': 5.0,
        'unlimited': float('inf')
    }
    
    @classmethod
    def get_user_limit(cls, user, base_limit):
        """
        Calculate user-specific rate limit based on their plan
        """
        if not user or not user.is_authenticated:
            return base_limit
        
        # Get user plan
        plan = getattr(user, 'subscription_plan', 'free')
        multiplier = cls.PLAN_MULTIPLIERS.get(plan, 1.0)
        
        if multiplier == float('inf'):
            return None  # No limit for unlimited plan
        
        # Parse and modify limit
        count, period = RateLimiter.parse_rate(base_limit)
        new_count = int(count * multiplier)
        
        # Reconstruct limit string
        period_str = f"{period}s"
        if period >= 86400:
            period_str = f"{period // 86400}d"
        elif period >= 3600:
            period_str = f"{period // 3600}h"
        elif period >= 60:
            period_str = f"{period // 60}m"
        
        return f"{new_count}/{period_str}"


def adaptive_rate_limit(category='data', action='read'):
    """
    Adaptive rate limiting based on user behavior and plan
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Get base limit
            base_limit = RateLimiter.RATE_LIMITS.get(category, {}).get(action, '100/1h')
            
            # Adjust for user plan
            if hasattr(request, 'user') and request.user.is_authenticated:
                limit = DynamicRateLimiter.get_user_limit(request.user, base_limit)
                identifier = f"user:{request.user.id}"
            else:
                limit = base_limit
                ip = request.META.get('REMOTE_ADDR', '')
                identifier = f"ip:{ip}"
            
            if limit is None:
                # Unlimited plan - no rate limiting
                return func(request, *args, **kwargs)
            
            # Apply rate limit
            allowed, remaining, reset_time = RateLimiter.check_rate_limit(
                category, action, identifier, limit
            )
            
            if not allowed:
                response = JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please upgrade your plan for higher limits.',
                    'retry_after': int(reset_time - time.time())
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
                response['X-RateLimit-Limit'] = limit
                response['X-RateLimit-Remaining'] = '0'
                response['X-RateLimit-Reset'] = str(int(reset_time))
                
                return response
            
            return func(request, *args, **kwargs)
        
        return wrapper
    return decorator