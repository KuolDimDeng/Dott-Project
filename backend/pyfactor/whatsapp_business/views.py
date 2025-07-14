from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
import uuid

from .models import (
    WhatsAppBusinessSettings,
    WhatsAppCatalog,
    WhatsAppProduct,
    WhatsAppOrder,
    WhatsAppOrderItem,
    WhatsAppMessage,
    WhatsAppAnalytics
)
from .serializers import (
    WhatsAppBusinessSettingsSerializer,
    WhatsAppCatalogSerializer,
    WhatsAppProductSerializer,
    WhatsAppOrderSerializer,
    WhatsAppMessageSerializer,
    WhatsAppAnalyticsSerializer,
    ProductSyncSerializer
)
from communications.whatsapp_service import whatsapp_service
from custom_auth.views.rbac_views import IsOwnerOrAdmin
from users.models import Tenant
from inventory.models import Product


class WhatsAppBusinessSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for WhatsApp Business Settings"""
    serializer_class = WhatsAppBusinessSettingsSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return WhatsAppBusinessSettings.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    @action(detail=False, methods=['post'])
    def toggle_whatsapp_business(self, request):
        """Toggle WhatsApp Business for non-WhatsApp commerce countries"""
        settings, created = WhatsAppBusinessSettings.objects.get_or_create(
            tenant=request.user.tenant,
            defaults={'is_enabled': True}
        )
        
        if not created:
            settings.is_enabled = not settings.is_enabled
            settings.save()
        
        return Response({
            'success': True,
            'enabled': settings.is_enabled,
            'message': f'WhatsApp Business {"enabled" if settings.is_enabled else "disabled"}'
        })

    @action(detail=False, methods=['get'])
    def check_availability(self, request):
        """Check if WhatsApp Business is available for this tenant"""
        try:
            settings = WhatsAppBusinessSettings.objects.get(tenant=request.user.tenant)
            return Response({
                'available': True,
                'enabled': settings.is_enabled,
                'configured': bool(settings.whatsapp_number)
            })
        except WhatsAppBusinessSettings.DoesNotExist:
            return Response({
                'available': True,
                'enabled': False,
                'configured': False
            })


class WhatsAppCatalogViewSet(viewsets.ModelViewSet):
    """ViewSet for WhatsApp Catalogs"""
    serializer_class = WhatsAppCatalogSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return WhatsAppCatalog.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    @action(detail=True, methods=['post'])
    def share_catalog(self, request, pk=None):
        """Share catalog via WhatsApp"""
        catalog = self.get_object()
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate catalog message
        message = f"🛍️ *{catalog.name}*\n\n"
        if catalog.description:
            message += f"{catalog.description}\n\n"
        
        message += f"Browse our catalog: {catalog.catalog_url or 'https://dottapps.com/catalog/' + str(catalog.id)}"
        
        # Send WhatsApp message
        result = whatsapp_service.send_text_message(phone_number, message)
        
        if result:
            # Log the message
            WhatsAppMessage.objects.create(
                tenant=request.user.tenant,
                recipient_phone=phone_number,
                message_type='catalog_share',
                message_content=message,
                whatsapp_message_id=result.get('messages', [{}])[0].get('id')
            )
            
            return Response({
                'success': True,
                'message': 'Catalog shared successfully',
                'message_id': result.get('messages', [{}])[0].get('id')
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to send WhatsApp message'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WhatsAppProductViewSet(viewsets.ModelViewSet):
    """ViewSet for WhatsApp Products"""
    serializer_class = WhatsAppProductSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        catalog_id = self.request.query_params.get('catalog_id')
        queryset = WhatsAppProduct.objects.filter(catalog__tenant=self.request.user.tenant)
        
        if catalog_id:
            queryset = queryset.filter(catalog_id=catalog_id)
        
        return queryset

    def perform_create(self, serializer):
        # Ensure catalog belongs to the user's tenant
        catalog = get_object_or_404(WhatsAppCatalog, pk=serializer.validated_data['catalog'].id, tenant=self.request.user.tenant)
        serializer.save()
    
    @action(detail=False, methods=['post'])
    def sync_from_inventory(self, request):
        """Sync products from main inventory to WhatsApp catalog"""
        serializer = ProductSyncSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        catalog_id = data['catalog_id']
        sync_all = data['sync_all']
        product_ids = data.get('product_ids', [])
        item_type = data['item_type']
        
        # Verify catalog belongs to user's tenant
        catalog = get_object_or_404(WhatsAppCatalog, pk=catalog_id, tenant=request.user.tenant)
        
        # Get products to sync
        if sync_all:
            products = Product.objects.filter(tenant=request.user.tenant, is_active=True)
        else:
            products = Product.objects.filter(id__in=product_ids, tenant=request.user.tenant, is_active=True)
        
        # Sync products
        synced_count = 0
        for product in products:
            # Check if already synced
            if WhatsAppProduct.objects.filter(catalog=catalog, linked_product=product).exists():
                continue
            
            # Create WhatsApp product
            whatsapp_product = WhatsAppProduct.objects.create(
                catalog=catalog,
                name=product.name,
                description=product.description or "",
                item_type=item_type,
                price=product.price or Decimal('0.00'),
                price_type='fixed',
                currency='USD',  # You might want to get this from user settings
                sku=product.sku,
                stock_quantity=product.quantity,
                is_available=product.is_active,
                linked_product=product
            )
            synced_count += 1
        
        return Response({
            'success': True,
            'synced_count': synced_count,
            'message': f'Successfully synced {synced_count} products to WhatsApp catalog'
        })
    
    @action(detail=False, methods=['get'])
    def available_for_sync(self, request):
        """Get products available for syncing to WhatsApp"""
        catalog_id = request.query_params.get('catalog_id')
        
        # Get all active products
        products = Product.objects.filter(tenant=request.user.tenant, is_active=True)
        
        # If catalog specified, exclude already synced products
        if catalog_id:
            catalog = get_object_or_404(WhatsAppCatalog, pk=catalog_id, tenant=request.user.tenant)
            synced_product_ids = WhatsAppProduct.objects.filter(
                catalog=catalog,
                linked_product__isnull=False
            ).values_list('linked_product_id', flat=True)
            products = products.exclude(id__in=synced_product_ids)
        
        # Simple serialization
        product_data = [{
            'id': str(product.id),
            'name': product.name,
            'sku': product.sku,
            'price': str(product.price) if product.price else '0.00',
            'quantity': product.quantity,
            'description': product.description
        } for product in products]
        
        return Response({
            'products': product_data,
            'count': len(product_data)
        })


class WhatsAppOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for WhatsApp Orders"""
    serializer_class = WhatsAppOrderSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return WhatsAppOrder.objects.filter(tenant=self.request.user.tenant)

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """Create a new WhatsApp order"""
        try:
            with transaction.atomic():
                # Extract order data
                customer_phone = request.data.get('customer_phone')
                customer_name = request.data.get('customer_name')
                customer_address = request.data.get('customer_address')
                items = request.data.get('items', [])
                
                if not customer_phone or not items:
                    return Response({
                        'error': 'Customer phone and items are required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create order
                order = WhatsAppOrder.objects.create(
                    tenant=request.user.tenant,
                    customer_phone=customer_phone,
                    customer_name=customer_name,
                    customer_address=customer_address,
                    total_amount=Decimal('0.00'),
                    currency='USD'  # Will be updated based on products
                )
                
                # Add order items
                total_amount = Decimal('0.00')
                for item_data in items:
                    product = get_object_or_404(WhatsAppProduct, pk=item_data['product_id'])
                    quantity = item_data.get('quantity', 1)
                    
                    order_item = WhatsAppOrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        unit_price=product.price
                    )
                    
                    total_amount += order_item.total_price
                    order.currency = product.currency  # Use product currency
                
                # Update order total and calculate Dott fee
                order.total_amount = total_amount
                order.calculate_dott_fee()
                order.save()
                
                # Send order confirmation via WhatsApp
                self._send_order_confirmation(order)
                
                return Response({
                    'success': True,
                    'order_id': str(order.id),
                    'total_amount': str(order.total_amount),
                    'currency': order.currency,
                    'dott_fee': str(order.dott_fee_amount)
                })
                
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def send_payment_link(self, request, pk=None):
        """Send payment link for an order"""
        order = self.get_object()
        
        # Generate payment link based on currency/country
        if order.currency == 'KES':
            # M-Pesa payment link
            payment_link = f"https://dottapps.com/payments/mpesa/{order.id}"
        else:
            # Stripe payment link
            payment_link = f"https://dottapps.com/payments/stripe/{order.id}"
        
        order.payment_link = payment_link
        order.save()
        
        # Send payment link via WhatsApp
        message = f"💳 *Payment for Order {order.id}*\n\n"
        message += f"Amount: {order.currency} {order.total_amount}\n"
        message += f"Pay now: {payment_link}\n\n"
        message += "Secure payment powered by Dott"
        
        result = whatsapp_service.send_text_message(order.customer_phone, message)
        
        if result:
            WhatsAppMessage.objects.create(
                tenant=request.user.tenant,
                recipient_phone=order.customer_phone,
                message_type='payment_link',
                message_content=message,
                whatsapp_message_id=result.get('messages', [{}])[0].get('id'),
                related_order=order
            )
            
            return Response({
                'success': True,
                'message': 'Payment link sent successfully',
                'payment_link': payment_link
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to send payment link'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status and notify customer"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(WhatsAppOrder.ORDER_STATUS_CHOICES):
            return Response({
                'error': 'Invalid status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order.order_status = new_status
        order.save()
        
        # Send status update via WhatsApp
        status_messages = {
            'confirmed': '✅ Your order has been confirmed!',
            'processing': '🔄 Your order is being processed',
            'shipped': '🚚 Your order has been shipped!',
            'delivered': '📦 Your order has been delivered!',
            'cancelled': '❌ Your order has been cancelled'
        }
        
        message = f"📋 *Order Update - {order.id}*\n\n"
        message += status_messages.get(new_status, f"Status updated to: {new_status}")
        
        result = whatsapp_service.send_text_message(order.customer_phone, message)
        
        if result:
            WhatsAppMessage.objects.create(
                tenant=request.user.tenant,
                recipient_phone=order.customer_phone,
                message_type='status_update',
                message_content=message,
                whatsapp_message_id=result.get('messages', [{}])[0].get('id'),
                related_order=order
            )
        
        return Response({
            'success': True,
            'message': 'Order status updated',
            'new_status': new_status
        })

    def _send_order_confirmation(self, order):
        """Send order confirmation via WhatsApp"""
        message = f"🛍️ *Order Confirmation*\n\n"
        message += f"Order ID: {order.id}\n"
        message += f"Total: {order.currency} {order.total_amount}\n\n"
        message += "Items:\n"
        
        for item in order.items.all():
            message += f"• {item.product.name} x {item.quantity} - {order.currency} {item.total_price}\n"
        
        message += f"\nWe'll send you a payment link shortly. Thank you for your order!"
        
        result = whatsapp_service.send_text_message(order.customer_phone, message)
        
        if result:
            WhatsAppMessage.objects.create(
                tenant=order.tenant,
                recipient_phone=order.customer_phone,
                message_type='order_confirmation',
                message_content=message,
                whatsapp_message_id=result.get('messages', [{}])[0].get('id'),
                related_order=order
            )


class WhatsAppAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for WhatsApp Analytics"""
    serializer_class = WhatsAppAnalyticsSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return WhatsAppAnalytics.objects.filter(tenant=self.request.user.tenant)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics"""
        today = timezone.now().date()
        
        # Get today's analytics
        today_analytics = WhatsAppAnalytics.objects.filter(
            tenant=request.user.tenant,
            date=today
        ).first()
        
        # Get total orders and revenue
        total_orders = WhatsAppOrder.objects.filter(tenant=request.user.tenant).count()
        total_revenue = WhatsAppOrder.objects.filter(
            tenant=request.user.tenant,
            payment_status='paid'
        ).aggregate(total=models.Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Get active catalogs and products
        active_catalogs = WhatsAppCatalog.objects.filter(tenant=request.user.tenant, is_active=True).count()
        active_products = WhatsAppProduct.objects.filter(catalog__tenant=request.user.tenant, is_available=True).count()
        
        return Response({
            'today_messages': today_analytics.messages_sent if today_analytics else 0,
            'today_orders': today_analytics.orders_completed if today_analytics else 0,
            'total_orders': total_orders,
            'total_revenue': str(total_revenue),
            'active_catalogs': active_catalogs,
            'active_products': active_products
        })