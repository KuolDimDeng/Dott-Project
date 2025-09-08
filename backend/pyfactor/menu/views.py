"""
API Views for Menu Management
"""
import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Avg
from django.shortcuts import get_object_or_404

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.business_categories import should_show_menu
from .models import MenuCategory, MenuItem, MenuItemReview, MenuSpecial
from .serializers import (
    MenuCategorySerializer, MenuItemSerializer, MenuItemListSerializer,
    MenuItemCreateSerializer, MenuItemReviewSerializer, MenuSpecialSerializer
)

logger = logging.getLogger(__name__)


class MenuPermission(IsAuthenticated):
    """Custom permission to check if user's business type supports menu"""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Check if user has a business with menu-enabled type
        try:
            profile = request.user.userprofile
            if profile.business:
                # If business has details with simplified_business_type, check it
                if hasattr(profile.business, 'details') and hasattr(profile.business.details, 'simplified_business_type'):
                    business_type = profile.business.details.simplified_business_type
                    if business_type:
                        return should_show_menu(business_type)
                
                # For legacy businesses or those without simplified_business_type, allow menu access
                # This ensures backward compatibility for existing businesses
                return True
        except Exception as e:
            logger.warning(f"Error checking menu permission: {e}")
            # If there's an error checking permissions, allow access for authenticated business users
            if hasattr(request.user, 'userprofile') and request.user.userprofile.business:
                return True
        
        return False


class MenuCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing menu categories
    """
    serializer_class = MenuCategorySerializer
    permission_classes = [IsAuthenticated]  # Temporarily using basic auth check
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['display_order', 'name']
    ordering = ['display_order', 'name']
    
    def get_queryset(self):
        """Filter by current tenant"""
        return MenuCategory.objects.filter(
            tenant_id=self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None,
            is_active=True
        )
    
    def perform_create(self, serializer):
        """Set tenant on creation"""
        serializer.save(tenant_id=self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder categories"""
        category_orders = request.data.get('orders', [])
        for item in category_orders:
            try:
                category = MenuCategory.objects.get(
                    id=item['id'],
                    tenant_id=request.user.tenant.id if hasattr(request.user, 'tenant') else None
                )
                category.display_order = item['order']
                category.save()
            except MenuCategory.DoesNotExist:
                continue
        
        return Response({'status': 'Categories reordered'})
    
    @action(detail=False, methods=['post'])
    def setup_defaults(self, request):
        """Create default categories for a restaurant"""
        default_categories = [
            {'name': 'Appetizers', 'category_type': 'APPETIZERS', 'display_order': 1},
            {'name': 'Main Courses', 'category_type': 'MAINS', 'display_order': 2},
            {'name': 'Desserts', 'category_type': 'DESSERTS', 'display_order': 3},
            {'name': 'Beverages', 'category_type': 'BEVERAGES', 'display_order': 4},
        ]
        
        created = []
        tenant_id = request.user.tenant.id if hasattr(request.user, 'tenant') else None
        for cat_data in default_categories:
            category, was_created = MenuCategory.objects.get_or_create(
                tenant_id=tenant_id,
                name=cat_data['name'],
                defaults={
                    'category_type': cat_data['category_type'],
                    'display_order': cat_data['display_order'],
                    'tenant_id': tenant_id
                }
            )
            if was_created:
                created.append(cat_data['name'])
        
        return Response({
            'created': created,
            'message': f"Created {len(created)} default categories"
        })


class MenuItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing menu items
    """
    permission_classes = [IsAuthenticated]  # Temporarily using basic auth check
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['name', 'price', 'category', 'display_order', 'created_at']
    ordering = ['category', 'display_order', 'name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MenuItemListSerializer
        elif self.action == 'create':
            return MenuItemCreateSerializer
        return MenuItemSerializer
    
    def get_queryset(self):
        """Filter by current tenant and optional filters"""
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        queryset = MenuItem.objects.filter(tenant_id=tenant_id)
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by availability
        available = self.request.query_params.get('available')
        if available == 'true':
            queryset = queryset.filter(is_available=True)
        elif available == 'false':
            queryset = queryset.filter(is_available=False)
        
        # Filter by dietary restrictions
        if self.request.query_params.get('vegetarian') == 'true':
            queryset = queryset.filter(is_vegetarian=True)
        if self.request.query_params.get('vegan') == 'true':
            queryset = queryset.filter(is_vegan=True)
        if self.request.query_params.get('gluten_free') == 'true':
            queryset = queryset.filter(is_gluten_free=True)
        
        # Filter by featured
        if self.request.query_params.get('featured') == 'true':
            queryset = queryset.filter(is_featured=True)
        
        return queryset.select_related('category')
    
    def perform_create(self, serializer):
        """Set tenant and business on creation"""
        try:
            profile = self.request.user.userprofile
            business = profile.business if profile else None
        except:
            business = None
        
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        serializer.save(
            tenant_id=tenant_id,
            business=business
        )
    
    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Toggle item availability"""
        item = self.get_object()
        item.is_available = not item.is_available
        item.save()
        return Response({
            'is_available': item.is_available,
            'message': f"Item {'enabled' if item.is_available else 'disabled'}"
        })
    
    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """Toggle featured status"""
        item = self.get_object()
        item.is_featured = not item.is_featured
        item.save()
        return Response({
            'is_featured': item.is_featured,
            'message': f"Item {'featured' if item.is_featured else 'unfeatured'}"
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update_prices(self, request):
        """Bulk update prices by percentage or fixed amount"""
        item_ids = request.data.get('item_ids', [])
        adjustment_type = request.data.get('type', 'percentage')  # 'percentage' or 'fixed'
        adjustment_value = request.data.get('value', 0)
        
        if not item_ids or adjustment_value == 0:
            return Response(
                {'error': 'Invalid parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant_id = request.user.tenant.id if hasattr(request.user, 'tenant') else None
        items = MenuItem.objects.filter(
            id__in=item_ids,
            tenant_id=tenant_id
        )
        
        updated_count = 0
        for item in items:
            if adjustment_type == 'percentage':
                item.price = item.price * (1 + adjustment_value / 100)
            else:  # fixed
                item.price = max(0, item.price + adjustment_value)
            item.save()
            updated_count += 1
        
        return Response({
            'updated': updated_count,
            'message': f"Updated {updated_count} items"
        })
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular items"""
        items = self.get_queryset().filter(
            is_available=True
        ).order_by('-order_count')[:10]
        
        serializer = MenuItemListSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search menu items"""
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        items = self.get_queryset().filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(tags__icontains=query),
            is_available=True
        )[:20]
        
        serializer = MenuItemListSerializer(items, many=True)
        return Response(serializer.data)


class MenuItemReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for menu item reviews
    """
    serializer_class = MenuItemReviewSerializer
    permission_classes = [IsAuthenticated]  # Allow customers to review
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get_queryset(self):
        """Filter by menu item if specified"""
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        queryset = MenuItemReview.objects.filter(
            tenant_id=tenant_id
        )
        
        menu_item_id = self.request.query_params.get('menu_item')
        if menu_item_id:
            queryset = queryset.filter(menu_item_id=menu_item_id)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set tenant and update menu item rating"""
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        review = serializer.save(tenant_id=tenant_id)
        
        # Update menu item rating
        menu_item = review.menu_item
        reviews = menu_item.reviews.all()
        menu_item.rating = reviews.aggregate(Avg('rating'))['rating__avg']
        menu_item.review_count = reviews.count()
        menu_item.save()


class MenuSpecialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for menu specials
    """
    serializer_class = MenuSpecialSerializer
    permission_classes = [MenuPermission]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get_queryset(self):
        """Filter by current tenant and active status"""
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        queryset = MenuSpecial.objects.filter(
            tenant_id=tenant_id
        )
        
        # Filter by active status
        active = self.request.query_params.get('active')
        if active == 'true':
            queryset = queryset.filter(is_active=True)
        
        # Filter by special type
        special_type = self.request.query_params.get('type')
        if special_type:
            queryset = queryset.filter(special_type=special_type)
        
        return queryset.prefetch_related('menu_items')
    
    def perform_create(self, serializer):
        """Set tenant on creation"""
        tenant_id = self.request.user.tenant.id if hasattr(self.request.user, 'tenant') else None
        serializer.save(tenant_id=tenant_id)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's specials"""
        from datetime import date, datetime
        
        today = date.today()
        weekday = today.strftime('%A').lower()
        current_time = datetime.now().time()
        
        # Build query for today's specials
        specials = self.get_queryset().filter(
            Q(is_active=True),
            Q(start_date__lte=today) | Q(start_date__isnull=True),
            Q(end_date__gte=today) | Q(end_date__isnull=True)
        )
        
        # Filter by day of week
        weekday_filter = {weekday: True}
        specials = specials.filter(**weekday_filter)
        
        # Filter by time if specified
        valid_specials = []
        for special in specials:
            if special.start_time and special.end_time:
                if special.start_time <= current_time <= special.end_time:
                    valid_specials.append(special)
            else:
                valid_specials.append(special)
        
        serializer = self.get_serializer(valid_specials, many=True)
        return Response(serializer.data)