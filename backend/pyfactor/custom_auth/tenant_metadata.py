"""
Tenant Metadata Service

This module provides a central registry for tenant information that will scale
from a few tenants to thousands, with the architecture to support future sharding.

Key features:
1. Efficient tenant lookup and caching
2. Schema name generation and tracking
3. Tenant metrics collection
4. Future-proof design for potential sharding
"""
import logging
import threading
import time
import redis
from django.conf import settings
from django.core.cache import cache
from custom_auth.models import Tenant

logger = logging.getLogger(__name__)

# Thread-local storage for tenant context
_thread_local = threading.local()

# Redis client for distributed tenant metadata
try:
    redis_client = redis.Redis(
        host=getattr(settings, 'REDIS_HOST', 'localhost'),
        port=getattr(settings, 'REDIS_PORT', 6379),
        db=getattr(settings, 'REDIS_TENANT_DB', 2),
        decode_responses=True
    )
    redis_available = True
except Exception as e:
    logger.warning(f"Redis not available for tenant metadata: {str(e)}")
    redis_available = False

# Cache keys
TENANT_INFO_CACHE_KEY = 'tenant_info:{}'
TENANT_METRICS_CACHE_KEY = 'tenant_metrics:{}'
TENANT_LIST_CACHE_KEY = 'tenant_list'

# Cache timeouts
TENANT_INFO_CACHE_TIMEOUT = 3600  # 1 hour
TENANT_METRICS_CACHE_TIMEOUT = 300  # 5 minutes
TENANT_LIST_CACHE_TIMEOUT = 3600  # 1 hour


