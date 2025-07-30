"""
Views for Material management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Sum, Avg
from django.utils import timezone
import logging

from .models_materials import Material, MaterialTransaction
from .serializers_materials import (
    MaterialSerializer, MaterialListSerializer,
    MaterialTransactionSerializer, MaterialStockUpdateSerializer
)

logger = logging.getLogger(__name__)


class MaterialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Material CRUD operations and inventory management
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MaterialSerializer
    
    def get_queryset(self):
        """
        Get materials filtered by tenant with optional query parameters
        """
        logger.info(f"🔍 [MaterialViewSet] === GET_QUERYSET START ===")
        
        # Debug tenant context
        from custom_auth.rls import get_current_tenant_id
        current_tenant = get_current_tenant_id()
        user_business_id = getattr(self.request.user, 'business_id', None)
        
        logger.info(f"🔍 [MaterialViewSet] Current tenant from RLS: {current_tenant}")
        logger.info(f"🔍 [MaterialViewSet] User business_id: {user_business_id}")
        logger.info(f"🔍 [MaterialViewSet] User authenticated: {self.request.user.is_authenticated}")
        
        # Use the tenant-aware manager which respects RLS context
        # This is the preferred approach as it leverages the RLS policies
        if current_tenant:
            # Use the regular objects manager which applies tenant filtering
            queryset = Material.objects.all()
            logger.info(f"🔍 [MaterialViewSet] Using tenant-aware manager with RLS context: {current_tenant}")
        elif hasattr(self.request.user, 'business_id') and self.request.user.business_id:
            # Fallback: manually filter by business_id if no RLS context
            queryset = Material.objects.filter(tenant_id=self.request.user.business_id)
            logger.info(f"🔍 [MaterialViewSet] Using manual tenant filter: {self.request.user.business_id}")
        else:
            logger.warning("🔍 [MaterialViewSet] No tenant context available")
            return Material.objects.none()
        
        # Log queryset count
        material_count = queryset.count()
        logger.info(f"🔍 [MaterialViewSet] Materials found for tenant: {material_count}")
        
        # Debug: show first few materials
        if material_count > 0:
            for material in queryset[:3]:
                logger.info(f"🔍 [MaterialViewSet] Material: {material.name} (ID: {material.id}, SKU: {material.sku})")
        
        # Apply filters from query parameters
        params = self.request.query_params
        
        # Filter by material type
        material_type = params.get('material_type')
        if material_type:
            queryset = queryset.filter(material_type=material_type)
        
        # Filter by active status
        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by billable status
        is_billable = params.get('is_billable')
        if is_billable is not None:
            queryset = queryset.filter(is_billable=is_billable.lower() == 'true')
        
        # Filter by low stock
        low_stock = params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(quantity_in_stock__lte=F('reorder_level'))
        
        # Search by name or SKU
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search) |
                Q(description__icontains=search)
            )
        
        # Filter by supplier
        supplier_id = params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        
        # Order by
        ordering = params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        
        # Optimize queries
        queryset = queryset.select_related('supplier', 'location')
        
        logger.info(f"🔍 [MaterialViewSet] Final queryset count after all filters: {queryset.count()}")
        
        # Debug: show first few materials in queryset
        try:
            materials_sample = list(queryset[:3].values('id', 'name', 'sku', 'tenant_id'))
            logger.info(f"🔍 [MaterialViewSet] Sample materials in queryset: {materials_sample}")
        except Exception as e:
            logger.info(f"🔍 [MaterialViewSet] Error getting sample materials: {e}")
        
        logger.info(f"🔍 [MaterialViewSet] === GET_QUERYSET END ===")
        
        return queryset
    
    def get_serializer_class(self):
        """Use lightweight serializer for list views"""
        if self.action == 'list':
            return MaterialListSerializer
        return MaterialSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new material with tenant assignment"""
        logger.info(f"🎯 [MaterialViewSet] === MATERIAL CREATION START ===")
        logger.info(f"🎯 [MaterialViewSet] Creating new material: {request.data.get('name')}")
        
        # Debug tenant context
        from custom_auth.rls import get_current_tenant_id, set_current_tenant_id
        current_tenant = get_current_tenant_id()
        user_business_id = getattr(request.user, 'business_id', None)
        
        logger.info(f"🎯 [MaterialViewSet] Current tenant from RLS: {current_tenant}")
        logger.info(f"🎯 [MaterialViewSet] User business_id: {user_business_id}")
        logger.info(f"🎯 [MaterialViewSet] User authenticated: {request.user.is_authenticated}")
        logger.info(f"🎯 [MaterialViewSet] User ID: {request.user.id if request.user.is_authenticated else 'None'}")
        
        # Ensure RLS context is set
        if not current_tenant and user_business_id:
            set_current_tenant_id(user_business_id)
            logger.info(f"🎯 [MaterialViewSet] Set RLS context to user's business_id: {user_business_id}")
        
        # Auto-generate SKU if not provided
        if not request.data.get('sku'):
            import time
            import random
            name_prefix = request.data.get('name', 'MAT')[:3].upper()
            timestamp = str(int(time.time()))[-6:]
            random_suffix = str(random.randint(100, 999))
            request.data['sku'] = f"{name_prefix}-{timestamp}-{random_suffix}"
            logger.info(f"🎯 [MaterialViewSet] Auto-generated SKU: {request.data['sku']}")
        
        # Log request data
        logger.info(f"🎯 [MaterialViewSet] Request data: {request.data}")
        
        # Call parent create method
        logger.info(f"🎯 [MaterialViewSet] Calling super().create()")
        response = super().create(request, *args, **kwargs)
        
        # Debug the created material
        if response.status_code == 201:
            created_material_id = response.data.get('id')
            logger.info(f"🎯 [MaterialViewSet] Material created successfully with ID: {created_material_id}")
            
            # Return the response immediately after successful creation
            # The list view will use the proper tenant-aware queryset
            return response
        else:
            logger.error(f"🎯 [MaterialViewSet] Material creation failed with status: {response.status_code}")
            logger.error(f"🎯 [MaterialViewSet] Response data: {response.data}")
        
        logger.info(f"🎯 [MaterialViewSet] === MATERIAL CREATION END ===")
        return response
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get all materials that are below reorder level"""
        materials = self.get_queryset().filter(
            quantity_in_stock__lte=F('reorder_level')
        )
        serializer = MaterialListSerializer(materials, many=True)
        return Response({
            'count': materials.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get material inventory statistics"""
        queryset = self.get_queryset()
        
        # Calculate statistics
        stats = {
            'total_materials': queryset.count(),
            'active_materials': queryset.filter(is_active=True).count(),
            'low_stock_count': queryset.filter(
                quantity_in_stock__lte=F('reorder_level')
            ).count(),
            'out_of_stock_count': queryset.filter(quantity_in_stock=0).count(),
            'total_stock_value': queryset.aggregate(
                total=Sum(F('quantity_in_stock') * F('unit_cost'))
            )['total'] or 0,
            'material_types': {},
        }
        
        # Count by material type
        for choice in Material.MATERIAL_TYPE_CHOICES:
            count = queryset.filter(material_type=choice[0]).count()
            if count > 0:
                stats['material_types'][choice[1]] = count
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """Update material stock with transaction logging"""
        material = self.get_object()
        serializer = MaterialStockUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            data = serializer.validated_data
            
            try:
                if data['transaction_type'] == 'purchase':
                    material.add_stock(
                        data['quantity'],
                        data.get('unit_cost'),
                        data.get('notes')
                    )
                else:
                    # For adjustments and returns
                    old_quantity = material.quantity_in_stock
                    
                    if data['transaction_type'] == 'return':
                        material.quantity_in_stock -= data['quantity']
                    else:  # adjustment
                        material.quantity_in_stock += data['quantity']
                    
                    material.save()
                    
                    # Create transaction
                    MaterialTransaction.objects.create(
                        material=material,
                        transaction_type=data['transaction_type'],
                        quantity=data['quantity'],
                        unit_cost=data.get('unit_cost'),
                        notes=data.get('notes'),
                        balance_after=material.quantity_in_stock,
                        created_by=request.user
                    )
                
                # Return updated material
                return Response(
                    MaterialSerializer(material).data,
                    status=status.HTTP_200_OK
                )
                
            except ValueError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def use_material(self, request, pk=None):
        """Use material for a job or service"""
        material = self.get_object()
        
        quantity = request.data.get('quantity')
        job_id = request.data.get('job_id')
        notes = request.data.get('notes', '')
        
        if not quantity:
            return Response(
                {'error': 'Quantity is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quantity = float(quantity)
            if quantity <= 0:
                raise ValueError("Quantity must be positive")
            
            # Check stock availability
            if quantity > material.quantity_in_stock:
                return Response(
                    {
                        'error': 'Insufficient stock',
                        'available': float(material.quantity_in_stock),
                        'requested': quantity
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the material
            material.use_material(quantity, notes)
            
            # If job_id provided, link the transaction to the job
            if job_id:
                transaction = material.transactions.latest('created_at')
                transaction.job_id = job_id
                transaction.created_by = request.user
                transaction.save()
            
            return Response(
                {
                    'message': 'Material used successfully',
                    'material': MaterialSerializer(material).data
                },
                status=status.HTTP_200_OK
            )
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export materials list to CSV"""
        import csv
        from django.http import HttpResponse
        
        materials = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="materials_inventory.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'SKU', 'Name', 'Type', 'Quantity', 'Unit', 'Unit Cost',
            'Reorder Level', 'Supplier', 'Location', 'Is Active'
        ])
        
        for material in materials:
            writer.writerow([
                material.sku,
                material.name,
                material.get_material_type_display(),
                material.quantity_in_stock,
                material.display_unit,
                material.unit_cost,
                material.reorder_level,
                material.supplier.name if material.supplier else '',
                material.location.name if material.location else '',
                'Yes' if material.is_active else 'No'
            ])
        
        return response


class MaterialTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing material transaction history
    """
    serializer_class = MaterialTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get transactions filtered by tenant and material"""
        # Get all materials for this tenant
        if hasattr(self.request.user, 'business_id') and self.request.user.business_id:
            tenant_materials = Material.all_objects.filter(
                tenant_id=self.request.user.business_id
            ).values_list('id', flat=True)
            
            queryset = MaterialTransaction.objects.filter(
                material_id__in=tenant_materials
            )
        else:
            return MaterialTransaction.objects.none()
        
        # Filter by material if specified
        material_id = self.request.query_params.get('material')
        if material_id:
            queryset = queryset.filter(material_id=material_id)
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Filter by job
        job_id = self.request.query_params.get('job')
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        
        # Optimize queries
        queryset = queryset.select_related(
            'material', 'created_by', 'job'
        ).order_by('-created_at')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create transaction with user assignment"""
        request.data['created_by'] = request.user.id
        return super().create(request, *args, **kwargs)