from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from django.utils import timezone
from .order_models import ConsumerOrder, OrderReview
from .models import BusinessListing, ConsumerProfile
from .payment_service import MarketplacePaymentService
from couriers.models import CourierProfile
import logging

logger = logging.getLogger(__name__)

class ConsumerOrderViewSet(viewsets.ModelViewSet):
    """
    Order management for consumers
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get orders for current consumer"""
        return ConsumerOrder.objects.filter(consumer=self.request.user)
    
    def create(self, request):
        """Create a new order"""
        logger.info(f"[OrderCreate] Starting order creation for user: {request.user}")
        logger.info(f"[OrderCreate] User authenticated: {request.user.is_authenticated}")
        logger.info(f"[OrderCreate] User email: {getattr(request.user, 'email', 'N/A')}")
        logger.info(f"[OrderCreate] Request data: {request.data}")

        try:
            items = request.data.get('items', [])
            delivery_address = request.data.get('delivery_address')
            delivery_type = request.data.get('delivery_type', 'delivery')
            special_instructions = request.data.get('special_instructions', '')
            payment_method = request.data.get('payment_method', 'card')

            # Get business from first item (assuming single business orders for now)
            if not items:
                return Response({
                    'success': False,
                    'error': 'No items in order'
                }, status=status.HTTP_400_BAD_REQUEST)

            business_id = items[0].get('business_id')
            logger.info(f"[OrderCreate] Looking for business listing: {business_id}")

            try:
                business_listing = BusinessListing.objects.get(id=business_id)
                logger.info(f"[OrderCreate] Found business listing for business: {business_listing.business.email}")
            except BusinessListing.DoesNotExist:
                logger.error(f"[OrderCreate] Business listing not found: {business_id}")
                raise

            # Use mobile app's calculated totals instead of recalculating
            subtotal = float(request.data.get('subtotal', 0))
            tax_amount = float(request.data.get('tax_amount', 0))
            delivery_fee = float(request.data.get('delivery_fee', 0))
            service_fee = float(request.data.get('service_fee', 0))
            tip_amount = float(request.data.get('tip_amount', 0))
            total_amount = float(request.data.get('total', 0))

            # Format delivery address as string if it's an object
            delivery_address_str = ''
            if delivery_address and isinstance(delivery_address, dict):
                delivery_address_str = f"{delivery_address.get('street', '')}, {delivery_address.get('city', '')}, {delivery_address.get('state', '')} {delivery_address.get('postal_code', '')}, {delivery_address.get('country', '')}"
            elif delivery_address:
                delivery_address_str = str(delivery_address)
            
            # Check if consumer is trying to order from their own business
            if request.user == business_listing.business:
                logger.warning(f"[OrderCreate] User {request.user.email} trying to order from their own business")
                # This is allowed for testing, but log it

            # Create order
            logger.info(f"[OrderCreate] Creating order with data:")
            logger.info(f"  - Consumer: {request.user.email} (ID: {request.user.id})")
            logger.info(f"  - Business: {business_listing.business.email} (ID: {business_listing.business.id})")
            logger.info(f"  - Items count: {len(items)}")
            logger.info(f"  - Total amount: {total_amount}")
            logger.info(f"  - Payment method: {payment_method}")
            logger.info(f"  - Tip amount: {tip_amount}")
            logger.info(f"  - Order will be auto-generated")

            # Handle UUID field - convert empty string to None
            conversation_id = request.data.get('conversation_id')
            if conversation_id == '' or conversation_id == 'null' or conversation_id == 'undefined':
                conversation_id = None

            # Create order instance without saving
            order = ConsumerOrder(
                consumer=request.user,
                business=business_listing.business,
                items=items,
                subtotal=subtotal,
                tax_amount=tax_amount,
                delivery_fee=delivery_fee,
                service_fee=service_fee,
                tip_amount=tip_amount,
                total_amount=total_amount,
                payment_method=payment_method,
                delivery_address=delivery_address_str,
                delivery_notes=special_instructions,
                created_from_chat=request.data.get('created_from_chat', False),
                chat_conversation_id=conversation_id
            )

            # Save to trigger order_number generation
            order.save()

            logger.info(f"[OrderCreate] Order created successfully: {order.order_number}")
            logger.info(f"[OrderCreate] Order ID: {order.id}, Total: {order.total_amount}")
            logger.info(f"[OrderCreate] Migration applied - items field should now accept list")
            
            # Update consumer profile
            consumer_profile, _ = ConsumerProfile.objects.get_or_create(user=request.user)
            consumer_profile.total_orders += 1
            consumer_profile.total_spent += total_amount
            consumer_profile.last_order_at = timezone.now()
            consumer_profile.save()
            
            # Update business listing
            business_listing.total_orders += 1
            business_listing.save()
            
            # Generate PINs for verification
            pins = order.generate_pins()

            # Send notification to business
            from .notification_service import OrderNotificationService
            OrderNotificationService.notify_business_new_order(order)
            OrderNotificationService.broadcast_order_update(order, 'created')

            # Automatically assign courier for delivery orders
            if request.data.get('delivery_type') == 'delivery':
                try:
                    from couriers.services import CourierAssignmentService
                    courier = CourierAssignmentService.assign_courier_to_order(
                        order.id,
                        auto_assign=True
                    )
                    if courier:
                        logger.info(f"Courier {courier.id} automatically assigned to order {order.order_number}")
                    else:
                        logger.warning(f"No courier available for order {order.order_number} - will keep searching")
                except ImportError:
                    logger.warning("CourierAssignmentService not available - skipping automatic courier assignment")
                except Exception as e:
                    logger.error(f"Error in automatic courier assignment for order {order.order_number}: {str(e)}")
                    # Don't fail the order creation if courier assignment fails

            return Response({
                'success': True,
                'order_id': str(order.id),
                'order_number': order.order_number,
                'total_amount': float(order.total_amount),
                'estimated_delivery': '30-45 minutes',  # Should be calculated
                'passcodes': {
                    'pickupCode': pins['pickup_pin'],
                    'deliveryCode': pins['delivery_pin'],
                    'consumerPin': pins['consumer_pin']
                }
            }, status=status.HTTP_201_CREATED)
            
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"[OrderCreate] Error creating order: {str(e)}")
            logger.error(f"[OrderCreate] Error type: {type(e).__name__}")
            import traceback
            logger.error(f"[OrderCreate] Stack trace: {traceback.format_exc()}")

            return Response({
                'success': False,
                'error': f'Failed to create order: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def retrieve(self, request, pk=None):
        """Get order details"""
        try:
            order = self.get_queryset().get(pk=pk)
            
            return Response({
                'success': True,
                'order': {
                    'id': str(order.id),
                    'order_number': order.order_number,
                    'business_name': order.business.business_name,
                    'items': order.items,
                    'subtotal': float(order.subtotal),
                    'tax_amount': float(order.tax_amount),
                    'delivery_fee': float(order.delivery_fee),
                    'total_amount': float(order.total_amount),
                    'status': order.order_status,
                    'payment_status': order.payment_status,
                    'payment_method': order.payment_method,
                    'delivery_address': order.delivery_address,
                    'created_at': order.created_at.isoformat(),
                    'estimated_delivery_time': order.estimated_delivery_time.isoformat() if order.estimated_delivery_time else None
                }
            })
        except ConsumerOrder.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def recent_orders(self, request):
        """Get recent orders for consumer"""
        orders = self.get_queryset().order_by('-created_at')[:5]
        
        order_data = []
        for order in orders:
            # Calculate time ago
            time_diff = timezone.now() - order.created_at
            if time_diff.days > 0:
                time_ago = f"{time_diff.days}d ago"
            elif time_diff.seconds > 3600:
                time_ago = f"{time_diff.seconds // 3600}h ago"
            else:
                time_ago = f"{time_diff.seconds // 60}m ago"
            
            order_data.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'business_name': order.business.business_name,
                'items_count': len(order.items),
                'total': float(order.total_amount),
                'status': order.order_status,
                'time_ago': time_ago
            })
        
        return Response({
            'success': True,
            'orders': order_data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order"""
        try:
            order = self.get_queryset().get(pk=pk)
            
            # Check if order can be cancelled
            if order.order_status in ['delivered', 'completed', 'cancelled']:
                return Response({
                    'success': False,
                    'error': f'Cannot cancel order with status: {order.order_status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            reason = request.data.get('reason', 'Customer requested cancellation')
            order.cancel_order(reason)
            
            return Response({
                'success': True,
                'message': 'Order cancelled successfully'
            })
        except ConsumerOrder.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)


class ConsumerFavoriteViewSet(viewsets.ViewSet):
    """
    Manage consumer favorite businesses
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get user's favorite businesses"""
        try:
            profile, _ = ConsumerProfile.objects.get_or_create(user=request.user)
            favorites = profile.favorite_businesses.all()
            
            favorite_data = []
            for business in favorites:
                favorite_data.append({
                    'id': str(business.id),
                    'name': business.business.business_name,
                    'category': business.get_primary_category_display(),
                    'rating': float(business.average_rating),
                    'is_open': business.is_open_now
                })
            
            return Response({
                'success': True,
                'favorites': favorite_data
            })
        except Exception as e:
            logger.error(f"Error fetching favorites: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to fetch favorites'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle favorite status for a business"""
        try:
            business_id = request.data.get('business_id')
            business_listing = BusinessListing.objects.get(id=business_id)
            
            profile, _ = ConsumerProfile.objects.get_or_create(user=request.user)
            
            if business_listing in profile.favorite_businesses.all():
                profile.favorite_businesses.remove(business_listing)
                is_favorite = False
            else:
                profile.favorite_businesses.add(business_listing)
                is_favorite = True
            
            return Response({
                'success': True,
                'is_favorite': is_favorite
            })
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def check(self, request, business_id=None):
        """Check if a business is favorited"""
        try:
            business_listing = BusinessListing.objects.get(id=business_id)
            profile, _ = ConsumerProfile.objects.get_or_create(user=request.user)
            
            is_favorite = business_listing in profile.favorite_businesses.all()
            
            return Response({
                'success': True,
                'is_favorite': is_favorite
            })
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'is_favorite': False
            })