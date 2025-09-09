"""
Mobile Orders Management API Views
Handles order management for businesses in the mobile app
"""
import logging
from django.db import transaction
from django.db.models import Q, Prefetch, Sum, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
import uuid

from .models import ConsumerOrder, BusinessListing
from .serializers import ConsumerOrderSerializer

logger = logging.getLogger(__name__)


class MobileBusinessOrdersViewSet(viewsets.ModelViewSet):
    """
    Mobile-specific order management for businesses
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConsumerOrderSerializer
    
    def get_queryset(self):
        """Get all orders for the user's business"""
        user = self.request.user
        if not user.business_id:
            return ConsumerOrder.objects.none()
        
        # Get business listing
        business_listing = BusinessListing.objects.filter(
            business_id=user.business_id,
            tenant=user.tenant
        ).first()
        
        if not business_listing:
            return ConsumerOrder.objects.none()
        
        # Return orders for this business
        return ConsumerOrder.objects.filter(
            business=business_listing,
            tenant=user.tenant
        ).select_related(
            'consumer',
            'business'
        ).prefetch_related(
            'items'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def active_orders(self, request):
        """
        Get all active orders (pending, confirmed, preparing)
        """
        try:
            active_statuses = ['pending', 'confirmed', 'preparing', 'ready']
            orders = self.get_queryset().filter(status__in=active_statuses)
            
            orders_data = []
            for order in orders:
                order_data = {
                    'id': order.id,
                    'order_number': order.order_number,
                    'consumer_name': order.consumer.user.full_name if order.consumer else 'Guest',
                    'consumer_phone': order.consumer.phone if order.consumer else order.guest_phone,
                    'status': order.status,
                    'order_type': order.order_type,
                    'total_amount': str(order.total_amount),
                    'payment_method': order.payment_method,
                    'payment_status': order.payment_status,
                    'created_at': order.created_at,
                    'estimated_time': order.estimated_delivery_time,
                    'items_count': order.items.count(),
                    'items': [
                        {
                            'name': item.get('name', 'Unknown'),
                            'quantity': item.get('quantity', 1),
                            'price': item.get('price', 0),
                            'notes': item.get('notes', '')
                        }
                        for item in order.items_data or []
                    ],
                    'delivery_address': order.delivery_address,
                    'notes': order.notes,
                    'is_urgent': self._is_order_urgent(order)
                }
                orders_data.append(order_data)
            
            return Response({
                'success': True,
                'data': orders_data,
                'count': len(orders_data),
                'stats': {
                    'pending': orders.filter(status='pending').count(),
                    'confirmed': orders.filter(status='confirmed').count(),
                    'preparing': orders.filter(status='preparing').count(),
                    'ready': orders.filter(status='ready').count()
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to get active orders: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve orders'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def order_history(self, request):
        """
        Get completed and cancelled orders
        """
        try:
            completed_statuses = ['delivered', 'completed', 'cancelled', 'refunded']
            orders = self.get_queryset().filter(status__in=completed_statuses)[:50]
            
            serializer = self.get_serializer(orders, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'count': orders.count()
            })
            
        except Exception as e:
            logger.error(f"Failed to get order history: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve order history'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def accept_order(self, request, pk=None):
        """
        Accept an order and set preparation time
        """
        try:
            order = self.get_object()
            
            if order.status != 'pending':
                return Response(
                    {'error': f'Cannot accept order in {order.status} status'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            preparation_time = request.data.get('preparation_time', 30)  # minutes
            
            with transaction.atomic():
                order.status = 'confirmed'
                order.confirmed_at = timezone.now()
                order.estimated_delivery_time = timezone.now() + timedelta(minutes=preparation_time)
                order.save()
                
                # Send notification to customer (implement your notification service)
                self._send_order_notification(order, 'accepted')
            
            return Response({
                'success': True,
                'message': 'Order accepted successfully',
                'data': {
                    'order_id': order.id,
                    'status': order.status,
                    'estimated_time': order.estimated_delivery_time
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to accept order: {str(e)}")
            return Response(
                {'error': 'Failed to accept order'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject_order(self, request, pk=None):
        """
        Reject an order with reason
        """
        try:
            order = self.get_object()
            
            if order.status != 'pending':
                return Response(
                    {'error': f'Cannot reject order in {order.status} status'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            reason = request.data.get('reason', 'Business unable to fulfill order')
            
            with transaction.atomic():
                order.status = 'cancelled'
                order.cancellation_reason = reason
                order.cancelled_at = timezone.now()
                order.cancelled_by = 'business'
                order.save()
                
                # Process refund if payment was made
                if order.payment_status == 'paid':
                    order.payment_status = 'refund_pending'
                    order.save()
                    # TODO: Trigger refund process
                
                # Send notification to customer
                self._send_order_notification(order, 'rejected', reason)
            
            return Response({
                'success': True,
                'message': 'Order rejected',
                'data': {
                    'order_id': order.id,
                    'status': order.status,
                    'reason': reason
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to reject order: {str(e)}")
            return Response(
                {'error': 'Failed to reject order'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update order status (preparing, ready, out_for_delivery, delivered)
        """
        try:
            order = self.get_object()
            new_status = request.data.get('status')
            
            # Define valid status transitions
            valid_transitions = {
                'confirmed': ['preparing', 'cancelled'],
                'preparing': ['ready', 'cancelled'],
                'ready': ['out_for_delivery', 'completed'],
                'out_for_delivery': ['delivered'],
            }
            
            current_status = order.status
            if current_status not in valid_transitions:
                return Response(
                    {'error': f'Cannot update order in {current_status} status'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if new_status not in valid_transitions[current_status]:
                return Response(
                    {'error': f'Invalid status transition from {current_status} to {new_status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                order.status = new_status
                
                # Set appropriate timestamps
                if new_status == 'preparing':
                    order.preparation_started_at = timezone.now()
                elif new_status == 'ready':
                    order.ready_at = timezone.now()
                elif new_status == 'out_for_delivery':
                    order.pickup_time = timezone.now()
                elif new_status == 'delivered':
                    order.delivery_time = timezone.now()
                    order.payment_status = 'paid' if order.payment_method != 'cash' else order.payment_status
                
                order.save()
                
                # Send notification
                self._send_order_notification(order, 'status_update')
            
            return Response({
                'success': True,
                'message': f'Order status updated to {new_status}',
                'data': {
                    'order_id': order.id,
                    'status': order.status
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to update order status: {str(e)}")
            return Response(
                {'error': 'Failed to update order status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def assign_delivery(self, request, pk=None):
        """
        Assign order for delivery (internal or third-party)
        """
        try:
            order = self.get_object()
            
            if order.order_type != 'delivery':
                return Response(
                    {'error': 'This is not a delivery order'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            delivery_method = request.data.get('delivery_method', 'internal')  # internal or third_party
            courier_id = request.data.get('courier_id')  # For third-party delivery
            
            with transaction.atomic():
                if delivery_method == 'third_party' and courier_id:
                    # TODO: Integrate with courier service
                    order.courier_id = courier_id
                    order.delivery_method = 'third_party'
                else:
                    order.delivery_method = 'internal'
                
                order.save()
            
            return Response({
                'success': True,
                'message': 'Delivery assigned successfully',
                'data': {
                    'order_id': order.id,
                    'delivery_method': order.delivery_method
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to assign delivery: {str(e)}")
            return Response(
                {'error': 'Failed to assign delivery'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def order_stats(self, request):
        """
        Get order statistics for the business
        """
        try:
            today = timezone.now().date()
            orders = self.get_queryset()
            
            # Today's stats
            today_orders = orders.filter(created_at__date=today)
            
            stats = {
                'today': {
                    'total_orders': today_orders.count(),
                    'pending': today_orders.filter(status='pending').count(),
                    'completed': today_orders.filter(status__in=['delivered', 'completed']).count(),
                    'cancelled': today_orders.filter(status='cancelled').count(),
                    'revenue': today_orders.filter(
                        status__in=['delivered', 'completed'],
                        payment_status='paid'
                    ).aggregate(total=Sum('total_amount'))['total'] or 0
                },
                'all_time': {
                    'total_orders': orders.count(),
                    'completed': orders.filter(status__in=['delivered', 'completed']).count(),
                    'average_order_value': orders.filter(
                        status__in=['delivered', 'completed']
                    ).aggregate(avg=Sum('total_amount') / Count('id'))['avg'] or 0
                },
                'order_types': {
                    'pickup': orders.filter(order_type='pickup').count(),
                    'delivery': orders.filter(order_type='delivery').count(),
                    'dine_in': orders.filter(order_type='dine_in').count()
                }
            }
            
            return Response({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            logger.error(f"Failed to get order stats: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _is_order_urgent(self, order):
        """Check if order needs urgent attention"""
        if order.status == 'pending':
            # Order pending for more than 5 minutes
            time_diff = timezone.now() - order.created_at
            return time_diff.total_seconds() > 300
        return False
    
    def _send_order_notification(self, order, notification_type, extra_message=None):
        """Send notification to customer about order status"""
        # TODO: Implement your notification service (push, SMS, etc.)
        logger.info(f"Notification would be sent for order {order.order_number}: {notification_type}")
        
        # Example notification messages
        messages = {
            'accepted': f"Your order #{order.order_number} has been accepted!",
            'rejected': f"Your order #{order.order_number} was cancelled. {extra_message or ''}",
            'status_update': f"Your order #{order.order_number} is now {order.status}",
        }
        
        message = messages.get(notification_type, f"Order #{order.order_number} update")
        
        # Send via your notification service
        # Example: send_push_notification(order.consumer.user, message)