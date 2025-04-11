"""
Optimized views for inventory module.
These views are designed to be lightweight and fast.
"""
import logging
import time
from django.db import connection
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Product
from .optimized_serializers import LightweightProductSerializer, ProductSummarySerializer
from pyfactor.db_routers import TenantSchemaRouter

logger = logging.getLogger(__name__)

# Cache settings
CACHE_TIMEOUT = 300  # 5 minutes
CACHE_KEY_PREFIX = 'inventory_product_'

class SmallPagination(PageNumberPagination):
    """Pagination class with smaller page size for faster response."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def optimized_product_list(request):
    """
    Optimized endpoint for listing products.
    This endpoint is designed to be fast and lightweight.
    It uses:
    - Lightweight serializer with fewer fields
    - Smaller page size
    - Redis caching
    - Optimized database queries
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema =  tenant.id if tenant else None
        
        # Build cache key based on query parameters and tenant
        cache_params = {k: v for k, v in request.query_params.items()}
        cache_key = f"{CACHE_KEY_PREFIX}{tenant_schema}_{hash(frozenset(cache_params.items()))}"
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(cached_data)
        
        # Set up database connection
        TenantSchemaRouter.clear_connection_cache()
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant_schema)
        
        # Set statement timeout to 15 seconds
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 15000')
        
        # Build optimized query
        queryset = Product.objects.select_related('department')
        
        # Only select needed fields to reduce data transfer
        queryset = queryset.only(
            'id', 'name', 'price', 'is_for_sale', 'is_for_rent',
            'product_code', 'stock_quantity', 'created_at'
        )
        
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
        
        # Order by created_at (using the new index)
        queryset = queryset.order_by('-created_at')
        
        # Apply pagination
        paginator = SmallPagination()
        paginated_products = paginator.paginate_queryset(queryset, request)
        
        # Use lightweight serializer
        serializer = LightweightProductSerializer(paginated_products, many=True)
        
        # Get paginated response
        response_data = paginator.get_paginated_response(serializer.data).data
        
        # Cache the response
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        
        logger.debug(f"Product list fetched in {time.time() - start_time:.4f}s")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in optimized product list: {str(e)}", exc_info=True)
        
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
def product_summary(request):
    """
    Ultra-lightweight endpoint that returns only essential product data.
    This is designed for dashboards or quick lists where minimal data is needed.
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema =  tenant.id if tenant else None
        
        # Build cache key
        cache_key = f"{CACHE_KEY_PREFIX}summary_{tenant_schema}"
        
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
        
        # Get most recent 100 products
        queryset = Product.objects.only(
            'id', 'name', 'price', 'product_code', 'stock_quantity'
        ).order_by('-created_at')[:100]
        
        # Use summary serializer
        serializer = ProductSummarySerializer(queryset, many=True)
        response_data = {"results": serializer.data}
        
        # Cache the response
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        
        logger.debug(f"Product summary fetched in {time.time() - start_time:.4f}s")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in product summary: {str(e)}", exc_info=True)
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_by_id_optimized(request, product_id):
    """
    Optimized endpoint for getting a single product by ID.
    Uses caching to improve performance.
    """
    start_time = time.time()
    
    try:
        # Get tenant information
        tenant = getattr(request, 'tenant', None)
        tenant_schema =  tenant.id if tenant else None
        
        # Build cache key
        cache_key = f"{CACHE_KEY_PREFIX}detail_{tenant_schema}_{product_id}"
        
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
                    p.description, 
                    p.price, 
                    p.is_for_sale, 
                    p.is_for_rent, 
                    p."salesTax", 
                    p.created_at, 
                    p.updated_at,
                    p.product_code, 
                    p.stock_quantity, 
                    p.reorder_level,
                    d.dept_name as department_name
                FROM 
                    inventory_product p
                LEFT JOIN 
                    inventory_department d ON p.department_id = d.id
                WHERE 
                    p.id = %s
            """, [product_id])
            
            row = cursor.fetchone()
            if not row:
                return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Convert row to dictionary
            columns = [col[0] for col in cursor.description]
            product_data = dict(zip(columns, row))
            
            # Cache the response
            cache.set(cache_key, product_data, CACHE_TIMEOUT)
            
            logger.debug(f"Product detail fetched in {time.time() - start_time:.4f}s")
            return Response(product_data)
        
    except Exception as e:
        logger.error(f"Error in optimized product detail: {str(e)}", exc_info=True)
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        TenantSchemaRouter.clear_connection_cache()