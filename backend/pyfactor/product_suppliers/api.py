from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count, Avg
from django.db import transaction
from django.shortcuts import get_object_or_404
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from .models import ProductSupplier, ProductSupplierItem
from .serializers import (
    ProductSupplierSerializer,
    ProductSupplierItemSerializer,
    ProductSupplierBulkImportSerializer,
    SupplierCatalogSerializer
)
from purchases.models import PurchaseOrder
from inventory.models import Product
import logging

logger = logging.getLogger(__name__)


class ProductSupplierViewSet(TenantIsolatedViewSet):
    """
    API for Product Suppliers with FULL tenant isolation and security
    Completely separate from service vendors
    """
    model = ProductSupplier
    serializer_class = ProductSupplierSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get suppliers with strict tenant isolation"""
        # Start with tenant-isolated queryset
        queryset = super().get_queryset()
        
        # Additional security: double-check tenant
        if hasattr(self.request.user, 'tenant_id'):
            queryset = queryset.filter(tenant_id=self.request.user.tenant_id)
        
        # Apply filters
        if self.request.query_params.get('active_only'):
            queryset = queryset.filter(is_active=True)
        
        if self.request.query_params.get('verified_only'):
            queryset = queryset.filter(is_verified=True)
        
        supplier_type = self.request.query_params.get('supplier_type')
        if supplier_type:
            queryset = queryset.filter(supplier_type=supplier_type)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(email__icontains=search)
            )
        
        # Prefetch related data for performance
        queryset = queryset.prefetch_related('supplier_items__product')
        
        return queryset.order_by('-is_preferred', 'name')
    
    def create(self, request):
        """Create supplier with security checks"""
        logger.info(f"Creating product supplier for tenant {request.user.tenant_id}")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Security: Force tenant_id and business from user
        serializer.save(
            tenant_id=request.user.tenant_id if hasattr(request.user, 'tenant_id') else None,
            business=request.user.business if hasattr(request.user, 'business') else None,
            created_by=request.user
        )
        
        logger.info(f"Product supplier created: {serializer.instance.id}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, pk=None):
        """Update supplier with audit trail"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            logger.warning(f"Tenant mismatch attempt: {request.user.email} tried to update supplier {pk}")
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(supplier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        
        logger.info(f"Product supplier updated: {pk}")
        return Response(serializer.data)
    
    @action(detail=True, methods=['GET'])
    def catalog(self, request, pk=None):
        """Get supplier's product catalog with pricing"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        items = ProductSupplierItem.objects.filter(
            product_supplier=supplier,
            tenant_id=request.user.tenant_id,
            is_active=True
        ).select_related('product')
        
        serializer = ProductSupplierItemSerializer(items, many=True)
        
        return Response({
            'supplier': ProductSupplierSerializer(supplier).data,
            'catalog': serializer.data,
            'total_products': items.count()
        })
    
    @action(detail=True, methods=['POST'])
    def add_product(self, request, pk=None):
        """Add a product to supplier's catalog"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate product belongs to tenant
        product_id = request.data.get('product_id')
        try:
            product = Product.objects.get(
                id=product_id,
                tenant_id=request.user.tenant_id
            )
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create supplier item
        data = request.data.copy()
        data['product_supplier'] = supplier.id
        data['product'] = product.id
        data['tenant_id'] = request.user.tenant_id
        
        serializer = ProductSupplierItemSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant_id=request.user.tenant_id)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['POST'])
    def create_purchase_order(self, request, pk=None):
        """Create a purchase order from this supplier"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if supplier can accept orders
        if not supplier.is_active or not supplier.is_verified:
            return Response(
                {"error": "Supplier is not active or verified"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check credit limit
        order_total = request.data.get('total_amount', 0)
        if not supplier.can_place_order(order_total):
            return Response(
                {"error": "Order exceeds credit limit"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create PO
        with transaction.atomic():
            po_data = {
                'product_supplier': supplier,
                'tenant_id': request.user.tenant_id,
                'business': request.user.business if hasattr(request.user, 'business') else None,
                'order_type': 'inventory',
                'total_amount': order_total,
                'payment_terms': supplier.payment_terms,
                'expected_delivery': request.data.get('expected_delivery'),
                'created_by': request.user
            }
            
            # Create the PO (simplified - you'd add line items here)
            po = PurchaseOrder.objects.create(**po_data)
            
            # Update supplier metrics
            supplier.total_orders += 1
            supplier.total_spend += order_total
            supplier.save()
        
        return Response({
            'purchase_order_id': po.id,
            'message': 'Purchase order created successfully'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['GET'])
    def performance(self, request, pk=None):
        """Get supplier performance metrics"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate metrics
        pos = PurchaseOrder.objects.filter(
            product_supplier=supplier,
            tenant_id=request.user.tenant_id
        )
        
        metrics = {
            'total_orders': pos.count(),
            'total_spend': pos.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'on_time_delivery_rate': supplier.on_time_delivery_rate,
            'quality_rating': supplier.quality_rating,
            'average_lead_time': supplier.lead_time_days,
            'active_products': supplier.supplier_items.filter(is_active=True).count(),
            'credit_usage': str(supplier.get_current_credit_usage()),
            'credit_limit': str(supplier.credit_limit) if supplier.credit_limit else 'Unlimited'
        }
        
        return Response(metrics)
    
    @action(detail=False, methods=['POST'])
    def bulk_import(self, request):
        """Bulk import suppliers with security"""
        serializer = ProductSupplierBulkImportSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        result = serializer.create_suppliers()
        
        return Response({
            'message': 'Bulk import completed',
            'created_count': len(result['created']),
            'updated_count': len(result['updated']),
            'error_count': len(result['errors']),
            'details': result
        })
    
    @action(detail=False, methods=['GET'])
    def preferred(self, request):
        """Get preferred suppliers only"""
        suppliers = self.get_queryset().filter(
            is_preferred=True,
            is_active=True
        )
        
        serializer = self.get_serializer(suppliers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['POST'])
    def verify(self, request, pk=None):
        """Verify a supplier (admin only)"""
        # Check admin permission
        if not request.user.is_staff and not request.user.role == 'OWNER':
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        supplier.is_verified = True
        supplier.save()
        
        logger.info(f"Supplier verified: {pk} by {request.user.email}")
        
        return Response({
            'message': 'Supplier verified successfully',
            'supplier': ProductSupplierSerializer(supplier).data
        })
    
    @action(detail=True, methods=['POST'])
    def deactivate(self, request, pk=None):
        """Deactivate a supplier"""
        supplier = self.get_object()
        
        # Security check
        if supplier.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        supplier.is_active = False
        supplier.save()
        
        # Deactivate all supplier items
        supplier.supplier_items.update(is_active=False)
        
        logger.info(f"Supplier deactivated: {pk} by {request.user.email}")
        
        return Response({
            'message': 'Supplier deactivated successfully'
        })


class ProductSupplierItemViewSet(TenantIsolatedViewSet):
    """
    API for managing product-supplier relationships
    """
    model = ProductSupplierItem
    serializer_class = ProductSupplierItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get items with strict tenant isolation"""
        queryset = super().get_queryset()
        
        # Additional security
        if hasattr(self.request.user, 'tenant_id'):
            queryset = queryset.filter(tenant_id=self.request.user.tenant_id)
        
        # Filter by supplier if provided
        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            queryset = queryset.filter(product_supplier_id=supplier_id)
        
        # Filter by product if provided
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        return queryset.select_related('product_supplier', 'product')
    
    @action(detail=True, methods=['GET'])
    def price_for_quantity(self, request, pk=None):
        """Calculate price for a specific quantity"""
        item = self.get_object()
        
        # Security check
        if item.tenant_id != request.user.tenant_id:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        quantity = int(request.query_params.get('quantity', 1))
        price = item.get_price_for_quantity(quantity)
        
        return Response({
            'quantity': quantity,
            'unit_price': str(price),
            'total_price': str(price * quantity),
            'bulk_discount_applied': price < item.cost_price
        })