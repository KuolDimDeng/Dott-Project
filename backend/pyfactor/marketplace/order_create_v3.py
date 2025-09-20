"""
Clean, simplified order creation endpoint v3
"""

import logging
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import BusinessListing
from .order_models import ConsumerOrder
import uuid

logger = logging.getLogger(__name__)
User = get_user_model()


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

        # Generate order number
        order_number = f"ORD{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"[OrderV3] Generated order number: {order_number}")

        # Create order data
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
            'delivery_address': data.get('delivery_address', {}).get('street', ''),
            'delivery_notes': data.get('special_instructions', ''),
            'payment_method': data.get('payment_method', 'cash'),
            'order_status': 'pending',
            'payment_status': 'pending'
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

            # Return success response
            return Response({
                'success': True,
                'message': 'Order created successfully',
                'order_id': str(order.id),
                'order_number': order.order_number,
                'status': order.order_status,
                'payment_status': order.payment_status
            }, status=status.HTTP_201_CREATED)

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