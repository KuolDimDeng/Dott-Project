"""
API views for StoreItems - global product catalog
"""
import base64
import json
from decimal import Decimal
from django.db.models import Q, Avg, Count
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models_storeitems import StoreItem, MerchantStoreItem, StoreItemVerification, StoreItemPriceHistory
from .serializers_storeitems import (
    StoreItemSerializer,
    MerchantStoreItemSerializer,
    StoreItemSearchSerializer,
    BulkPriceUpdateSerializer
)


class StoreItemViewSet(viewsets.ModelViewSet):
    """
    Global store items catalog - available to all authenticated merchants
    No tenant filtering as these are shared across all tenants
    """
    serializer_class = StoreItemSerializer
    permission_classes = [IsAuthenticated]
    queryset = StoreItem.objects.all()

    def get_queryset(self):
        """Filter and search store items"""
        queryset = StoreItem.objects.all()

        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(barcode__icontains=search) |
                Q(name__icontains=search) |
                Q(brand__icontains=search) |
                Q(category__icontains=search)
            )

        # Category filter
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)

        # Verified only filter
        verified_only = self.request.query_params.get('verified', None)
        if verified_only == 'true':
            queryset = queryset.filter(verified=True)

        # Region filter
        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(region_code=region)

        return queryset.order_by('-verified', 'name')

    @action(methods=['get'], detail=False)
    def scan(self, request):
        """
        Scan barcode and return product information
        GET /api/inventory/store-items/scan/?barcode=123456
        """
        barcode = request.query_params.get('barcode', '').strip()

        if not barcode:
            return Response(
                {'error': 'Barcode parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try exact match first
        store_item = StoreItem.objects.filter(barcode=barcode).first()

        if store_item:
            # Get merchant's pricing if available
            merchant_id = request.user.id
            merchant_item = MerchantStoreItem.objects.filter(
                merchant_id=merchant_id,
                store_item=store_item
            ).first()

            # Get area price average
            from users.models import UserProfile
            try:
                profile = UserProfile.objects.get(user_id=merchant_id)
                area_avg = StoreItemPriceHistory.get_area_average(
                    store_item.id,
                    f"{profile.city}, {profile.country}"
                )
            except:
                area_avg = None

            response_data = {
                'found': True,
                'store_item': StoreItemSerializer(store_item).data,
                'merchant_pricing': MerchantStoreItemSerializer(merchant_item).data if merchant_item else None,
                'area_average_price': area_avg,
                'needs_pricing': merchant_item is None
            }

            return Response(response_data)

        # If not found, try fuzzy match
        # Remove last 3 digits and search (sometimes country codes differ)
        if len(barcode) > 3:
            base_barcode = barcode[:-3]
            similar_items = StoreItem.objects.filter(
                barcode__startswith=base_barcode
            )[:5]

            if similar_items:
                return Response({
                    'found': False,
                    'suggestions': StoreItemSerializer(similar_items, many=True).data,
                    'message': 'Exact match not found, but here are similar products'
                })

        # Nothing found
        return Response({
            'found': False,
            'barcode': barcode,
            'message': 'Product not found. You can add it to the catalog.'
        })

    @action(methods=['post'], detail=False)
    def add_product(self, request):
        """
        Add a new product to the global catalog
        POST /api/inventory/store-items/add_product/
        """
        barcode = request.data.get('barcode', '').strip()
        name = request.data.get('name', '').strip()

        if not barcode or not name:
            return Response(
                {'error': 'Barcode and name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already exists
        if StoreItem.objects.filter(barcode=barcode).exists():
            return Response(
                {'error': 'Product with this barcode already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new store item
        store_item = StoreItem.objects.create(
            barcode=barcode,
            name=name,
            brand=request.data.get('brand', ''),
            category=request.data.get('category', 'General'),
            subcategory=request.data.get('subcategory', ''),
            size=request.data.get('size', ''),
            unit=request.data.get('unit', ''),
            description=request.data.get('description', ''),
            image_url=request.data.get('image_url', ''),
            created_by_merchant_id=request.user.id
        )

        # Add merchant's pricing
        if request.data.get('sell_price'):
            MerchantStoreItem.objects.create(
                merchant_id=request.user.id,
                store_item=store_item,
                sell_price=Decimal(str(request.data.get('sell_price'))),
                cost_price=Decimal(str(request.data.get('cost_price', 0))) if request.data.get('cost_price') else None,
                stock_quantity=int(request.data.get('stock_quantity', 0)),
                currency=request.data.get('currency', 'USD')
            )

        return Response(
            StoreItemSerializer(store_item).data,
            status=status.HTTP_201_CREATED
        )

    @action(methods=['post'], detail=True)
    def verify(self, request, pk=None):
        """
        Verify a store item's information
        POST /api/inventory/store-items/{id}/verify/
        """
        store_item = self.get_object()
        is_correct = request.data.get('is_correct', True)
        notes = request.data.get('notes', '')

        verification, created = StoreItemVerification.objects.update_or_create(
            store_item=store_item,
            merchant_id=request.user.id,
            defaults={
                'is_correct': is_correct,
                'notes': notes
            }
        )

        return Response({
            'verified': True,
            'verification_count': store_item.verification_count,
            'is_verified': store_item.verified
        })

    @action(methods=['post'], detail=False)
    def ai_detect(self, request):
        """
        Detect products from image using AI
        POST /api/inventory/store-items/ai_detect/
        """
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']
        image_data = image_file.read()

        # Use Claude Vision API
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')

            response = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this store shelf/product image and identify all products visible.
                            For each product, provide:
                            - name: Product name
                            - brand: Brand name if visible
                            - size: Size/quantity if visible
                            - category: Product category
                            - confidence: Confidence score 0-100

                            Return as JSON array. Example:
                            [{"name": "Coca-Cola", "brand": "Coca-Cola", "size": "500ml", "category": "Beverages", "confidence": 95}]
                            """
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": f"image/{image_file.name.split('.')[-1]}",
                                "data": image_base64
                            }
                        }
                    ]
                }]
            )

            # Parse AI response
            ai_response = response.content[0].text
            detected_products = json.loads(ai_response)

            # Match with existing store items
            matched_products = []
            for product in detected_products:
                # Search for existing items
                existing = StoreItem.objects.filter(
                    Q(name__icontains=product['name']) |
                    Q(brand__icontains=product.get('brand', ''))
                ).first()

                if existing:
                    product['store_item_id'] = str(existing.id)
                    product['barcode'] = existing.barcode
                    product['matched'] = True
                else:
                    product['matched'] = False

                matched_products.append(product)

            return Response({
                'success': True,
                'products': matched_products,
                'total_detected': len(matched_products)
            })

        except Exception as e:
            return Response(
                {'error': f'AI detection failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(methods=['get'], detail=False)
    def categories(self, request):
        """
        Get all available categories
        GET /api/inventory/store-items/categories/
        """
        categories = StoreItem.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response(categories)

    @action(methods=['get'], detail=True)
    def price_history(self, request, pk=None):
        """
        Get price history for a store item
        GET /api/inventory/store-items/{id}/price_history/
        """
        store_item = self.get_object()
        days = int(request.query_params.get('days', 30))

        from datetime import timedelta
        from django.utils import timezone

        cutoff_date = timezone.now() - timedelta(days=days)

        history = StoreItemPriceHistory.objects.filter(
            store_item=store_item,
            recorded_at__gte=cutoff_date
        ).values('price', 'currency', 'location', 'recorded_at').order_by('-recorded_at')

        return Response({
            'store_item': StoreItemSerializer(store_item).data,
            'history': list(history),
            'days': days
        })


class MerchantStoreItemViewSet(viewsets.ModelViewSet):
    """
    Merchant-specific store items with custom pricing
    """
    serializer_class = MerchantStoreItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get merchant's store items"""
        return MerchantStoreItem.objects.filter(
            merchant_id=self.request.user.id
        ).select_related('store_item')

    @action(methods=['post'], detail=False)
    def bulk_price_update(self, request):
        """
        Update prices in bulk
        POST /api/inventory/merchant-items/bulk_price_update/
        """
        serializer = BulkPriceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        update_type = serializer.validated_data['update_type']
        value = serializer.validated_data['value']
        category = serializer.validated_data.get('category')
        brand = serializer.validated_data.get('brand')

        # Get items to update
        items = MerchantStoreItem.objects.filter(merchant_id=request.user.id)

        if category:
            items = items.filter(store_item__category=category)
        if brand:
            items = items.filter(store_item__brand=brand)

        updated_count = 0

        for item in items:
            if update_type == 'percentage_increase':
                item.sell_price *= Decimal(1 + value / 100)
            elif update_type == 'percentage_decrease':
                item.sell_price *= Decimal(1 - value / 100)
            elif update_type == 'fixed_increase':
                item.sell_price += Decimal(str(value))
            elif update_type == 'fixed_decrease':
                item.sell_price -= Decimal(str(value))
            elif update_type == 'set_markup':
                if item.cost_price:
                    item.sell_price = item.cost_price * Decimal(1 + value / 100)

            item.save()
            updated_count += 1

        return Response({
            'success': True,
            'updated_count': updated_count,
            'message': f'Successfully updated {updated_count} items'
        })

    @action(methods=['get'], detail=False)
    def low_stock(self, request):
        """
        Get items with low stock
        GET /api/inventory/merchant-items/low_stock/
        """
        items = MerchantStoreItem.objects.filter(
            merchant_id=request.user.id,
            stock_quantity__lte=models.F('min_stock')
        ).select_related('store_item')

        return Response(
            MerchantStoreItemSerializer(items, many=True).data
        )

    @action(methods=['get'], detail=False)
    def best_sellers(self, request):
        """
        Get best-selling items
        GET /api/inventory/merchant-items/best_sellers/
        """
        from django.db.models import F

        items = MerchantStoreItem.objects.filter(
            merchant_id=request.user.id
        ).order_by('-last_sold_at')[:20]

        return Response(
            MerchantStoreItemSerializer(items, many=True).data
        )