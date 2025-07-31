"""
Rate limiting service using Redis
"""
import time
from typing import Optional, Tuple
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Token bucket rate limiter using Redis
    """
    
    def __init__(self, key_prefix: str = "rate_limit", max_requests: int = 100, window_seconds: int = 60):
        self.key_prefix = key_prefix
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def _get_key(self, identifier: str) -> str:
        """Generate cache key for identifier"""
        return f"{self.key_prefix}:{identifier}"
    
    def check_rate_limit(self, identifier: str) -> Tuple[bool, dict]:
        """
        Check if request is within rate limit
        
        Returns:
            Tuple of (allowed, info) where info contains:
            - remaining: requests remaining
            - reset: timestamp when limit resets
            - retry_after: seconds until next request allowed (if blocked)
        """
        key = self._get_key(identifier)
        now = time.time()
        
        try:
            # Get current bucket info
            bucket_data = cache.get(key)
            
            if bucket_data is None:
                # Initialize new bucket
                bucket_data = {
                    'tokens': self.max_requests - 1,
                    'last_refill': now,
                }
                cache.set(key, bucket_data, self.window_seconds)
                
                return True, {
                    'remaining': bucket_data['tokens'],
                    'reset': int(now + self.window_seconds),
                    'retry_after': None
                }
            
            # Calculate tokens to add based on time passed
            time_passed = now - bucket_data['last_refill']
            tokens_to_add = int(time_passed * self.max_requests / self.window_seconds)
            
            # Refill bucket
            bucket_data['tokens'] = min(
                self.max_requests,
                bucket_data['tokens'] + tokens_to_add
            )
            bucket_data['last_refill'] = now
            
            # Check if request allowed
            if bucket_data['tokens'] >= 1:
                bucket_data['tokens'] -= 1
                cache.set(key, bucket_data, self.window_seconds)
                
                return True, {
                    'remaining': int(bucket_data['tokens']),
                    'reset': int(now + self.window_seconds),
                    'retry_after': None
                }
            else:
                # Calculate retry after
                tokens_needed = 1 - bucket_data['tokens']
                retry_after = int(tokens_needed * self.window_seconds / self.max_requests)
                
                return False, {
                    'remaining': 0,
                    'reset': int(now + self.window_seconds),
                    'retry_after': retry_after
                }
        
        except Exception as e:
            logger.error(f"Rate limiter error: {str(e)}")
            # Allow request on error
            return True, {
                'remaining': -1,
                'reset': int(now + self.window_seconds),
                'retry_after': None
            }
    
    def reset_limit(self, identifier: str):
        """Reset rate limit for identifier"""
        key = self._get_key(identifier)
        cache.delete(key)


class APIRateLimiter:
    """
    API-specific rate limiters with different tiers
    """
    
    # Rate limit configurations by tier
    TIERS = {
        'free': {
            'requests_per_minute': 30,
            'requests_per_hour': 500,
            'ai_requests_per_day': 10,
        },
        'professional': {
            'requests_per_minute': 60,
            'requests_per_hour': 2000,
            'ai_requests_per_day': 100,
        },
        'enterprise': {
            'requests_per_minute': 120,
            'requests_per_hour': 5000,
            'ai_requests_per_day': 1000,
        }
    }
    
    @classmethod
    def get_limiter_for_user(cls, user, limit_type: str = 'minute'):
        """Get rate limiter for user based on their subscription tier"""
        # Determine user tier
        tier = 'free'
        if hasattr(user, 'subscription_plan'):
            tier = user.subscription_plan.lower()
        elif hasattr(user, 'profile') and hasattr(user.profile, 'subscription_plan'):
            tier = user.profile.subscription_plan.lower()
        
        if tier not in cls.TIERS:
            tier = 'free'
        
        # Get limits for tier
        tier_config = cls.TIERS[tier]
        
        if limit_type == 'minute':
            return RateLimiter(
                key_prefix=f"api_rate_minute:{user.id}",
                max_requests=tier_config['requests_per_minute'],
                window_seconds=60
            )
        elif limit_type == 'hour':
            return RateLimiter(
                key_prefix=f"api_rate_hour:{user.id}",
                max_requests=tier_config['requests_per_hour'],
                window_seconds=3600
            )
        elif limit_type == 'ai_daily':
            return RateLimiter(
                key_prefix=f"ai_rate_daily:{user.id}",
                max_requests=tier_config['ai_requests_per_day'],
                window_seconds=86400
            )
        else:
            raise ValueError(f"Unknown limit type: {limit_type}")
    
    @classmethod
    def check_user_limits(cls, user) -> Tuple[bool, dict]:
        """Check all rate limits for user"""
        # Check minute limit
        minute_limiter = cls.get_limiter_for_user(user, 'minute')
        minute_allowed, minute_info = minute_limiter.check_rate_limit(str(user.id))
        
        if not minute_allowed:
            return False, {
                'limit_type': 'minute',
                'message': 'Rate limit exceeded. Please wait before making more requests.',
                **minute_info
            }
        
        # Check hour limit
        hour_limiter = cls.get_limiter_for_user(user, 'hour')
        hour_allowed, hour_info = hour_limiter.check_rate_limit(str(user.id))
        
        if not hour_allowed:
            return False, {
                'limit_type': 'hour',
                'message': 'Hourly rate limit exceeded. Please wait before making more requests.',
                **hour_info
            }
        
        return True, {
            'minute': minute_info,
            'hour': hour_info
        }
    
    @classmethod
    def check_ai_limit(cls, user) -> Tuple[bool, dict]:
        """Check AI-specific rate limit"""
        ai_limiter = cls.get_limiter_for_user(user, 'ai_daily')
        allowed, info = ai_limiter.check_rate_limit(str(user.id))
        
        if not allowed:
            return False, {
                'limit_type': 'ai_daily',
                'message': 'Daily AI request limit exceeded. Upgrade your plan for more AI features.',
                **info
            }
        
        return True, info


# Rate limiting decorator for views
def rate_limit(limit_type: str = 'minute'):
    """
    Decorator to rate limit views
    
    Usage:
        @rate_limit('minute')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            
            # Check rate limits
            if limit_type == 'ai':
                allowed, info = APIRateLimiter.check_ai_limit(request.user)
            else:
                limiter = APIRateLimiter.get_limiter_for_user(request.user, limit_type)
                allowed, info = limiter.check_rate_limit(str(request.user.id))
            
            if not allowed:
                from django.http import JsonResponse
                response = JsonResponse({
                    'error': info.get('message', 'Rate limit exceeded'),
                    'retry_after': info.get('retry_after'),
                    'reset': info.get('reset')
                }, status=429)
                
                # Add rate limit headers
                response['X-RateLimit-Limit'] = str(limiter.max_requests if 'limiter' in locals() else 'N/A')
                response['X-RateLimit-Remaining'] = str(info.get('remaining', 0))
                response['X-RateLimit-Reset'] = str(info.get('reset', 0))
                if info.get('retry_after'):
                    response['Retry-After'] = str(info['retry_after'])
                
                return response
            
            # Add rate limit info to response
            response = view_func(request, *args, **kwargs)
            if hasattr(response, '__setitem__'):
                response['X-RateLimit-Remaining'] = str(info.get('remaining', -1))
                response['X-RateLimit-Reset'] = str(info.get('reset', 0))
            
            return response
        
        return wrapper
    return decorator