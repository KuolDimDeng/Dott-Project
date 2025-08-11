from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from rest_framework import viewsets, status
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    InventoryItem, Category, Supplier, Location, InventoryTransaction,
    Product, Service, Department, CustomChargePlan, BillOfMaterials, ServiceMaterials
)
from .serializers import (
    InventoryItemSerializer, CategorySerializer, SupplierSerializer,
    LocationSerializer, InventoryTransactionSerializer, ProductSerializer,
    ServiceSerializer, DepartmentSerializer, CustomChargePlanSerializer,
    BillOfMaterialsSerializer, ServiceMaterialsSerializer
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
from pyfactor.analytics import track_event, track_business_metric

# Get logger
logger = logging.getLogger(__name__)

class InventoryItemViewSet(TenantIsolatedViewSet):
    queryset = InventoryItem.objects.all()  # Base queryset needed for TenantIsolatedViewSet
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context - MUST call parent for tenant filtering
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        try:
            # CRITICAL: Call parent's get_queryset() which applies tenant filtering
            queryset = super().get_queryset()
            
            # Now apply select_related for optimization
            queryset = queryset.select_related(
                'category', 'supplier', 'location'
            )
            
            # Log tenant information
            tenant_id = getattr(self.request.user, 'tenant_id', None) or \
                       getattr(self.request.user, 'business_id', None)
            logger.debug(f"[InventoryItemViewSet] Tenant filtering applied for tenant: {tenant_id}")
            
            # Apply any filters from query parameters
            if self.request.query_params.get('category'):
                queryset = queryset.filter(category__name=self.request.query_params.get('category'))
            
            if self.request.query_params.get('min_quantity'):
                try:
                    min_quantity = int(self.request.query_params.get('min_quantity'))
                    queryset = queryset.filter(quantity__gte=min_quantity)
                except ValueError:
                    pass
            
            logger.debug(f"InventoryItem queryset fetched in {time.time() - start_time:.4f}s with {queryset.count()} items")
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

class CategoryViewSet(TenantIsolatedViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class SupplierViewSet(TenantIsolatedViewSet):
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
    

class LocationViewSet(TenantIsolatedViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]

class InventoryTransactionViewSet(TenantIsolatedViewSet):
    queryset = InventoryTransaction.objects.all()
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(TenantIsolatedViewSet):
    queryset = Product.objects.all()  # Base queryset needed for TenantIsolatedViewSet
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create to track product creation and handle pricing model"""
        logger.info(f"[ProductViewSet] === PRODUCT CREATION START ===")
        logger.info(f"[ProductViewSet] Request data: {request.data}")
        logger.info(f"[ProductViewSet] Tenant ID: {getattr(request, 'tenant_id', 'Not set')}")
        
        try:
            # Log specific pricing model fields
            logger.info(f"[ProductViewSet] Pricing model: {request.data.get('pricing_model', 'Not provided')}")
            logger.info(f"[ProductViewSet] Weight: {request.data.get('weight', 'Not provided')}")
            logger.info(f"[ProductViewSet] Weight unit: {request.data.get('weight_unit', 'Not provided')}")
            logger.info(f"[ProductViewSet] Daily rate: {request.data.get('daily_rate', 'Not provided')}")
            logger.info(f"[ProductViewSet] Entry date: {request.data.get('entry_date', 'Not provided')}")
            
            # Check if the pricing model columns exist in the database
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'inventory_product' 
                    AND column_name = 'pricing_model'
                """)
                if not cursor.fetchone():
                    logger.error("[ProductViewSet] pricing_model column does not exist in database!")
                    return Response(
                        {
                            "error": "Database schema not up to date", 
                            "details": "Pricing model fields are not available. Please run migrations.",
                            "migrations_needed": ["inventory.0011_add_pricing_model_fields"]
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            response = super().create(request, *args, **kwargs)
            
            if response.status_code == status.HTTP_201_CREATED:
                logger.info(f"[ProductViewSet] Product created successfully: {response.data.get('id', 'Unknown ID')}")
                user_id = str(request.user.id) if request.user.is_authenticated else None
                product_data = response.data
                
                # Track product creation event
                track_event(
                    user_id=user_id,
                    event_name='product_created_backend',
                    properties={
                        'product_id': product_data.get('id'),
                        'product_name': product_data.get('name'),
                        'price': product_data.get('price'),
                        'has_sku': bool(product_data.get('sku')),
                        'for_sale': product_data.get('for_sale', True),
                        'for_rent': product_data.get('for_rent', False),
                        'initial_stock': product_data.get('stock_quantity', 0)
                    }
                )
                
                # Track inventory value metric
                if product_data.get('price') and product_data.get('stock_quantity'):
                    inventory_value = float(product_data.get('price', 0)) * int(product_data.get('stock_quantity', 0))
                    track_business_metric(
                        user_id=user_id,
                        metric_name='inventory_value_added',
                        value=inventory_value,
                        metadata={
                            'product_id': product_data.get('id'),
                            'product_name': product_data.get('name')
                        }
                    )
            
            return response
            
        except Exception as e:
            logger.error(f"[ProductViewSet] Error creating product: {str(e)}", exc_info=True)
            
            # Check if it's a database column error
            error_str = str(e).lower()
            if 'column' in error_str and ('pricing_model' in error_str or 'weight' in error_str or 'daily_rate' in error_str):
                return Response(
                    {
                        "error": "Database schema error", 
                        "details": "Pricing model fields are missing. Migrations need to be applied.",
                        "specific_error": str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response(
                {"error": str(e), "details": "Failed to create product with pricing model"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context - MUST call parent for tenant filtering
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        try:
            # CRITICAL: Call parent's get_queryset() which applies tenant filtering
            queryset = super().get_queryset()
            
            # Log the tenant filtering
            tenant_id = getattr(self.request.user, 'tenant_id', None) or \
                       getattr(self.request.user, 'business_id', None)
            logger.info(f"[ProductViewSet] Tenant filtering applied for tenant: {tenant_id}")
            
            # Apply any additional filters from query parameters
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
            
            logger.debug(f"Product queryset fetched in {time.time() - start_time:.4f}s with {queryset.count()} items")
            return queryset.order_by('name')
            
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
    
    def update(self, request, *args, **kwargs):
        """Override update to track product updates"""
        # Get the existing product data before update
        instance = self.get_object()
        old_price = instance.price
        old_stock = instance.stock_quantity
        
        response = super().update(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_200_OK:
            user_id = str(request.user.id) if request.user.is_authenticated else None
            product_data = response.data
            
            # Track product update event
            track_event(
                user_id=user_id,
                event_name='product_updated_backend',
                properties={
                    'product_id': product_data.get('id'),
                    'product_name': product_data.get('name'),
                    'price_changed': float(product_data.get('price', 0)) != float(old_price),
                    'stock_changed': int(product_data.get('stock_quantity', 0)) != int(old_stock),
                    'new_price': product_data.get('price'),
                    'new_stock': product_data.get('stock_quantity')
                }
            )
            
            # Track inventory value change
            old_value = float(old_price) * int(old_stock)
            new_value = float(product_data.get('price', 0)) * int(product_data.get('stock_quantity', 0))
            value_change = new_value - old_value
            
            if value_change != 0:
                track_business_metric(
                    user_id=user_id,
                    metric_name='inventory_value_change',
                    value=value_change,
                    metadata={
                        'product_id': product_data.get('id'),
                        'product_name': product_data.get('name'),
                        'old_value': old_value,
                        'new_value': new_value
                    }
                )
        
        return response
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to track product deletion"""
        logger.info("🔴 [BACKEND DELETE] === START PRODUCT DELETION ===")
        logger.info(f"🔴 [BACKEND DELETE] Request path: {request.path}")
        logger.info(f"🔴 [BACKEND DELETE] Request method: {request.method}")
        logger.info(f"🔴 [BACKEND DELETE] Request user: {request.user}")
        logger.info(f"🔴 [BACKEND DELETE] Tenant ID: {getattr(request, 'tenant_id', 'Not set')}")
        logger.info(f"🔴 [BACKEND DELETE] URL kwargs: {kwargs}")
        
        try:
            logger.info("🔴 [BACKEND DELETE] Step 1: Getting product instance...")
            instance = self.get_object()
            product_id = str(instance.id)
            product_name = instance.name
            inventory_value = float(instance.price) * int(instance.stock_quantity)
            
            logger.info(f"🔴 [BACKEND DELETE] Step 2: Found product to delete:")
            logger.info(f"🔴 [BACKEND DELETE]   - ID: {product_id}")
            logger.info(f"🔴 [BACKEND DELETE]   - Name: {product_name}")
            logger.info(f"🔴 [BACKEND DELETE]   - Price: {instance.price}")
            logger.info(f"🔴 [BACKEND DELETE]   - Stock: {instance.stock_quantity}")
            logger.info(f"🔴 [BACKEND DELETE]   - Inventory value: {inventory_value}")
            
            logger.info("🔴 [BACKEND DELETE] Step 3: Calling parent destroy method...")
            response = super().destroy(request, *args, **kwargs)
            
            logger.info(f"🔴 [BACKEND DELETE] Step 4: Delete response status: {response.status_code}")
            
            if response.status_code == status.HTTP_204_NO_CONTENT:
                logger.info("🔴 [BACKEND DELETE] ✅ Product deleted successfully")
                user_id = str(request.user.id) if request.user.is_authenticated else None
                
                # Track product deletion event
                track_event(
                    user_id=user_id,
                    event_name='product_deleted_backend',
                    properties={
                        'product_id': product_id,
                        'product_name': product_name,
                        'inventory_value_removed': inventory_value
                    }
                )
                
                # Track inventory value reduction
                if inventory_value > 0:
                    track_business_metric(
                        user_id=user_id,
                        metric_name='inventory_value_removed',
                        value=inventory_value,
                        metadata={
                            'product_id': product_id,
                        'product_name': product_name
                    }
                )
            else:
                logger.error(f"🔴 [BACKEND DELETE] ❌ Delete failed with status: {response.status_code}")
            
            logger.info("🔴 [BACKEND DELETE] === END PRODUCT DELETION ===")
            return response
            
        except Exception as e:
            logger.error(f"🔴 [BACKEND DELETE] ❌ Exception during deletion: {str(e)}", exc_info=True)
            logger.error(f"🔴 [BACKEND DELETE] Exception type: {type(e).__name__}")
            logger.error("🔴 [BACKEND DELETE] === END PRODUCT DELETION (ERROR) ===")
            
            # Re-raise the exception to let DRF handle it
            raise

class ServiceViewSet(TenantIsolatedViewSet):
    queryset = Service.objects.all()  # TenantManager handles filtering automatically
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    
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

class DepartmentViewSet(TenantIsolatedViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class CustomChargePlanViewSet(TenantIsolatedViewSet):
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
            
        # Get tenant_id from user for explicit filtering
        user_tenant_id = getattr(request.user, 'tenant_id', None) or \
                        getattr(request.user, 'business_id', None)
        
        if not user_tenant_id:
            logger.warning("No tenant_id found for user, returning empty list")
            return Response({"error": "No tenant context"}, status=status.HTTP_403_FORBIDDEN)
        
        # Explicitly filter by tenant_id for safety
        products = Product.objects.filter(tenant_id=user_tenant_id)
        
        # Use a transaction with a timeout to prevent long-running queries
        from django.db import transaction as db_transaction, connection
        with db_transaction.atomic():
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
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            # Set timeout for the transaction
            with connection.cursor() as cursor:
                cursor.execute('SET LOCAL statement_timeout = 10000')  # 10 seconds
            
            # Get tenant_id from user for explicit filtering
            user_tenant_id = getattr(request.user, 'tenant_id', None) or \
                           getattr(request.user, 'business_id', None)
            
            if not user_tenant_id:
                logger.warning("No tenant_id found for user, returning empty list")
                return Response({"error": "No tenant context"}, status=status.HTTP_403_FORBIDDEN)
            
            # Explicitly filter by tenant_id for safety
            services = Service.objects.filter(tenant_id=user_tenant_id)
            
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


class BillOfMaterialsViewSet(TenantIsolatedViewSet):
    serializer_class = BillOfMaterialsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = BillOfMaterials.objects.all()
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Track analytics when BOM is created"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_201_CREATED:
            user_id = str(request.user.id) if request.user.is_authenticated else 'anonymous'
            track_event(
                user_id=user_id,
                event_name='bill_of_materials_created',
                properties={
                    'product_id': response.data.get('product'),
                    'material_id': response.data.get('material'),
                    'quantity': response.data.get('quantity_required')
                }
            )
        
        return response


class ServiceMaterialsViewSet(TenantIsolatedViewSet):
    serializer_class = ServiceMaterialsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ServiceMaterials.objects.all()
        service_id = self.request.query_params.get('service', None)
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Track analytics when service materials are created"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_201_CREATED:
            user_id = str(request.user.id) if request.user.is_authenticated else 'anonymous'
            track_event(
                user_id=user_id,
                event_name='service_materials_created',
                properties={
                    'service_id': response.data.get('service'),
                    'material_id': response.data.get('material'),
                    'quantity': response.data.get('quantity_required')
                }
            )
        
        return response