class TenantMetadataService:
    """
    Central service for tenant metadata management.
    """
    
    @staticmethod
    def get_schema_name(tenant_id):
        """
        Generate schema name from tenant ID.
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            str: Schema name
        """
        if not tenant_id:
            return 'public'
        
        # Convert UUID to string and remove dashes
        tenant_str = str(tenant_id).replace('-', '_')
        
        # Get schema prefix from settings
        schema_prefix = getattr(settings, 'TENANT_SCHEMA_PREFIX', 'tenant_')
        
        # Construct schema name
        return f"{schema_prefix}{tenant_str}"
    
    @staticmethod
    def get_tenant_info(tenant_id):
        """
        Get tenant information from cache or database.
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            dict: Tenant information
        """
        if not tenant_id:
            return None
        
        tenant_id_str = str(tenant_id)
        cache_key = TENANT_INFO_CACHE_KEY.format(tenant_id_str)
        
        # Try to get from cache first
        tenant_info = cache.get(cache_key)
        if tenant_info:
            return tenant_info
        
        # Fall back to database
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Create tenant info dict
            tenant_info = {
                'id': str(tenant.id),
                'schema_name': TenantMetadataService.get_schema_name(tenant_id),
                'name': tenant.name,
                'is_active': tenant.is_active,
                'created_on': str(tenant.created_on),
                # No updated_at field in the model, using created_on instead
                'updated_at': str(tenant.created_on),
                # Add future fields for sharding
                'db_alias': 'default',  # Currently always default, but prepared for sharding
            }
            
            # Store in cache
            cache.set(cache_key, tenant_info, TENANT_INFO_CACHE_TIMEOUT)
            
            return tenant_info
        except Tenant.DoesNotExist:
            logger.warning(f"Tenant {tenant_id} not found in database")
            return None
        except Exception as e:
            logger.error(f"Error getting tenant from database: {str(e)}")
            return None
    
    @staticmethod
    def set_current_tenant(tenant_id):
        """
        Set the current tenant in thread-local storage.
        
        Args:
            tenant_id: UUID of the tenant
        """
        if not tenant_id:
            return
        
        tenant_info = TenantMetadataService.get_tenant_info(tenant_id)
        if tenant_info:
            setattr(_thread_local, 'tenant_id', str(tenant_id))
            setattr(_thread_local, 'schema_name', tenant_info.get('schema_name'))
            setattr(_thread_local, 'db_alias', tenant_info.get('db_alias', 'default'))
            logger.debug(f"Set current tenant to {tenant_id} (schema: {tenant_info.get('schema_name')})")
    
    @staticmethod
    def get_current_tenant_id():
        """
        Get the current tenant ID from thread-local storage.
        
        Returns:
            str: Tenant ID
        """
        return getattr(_thread_local, 'tenant_id', None)
    
    @staticmethod
    def get_current_schema_name():
        """
        Get the current schema name from thread-local storage.
        
        Returns:
            str: Schema name
        """
        return getattr(_thread_local, 'schema_name', 'public')
    
    @staticmethod
    def get_current_db_alias():
        """
        Get the current database alias from thread-local storage.
        
        Returns:
            str: Database alias
        """
        return getattr(_thread_local, 'db_alias', 'default')
    
    @staticmethod
    def clear_current_tenant():
        """
        Clear the current tenant from thread-local storage.
        """
        if hasattr(_thread_local, 'tenant_id'):
            delattr(_thread_local, 'tenant_id')
        if hasattr(_thread_local, 'schema_name'):
            delattr(_thread_local, 'schema_name')
        if hasattr(_thread_local, 'db_alias'):
            delattr(_thread_local, 'db_alias')
    
    @staticmethod
    def register_tenant(tenant):
        """
        Register a tenant in the metadata service.
        
        Args:
            tenant: Tenant model instance
        """
        tenant_id = str(tenant.id)
        schema_name = TenantMetadataService.get_schema_name(tenant_id)
        
        # Store in local cache
        cache_key = TENANT_INFO_CACHE_KEY.format(tenant_id)
        cache_data = {
            'id': tenant_id,
            'schema_name': schema_name,
            'name': tenant.name,
            'db_alias': 'default',  # Currently always default
            'is_active': tenant.is_active,
            'created_on': str(tenant.created_on),
            # No updated_at field in the model, using created_on instead
            'updated_at': str(tenant.created_on),
        }
        
        # Store in Django cache
        cache.set(cache_key, cache_data, TENANT_INFO_CACHE_TIMEOUT)
        
        # Store in Redis if available
        if redis_available:
            try:
                redis_client.hset(f"tenant:{tenant_id}", mapping=cache_data)
                redis_client.sadd("tenants:all", tenant_id)
                logger.debug(f"Tenant {tenant_id} registered in Redis")
            except Exception as e:
                logger.error(f"Error registering tenant in Redis: {str(e)}")
    
    @staticmethod
    def get_all_tenants(force_refresh=False):
        """
        Get all tenants from cache or database.
        
        Args:
            force_refresh: Force refresh from database
            
        Returns:
            list: List of tenant info dictionaries
        """
        if not force_refresh:
            # Try to get from cache first
            tenants = cache.get(TENANT_LIST_CACHE_KEY)
            if tenants:
                return tenants
            
            # Try to get from Redis
            if redis_available:
                try:
                    tenant_ids = redis_client.smembers("tenants:all")
                    if tenant_ids:
                        tenants = []
                        for tenant_id in tenant_ids:
                            tenant_info = redis_client.hgetall(f"tenant:{tenant_id}")
                            if tenant_info:
                                tenants.append(tenant_info)
                        
                        # Store in Django cache
                        cache.set(TENANT_LIST_CACHE_KEY, tenants, TENANT_LIST_CACHE_TIMEOUT)
                        return tenants
                except Exception as e:
                    logger.error(f"Error getting tenants from Redis: {str(e)}")
        
        # Fall back to database
        try:
            tenants = []
            for tenant in Tenant.objects.all():
                tenant_info = {
                    'id': str(tenant.id),
                    'schema_name': TenantMetadataService.get_schema_name(tenant.id),
                    'name': tenant.name,
                    'is_active': tenant.is_active,
                    'created_on': str(tenant.created_on),
                    # No updated_at field in the model, using created_on instead
                    'updated_at': str(tenant.created_on),
                    'db_alias': 'default',  # Currently always default
                }
                tenants.append(tenant_info)
                
                # Register tenant in Redis
                TenantMetadataService.register_tenant(tenant)
            
            # Store in cache
            cache.set(TENANT_LIST_CACHE_KEY, tenants, TENANT_LIST_CACHE_TIMEOUT)
            
            return tenants
        except Exception as e:
            logger.error(f"Error getting tenants from database: {str(e)}")
            return []
    
    @staticmethod
    def record_tenant_metrics(tenant_id, metrics):
        """
        Record metrics for a tenant.
        
        Args:
            tenant_id: UUID of the tenant
            metrics: Dictionary of metrics to record
        """
        if not tenant_id:
            return
        
        tenant_id_str = str(tenant_id)
        cache_key = TENANT_METRICS_CACHE_KEY.format(tenant_id_str)
        
        # Get existing metrics
        existing_metrics = cache.get(cache_key, {})
        
        # Update metrics
        existing_metrics.update({
            'last_updated': time.time(),
            **metrics
        })
        
        # Store in cache
        cache.set(cache_key, existing_metrics, TENANT_METRICS_CACHE_TIMEOUT)
    
    @staticmethod
    def get_tenant_metrics(tenant_id):
        """
        Get metrics for a tenant.
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            dict: Tenant metrics
        """
        if not tenant_id:
            return {}
        
        tenant_id_str = str(tenant_id)
        cache_key = TENANT_METRICS_CACHE_KEY.format(tenant_id_str)
        
        # Get metrics from cache
        return cache.get(cache_key, {})