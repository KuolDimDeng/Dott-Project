from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import connection, transaction, models
from django.db.models import Q, F, Case, When, Sum, Count, Avg
from django.utils.decorators import method_decorator
from functools import wraps
from .models import Product, Department
from .serializers import ProductSerializer
import logging
import time
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

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
        schema_name =  tenant.id if tenant else None
        
        # Log tenant information
        if tenant:
            logger.debug(f"Request has tenant: { tenant.id} (Status: {tenant.database_status})")
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

class SmallPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ultra_fast_products(request):
    """
    Ultra-fast endpoint for retrieving products with minimal data
    Uses direct SQL for maximum reliability and performance
    """
    import uuid
    from django.db import connection
    from rest_framework.pagination import PageNumberPagination
    from custom_auth.utils import ensure_single_tenant_per_business
    
    # Get schema from request or headers
    schema_name = None
    tenant_id = None
    
    # Log all available headers and request properties for debugging
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request tenant: {getattr(request, 'tenant', None)}")
    logger.info(f"Request user: {request.user.email if hasattr(request, 'user') and request.user else 'None'}")
    
    # Try to get from tenant object first (set by middleware)
    if hasattr(request, 'tenant') and request.tenant:
        schema_name = request. tenant.id
        tenant_id = str(request.tenant.id)
        logger.info(f"Using tenant from request.tenant: {schema_name} (ID: {tenant_id})")
    
    # Then try headers
    if not schema_name:
        schema_name = request.headers.get('X-Schema-Name')
        if schema_name:
            logger.info(f"Using schema from X-Schema-Name header: {schema_name}")
    
    # Try to get tenant ID from headers
    if not tenant_id:
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            logger.info(f"Using tenant ID from X-Tenant-ID header: {tenant_id}")
            # If we have tenant ID but no schema name, construct it
            if not schema_name:
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.info(f"Generated schema name from tenant ID: {schema_name}")
    
    # Try to get business ID from headers as a fallback
    if not tenant_id:
        business_id = request.headers.get('X-Business-ID')
        if business_id:
            logger.info(f"Using business ID as tenant ID: {business_id}")
            tenant_id = business_id
            if not schema_name:
                schema_name = f"tenant_{business_id.replace('-', '_')}"
                logger.info(f"Generated schema name from business ID: {schema_name}")
    
    # If we still don't have a tenant ID but have a user, try to find their tenant
    if not tenant_id and request.user and request.user.is_authenticated:
        try:
            # Use the failsafe function to ensure we get a tenant
            tenant, _ = ensure_single_tenant_per_business(request.user, None)
            if tenant:
                tenant_id = str(tenant.id)
                schema_name =  tenant.id
                logger.info(f"Retrieved tenant for user {request.user.email}: {schema_name} (ID: {tenant_id})")
                # Add tenant to request for future use
                request.tenant = tenant
        except Exception as tenant_error:
            logger.error(f"Error finding tenant for user: {str(tenant_error)}")
    
    # If we still don't have a schema name, check if the tenant schema exists
    if tenant_id and not schema_name:
        # Generate schema name from tenant ID
        schema_name = f"tenant_{tenant_id.replace('-', '_')}"
        logger.info(f"Generated schema name from tenant ID: {schema_name}")
        
        # Verify schema exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = %s
                )
            """, [schema_name])
            schema_exists = cursor.fetchone()[0]
            
            if not schema_exists:
                logger.warning(f"Generated schema {schema_name} does not exist in database")
    
    # Final fallback to a known schema (for development/testing only)
    if not schema_name:
        schema_name = 'public'
        logger.warning("No schema identified, falling back to public schema as last resort")
    
    logger.info(f"Final decision: Using schema: {schema_name}")
    
    # Define the SQL query - get all products from the schema
    # First check if the table exists in the schema
    table_check_sql = f"""
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = '{schema_name}' 
        AND table_name = 'inventory_product'
    )
    """
    
    # Log the table check for debugging
    logger.info(f"Checking if inventory_product table exists in schema {schema_name}")
    
    with connection.cursor() as cursor:
        cursor.execute(table_check_sql)
        table_exists = cursor.fetchone()[0]
        
    if not table_exists:
        logger.error(f"Table inventory_product does not exist in schema {schema_name}")
        return Response({
            "error": f"Table inventory_product does not exist in schema {schema_name}",
            "schema": schema_name,
            "tenant_id": tenant_id
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Define the SQL query - get all products from the schema
    sql = f"""
    SELECT 
        id, 
        name, 
        product_code, 
        price, 
        stock_quantity, 
        is_for_sale,
        department_id
    FROM 
        {schema_name}.inventory_product
    ORDER BY 
        created_at DESC
    """
    
    try:
        with connection.cursor() as cursor:
            # Explicitly set the search path
            # RLS: Use tenant context instead of schema
            # cursor.execute(f'SET search_path TO {schema_name}')
            set_current_tenant_id(tenant_id)
            
            # Execute the query
            cursor.execute(sql)
            
            # Get column names
            columns = [col[0] for col in cursor.description]
            
            # Fetch the results
            products = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # Convert UUID bytes to string if necessary
            for product in products:
                if isinstance(product['id'], bytes) or isinstance(product['id'], uuid.UUID):
                    product['id'] = str(product['id'])
                if product['department_id'] and (isinstance(product['department_id'], bytes) or 
                                              isinstance(product['department_id'], uuid.UUID)):
                    product['department_id'] = str(product['department_id'])
                
                # Ensure price is float
                if product['price']:
                    product['price'] = float(product['price'])
            
            # Set up pagination
            paginator = PageNumberPagination()
            paginator.page_size = 20
            page = paginator.paginate_queryset(products, request)
            
            if page is not None:
                response = paginator.get_paginated_response(page)
            else:
                response = Response(products)
            
            # Add the schema and tenant info to headers for debugging
            response['X-Schema-Used'] = schema_name
            if tenant_id:
                response['X-Tenant-ID'] = tenant_id
            
            # Log success
            logger.info(f"Found {len(products)} products in schema {schema_name}")
            
            return response
            
    except Exception as e:
        logger.error(f"Error retrieving products from {schema_name}: {str(e)}", exc_info=True)
        return Response({
            "error": f"Failed to retrieve products: {str(e)}",
            "schema": schema_name,
            "tenant_id": tenant_id,
            "user": request.user.email if hasattr(request, 'user') and request.user else None,
            "headers": dict(request.headers),
            "detail": "Direct SQL query failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    schema_name =  tenant.id if tenant else None
    
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
    schema_name =  tenant.id if tenant else None
    
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
    schema_name =  tenant.id if tenant else None
    
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

@api_view(['GET'])
def check_location_migration_status(request):
    """
    Check if the location structured address migration has been applied
    """
    from .models import Location
    from django.core.exceptions import FieldDoesNotExist
    
    try:
        # Check database columns
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'inventory_location'
                AND column_name IN ('street_address', 'street_address_2', 'city', 
                                  'state_province', 'postal_code', 'country', 
                                  'latitude', 'longitude')
                ORDER BY column_name;
            """)
            
            db_columns = cursor.fetchall()
            
            # Check Django migration status
            cursor.execute("""
                SELECT name, applied 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND name = '0010_add_structured_address_to_location'
                LIMIT 1;
            """)
            
            migration_record = cursor.fetchone()
        
        # Check model fields
        new_fields = [
            'street_address', 'street_address_2', 'city', 
            'state_province', 'postal_code', 'country',
            'latitude', 'longitude'
        ]
        
        model_fields = {}
        for field_name in new_fields:
            try:
                field = Location._meta.get_field(field_name)
                model_fields[field_name] = field.__class__.__name__
            except FieldDoesNotExist:
                model_fields[field_name] = "NOT_FOUND"
        
        # Test location creation
        try:
            test_location = Location(
                name="Test Location",
                street_address="123 Test St",
                city="Test City",
                state_province="Test State",
                postal_code="12345",
                country="US"
            )
            test_location.full_clean()  # Validate without saving
            location_test_passed = True
            test_error = None
        except Exception as e:
            location_test_passed = False
            test_error = str(e)
        
        # Compile results
        db_field_names = [col[0] for col in db_columns]
        missing_db_fields = [field for field in new_fields if field not in db_field_names]
        
        migration_applied = migration_record[1] if migration_record else False
        
        missing_model_fields = [field for field, type_name in model_fields.items() 
                               if type_name == "NOT_FOUND"]
        
        status_ok = (
            len(missing_db_fields) == 0 and 
            migration_applied and 
            len(missing_model_fields) == 0 and 
            location_test_passed
        )
        
        return Response({
            "status": "ok" if status_ok else "issues_detected",
            "migration_applied": migration_applied,
            "database_fields": {
                "existing": db_field_names,
                "missing": missing_db_fields,
                "total_expected": len(new_fields)
            },
            "model_fields": model_fields,
            "location_test": {
                "passed": location_test_passed,
                "error": test_error
            },
            "recommendations": [] if status_ok else [
                "Run migration: python manage.py migrate inventory 0010" if missing_db_fields or not migration_applied else None,
                "Check model file updates" if missing_model_fields else None,
                "Restart Django application" if not status_ok else None
            ]
        })
        
    except Exception as e:
        logger.error(f"Error checking location migration status: {str(e)}", exc_info=True)
        return Response({
            "status": "error",
            "error": str(e),
            "detail": "Failed to check migration status"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)