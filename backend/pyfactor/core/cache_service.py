"""
Redis Cache Service
Provides a centralized caching layer for the application
"""
import json
import hashlib
from typing import Any, Optional, Union, List
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """
    Centralized cache service with automatic key generation and TTL management
    """
    
    # Cache key prefixes
    PREFIX_USER = "user"
    PREFIX_BUSINESS = "business"
    PREFIX_DASHBOARD = "dashboard"
    PREFIX_CURRENCY = "currency"
    PREFIX_INVOICE = "invoice"
    PREFIX_CUSTOMER = "customer"
    PREFIX_PRODUCT = "product"
    PREFIX_EMPLOYEE = "employee"
    PREFIX_REPORT = "report"
    PREFIX_SESSION = "session"
    
    # Default TTLs (in seconds)
    TTL_SHORT = 5 * 60  # 5 minutes
    TTL_MEDIUM = 30 * 60  # 30 minutes
    TTL_LONG = 4 * 60 * 60  # 4 hours
    TTL_DAY = 24 * 60 * 60  # 24 hours
    
    @staticmethod
    def _generate_key(prefix: str, *args, **kwargs) -> str:
        """Generate a cache key from prefix and arguments"""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if arg is not None:
                key_parts.append(str(arg))
        
        # Add keyword arguments (sorted for consistency)
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = ":".join([f"{k}={v}" for k, v in sorted_kwargs if v is not None])
            if kwargs_str:
                key_parts.append(kwargs_str)
        
        # Create key
        key = ":".join(key_parts)
        
        # Hash if too long
        if len(key) > 200:
            hash_suffix = hashlib.md5(key.encode()).hexdigest()[:8]
            key = f"{key[:180]}:{hash_suffix}"
        
        return key
    
    @classmethod
    def get(cls, prefix: str, *args, default=None, **kwargs) -> Any:
        """Get value from cache"""
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            value = cache.get(key, default)
            if value is not None and value != default:
                logger.debug(f"Cache HIT: {key}")
            else:
                logger.debug(f"Cache MISS: {key}")
            return value
        except Exception as e:
            logger.error(f"Cache GET error for {key}: {str(e)}")
            return default
    
    @classmethod
    def set(cls, prefix: str, value: Any, ttl: Optional[int] = None, *args, **kwargs) -> bool:
        """Set value in cache"""
        key = cls._generate_key(prefix, *args, **kwargs)
        if ttl is None:
            ttl = cls.TTL_MEDIUM
        
        try:
            cache.set(key, value, ttl)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache SET error for {key}: {str(e)}")
            return False
    
    @classmethod
    def delete(cls, prefix: str, *args, **kwargs) -> bool:
        """Delete value from cache"""
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            cache.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache DELETE error for {key}: {str(e)}")
            return False
    
    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """Delete all keys matching pattern (Redis only)"""
        try:
            if hasattr(cache, '_cache'):
                # Django-redis
                return cache.delete_pattern(pattern)
            else:
                logger.warning("Pattern deletion not supported by cache backend")
                return 0
        except Exception as e:
            logger.error(f"Cache DELETE_PATTERN error for {pattern}: {str(e)}")
            return 0
    
    @classmethod
    def invalidate_user(cls, user_id: int) -> None:
        """Invalidate all user-related cache"""
        patterns = [
            f"{cls.PREFIX_USER}:{user_id}:*",
            f"{cls.PREFIX_DASHBOARD}:{user_id}:*",
            f"{cls.PREFIX_SESSION}:{user_id}:*",
        ]
        for pattern in patterns:
            cls.delete_pattern(pattern)
    
    @classmethod
    def invalidate_business(cls, business_id: str) -> None:
        """Invalidate all business-related cache"""
        patterns = [
            f"{cls.PREFIX_BUSINESS}:{business_id}:*",
            f"{cls.PREFIX_DASHBOARD}:*:{business_id}:*",
            f"{cls.PREFIX_INVOICE}:{business_id}:*",
            f"{cls.PREFIX_CUSTOMER}:{business_id}:*",
            f"{cls.PREFIX_PRODUCT}:{business_id}:*",
            f"{cls.PREFIX_EMPLOYEE}:{business_id}:*",
        ]
        for pattern in patterns:
            cls.delete_pattern(pattern)
    
    # Specific cache methods for common operations
    
    @classmethod
    def get_user_profile(cls, user_id: int) -> Optional[dict]:
        """Get cached user profile"""
        return cls.get(cls.PREFIX_USER, user_id, "profile")
    
    @classmethod
    def set_user_profile(cls, user_id: int, profile: dict) -> bool:
        """Cache user profile"""
        return cls.set(cls.PREFIX_USER, profile, cls.TTL_MEDIUM, user_id, "profile")
    
    @classmethod
    def get_business_details(cls, business_id: str) -> Optional[dict]:
        """Get cached business details"""
        return cls.get(cls.PREFIX_BUSINESS, business_id, "details")
    
    @classmethod
    def set_business_details(cls, business_id: str, details: dict) -> bool:
        """Cache business details"""
        return cls.set(cls.PREFIX_BUSINESS, details, cls.TTL_LONG, business_id, "details")
    
    @classmethod
    def get_dashboard_data(cls, user_id: int, business_id: str, date_range: str) -> Optional[dict]:
        """Get cached dashboard data"""
        return cls.get(cls.PREFIX_DASHBOARD, user_id, business_id, date_range=date_range)
    
    @classmethod
    def set_dashboard_data(cls, user_id: int, business_id: str, date_range: str, data: dict) -> bool:
        """Cache dashboard data"""
        return cls.set(cls.PREFIX_DASHBOARD, data, cls.TTL_SHORT, user_id, business_id, date_range=date_range)
    
    @classmethod
    def get_currency_preferences(cls, business_id: str) -> Optional[dict]:
        """Get cached currency preferences"""
        return cls.get(cls.PREFIX_CURRENCY, business_id, "preferences")
    
    @classmethod
    def set_currency_preferences(cls, business_id: str, preferences: dict) -> bool:
        """Cache currency preferences"""
        return cls.set(cls.PREFIX_CURRENCY, preferences, cls.TTL_LONG, business_id, "preferences")
    
    @classmethod
    def get_exchange_rate(cls, from_currency: str, to_currency: str) -> Optional[float]:
        """Get cached exchange rate"""
        return cls.get(cls.PREFIX_CURRENCY, "rate", from_currency=from_currency, to_currency=to_currency)
    
    @classmethod
    def set_exchange_rate(cls, from_currency: str, to_currency: str, rate: float) -> bool:
        """Cache exchange rate"""
        return cls.set(cls.PREFIX_CURRENCY, rate, cls.TTL_LONG, "rate", 
                      from_currency=from_currency, to_currency=to_currency)


# Create a singleton instance
cache_service = CacheService()