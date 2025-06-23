from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    InventoryItem, Category, Supplier, Location, InventoryTransaction,
    Product, Service, Department, CustomChargePlan
)
from .serializers import (
    InventoryItemSerializer, CategorySerializer, SupplierSerializer,
    LocationSerializer, InventoryTransactionSerializer, ProductSerializer,
    ServiceSerializer, DepartmentSerializer, CustomChargePlanSerializer
)
import json
from django.views.decorators.csrf import csrf_exempt
from io import BytesIO
from barcode import Code128
from barcode.writer import ImageWriter
from custom_auth.utils import ensure_single_tenant_per_business
from custom_auth.middleware import verify_auth_tables_in_schema
import uuid
import logging

# Get logger
logger = logging.getLogger(__name__)

class InventoryItemViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context and optimized queries
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        try:
            # Log tenant information if available
            tenant_id = getattr(self.request, 'tenant_id', None)
            if tenant_id:
                logger.debug(f"Request has tenant_id: {tenant_id}")
            else:
                logger.debug("No tenant_id found in request")
            
            # Use select_related to optimize queries
            queryset = InventoryItem.objects.select_related(
                'category', 'supplier', 'location'
            ).all()
            
            # Apply any filters from query parameters
            if self.request.query_params.get('category'):
                queryset = queryset.filter(category__name=self.request.query_params.get('category'))
            
            if self.request.query_params.get('min_quantity'):
                try:
                    min_quantity = int(self.request.query_params.get('min_quantity'))
                    queryset = queryset.filter(quantity__gte=min_quantity)
                except ValueError:
                    pass
            
            logger.debug(f"InventoryItem queryset fetched in {time.time() - start_time:.4f}s")
            return queryset
            
        except Exception as e:
            logger.error(f"Error getting inventory item queryset: {str(e)}", exc_info=True)
            # Return empty queryset on error
            return InventoryItem.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list method to add better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error listing inventory items: {str(e)}", exc_info=True)
            
            # Provide more specific error messages based on the exception type
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

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """Override list method to add better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error listing suppliers: {str(e)}", exc_info=True)
            
            # Provide more specific error messages based on the exception type
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
    

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]

class InventoryTransactionViewSet(viewsets.ModelViewSet):
    queryset = InventoryTransaction.objects.all()
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context and optimized queries
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        try:
            # Use the TenantManager which automatically filters by tenant
            queryset = Product.objects.all()
            
            # Apply any filters from query parameters
            if self.request.query_params.get('is_for_sale'):
                queryset = queryset.filter(
                    is_for_sale=self.request.query_params.get('is_for_sale').lower() == 'true'
                )
            
            if self.request.query_params.get('min_stock'):
                try:
                    min_stock = int(self.request.query_params.get('min_stock'))
                    queryset = queryset.filter(stock_quantity__gte=min_stock)
                except ValueError:
                    pass
            
            logger.debug(f"Product queryset fetched in {time.time() - start_time:.4f}s")
            return queryset
            
        except Exception as e:
            logger.error(f"Error getting product queryset: {str(e)}", exc_info=True)
            # Return empty queryset on error
            return Product.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list method to add better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error listing products: {str(e)}", exc_info=True)
            
            # Provide more specific error messages based on the exception type
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

class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context and optimized queries
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        try:
            # Log tenant information if available
            tenant_id = getattr(self.request, 'tenant_id', None)
            if tenant_id:
                logger.debug(f"Request has tenant_id: {tenant_id}")
            else:
                logger.debug("No tenant_id found in request")
            
            # Services don't have TenantManager, so they need regular filtering
            queryset = Service.objects.all()
            
            # Apply any filters from query parameters
            if self.request.query_params.get('is_recurring'):
                queryset = queryset.filter(
                    is_recurring=self.request.query_params.get('is_recurring').lower() == 'true'
                )
            
            logger.debug(f"Service queryset fetched in {time.time() - start_time:.4f}s")
            return queryset
            
        except Exception as e:
            logger.error(f"Error getting service queryset: {str(e)}", exc_info=True)
            # Return empty queryset on error
            return Service.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list method to add better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error listing services: {str(e)}", exc_info=True)
            
            # Provide more specific error messages based on the exception type
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

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class CustomChargePlanViewSet(viewsets.ModelViewSet):
    queryset = CustomChargePlan.objects.all()
    serializer_class = CustomChargePlanSerializer
    permission_classes = [IsAuthenticated]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    """Create a new product with dynamic table creation tracking"""
    request_id = uuid.uuid4().hex[:8]
    user = request.user
    logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Product creation requested by user {user.id}")
    
    # Get database information
    try:
        from finance.views import get_user_database
        database_name = get_user_database(user)
        logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Using database {database_name} for product creation")
        
        # Check if product table exists
        from django.db import connections
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'inventory_product'
                )
            """, [database_name.split('_')[0]])  # Extract schema name from database name
            
            table_exists = cursor.fetchone()[0]
            logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Product table exists: {table_exists}")
            
            if not table_exists:
                logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Product table will be created dynamically")
    except Exception as e:
        logger.error(f"[DYNAMIC-CREATEOPT-{request_id}] Error checking product table: {str(e)}")
    
    # Process product creation
    serializer = ProductSerializer(data=request.data, context={'database_name': database_name})
    
    if serializer.is_valid():
        try:
            product = serializer.save()
            logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Product created successfully with ID {product.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"[DYNAMIC-CREATEOPT-{request_id}] Error creating product: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        logger.warning(f"[DYNAMIC-CREATEOPT-{request_id}] Invalid product data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    """Create a new service with dynamic table creation tracking"""
    request_id = uuid.uuid4().hex[:8]
    user = request.user
    logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Service creation requested by user {user.id}")
    
    # Get database information
    try:
        from finance.views import get_user_database
        database_name = get_user_database(user)
        logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Using database {database_name} for service creation")
        
        # Check if service table exists
        from django.db import connections
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'inventory_service'
                )
            """, [database_name.split('_')[0]])  # Extract schema name from database name
            
            table_exists = cursor.fetchone()[0]
            logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Service table exists: {table_exists}")
            
            if not table_exists:
                logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Service table will be created dynamically")
    except Exception as e:
        logger.error(f"[DYNAMIC-CREATEOPT-{request_id}] Error checking service table: {str(e)}")
    
    # Process service creation
    serializer = ServiceSerializer(data=request.data, context={'database_name': database_name})
    
    if serializer.is_valid():
        try:
            service = serializer.save()
            logger.info(f"[DYNAMIC-CREATEOPT-{request_id}] Service created successfully with ID {service.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"[DYNAMIC-CREATEOPT-{request_id}] Error creating service: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        logger.warning(f"[DYNAMIC-CREATEOPT-{request_id}] Invalid service data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_list(request):
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    try:
        # Get tenant information if available
        tenant_id = getattr(request, 'tenant_id', None)
        if tenant_id:
            logger.debug(f"Request has tenant_id: {tenant_id}")
        else:
            logger.debug("No tenant_id found in request")
            
        # Use the TenantManager which automatically filters by tenant
        # The TenantManager uses the RLS context set by middleware
        products = Product.objects.all()
        
        # Use a transaction with a timeout to prevent long-running queries
        from django.db import transaction, connection
        with transaction.atomic():
            # Set timeout for the transaction
            with connection.cursor() as cursor:
                cursor.execute('SET LOCAL statement_timeout = 15000')  # 15 seconds (increased from 10)
            
            # Apply any filters from query parameters
            if request.query_params.get('is_for_sale'):
                products = products.filter(is_for_sale=request.query_params.get('is_for_sale').lower() == 'true')
            
            if request.query_params.get('min_stock'):
                try:
                    min_stock = int(request.query_params.get('min_stock'))
                    products = products.filter(stock_quantity__gte=min_stock)
                except ValueError:
                    pass
                    
            # Optimize with pagination
            from rest_framework.pagination import PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = 50  # Adjust based on your needs
            paginated_products = paginator.paginate_queryset(products, request)
            
            serializer = ProductSerializer(paginated_products, many=True)
            
            logger.debug(f"Product list fetched in {time.time() - start_time:.4f}s")
            return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching product list: {str(e)}", exc_info=True)
        
        # Provide more specific error messages based on the exception type
        if "timeout" in str(e).lower():
            return Response(
                {"error": "Database operation timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        elif "permission denied" in str(e).lower():
            return Response(
                {"error": "Database permission error. Please contact support."},
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_list(request):
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    # Log the current database connection and schema
    from django.db import connection
    
    try:
        # Get optimized connection for the current schema
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Fetching services from schema: {current_schema}, using connection: {connection.alias}")
        
        # Get tenant information if available
        tenant_id = getattr(request, 'tenant_id', None)
        if tenant_id:
            logger.debug(f"Request has tenant_id: {tenant_id}")
        else:
            logger.debug("No tenant_id found in request")
        
        # Use a transaction with a timeout to prevent long-running queries
        from django.db import transaction
        with transaction.atomic():
            # Set timeout for the transaction
            with connection.cursor() as cursor:
                cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
            
            # Get all services
            services = Service.objects.all()
            
            # Apply any filters from query parameters
            if request.query_params.get('is_recurring'):
                services = services.filter(is_recurring=request.query_params.get('is_recurring').lower() == 'true')
                    
            # Optimize with pagination
            from rest_framework.pagination import PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = 50  # Adjust based on your needs
            paginated_services = paginator.paginate_queryset(services, request)
            
            serializer = ServiceSerializer(paginated_services, many=True)
            
            logger.debug(f"Service list fetched in {time.time() - start_time:.4f}s")
            return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching service list: {str(e)}", exc_info=True)
        
        # Provide more specific error messages based on the exception type
        if "timeout" in str(e).lower():
            return Response(
                {"error": "Database operation timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        elif "permission denied" in str(e).lower():
            return Response(
                {"error": "Database permission error. Please contact support."},
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def product_detail(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def service_detail(request, pk):
    try:
        service = Service.objects.get(pk=pk)
    except Service.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ServiceSerializer(service)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ServiceSerializer(service, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        service.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_by_barcode(request, barcode):
    try:
        product = Product.objects.get(product_code=barcode)
        serializer = ProductSerializer(product)
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def print_barcode(request, product_id):
    try:
        product = Product.objects.get(pk=product_id)
        barcode_image = product.get_barcode_image()
        return HttpResponse(barcode_image, content_type='image/png')
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)