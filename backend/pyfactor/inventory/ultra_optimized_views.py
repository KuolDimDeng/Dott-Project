"""
Ultra-optimized views for inventory module.
These views are designed to be extremely fast and efficient.
"""
import logging
import time
from django.db import connection, models
from django.core.cache import cache
from django.conf import settings
from django.db.models import Sum, Avg, Count, F, Q, Value, ExpressionWrapper, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Product
from .ultra_lightweight_serializers import (
    UltraLightweightProductSerializer, 
    ProductListSerializer,
    ProductStatsSerializer
)
from pyfactor.db_routers import TenantSchemaRouter

logger = logging.getLogger(__name__)

# Cache settings
CACHE_TIMEOUT = 600  # 10 minutes
STATS_CACHE_TIMEOUT = 1800  # 30 minutes
CACHE_KEY_PREFIX = 'inventory_ultra_'

class MicroPagination(PageNumberPagination):
    """Pagination class with very small page size for ultra-fast initial load."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ultra_fast_product_list(request):
    """
    Ultra-optimized endpoint for listing products.
    This endpoint is designed to be extremely fast for initial page load.
    It uses:
    - Ultra-lightweight serializer with minimal fields
    - Smaller page size for faster initial load
    - Longer Redis caching (10 minutes)
    - Optimized database queries with only needed fields
    - Query hints for the database optimizer
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema = tenant.schema_name if tenant else None
        
        # Build cache key based on query parameters and tenant
        cache_params = {k: v for k, v in request.query_params.items()}
        cache_key = f"{CACHE_KEY_PREFIX}ultra_list_{tenant_schema}_{hash(frozenset(cache_params.items()))}"
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(cached_data)
        
        # Set up database connection
        TenantSchemaRouter.clear_connection_cache()
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant_schema)
        
        # Set statement timeout to 5 seconds (shorter for faster response)
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 5000')
        
        # Build optimized query
        queryset = Product.objects.all()
        
        # Only select needed fields to reduce data transfer
        queryset = queryset.only(
            'id', 'name', 'product_code', 'stock_quantity', 'price', 'is_for_sale'
        )
        
        # Add query hints for the database optimizer
        queryset = queryset.select_related('department')
        
        # Apply filters
        if 'is_for_sale' in request.query_params:
            queryset = queryset.filter(
                is_for_sale=request.query_params.get('is_for_sale').lower() == 'true'
            )
        
        if 'min_stock' in request.query_params:
            try:
                min_stock = int(request.query_params.get('min_stock'))
                queryset = queryset.filter(stock_quantity__gte=min_stock)
            except ValueError:
                pass
        
        if 'department' in request.query_params:
            try:
                department_id = request.query_params.get('department')
                queryset = queryset.filter(department_id=department_id)
            except ValueError:
                pass
        
        if 'search' in request.query_params:
            search_term = request.query_params.get('search')
            if search_term:
                queryset = queryset.filter(
                    Q(name__icontains=search_term) | 
                    Q(product_code__icontains=search_term)
                )
        
        # Order by created_at (using the index)
        queryset = queryset.order_by('-created_at')
        
        # Apply pagination
        paginator = MicroPagination()
        paginated_products = paginator.paginate_queryset(queryset, request)
        
        # Use ultra-lightweight serializer
        serializer = UltraLightweightProductSerializer(paginated_products, many=True)
        
        # Get paginated response
        response_data = paginator.get_paginated_response(serializer.data).data
        
        # Cache the response
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        
        logger.debug(f"Ultra-fast product list fetched in {time.time() - start_time:.4f}s")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in ultra-fast product list: {str(e)}", exc_info=True)
        
        if "timeout" in str(e).lower():
            return Response(
                {"error": "Database operation timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        else:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    finally:
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_list_with_department(request):
    """
    Optimized endpoint for listing products with department information.
    This endpoint is a good balance between performance and data completeness.
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema = tenant.schema_name if tenant else None
        
        # Build cache key based on query parameters and tenant
        cache_params = {k: v for k, v in request.query_params.items()}
        cache_key = f"{CACHE_KEY_PREFIX}list_with_dept_{tenant_schema}_{hash(frozenset(cache_params.items()))}"
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(cached_data)
        
        # Set up database connection
        TenantSchemaRouter.clear_connection_cache()
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant_schema)
        
        # Set statement timeout to 8 seconds
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 8000')
        
        # Build optimized query
        queryset = Product.objects.select_related('department')
        
        # Apply filters (same as ultra_fast_product_list)
        if 'is_for_sale' in request.query_params:
            queryset = queryset.filter(
                is_for_sale=request.query_params.get('is_for_sale').lower() == 'true'
            )
        
        if 'min_stock' in request.query_params:
            try:
                min_stock = int(request.query_params.get('min_stock'))
                queryset = queryset.filter(stock_quantity__gte=min_stock)
            except ValueError:
                pass
        
        if 'department' in request.query_params:
            try:
                department_id = request.query_params.get('department')
                queryset = queryset.filter(department_id=department_id)
            except ValueError:
                pass
        
        if 'search' in request.query_params:
            search_term = request.query_params.get('search')
            if search_term:
                queryset = queryset.filter(
                    Q(name__icontains=search_term) | 
                    Q(product_code__icontains=search_term)
                )
        
        # Order by created_at (using the index)
        queryset = queryset.order_by('-created_at')
        
        # Apply pagination (standard size)
        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginated_products = paginator.paginate_queryset(queryset, request)
        
        # Use product list serializer with department
        serializer = ProductListSerializer(paginated_products, many=True)
        
        # Get paginated response
        response_data = paginator.get_paginated_response(serializer.data).data
        
        # Cache the response
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        
        logger.debug(f"Product list with department fetched in {time.time() - start_time:.4f}s")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in product list with department: {str(e)}", exc_info=True)
        
        if "timeout" in str(e).lower():
            return Response(
                {"error": "Database operation timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        else:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    finally:
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_stats(request):
    """
    Get product statistics for dashboard widgets.
    This endpoint provides aggregated data about products.
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema = tenant.schema_name if tenant else None
        
        # Build cache key
        cache_key = f"{CACHE_KEY_PREFIX}stats_{tenant_schema}"
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(cached_data)
        
        # Set up database connection
        TenantSchemaRouter.clear_connection_cache()
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant_schema)
        
        # Set statement timeout to 10 seconds
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 10000')
        
        # Calculate statistics
        total_products = Product.objects.count()
        
        # Count products with stock below reorder level
        low_stock_count = Product.objects.filter(
            stock_quantity__lt=F('reorder_level')
        ).count()
        
        # Calculate total inventory value
        total_value_expr = ExpressionWrapper(
            Sum(F('stock_quantity') * F('price')),
            output_field=DecimalField()
        )
        total_value = Product.objects.aggregate(
            total_value=Coalesce(total_value_expr, Value(0))
        )['total_value'] or 0
        
        # Calculate average price
        avg_price = Product.objects.aggregate(
            avg_price=Coalesce(Avg('price'), Value(0))
        )['avg_price'] or 0
        
        # Get newest product
        newest_product = None
        if total_products > 0:
            newest_product = Product.objects.order_by('-created_at').first()
        
        # Prepare stats data
        stats_data = {
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'total_value': total_value,
            'avg_price': avg_price,
            'newest_product': newest_product
        }
        
        # Serialize the data
        serializer = ProductStatsSerializer(stats_data)
        response_data = serializer.data
        
        # Cache the response
        cache.set(cache_key, response_data, STATS_CACHE_TIMEOUT)
        
        logger.debug(f"Product stats fetched in {time.time() - start_time:.4f}s")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in product stats: {str(e)}", exc_info=True)
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_by_code(request, product_code):
    """
    Get a product by its product code.
    This is optimized for barcode scanning and quick lookups.
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema = tenant.schema_name if tenant else None
        
        # Build cache key
        cache_key = f"{CACHE_KEY_PREFIX}product_code_{tenant_schema}_{product_code}"
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(cached_data)
        
        # Set up database connection
        TenantSchemaRouter.clear_connection_cache()
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant_schema)
        
        # Direct SQL query for better performance
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.id, 
                    p.name, 
                    p.product_code, 
                    p.stock_quantity,
                    p.price,
                    p.is_for_sale,
                    d.dept_name as department_name
                FROM 
                    inventory_product p
                LEFT JOIN 
                    inventory_department d ON p.department_id = d.id
                WHERE 
                    p.product_code = %s
                LIMIT 1
            """, [product_code])
            
            row = cursor.fetchone()
            if not row:
                return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Convert row to dictionary
            columns = [col[0] for col in cursor.description]
            product_data = dict(zip(columns, row))
            
            # Cache the response
            cache.set(cache_key, product_data, CACHE_TIMEOUT)
            
            logger.debug(f"Product by code fetched in {time.time() - start_time:.4f}s")
            return Response(product_data)
        
    except Exception as e:
        logger.error(f"Error in product by code: {str(e)}", exc_info=True)
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        TenantSchemaRouter.clear_connection_cache()