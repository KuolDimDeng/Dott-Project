from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import connection, transaction, models
from django.db.models import Q, F, Case, When
from django.utils.decorators import method_decorator
from functools import wraps
from .models import Product, Department
from .serializers import ProductSerializer
import logging
import time

logger = logging.getLogger(__name__)

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

class OptimizedProductViewSet(viewsets.ModelViewSet):
    """
    Optimized ViewSet for Product model with tenant awareness
    """
    serializer_class = ProductSerializer
    pagination_class = OptimizedPagination
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all()  # Default queryset, will be overridden in get_queryset
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context and optimized queries
        """
        # Get tenant schema from request
        tenant = getattr(self.request, 'tenant', None)
        schema_name = tenant.schema_name if tenant else None
        
        # Log tenant information
        if tenant:
            logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
        else:
            logger.debug("No tenant found in request")
        
        # Use optimized manager with tenant context
        queryset = Product.optimized.for_tenant(schema_name)
        
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
        
        if params.get('min_stock'):
            try:
                min_stock = int(params.get('min_stock'))
                queryset = queryset.filter(stock_quantity__gte=min_stock)
            except (ValueError, TypeError):
                pass
        
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(product_code__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        if params.get('department'):
            queryset = queryset.filter(department__dept_name=params.get('department'))
        
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
            logger.debug(f"Product list fetched in {elapsed_time:.4f}s")
            
            return response
    
    @method_decorator(handle_tenant_error)
    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to add better error handling
        """
        return super().retrieve(request, *args, **kwargs)
    
    @method_decorator(handle_tenant_error)
    def create(self, request, *args, **kwargs):
        """
        Override create method to add better error handling
        """
        return super().create(request, *args, **kwargs)
    
    @method_decorator(handle_tenant_error)
    def update(self, request, *args, **kwargs):
        """
        Override update method to add better error handling
        """
        return super().update(request, *args, **kwargs)
    
    @method_decorator(handle_tenant_error)
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to add better error handling
        """
        return super().destroy(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def ultra_fast_products(request):
    """
    Ultra-fast product list endpoint with minimal fields
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name = tenant.schema_name if tenant else None
    
    # Get tenant info from headers as backup if not in request object
    if not schema_name:
        tenant_id = request.headers.get('X-Tenant-ID')
        schema_header = request.headers.get('X-Schema-Name')
        
        if schema_header:
            schema_name = schema_header
            logger.debug(f"Using schema from header: {schema_name}")
        elif tenant_id:
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            logger.debug(f"Generated schema from tenant ID header: {schema_name}")
    
    if not schema_name:
        return Response(
            {"error": "No tenant schema context found", "detail": "Please specify tenant in headers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.debug(f"Processing ultra_fast_products with schema: {schema_name}")
    
    # Use a transaction with a timeout
    try:
        with transaction.atomic():
            # Set timeout for the transaction
            with connection.cursor() as cursor:
                cursor.execute('SET LOCAL statement_timeout = 5000')  # 5 seconds
                
                # EXPLICITLY set the search path for this connection
                cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Get ultra-fast products
            products = Product.optimized.for_tenant(schema_name).get_ultra_fast(request.query_params)
            
            # Set up pagination
            paginator = OptimizedPagination()
            paginator.page_size = 50  # Larger page size for ultra-fast endpoint
            page = paginator.paginate_queryset(products, request)
            
            if page is not None:
                # Use optimized serialization for better performance
                result = []
                for product in page:
                    result.append({
                        'id': str(product.id),
                        'name': product.name,
                        'product_code': product.product_code,
                        'unit_price': product.unit_price,
                        'stock_quantity': product.stock_quantity,
                        'is_for_sale': product.is_for_sale,
                        'department_id': str(product.department_id) if product.department_id else None,
                        'department_name': product.department.dept_name if product.department else None,
                    })
                
                response = paginator.get_paginated_response(result)
            else:
                # Handle case with no pagination
                result = []
                for product in products:
                    result.append({
                        'id': str(product.id),
                        'name': product.name,
                        'product_code': product.product_code,
                        'unit_price': product.unit_price,
                        'stock_quantity': product.stock_quantity,
                        'is_for_sale': product.is_for_sale,
                        'department_id': str(product.department_id) if product.department_id else None,
                        'department_name': product.department.dept_name if product.department else None,
                    })
                
                response = Response(result)
            
            # Log performance metrics
            elapsed_time = time.time() - start_time
            logger.debug(f"Ultra-fast products fetched in {elapsed_time:.4f}s")
            
            # Add schema info to response headers
            response['X-Schema-Used'] = schema_name
            
            return response
    except Exception as e:
        logger.error(f"Error in ultra_fast_products with schema {schema_name}: {str(e)}", exc_info=True)
        
        if "permission denied" in str(e).lower() or "does not exist" in str(e).lower():
            return Response(
                {"error": f"Schema error with {schema_name}", "detail": str(e)},
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def products_with_department(request):
    """
    Product list endpoint with department information
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name = tenant.schema_name if tenant else None
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 8000')  # 8 seconds
        
        # Get products with department
        products = Product.optimized.for_tenant(schema_name).get_with_department(request.query_params)
        
        # Set up pagination
        paginator = OptimizedPagination()
        page = paginator.paginate_queryset(products, request)
        
        if page is not None:
            # Use a serializer with department information
            data = [{
                'id': str(p.id),
                'name': p.name,
                'product_code': p.product_code,
                'description': p.description,
                'stock_quantity': p.stock_quantity,
                'reorder_level': p.reorder_level,
                'price': float(p.price),
                'is_for_sale': p.is_for_sale,
                'department_name': p.department_name if hasattr(p, 'department_name') else (p.department.dept_name if p.department else None)
            } for p in page]
            
            response = paginator.get_paginated_response(data)
        else:
            data = [{
                'id': str(p.id),
                'name': p.name,
                'product_code': p.product_code,
                'description': p.description,
                'stock_quantity': p.stock_quantity,
                'reorder_level': p.reorder_level,
                'price': float(p.price),
                'is_for_sale': p.is_for_sale,
                'department_name': p.department_name if hasattr(p, 'department_name') else (p.department.dept_name if p.department else None)
            } for p in products]
            
            response = Response(data)
        
        # Log performance metrics
        elapsed_time = time.time() - start_time
        logger.debug(f"Products with department fetched in {elapsed_time:.4f}s")
        
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def product_stats(request):
    """
    Product statistics endpoint
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name = tenant.schema_name if tenant else None
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
        
        # Get product statistics
        stats = Product.optimized.for_tenant(schema_name).get_stats()
        
        # Log performance metrics
        elapsed_time = time.time() - start_time
        logger.debug(f"Product stats fetched in {elapsed_time:.4f}s")
        
        return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@handle_tenant_error
def product_by_code(request, code):
    """
    Get product by code endpoint
    """
    start_time = time.time()
    
    # Get tenant schema from request
    tenant = getattr(request, 'tenant', None)
    schema_name = tenant.schema_name if tenant else None
    
    # Use a transaction with a timeout
    with transaction.atomic():
        # Set timeout for the transaction
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL statement_timeout = 5000')  # 5 seconds
        
        try:
            # Get product by code
            product = Product.optimized.for_tenant(schema_name).get(product_code=code)
            
            # Serialize product
            serializer = ProductSerializer(product)
            
            # Log performance metrics
            elapsed_time = time.time() - start_time
            logger.debug(f"Product by code fetched in {elapsed_time:.4f}s")
            
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found", "detail": f"No product found with code {code}"},
                status=status.HTTP_404_NOT_FOUND
            )