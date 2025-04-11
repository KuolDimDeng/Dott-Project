from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import connection, transaction, models
from django.db.models import Q, F
from django.utils.decorators import method_decorator
from functools import wraps
from .models import Service
from .serializers import ServiceSerializer
from .ultra_lightweight_service_serializers import (
    UltraLightweightServiceSerializer,
    ServiceListSerializer,
    ServiceStatsSerializer
)
from django.core.cache import cache
import logging
import time

logger = logging.getLogger(__name__)

# Cache settings
CACHE_TIMEOUT = 300  # 5 minutes
CACHE_KEY_PREFIX = 'inventory_service_'

def handle_tenant_error(func):
    """
    Decorator for handling tenant-related errors consistently
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Tenant operation error: {str(e)}", exc_info=True)
            
            if "permission denied" in str(e).lower():
                return Response(
                    {"error": "Database permission error", "detail": str(e)},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif "does not exist" in str(e).lower():
                return Response(
                    {"error": "Tenant schema not found", "detail": str(e)},
                    status=status.HTTP_404_NOT_FOUND
                )
            elif "timeout" in str(e).lower():
                return Response(
                    {"error": "Database operation timed out", "detail": str(e)},
                    status=status.HTTP_504_GATEWAY_TIMEOUT
                )
            else:
                return Response(
                    {"error": "Internal server error", "detail": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    return wrapper

class OptimizedPagination(PageNumberPagination):
    """
    Optimized pagination for inventory endpoints
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class OptimizedServiceViewSet(viewsets.ModelViewSet):
    """
    Optimized ViewSet for Service model with tenant awareness
    """
    serializer_class = ServiceSerializer
    pagination_class = OptimizedPagination
    permission_classes = [IsAuthenticated]
    queryset = Service.objects.all()  # Default queryset, will be overridden in get_queryset
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context and optimized queries
        """
        # Get tenant schema from request
        tenant = getattr(self.request, 'tenant', None)
        schema_name =  tenant.id if tenant else None
        
        # Log tenant information
        if tenant:
            logger.debug(f"Request has tenant: { tenant.id} (Status: {tenant.database_status})")
        else:
            logger.debug("No tenant found in request")
        
        # Use optimized manager with tenant context
        queryset = Service.optimized.for_tenant(schema_name)
        
        # Apply filters from query parameters
        return self._apply_filters(queryset)
    
    def _apply_filters(self, queryset):
        """
        Apply filters from query parameters
        """
        params = self.request.query_params
        
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
                Q(name__icontains=search_term) |
                Q(service_code__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        return queryset
    
    @method_decorator(handle_tenant_error)
    def list(self, request, *args, **kwargs):
        """
        Override list method to add better error handling and performance monitoring
        """
        start_time = time.time()
        
        # Use a transaction with a timeout to prevent long-running queries
        with transaction.atomic():
            # Set timeout for the transaction
            with connection.cursor() as cursor:
                cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
            
            # Get queryset and paginate
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
            else:
                serializer = self.get_serializer(queryset, many=True)
                response = Response(serializer.data)
            
            # Log performance metrics
            elapsed_time = time.time() - start_time
            logger.debug(f"Service list fetched in {elapsed_time:.4f}s")
            
            return response
    
    @method_decorator(handle_tenant_error)
    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to add better error handling and caching
        """
        # Try to get from cache first
        pk = kwargs.get('pk')
        tenant = getattr(request, 'tenant', None)
        schema_name =  tenant.id if tenant else None
        cache_key = f"{CACHE_KEY_PREFIX}detail_{schema_name or 'default'}_{pk}"
        
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Retrieved service detail from cache: {pk}")
            return Response(cached_data)
        
        # If not in cache, get from database
        response = super().retrieve(request, *args, **kwargs)
        
        # Cache the response
        if response.status_code == 200:
            cache.set(cache_key, response.data, CACHE_TIMEOUT)
        
        return response
    
    @method_decorator(handle_tenant_error)
    def create(self, request, *args, **kwargs):
        """
        Override create method to add better error handling
        """
        return super().create(request, *args, **kwargs)
    
    @method_decorator(handle_tenant_error)
    def update(self, request, *args, **kwargs):
        """
        Override update method to add better error handling and cache invalidation
        """
        # Invalidate cache
        pk = kwargs.get('pk')
        tenant = getattr(request, 'tenant', None)
        schema_name =  tenant.id if tenant else None
        cache_key = f"{CACHE_KEY_PREFIX}detail_{schema_name or 'default'}_{pk}"
        cache.delete(cache_key)
        
        return super().update(request, *args, **kwargs)
    
    @method_decorator(handle_tenant_error)
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to add better error handling and cache invalidation
        """
        # Invalidate cache
        pk = kwargs.get('pk')
        tenant = getattr(request, 'tenant', None)
        schema_name =  tenant.id if tenant else None
        cache_key = f"{CACHE_KEY_PREFIX}detail_{schema_name or 'default'}_{pk}"
        cache.delete(cache_key)
        
        return super().destroy(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def ultra_fast_services(request):
    """
    Ultra-fast service list endpoint with minimal fields
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name =  tenant.id if tenant else None
    
    # Check cache first
    cache_key = f"{CACHE_KEY_PREFIX}ultra_fast_{schema_name or 'default'}"
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Retrieved ultra-fast services from cache")
        return Response(cached_data)
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 5000')  # 5 seconds
        
        # Get ultra-fast services
        services = Service.optimized.for_tenant(schema_name).get_ultra_fast(request.query_params)
        
        # Set up pagination
        paginator = OptimizedPagination()
        paginator.page_size = 50  # Larger page size for ultra-fast endpoint
        page = paginator.paginate_queryset(services, request)
        
        if page is not None:
            # Use a minimal serializer for better performance
            data = [{
                'id': str(s.id),
                'name': s.name,
                'service_code': s.service_code,
                'price': float(s.price),
                'is_recurring': s.is_recurring
            } for s in page]
            
            response = paginator.get_paginated_response(data)
        else:
            data = [{
                'id': str(s.id),
                'name': s.name,
                'service_code': s.service_code,
                'price': float(s.price),
                'is_recurring': s.is_recurring
            } for s in services]
            
            response = Response(data)
        
        # Cache the response
        cache.set(cache_key, response.data, CACHE_TIMEOUT)
        
        # Log performance metrics
        elapsed_time = time.time() - start_time
        logger.debug(f"Ultra-fast services fetched in {elapsed_time:.4f}s")
        
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def service_stats(request):
    """
    Service statistics endpoint
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name =  tenant.id if tenant else None
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
        
        # Get service statistics
        stats = Service.optimized.for_tenant(schema_name).get_stats()
        
        # Get newest service
        newest_service = Service.optimized.for_tenant(schema_name).order_by('-created_at').first()
        if newest_service:
            stats['newest_service'] = UltraLightweightServiceSerializer(newest_service).data
        else:
            stats['newest_service'] = None
        
        # Log performance metrics
        elapsed_time = time.time() - start_time
        logger.debug(f"Service stats fetched in {elapsed_time:.4f}s")
        
        return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def service_by_code(request, code):
    """
    Get service by code endpoint
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name =  tenant.id if tenant else None
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 5000')  # 5 seconds
        
        try:
            # Get service by code
            service = Service.optimized.for_tenant(schema_name).get_by_code(code)
            
            # Serialize service
            serializer = ServiceSerializer(service)
            
            # Log performance metrics
            elapsed_time = time.time() - start_time
            logger.debug(f"Service by code fetched in {elapsed_time:.4f}s")
            
            return Response(serializer.data)
        except Service.DoesNotExist:
            return Response(
                {"error": "Service not found", "detail": f"No service found with code {code}"},
                status=status.HTTP_404_NOT_FOUND
            )