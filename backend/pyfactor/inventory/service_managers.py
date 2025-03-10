from django.db import models, connection, transaction
from django.db.models import Case, When, F, ExpressionWrapper, BooleanField, DurationField, Sum, Avg, Count
from django.utils import timezone
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cache settings
CACHE_TIMEOUT = 300  # 5 minutes
CACHE_KEY_PREFIX = 'inventory_service_'

class OptimizedServiceManager(models.Manager):
    """
    Optimized manager for Service model with tenant-aware queries
    and performance optimizations.
    """
    
    def get_queryset(self):
        """
        Get base queryset with essential related objects
        """
        return super().get_queryset()
    
    def for_tenant(self, schema_name):
        """
        Get queryset with proper tenant context
        
        Args:
            schema_name (str): The tenant schema name
            
        Returns:
            QuerySet: Queryset with tenant context
        """
        if not schema_name:
            logger.warning("No schema name provided, using default schema")
            return self.get_queryset()
        
        # Use a single transaction for better performance
        with transaction.atomic():
            # Set search path once
            with connection.cursor() as cursor:
                cursor.execute(f'SET LOCAL search_path TO "{schema_name}",public')
            
            # Return optimized queryset
            return self.get_queryset()
    
    def with_service_stats(self):
        """
        Include service statistics with a single query
        
        Returns:
            QuerySet: Queryset with annotated service statistics
        """
        return self.get_queryset().annotate(
            is_active=Case(
                When(is_for_sale=True, then=True),
                default=False,
                output_field=BooleanField()
            ),
            days_available=ExpressionWrapper(
                timezone.now() - F('created_at'),
                output_field=DurationField()
            ),
            service_value=F('price')
        )
    
    def get_stats(self, schema_name=None):
        """
        Get service statistics
        
        Args:
            schema_name (str, optional): The tenant schema name
            
        Returns:
            dict: Dictionary with service statistics
        """
        # Try to get from cache first
        cache_key = f"{CACHE_KEY_PREFIX}stats_{schema_name or 'default'}"
        cached_stats = cache.get(cache_key)
        if cached_stats:
            logger.debug(f"Retrieved service stats from cache for schema {schema_name}")
            return cached_stats
            
        queryset = self.for_tenant(schema_name) if schema_name else self.get_queryset()
        
        # Use aggregation for efficient statistics calculation
        stats = queryset.aggregate(
            total_services=Count('id'),
            avg_price=Avg('price'),
            total_recurring=Count('id', filter=models.Q(is_recurring=True))
        )
        
        # Ensure values are not None
        stats['avg_price'] = stats['avg_price'] or 0
        
        # Cache the results
        cache.set(cache_key, stats, CACHE_TIMEOUT)
        
        return stats
    
    def filter_by_params(self, params):
        """
        Filter services by query parameters
        
        Args:
            params (dict): Query parameters
            
        Returns:
            QuerySet: Filtered queryset
        """
        queryset = self.get_queryset()
        
        # Apply filters based on parameters
        if params.get('is_for_sale') is not None:
            is_for_sale = params.get('is_for_sale').lower() == 'true'
            queryset = queryset.filter(is_for_sale=is_for_sale)
        
        if params.get('is_recurring') is not None:
            is_recurring = params.get('is_recurring').lower() == 'true'
            queryset = queryset.filter(is_recurring=is_recurring)
        
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                models.Q(name__icontains=search_term) |
                models.Q(service_code__icontains=search_term) |
                models.Q(description__icontains=search_term)
            )
        
        return queryset
    
    def get_ultra_fast(self, params=None):
        """
        Get minimal service data for ultra-fast listing
        
        Args:
            params (dict, optional): Query parameters
            
        Returns:
            QuerySet: Optimized queryset with minimal fields
        """
        queryset = self.get_queryset()
        
        # Apply filters if params provided
        if params:
            queryset = self.filter_by_params(params)
        
        # Only select essential fields for better performance
        return queryset.only(
            'id', 'name', 'service_code', 'price', 
            'is_for_sale', 'is_recurring'
        )
    
    def get_by_code(self, code, schema_name=None):
        """
        Get service by code with caching
        
        Args:
            code (str): The service code
            schema_name (str, optional): The tenant schema name
            
        Returns:
            Service: The service object
        """
        # Try to get from cache first
        cache_key = f"{CACHE_KEY_PREFIX}code_{schema_name or 'default'}_{code}"
        cached_service = cache.get(cache_key)
        if cached_service:
            logger.debug(f"Retrieved service by code from cache: {code}")
            return cached_service
            
        # Get from database if not in cache
        queryset = self.for_tenant(schema_name) if schema_name else self.get_queryset()
        service = queryset.get(service_code=code)
        
        # Cache the result
        cache.set(cache_key, service, CACHE_TIMEOUT)
        
        return service
    
    def bulk_create_services(self, services_data, schema_name=None):
        """
        Efficiently create multiple services
        
        Args:
            services_data (list): List of service data dictionaries
            schema_name (str, optional): The tenant schema name
            
        Returns:
            list: The created service objects
        """
        from .models import Service
        
        queryset = self.for_tenant(schema_name) if schema_name else self.get_queryset()
        
        with transaction.atomic():
            # Generate service codes
            for service_data in services_data:
                if not service_data.get('service_code'):
                    service_data['service_code'] = Service.generate_unique_code(service_data['name'], 'service_code')
            
            # Bulk create
            services = [Service(**data) for data in services_data]
            return Service.objects.bulk_create(services)
    
    def bulk_update_services(self, services, fields, schema_name=None):
        """
        Efficiently update multiple services
        
        Args:
            services (list): List of service objects
            fields (list): List of fields to update
            schema_name (str, optional): The tenant schema name
            
        Returns:
            int: Number of services updated
        """
        queryset = self.for_tenant(schema_name) if schema_name else self.get_queryset()
        
        with transaction.atomic():
            # Bulk update
            return queryset.bulk_update(services, fields)