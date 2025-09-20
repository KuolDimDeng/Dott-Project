"""
Production-ready order creation endpoint v3 with notifications and courier assignment
"""

import logging
import random
import string
from decimal import Decimal
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import BusinessListing
from .order_models import ConsumerOrder
import uuid

logger = logging.getLogger(__name__)
User = get_user_model()
channel_layer = get_channel_layer()


def generate_passcode(length=6):
    """Generate a random numeric passcode"""
    return ''.join(random.choices(string.digits, k=length))


def format_items_for_email(items):
    """Format order items for email display"""
    formatted = []
    for item in items:
        formatted.append(f"- {item.get('name', 'Unknown')} x{item.get('quantity', 1)} - ${item.get('price', 0)}")
    return '\n'.join(formatted)


def send_payment_receipt(user, order, payment_intent_id):
    """Send payment receipt to customer"""
    try:
        receipt_message = f'''
        Payment Receipt

        Order Number: {order.order_number}
        Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}
        Payment ID: {payment_intent_id}

        Items:
        {format_items_for_email(order.items)}

        Subtotal: ${order.subtotal}
        Tax: ${order.tax_amount}
        Delivery Fee: ${order.delivery_fee}
        Service Fee: ${order.service_fee}
        Tip: ${order.tip_amount}
        Discount: -${order.discount_amount}

        Total Paid: ${order.total_amount}

        Payment Method: {order.payment_method}
        Status: Paid

        Thank you for your order!
        '''

        send_mail(
            subject=f'Payment Receipt - Order #{order.order_number}',
            message=receipt_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True
        )
    except Exception as e:
        logger.error(f"Failed to send payment receipt: {e}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_order_v3(request):
    """
    Simplified order creation endpoint with better error handling
    """
    try:
        # Log the incoming request
        logger.info(f"[OrderV3] ========== NEW ORDER REQUEST ==========")
        logger.info(f"[OrderV3] User: {request.user.email} (ID: {request.user.id})")

        # Extract data from request
        data = request.data
        logger.info(f"[OrderV3] Request data keys: {list(data.keys())}")

        # Validate required fields
        required_fields = ['items', 'subtotal', 'total_amount', 'payment_method']
        for field in required_fields:
            if field not in data:
                logger.error(f"[OrderV3] Missing required field: {field}")
                return Response({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Get items and extract business_id
        items = data.get('items', [])
        if not items:
            logger.error(f"[OrderV3] No items in order")
            return Response({
                'success': False,
                'error': 'Order must contain at least one item'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get business_id from first item
        business_listing_id = items[0].get('business_id')
        logger.info(f"[OrderV3] Business listing ID from items: {business_listing_id}")

        if not business_listing_id:
            logger.error(f"[OrderV3] No business_id in items")
            return Response({
                'success': False,
                'error': 'Items must contain business_id'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the BusinessListing and its associated User
        try:
            business_listing = BusinessListing.objects.select_related('business').get(
                id=business_listing_id
            )
            logger.info(f"[OrderV3] Found BusinessListing: {business_listing.id}")
            logger.info(f"[OrderV3] Business User: {business_listing.business}")
            logger.info(f"[OrderV3] Business User ID: {business_listing.business_id}")

        except BusinessListing.DoesNotExist:
            logger.error(f"[OrderV3] BusinessListing not found: {business_listing_id}")
            return Response({
                'success': False,
                'error': f'Business not found: {business_listing_id}'
            }, status=status.HTTP_404_NOT_FOUND)

        # Get the business user - with fallback
        business_user = business_listing.business
        if not business_user and business_listing.business_id:
            try:
                business_user = User.objects.get(id=business_listing.business_id)
                logger.warning(f"[OrderV3] Had to fetch business user manually: {business_user}")
            except User.DoesNotExist:
                logger.error(f"[OrderV3] Business user {business_listing.business_id} does not exist")
                return Response({
                    'success': False,
                    'error': 'Business user not found'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not business_user:
            logger.error(f"[OrderV3] Could not determine business user")
            return Response({
                'success': False,
                'error': 'Could not determine business user'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info(f"[OrderV3] Final business user: {business_user} (ID: {business_user.id})")

        # Generate order number and passcodes (all 4 digits as per database schema)
        order_number = f"ORD{uuid.uuid4().hex[:8].upper()}"
        pickup_pin = generate_passcode(4)
        delivery_pin = generate_passcode(4)
        consumer_delivery_pin = generate_passcode(4)

        logger.info(f"[OrderV3] Generated order number: {order_number}")
        logger.info(f"[OrderV3] Generated passcodes - Pickup: {pickup_pin}, Delivery: {delivery_pin}, Consumer: {consumer_delivery_pin}")

        # Determine order type from delivery address presence
        delivery_type = data.get('delivery_type', 'delivery')
        delivery_address = data.get('delivery_address', {})

        # Create order data (without delivery_type field which doesn't exist in model)
        order_data = {
            'order_number': order_number,
            'consumer': request.user,  # The consumer is the authenticated user
            'business': business_user,  # The business user we found
            'items': items,
            'subtotal': data.get('subtotal', 0),
            'tax_amount': data.get('tax_amount', 0),
            'delivery_fee': data.get('delivery_fee', 0),
            'service_fee': data.get('service_fee', 0),
            'tip_amount': data.get('tip_amount', 0),
            'discount_amount': data.get('discount_amount', 0),
            'total_amount': data.get('total_amount', 0),
            'delivery_address': delivery_address.get('street', ''),
            'delivery_notes': data.get('special_instructions', ''),
            'payment_method': data.get('payment_method', 'cash'),
            'order_status': 'pending',
            'payment_status': 'pending',
            'pickup_pin': pickup_pin,
            'delivery_pin': delivery_pin,
            'consumer_delivery_pin': consumer_delivery_pin
        }

        # Log the order data before creation
        logger.info(f"[OrderV3] Creating order with data:")
        logger.info(f"[OrderV3]   consumer: {order_data['consumer']} (ID: {order_data['consumer'].id})")
        logger.info(f"[OrderV3]   business: {order_data['business']} (ID: {order_data['business'].id})")
        logger.info(f"[OrderV3]   order_number: {order_data['order_number']}")
        logger.info(f"[OrderV3]   total_amount: {order_data['total_amount']}")

        # Create the order
        try:
            order = ConsumerOrder.objects.create(**order_data)
            logger.info(f"[OrderV3] ✅ Order created successfully: {order.id}")

            # Handle payment if provided
            payment_details = data.get('payment_details')
            if payment_details:
                payment_intent_id = payment_details.get('paymentIntentId')
                if payment_intent_id:
                    order.payment_intent_id = payment_intent_id
                    order.payment_status = 'paid'
                    order.order_status = 'confirmed'
                    order.save()
                    logger.info(f"[OrderV3] Payment recorded: {payment_intent_id}")

            # Send notifications to business (restaurant) via WebSocket
            try:
                logger.info(f"[OrderV3] Sending WebSocket notification to business: {business_user.id}")
                async_to_sync(channel_layer.group_send)(
                    f"business_{business_user.id}",
                    {
                        "type": "new_order",
                        "order_id": str(order.id),
                        "order_number": order.order_number,
                        "total_amount": float(order.total_amount),
                        "items": order.items,
                        "consumer": request.user.email,
                        "pickup_pin": pickup_pin,
                        "delivery_type": delivery_type,
                        "message": f"New order #{order.order_number} received!"
                    }
                )
                logger.info(f"[OrderV3] ✅ WebSocket notification sent to business")
            except Exception as e:
                logger.error(f"[OrderV3] Failed to send WebSocket notification: {e}")

            # Send email notification to business
            try:
                if hasattr(business_user, 'email') and business_user.email:
                    send_mail(
                        subject=f'New Order #{order.order_number}',
                        message=f'''
                        You have received a new order!

                        Order Number: {order.order_number}
                        Customer: {request.user.email}
                        Total Amount: ${order.total_amount}
                        Payment Method: {order.payment_method}
                        Pickup PIN: {pickup_pin}

                        Items:
                        {format_items_for_email(order.items)}

                        Please prepare this order promptly.
                        ''',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[business_user.email],
                        fail_silently=True
                    )
                    logger.info(f"[OrderV3] ✅ Email notification sent to business: {business_user.email}")
            except Exception as e:
                logger.error(f"[OrderV3] Failed to send email notification: {e}")

            # Send payment receipt to consumer
            try:
                if payment_details and payment_intent_id:
                    send_payment_receipt(request.user, order, payment_intent_id)
                    logger.info(f"[OrderV3] ✅ Payment receipt sent to consumer")
            except Exception as e:
                logger.error(f"[OrderV3] Failed to send payment receipt: {e}")

            # Assign courier for delivery orders
            courier_assigned = None
            if delivery_type == 'delivery':
                try:
                    from couriers.services import CourierAssignmentService

                    # First set order status to business_accepted for courier assignment
                    order.order_status = 'business_accepted'
                    order.save()

                    # Assign courier
                    courier = CourierAssignmentService.assign_courier_to_order(order.id, auto_assign=True)
                    if courier:
                        courier_assigned = {
                            'id': str(courier.id),
                            'name': f"{courier.user.first_name} {courier.user.last_name}".strip() or courier.user.email,
                            'phone': courier.phone_number,
                            'vehicle_type': courier.vehicle_type,
                            'estimated_time': '30-45 minutes'
                        }
                        logger.info(f"[OrderV3] ✅ Courier assigned: {courier.user.email}")
                    else:
                        logger.warning(f"[OrderV3] No available courier found, order remains in searching status")
                except ImportError as e:
                    logger.warning(f"[OrderV3] Courier service not available: {e}")
                except Exception as e:
                    logger.error(f"[OrderV3] Failed to assign courier: {e}")

            # Return success response with order details and relevant passcodes
            response_data = {
                'success': True,
                'message': 'Order created successfully',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'status': order.order_status,
                'payment_status': order.payment_status,
                'estimated_time': '20-30 minutes' if delivery_type == 'pickup' else '45-60 minutes',
                # Include all order amounts for display
                'subtotal': float(order.subtotal),
                'tax_amount': float(order.tax_amount),
                'delivery_fee': float(order.delivery_fee),
                'service_fee': float(order.service_fee),
                'tip_amount': float(order.tip_amount),
                'discount_amount': float(order.discount_amount),
                'total_amount': float(order.total_amount),
                'delivery_type': delivery_type,
                'delivery_address': order.delivery_address,
                'payment_method': order.payment_method
            }

            # Only include relevant passcodes based on order type
            if delivery_type == 'pickup':
                # For pickup: consumer shows this code to restaurant
                response_data['passcodes'] = {
                    'pickupCode': pickup_pin,  # Consumer → Restaurant verification
                    'type': 'pickup'
                }
            else:
                # For delivery: consumer gives this code to courier for verification
                response_data['passcodes'] = {
                    'consumerPin': consumer_delivery_pin,  # Consumer → Courier verification
                    'type': 'delivery'
                }
                # Include courier info if assigned
                if courier_assigned:
                    response_data['courier'] = courier_assigned

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"[OrderV3] Failed to create order: {e}")
            logger.error(f"[OrderV3] Error type: {type(e)}")
            import traceback
            logger.error(f"[OrderV3] Traceback: {traceback.format_exc()}")

            return Response({
                'success': False,
                'error': f'Failed to create order: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"[OrderV3] Unexpected error: {e}")
        import traceback
        logger.error(f"[OrderV3] Traceback: {traceback.format_exc()}")

        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)