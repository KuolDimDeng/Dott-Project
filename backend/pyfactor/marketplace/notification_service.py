"""
Marketplace Notification Service
Handles all order-related notifications to businesses, consumers, and couriers
"""
import logging
from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

class OrderNotificationService:
    """
    Central notification service for order updates
    """

    @staticmethod
    def notify_business_new_order(order):
        """
        Notify business about new order
        """
        try:
            business = order.business

            # Prepare notification data
            notification_data = {
                'type': 'new_order',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'consumer_name': getattr(order.consumer, 'name', order.consumer.email if order.consumer else 'Guest'),
                'total_amount': float(order.total_amount),
                'items_count': len(order.items) if order.items else 0,
                'delivery_type': 'delivery' if order.delivery_address else 'pickup',
                'created_at': order.created_at.isoformat(),
                'message': f'New order #{order.order_number} received!'
            }

            # Send via WebSocket to business dashboard
            OrderNotificationService._send_websocket_to_business(
                business.id,
                notification_data
            )

            # Send push notification if available
            OrderNotificationService._send_push_notification(
                business,
                title="New Order!",
                body=f"Order #{order.order_number} - ${order.total_amount}",
                data=notification_data
            )

            # Log the notification
            logger.info(f"Business {business.id} notified of order {order.order_number}")

            return True

        except Exception as e:
            logger.error(f"Failed to notify business of new order: {e}")
            return False

    @staticmethod
    def notify_consumer_order_accepted(order, preparation_time=None):
        """
        Notify consumer that order was accepted
        """
        try:
            consumer = order.consumer

            message = f"Your order #{order.order_number} has been accepted!"
            if preparation_time:
                message += f" It will be ready in {preparation_time} minutes."

            notification_data = {
                'type': 'order_accepted',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'status': order.order_status,
                'preparation_time': preparation_time,
                'message': message
            }

            # Send via WebSocket
            OrderNotificationService._send_websocket_to_consumer(
                consumer.id,
                notification_data
            )

            # Send push notification
            OrderNotificationService._send_push_notification(
                consumer,
                title="Order Accepted!",
                body=message,
                data=notification_data
            )

            logger.info(f"Consumer {consumer.id} notified of order acceptance")
            return True

        except Exception as e:
            logger.error(f"Failed to notify consumer of order acceptance: {e}")
            return False

    @staticmethod
    def notify_courier_new_assignment(order, courier):
        """
        Notify courier about new delivery assignment
        """
        try:
            business_listing = order.business.marketplace_listing

            notification_data = {
                'type': 'new_delivery',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'pickup_location': {
                    'business_name': business_listing.business.business_name if business_listing else 'Unknown',
                    'address': business_listing.address if business_listing else '',
                    'latitude': float(business_listing.latitude) if business_listing and business_listing.latitude else None,
                    'longitude': float(business_listing.longitude) if business_listing and business_listing.longitude else None,
                },
                'delivery_location': {
                    'address': order.delivery_address,
                    'latitude': float(order.delivery_latitude) if hasattr(order, 'delivery_latitude') and order.delivery_latitude else None,
                    'longitude': float(order.delivery_longitude) if hasattr(order, 'delivery_longitude') and order.delivery_longitude else None,
                },
                'earnings': float(order.courier_earnings) if order.courier_earnings else 0,
                'message': f'New delivery assigned! Pickup from {business_listing.business.business_name if business_listing else "merchant"}'
            }

            # Send via WebSocket
            OrderNotificationService._send_websocket_to_courier(
                courier.user.id,
                notification_data
            )

            # Send push notification
            OrderNotificationService._send_push_notification(
                courier.user,
                title="New Delivery!",
                body=f"Pickup from {business_listing.business.business_name if business_listing else 'merchant'} - ${order.courier_earnings}",
                data=notification_data
            )

            logger.info(f"Courier {courier.id} notified of new assignment")
            return True

        except Exception as e:
            logger.error(f"Failed to notify courier of assignment: {e}")
            return False

    @staticmethod
    def notify_order_status_update(order, old_status):
        """
        Notify all parties about order status changes
        """
        try:
            new_status = order.order_status

            # Status-specific notifications
            status_notifications = {
                'preparing': {
                    'consumer': 'Your order is being prepared!',
                    'courier': None,
                    'business': None
                },
                'ready_for_pickup': {
                    'consumer': 'Your order is ready for pickup!',
                    'courier': 'Order is ready for pickup!',
                    'business': 'Order marked as ready'
                },
                'picked_up': {
                    'consumer': 'Your order has been picked up by the courier!',
                    'courier': 'Pickup confirmed',
                    'business': 'Order picked up by courier'
                },
                'in_transit': {
                    'consumer': 'Your order is on the way!',
                    'courier': None,
                    'business': None
                },
                'arrived': {
                    'consumer': 'Your courier has arrived!',
                    'courier': None,
                    'business': None
                },
                'delivered': {
                    'consumer': 'Your order has been delivered!',
                    'courier': 'Delivery completed',
                    'business': 'Order delivered successfully'
                },
                'cancelled': {
                    'consumer': 'Your order has been cancelled',
                    'courier': 'Delivery cancelled',
                    'business': 'Order cancelled'
                }
            }

            notifications = status_notifications.get(new_status, {})

            # Base notification data
            base_data = {
                'type': 'status_update',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'old_status': old_status,
                'new_status': new_status,
                'updated_at': timezone.now().isoformat()
            }

            # Notify consumer
            if notifications.get('consumer') and order.consumer:
                consumer_data = {**base_data, 'message': notifications['consumer']}
                OrderNotificationService._send_websocket_to_consumer(
                    order.consumer.id,
                    consumer_data
                )
                OrderNotificationService._send_push_notification(
                    order.consumer,
                    title=f"Order #{order.order_number}",
                    body=notifications['consumer'],
                    data=consumer_data
                )

            # Notify courier
            if notifications.get('courier') and order.courier:
                courier_data = {**base_data, 'message': notifications['courier']}
                OrderNotificationService._send_websocket_to_courier(
                    order.courier.user.id,
                    courier_data
                )
                OrderNotificationService._send_push_notification(
                    order.courier.user,
                    title=f"Order #{order.order_number}",
                    body=notifications['courier'],
                    data=courier_data
                )

            # Notify business
            if notifications.get('business') and order.business:
                business_data = {**base_data, 'message': notifications['business']}
                OrderNotificationService._send_websocket_to_business(
                    order.business.id,
                    business_data
                )
                OrderNotificationService._send_push_notification(
                    order.business,
                    title=f"Order #{order.order_number}",
                    body=notifications['business'],
                    data=business_data
                )

            logger.info(f"Order {order.order_number} status update notifications sent")
            return True

        except Exception as e:
            logger.error(f"Failed to send status update notifications: {e}")
            return False

    @staticmethod
    def _send_websocket_to_business(business_id, data):
        """
        Send WebSocket message to business dashboard
        """
        try:
            # Business dashboard channel
            channel_name = f"business_{business_id}"

            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'order.notification',
                    'data': data
                }
            )

            logger.debug(f"WebSocket sent to business channel: {channel_name}")

        except Exception as e:
            logger.error(f"Failed to send WebSocket to business: {e}")

    @staticmethod
    def notify_business_status_change(listing, is_open):
        """
        Notify all clients when a business changes its open/closed status
        """
        try:
            # Prepare notification data
            notification_data = {
                'type': 'business_status_update',
                'business_id': str(listing.id),
                'business_name': listing.business.business_name,
                'is_open': is_open,
                'status_text': 'OPEN' if is_open else 'CLOSED',
                'timestamp': timezone.now().isoformat()
            }

            # Broadcast to marketplace channel for all consumers
            channel_name = "marketplace_updates"

            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'business.status_update',
                    'data': notification_data
                }
            )

            logger.info(f"Business status change notification sent for {listing.business.business_name}: {'OPEN' if is_open else 'CLOSED'}")

        except Exception as e:
            logger.error(f"Failed to send business status change notification: {e}")

    @staticmethod
    def _send_websocket_to_consumer(consumer_id, data):
        """
        Send WebSocket message to consumer app
        """
        try:
            # Consumer app channel
            channel_name = f"consumer_{consumer_id}"

            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'order.notification',
                    'data': data
                }
            )

            logger.debug(f"WebSocket sent to consumer channel: {channel_name}")

        except Exception as e:
            logger.error(f"Failed to send WebSocket to consumer: {e}")

    @staticmethod
    def _send_websocket_to_courier(courier_user_id, data):
        """
        Send WebSocket message to courier app
        """
        try:
            # Courier app channel
            channel_name = f"courier_{courier_user_id}"

            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'delivery.notification',
                    'data': data
                }
            )

            logger.debug(f"WebSocket sent to courier channel: {channel_name}")

        except Exception as e:
            logger.error(f"Failed to send WebSocket to courier: {e}")

    @staticmethod
    def _send_push_notification(user, title, body, data=None):
        """
        Send push notification via Firebase/OneSignal/etc
        This is a placeholder for actual push notification service
        """
        try:
            # TODO: Integrate with actual push notification service
            # For now, just log the notification
            logger.info(f"Push notification queued for user {user.id}: {title} - {body}")

            # Example integration with Firebase (when ready):
            # from firebase_admin import messaging
            #
            # if user.fcm_token:
            #     message = messaging.Message(
            #         notification=messaging.Notification(
            #             title=title,
            #             body=body
            #         ),
            #         data=data,
            #         token=user.fcm_token
            #     )
            #     response = messaging.send(message)

            return True

        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False

    @staticmethod
    def broadcast_order_update(order, update_type='general'):
        """
        Broadcast order update to all relevant parties via WebSocket
        """
        try:
            order_data = {
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.order_status,
                'payment_status': order.payment_status,
                'preparation_time': order.preparation_time if hasattr(order, 'preparation_time') else None,
                'courier_assigned': order.courier is not None,
                'updated_at': timezone.now().isoformat(),
                'update_type': update_type
            }

            # Broadcast to order-specific channel
            channel_name = f"order_{order.id}"

            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'order.update',
                    'data': order_data
                }
            )

            logger.debug(f"Order update broadcast to channel: {channel_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to broadcast order update: {e}")
            return False