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
            tenant = getattr(self.request, 'tenant', None)
            if tenant:
                logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
            else:
                logger.debug("No tenant found in request")
            
            # Get optimized connection for the current schema
            from django.db import connection
            from pyfactor.db_routers import TenantSchemaRouter
            
            # Clear connection cache to ensure clean state
            TenantSchemaRouter.clear_connection_cache()
            
            # Get optimized connection for tenant schema
            if tenant:
                TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
            
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
        finally:
            # Reset connection cache
            TenantSchemaRouter.clear_connection_cache()
    
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
            # Log tenant information if available
            tenant = getattr(self.request, 'tenant', None)
            if tenant:
                logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
            else:
                logger.debug("No tenant found in request")
            
            # Use the optimized manager to get products for this tenant
            if tenant:
                # Use the optimized manager's for_tenant method
                queryset = Product.optimized.for_tenant(tenant.schema_name)
                logger.debug(f"Using optimized manager for tenant: {tenant.schema_name}")
            else:
                # Fall back to regular queryset
                queryset = Product.objects.select_related('department').all()
                logger.debug("Using regular queryset (no tenant)")
            
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
            tenant = getattr(self.request, 'tenant', None)
            if tenant:
                logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
            else:
                logger.debug("No tenant found in request")
            
            # Get optimized connection for the current schema
            from django.db import connection
            from pyfactor.db_routers import TenantSchemaRouter
            
            # Clear connection cache to ensure clean state
            TenantSchemaRouter.clear_connection_cache()
            
            # Get optimized connection for tenant schema
            if tenant:
                TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
            
            # Use select_related to optimize queries
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
        finally:
            # Reset connection cache
            TenantSchemaRouter.clear_connection_cache()
    
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
    import logging
    import time
    import uuid
    
    from django.db import connection
    from pyfactor.db_routers import TenantSchemaRouter
    from django.conf import settings
    from rest_framework import status
    from rest_framework.response import Response
    from .serializers import ProductSerializer
    
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    request_id = str(uuid.uuid4())[:8]
    logger.debug(f"[CREATE-PRODUCT-{request_id}] Starting product creation for user {request.user.email}")
    
    # Get the tenant for this request
    tenant = getattr(request, 'tenant', None)
    
    # If no tenant is found in the request, ensure the user has a tenant using our failsafe
    if not tenant:
        logger.warning(f"[CREATE-PRODUCT-{request_id}] No tenant found in request, attempting to find or use existing tenant")
        
        # Get business ID from headers or user data
        business_id = request.headers.get('X-Business-ID') or getattr(request.user, 'custom', {}).get('businessid')
        
        # Use our failsafe to get the correct tenant
        tenant, _ = ensure_single_tenant_per_business(request.user, business_id)
        
        if tenant:
            logger.info(f"[CREATE-PRODUCT-{request_id}] Found tenant {tenant.schema_name} for user {request.user.email}")
            # Add tenant to request for middleware and other components
            request.tenant = tenant
        else:
            logger.error(f"[CREATE-PRODUCT-{request_id}] No tenant found for user {request.user.email}, cannot create product")
            return Response(
                {"error": "No tenant found for this user. Please complete onboarding first."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Ensure we're in the correct schema context
    try:
        # Clear connection cache to ensure clean state
        logger.debug(f"[CREATE-PRODUCT-{request_id}] Clearing connection cache")
        TenantSchemaRouter.clear_connection_cache()
        
        # Get optimized connection for tenant schema
        if tenant:
            logger.debug(f"[CREATE-PRODUCT-{request_id}] Getting connection for schema: {tenant.schema_name}")
            TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
        
        # Log request data for debugging
        logger.debug(f"[CREATE-PRODUCT-{request_id}] Product data: {request.data}")
        
        # Validate the data
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            logger.debug(f"[CREATE-PRODUCT-{request_id}] Product data validated successfully: {serializer.validated_data}")
            
            # Use a transaction to ensure atomicity
            from django.db import transaction
            with transaction.atomic():
                # Set timeout for the transaction
                with connection.cursor() as cursor:
                    cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
                    logger.debug(f"[CREATE-PRODUCT-{request_id}] Set transaction timeout to 10 seconds")
                
                # Save the product
                logger.debug("[CREATE-PRODUCT-{request_id}] Attempting to save product")
                product = serializer.save()
                logger.info(f"[CREATE-PRODUCT-{request_id}] Successfully created product: {product.name} with ID {product.id} in {time.time() - start_time:.4f}s")
                return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
        else:
            logger.warning(f"[CREATE-PRODUCT-{request_id}] Product validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Get detailed exception information
        exc_type, exc_value, exc_traceback = sys.exc_info()
        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
        
        logger.error(f"[CREATE-PRODUCT-{request_id}] Error creating product: {str(e)}", exc_info=True)
        logger.error(f"[CREATE-PRODUCT-{request_id}] Stack trace: {''.join(stack_trace)}")
        
        # Log database connection state
        try:
            with connection.cursor() as cursor:
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                logger.error(f"[CREATE-PRODUCT-{request_id}] Current search_path at error: {current_path}")
                
                # Check if schema exists
                if tenant:
                    cursor.execute("""
                        SELECT schema_name FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, [tenant.schema_name])
                    schema_exists = cursor.fetchone() is not None
                    logger.error(f"[CREATE-PRODUCT-{request_id}] Schema {tenant.schema_name} exists: {schema_exists}")
        except Exception as conn_error:
            logger.error(f"[CREATE-PRODUCT-{request_id}] Error checking connection state: {str(conn_error)}")
        
        # Provide more specific error messages based on the exception type
        if "timeout" in str(e).lower():
            return Response({"error": "Database operation timed out. Please try again."},
                           status=status.HTTP_504_GATEWAY_TIMEOUT)
        elif "duplicate key" in str(e).lower():
            return Response({"error": "A product with this code already exists."},
                           status=status.HTTP_409_CONFLICT)
        elif "schema" in str(e).lower():
            return Response({"error": "Database schema error. Please try again or contact support.",
                            "details": str(e)},
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": str(e), "details": "See server logs for more information"},
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        # Reset connection cache
        logger.debug("[CREATE-PRODUCT-{request_id}] Resetting connection cache")
        TenantSchemaRouter.clear_connection_cache()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    # Log the current database connection and schema
    from django.db import connection
    from pyfactor.db_routers import TenantSchemaRouter
    
    # Get optimized connection for the current schema
    with connection.cursor() as cursor:
        cursor.execute('SHOW search_path')
        current_schema = cursor.fetchone()[0]
        logger.debug(f"Creating service in schema: {current_schema}, using connection: {connection.alias}")
    
    # Log tenant information if available
    tenant = getattr(request, 'tenant', None)
    if tenant:
        logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
    else:
        logger.warning("No tenant found in request")
    
    # Ensure we're in the correct schema context
    try:
        # Clear connection cache to ensure clean state
        TenantSchemaRouter.clear_connection_cache()
        
        # Get optimized connection for tenant schema
        if tenant:
            TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
        
        # Validate the data
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            # Use a transaction to ensure atomicity
            from django.db import transaction
            with transaction.atomic():
                # Set timeout for the transaction
                with connection.cursor() as cursor:
                    cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
                
                # Save the service
                service = serializer.save()
                logger.debug(f"Successfully created service: {service.name} with ID {service.id} in {time.time() - start_time:.4f}s")
                return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)
        else:
            logger.warning(f"Service validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating service: {str(e)}", exc_info=True)
        
        # Provide more specific error messages based on the exception type
        if "timeout" in str(e).lower():
            return Response({"error": "Database operation timed out. Please try again."},
                           status=status.HTTP_504_GATEWAY_TIMEOUT)
        elif "duplicate key" in str(e).lower():
            return Response({"error": "A service with this code already exists."},
                           status=status.HTTP_409_CONFLICT)
        else:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        # Reset connection cache
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_list(request):
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    try:
        # Get tenant information if available
        tenant = getattr(request, 'tenant', None)
        if tenant:
            logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
            
            # Use the optimized manager's for_tenant method
            products = Product.optimized.for_tenant(tenant.schema_name)
            logger.debug(f"Using optimized manager for tenant: {tenant.schema_name}")
        else:
            logger.debug("No tenant found in request, using current schema")
            # Fall back to regular queryset
            products = Product.objects.select_related('department').all()
        
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
    finally:
        # Reset connection cache
        TenantSchemaRouter.clear_connection_cache()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_list(request):
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    # Log the current database connection and schema
    from django.db import connection
    from pyfactor.db_routers import TenantSchemaRouter
    
    try:
        # Get optimized connection for the current schema
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Fetching services from schema: {current_schema}, using connection: {connection.alias}")
        
        # Ensure we're in the correct schema context
        TenantSchemaRouter.clear_connection_cache()
        
        # Get tenant information if available
        tenant = getattr(request, 'tenant', None)
        if tenant:
            logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
            TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
        else:
            logger.debug("No tenant found in request, using current schema")
        
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
    finally:
        # Reset connection cache
        TenantSchemaRouter.clear_connection_cache()

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