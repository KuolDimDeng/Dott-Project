"""
WebSocket consumers for real-time marketplace notifications
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class BusinessNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for business notifications (new orders, etc.)
    """
    async def connect(self):
        self.business_id = self.scope['url_route']['kwargs']['business_id']
        self.business_group_name = f'business_{self.business_id}'

        # Verify user is authenticated and owns this business
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            logger.warning(f"Unauthorized WebSocket connection attempt for business {self.business_id}")
            await self.close()
            return

        # Join business group
        await self.channel_layer.group_add(
            self.business_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Business {self.business_id} connected to WebSocket")

    async def disconnect(self, close_code):
        # Leave business group
        await self.channel_layer.group_discard(
            self.business_group_name,
            self.channel_name
        )
        logger.info(f"Business {self.business_id} disconnected from WebSocket")

    async def receive(self, text_data):
        """Handle incoming messages from business"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'order_accept':
                await self.handle_order_accept(data)
            elif message_type == 'order_reject':
                await self.handle_order_reject(data)

        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from business {self.business_id}")
        except Exception as e:
            logger.error(f"Error processing message from business {self.business_id}: {e}")

    async def new_order(self, event):
        """Send new order notification to business"""
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'order_id': event.get('order_id'),
            'order_number': event.get('order_number'),
            'total_amount': event.get('total_amount'),
            'items': event.get('items'),
            'consumer': event.get('consumer'),
            'pickup_pin': event.get('pickup_pin'),
            'delivery_type': event.get('delivery_type'),
            'message': event.get('message')
        }))

    async def handle_order_accept(self, data):
        """Handle business accepting an order"""
        order_id = data.get('order_id')
        # Update order status and notify consumer
        logger.info(f"Business {self.business_id} accepted order {order_id}")

    async def handle_order_reject(self, data):
        """Handle business rejecting an order"""
        order_id = data.get('order_id')
        reason = data.get('reason', 'Business unavailable')
        # Update order status and notify consumer
        logger.info(f"Business {self.business_id} rejected order {order_id}: {reason}")


class ConsumerNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for consumer notifications (order updates, etc.)
    """
    async def connect(self):
        self.consumer_id = self.scope['url_route']['kwargs']['consumer_id']
        self.consumer_group_name = f'consumer_{self.consumer_id}'

        # Verify user is authenticated and is this consumer
        user = self.scope.get('user')
        if not user or not user.is_authenticated or str(user.id) != self.consumer_id:
            logger.warning(f"Unauthorized WebSocket connection attempt for consumer {self.consumer_id}")
            await self.close()
            return

        # Join consumer group
        await self.channel_layer.group_add(
            self.consumer_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Consumer {self.consumer_id} connected to WebSocket")

    async def disconnect(self, close_code):
        # Leave consumer group
        await self.channel_layer.group_discard(
            self.consumer_group_name,
            self.channel_name
        )
        logger.info(f"Consumer {self.consumer_id} disconnected from WebSocket")

    async def order_update(self, event):
        """Send order update to consumer"""
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'order_id': event.get('order_id'),
            'status': event.get('status'),
            'message': event.get('message'),
            'courier': event.get('courier'),
            'estimated_time': event.get('estimated_time')
        }))

    async def payment_receipt(self, event):
        """Send payment receipt notification"""
        await self.send(text_data=json.dumps({
            'type': 'payment_receipt',
            'order_id': event.get('order_id'),
            'receipt_url': event.get('receipt_url')
        }))


class CourierNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for courier notifications (delivery assignments, etc.)
    """
    async def connect(self):
        self.courier_id = self.scope['url_route']['kwargs']['courier_id']
        self.courier_group_name = f'courier_{self.courier_id}'

        # Verify user is authenticated and is a courier
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            logger.warning(f"Unauthorized WebSocket connection attempt for courier {self.courier_id}")
            await self.close()
            return

        # Join courier group
        await self.channel_layer.group_add(
            self.courier_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Courier {self.courier_id} connected to WebSocket")

    async def disconnect(self, close_code):
        # Leave courier group
        await self.channel_layer.group_discard(
            self.courier_group_name,
            self.channel_name
        )
        logger.info(f"Courier {self.courier_id} disconnected from WebSocket")

    async def delivery_assignment(self, event):
        """Send new delivery assignment to courier"""
        await self.send(text_data=json.dumps({
            'type': 'delivery_assignment',
            'order_id': event.get('order_id'),
            'order_number': event.get('order_number'),
            'pickup_location': event.get('pickup_location'),
            'delivery_location': event.get('delivery_location'),
            'estimated_earnings': event.get('estimated_earnings'),
            'message': event.get('message')
        }))


class OrderTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time order tracking
    """
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.order_group_name = f'order_{self.order_id}'

        # Join order group
        await self.channel_layer.group_add(
            self.order_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Client connected to track order {self.order_id}")

    async def disconnect(self, close_code):
        # Leave order group
        await self.channel_layer.group_discard(
            self.order_group_name,
            self.channel_name
        )

    async def order_status_update(self, event):
        """Send order status update"""
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'status': event.get('status'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp')
        }))

    async def courier_location_update(self, event):
        """Send courier location update"""
        await self.send(text_data=json.dumps({
            'type': 'courier_location',
            'latitude': event.get('latitude'),
            'longitude': event.get('longitude'),
            'timestamp': event.get('timestamp')
        }))