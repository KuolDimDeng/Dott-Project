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
        Get materials filtered by tenant with detailed logging
        """
        list_request_id = f"list-{timezone.now().timestamp()}-{str(self.request.user.id)[:8] if hasattr(self.request.user, 'id') else 'anon'}"
        logger.info(f"🔴 [MaterialViewSet] === GET_QUERYSET START ===")
        logger.info(f"🔴 [{list_request_id}] List Request ID: {list_request_id}")
        logger.info(f"🔴 [{list_request_id}] Timestamp: {timezone.now().isoformat()}")
        logger.info(f"🔴 [{list_request_id}] Action: {self.action}")
        logger.info(f"🔴 [{list_request_id}] Query params: {dict(self.request.query_params)}")
        
        # Debug tenant context
        from custom_auth.rls import get_current_tenant_id
        current_tenant = get_current_tenant_id()
        user_business_id = getattr(self.request.user, 'business_id', None)
        
        logger.info(f"🔴 [{list_request_id}] Current tenant from RLS: {current_tenant}")
        logger.info(f"🔴 [{list_request_id}] User email: {getattr(self.request.user, 'email', 'None')}")
        logger.info(f"🔴 [{list_request_id}] User business_id: {user_business_id}")
        logger.info(f"🔴 [{list_request_id}] User authenticated: {self.request.user.is_authenticated}")
        
        # Log what manager we'll use
        logger.info(f"🔴 [{list_request_id}] Determining which manager to use...")
        
        # Use the tenant-aware manager which respects RLS context
        # This is the preferred approach as it leverages the RLS policies
        if current_tenant:
            # Use the regular objects manager which applies tenant filtering
            logger.info(f"🔴 [{list_request_id}] ✅ Using tenant-aware Material.objects.all() with RLS context: {current_tenant}")
            queryset = Material.objects.all()
            logger.info(f"🔴 [{list_request_id}] Initial queryset count: {queryset.count()}")
            
            # Log first few materials
            materials_sample = list(queryset[:5])
            for idx, mat in enumerate(materials_sample):
                logger.info(f"🔴 [{list_request_id}] Material {idx+1}: {mat.name} (ID: {mat.id}, Tenant: {mat.tenant_id})")
        elif hasattr(self.request.user, 'business_id') and self.request.user.business_id:
            # Fallback: manually filter by business_id if no RLS context
            logger.info(f"🔴 [{list_request_id}] ⚠️ No RLS context, using manual filter with business_id: {self.request.user.business_id}")
            queryset = Material.objects.filter(tenant_id=self.request.user.business_id)
            logger.info(f"🔴 [{list_request_id}] Manual filter queryset count: {queryset.count()}")
        else:
            logger.warning(f"🔴 [{list_request_id}] ❌ No tenant context available - returning empty queryset")
            return Material.objects.none()
        
        # Log queryset count before filters
        material_count = queryset.count()
        logger.info(f"🔴 [{list_request_id}] Total materials found before filters: {material_count}")
        
        # Debug: show all materials with details
        if material_count > 0:
            logger.info(f"🔴 [{list_request_id}] Listing ALL {material_count} materials:")
            for idx, material in enumerate(queryset):
                logger.info(f"🔴 [{list_request_id}]   {idx+1}. {material.name} (ID: {material.id}, SKU: {material.sku}, Active: {material.is_active}, Tenant: {material.tenant_id})")
        else:
            logger.warning(f"🔴 [{list_request_id}] ⚠️ NO MATERIALS FOUND for this tenant!")
        
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
        
        # Log applied filters
        logger.info(f"🔴 [{list_request_id}] Applied filters:")
        logger.info(f"🔴 [{list_request_id}]   - material_type: {params.get('material_type', 'None')}")
        logger.info(f"🔴 [{list_request_id}]   - is_active: {params.get('is_active', 'None')}")
        logger.info(f"🔴 [{list_request_id}]   - is_billable: {params.get('is_billable', 'None')}")
        logger.info(f"🔴 [{list_request_id}]   - low_stock: {params.get('low_stock', 'None')}")
        logger.info(f"🔴 [{list_request_id}]   - search: {params.get('search', 'None')}")
        logger.info(f"🔴 [{list_request_id}]   - supplier: {params.get('supplier', 'None')}")
        
        # Order by
        ordering = params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        logger.info(f"🔴 [{list_request_id}] Ordering by: {ordering}")
        
        # Optimize queries
        queryset = queryset.select_related('supplier', 'location')
        
        # Final count and results
        final_count = queryset.count()
        logger.info(f"🔴 [{list_request_id}] Final queryset count after all filters: {final_count}")
        
        # Debug: show ALL final materials
        try:
            if final_count > 0:
                materials_list = list(queryset.values('id', 'name', 'sku', 'tenant_id', 'is_active'))
                logger.info(f"🔴 [{list_request_id}] FINAL materials being returned ({final_count} total):")
                for idx, mat in enumerate(materials_list):
                    logger.info(f"🔴 [{list_request_id}]   {idx+1}. {mat['name']} (ID: {mat['id']}, SKU: {mat['sku']}, Active: {mat['is_active']})")
            else:
                logger.warning(f"🔴 [{list_request_id}] ⚠️ FINAL RESULT: Empty queryset being returned!")
            logger.info(f"🔴 [{list_request_id}] Sample materials in queryset: {materials_list[:3] if final_count > 0 else []}")
        except Exception as e:
            logger.error(f"🔴 [{list_request_id}] Error getting sample materials: {e}")
        
        logger.info(f"🔴 [{list_request_id}] === GET_QUERYSET END ===")
        logger.info(f"🔴 [MaterialViewSet] === GET_QUERYSET END ===")
        
        return queryset
    
    def get_serializer_class(self):
        """Use lightweight serializer for list views"""
        if self.action == 'list':
            return MaterialListSerializer
        return MaterialSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new material with comprehensive logging"""
        backend_request_id = f"backend-{timezone.now().timestamp()}-{str(request.user.id)[:8] if hasattr(request.user, 'id') else 'anon'}"
        logger.info(f"🟢 [MaterialViewSet] === MATERIAL CREATION START ===")
        logger.info(f"🟢 [{backend_request_id}] Request ID: {backend_request_id}")
        logger.info(f"🟢 [{backend_request_id}] Timestamp: {timezone.now().isoformat()}")
        logger.info(f"🟢 [{backend_request_id}] Material name: {request.data.get('name')}")
        logger.info(f"🟢 [{backend_request_id}] Full request data: {request.data}")
        logger.info(f"🟢 [{backend_request_id}] Request method: {request.method}")
        logger.info(f"🟢 [{backend_request_id}] Request headers: {dict(request.headers)}")
        
        # Debug tenant context
        from custom_auth.rls import get_current_tenant_id, set_current_tenant_id
        current_tenant = get_current_tenant_id()
        user_business_id = getattr(request.user, 'business_id', None)
        
        logger.info(f"🟢 [{backend_request_id}] Current tenant from RLS: {current_tenant}")
        logger.info(f"🟢 [{backend_request_id}] User email: {getattr(request.user, 'email', 'None')}")
        logger.info(f"🟢 [{backend_request_id}] User business_id: {user_business_id}")
        logger.info(f"🟢 [{backend_request_id}] User authenticated: {request.user.is_authenticated}")
        logger.info(f"🟢 [{backend_request_id}] User ID: {request.user.id if request.user.is_authenticated else 'None'}")
        
        # Ensure RLS context is set
        if not current_tenant and user_business_id:
            set_current_tenant_id(user_business_id)
            logger.info(f"🟢 [{backend_request_id}] Set RLS context to user's business_id: {user_business_id}")
            current_tenant = get_current_tenant_id()
            logger.info(f"🟢 [{backend_request_id}] RLS context after setting: {current_tenant}")
        
        # Auto-generate SKU if not provided
        if not request.data.get('sku'):
            import time
            import random
            name_prefix = request.data.get('name', 'MAT')[:3].upper()
            timestamp = str(int(time.time()))[-6:]
            random_suffix = str(random.randint(100, 999))
            request.data['sku'] = f"{name_prefix}-{timestamp}-{random_suffix}"
            logger.info(f"🟢 [{backend_request_id}] Auto-generated SKU: {request.data['sku']}")
        
        # Log request data
        logger.info(f"🟢 [{backend_request_id}] Final request data before creation: {request.data}")
        
        try:
            # Call parent create method
            logger.info(f"🟢 [{backend_request_id}] Calling super().create()...")
            response = super().create(request, *args, **kwargs)
            
            logger.info(f"🟢 [{backend_request_id}] Response status code: {response.status_code}")
            logger.info(f"🟢 [{backend_request_id}] Response data: {response.data}")
            
            # Debug the created material
            if response.status_code == 201:
                created_material_id = response.data.get('id')
                logger.info(f"🟢 [{backend_request_id}] ✅ Material created successfully with ID: {created_material_id}")
                
                # Verify it exists in the database
                try:
                    material = Material.objects.filter(id=created_material_id).first()
                    if material:
                        logger.info(f"🟢 [{backend_request_id}] ✅ Verified material in DB:")
                        logger.info(f"🟢 [{backend_request_id}]   - Name: {material.name}")
                        logger.info(f"🟢 [{backend_request_id}]   - SKU: {material.sku}")
                        logger.info(f"🟢 [{backend_request_id}]   - Tenant ID: {material.tenant_id}")
                        logger.info(f"🟢 [{backend_request_id}]   - Is Active: {material.is_active}")
                    else:
                        logger.error(f"🟢 [{backend_request_id}] ❌ Material NOT found in database!")
                except Exception as e:
                    logger.error(f"🟢 [{backend_request_id}] Error verifying material: {e}")
                
                logger.info(f"🟢 [{backend_request_id}] === MATERIAL CREATION END (SUCCESS) ===")
                return response
            else:
                logger.error(f"🟢 [{backend_request_id}] ❌ Material creation failed with status: {response.status_code}")
                logger.error(f"🟢 [{backend_request_id}] Error response: {response.data}")
                logger.info(f"🟢 [{backend_request_id}] === MATERIAL CREATION END (FAILED) ===")
                return response
                
        except Exception as e:
            logger.error(f"🟢 [{backend_request_id}] ❌ Exception during material creation: {e}")
            logger.error(f"🟢 [{backend_request_id}] Exception type: {type(e).__name__}")
            logger.error(f"🟢 [{backend_request_id}] Exception args: {e.args}")
            import traceback
            logger.error(f"🟢 [{backend_request_id}] Traceback: {traceback.format_exc()}")
            logger.info(f"🟢 [{backend_request_id}] === MATERIAL CREATION END (EXCEPTION) ===")
            raise
    
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