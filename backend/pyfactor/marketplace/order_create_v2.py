"""
Alternative order creation implementation with comprehensive validation
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging
import json
import uuid
import random
import string

from .order_models import ConsumerOrder
from .models import BusinessListing, ConsumerProfile

logger = logging.getLogger(__name__)

def validate_and_clean_order_data(data):
    """Validate and clean order data before processing"""
    errors = []
    cleaned_data = {}

    # Required fields
    required_fields = ['items', 'subtotal', 'total_amount']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    # Validate items
    items = data.get('items', [])
    if not items:
        errors.append("Order must contain at least one item")
    elif not isinstance(items, list):
        errors.append("Items must be a list")
    else:
        cleaned_items = []
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                errors.append(f"Item {i} must be a dictionary")
                continue

            cleaned_item = {}
            # Required item fields
            for field in ['product_id', 'name', 'quantity', 'price']:
                if field not in item:
                    errors.append(f"Item {i} missing required field: {field}")
                else:
                    cleaned_item[field] = item[field]

            # Optional business_id
            if 'business_id' in item:
                cleaned_item['business_id'] = str(item['business_id'])

            if len(cleaned_item) == 5 or len(cleaned_item) == 4:  # All required fields present
                cleaned_items.append(cleaned_item)

        cleaned_data['items'] = cleaned_items

    # Numeric fields
    numeric_fields = [
        'subtotal', 'tax_amount', 'delivery_fee', 'service_fee',
        'tip_amount', 'discount_amount', 'total_amount'
    ]

    for field in numeric_fields:
        value = data.get(field, 0)
        try:
            cleaned_data[field] = Decimal(str(value))
        except:
            cleaned_data[field] = Decimal('0')
            if field in ['subtotal', 'total_amount']:
                errors.append(f"Invalid numeric value for {field}: {value}")

    # String fields
    cleaned_data['payment_method'] = data.get('payment_method', 'cash')
    cleaned_data['order_status'] = 'pending'
    cleaned_data['payment_status'] = 'pending'

    # Address handling
    delivery_address = data.get('delivery_address', '')
    if isinstance(delivery_address, dict):
        # Format address from dictionary
        street = delivery_address.get('street', '')
        city = delivery_address.get('city', '')
        state = delivery_address.get('state', '')
        postal = delivery_address.get('postal_code', '')
        country = delivery_address.get('country', '')
        cleaned_data['delivery_address'] = f"{street}, {city}, {state} {postal}, {country}".strip(', ')
    else:
        cleaned_data['delivery_address'] = str(delivery_address) if delivery_address else ''

    # Optional string fields
    cleaned_data['delivery_notes'] = str(data.get('special_instructions', '') or data.get('delivery_notes', ''))
    cleaned_data['cancellation_reason'] = ''

    # UUID fields
    conversation_id = data.get('conversation_id') or data.get('chat_conversation_id')
    if conversation_id and conversation_id not in ['', 'null', 'undefined']:
        try:
            cleaned_data['chat_conversation_id'] = str(uuid.UUID(str(conversation_id)))
        except:
            cleaned_data['chat_conversation_id'] = None
    else:
        cleaned_data['chat_conversation_id'] = None

    # Boolean fields
    cleaned_data['created_from_chat'] = bool(data.get('created_from_chat', False))

    return cleaned_data, errors


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_v2(request):
    """
    Alternative order creation endpoint with comprehensive validation
    """
    logger.info("=" * 80)
    logger.info("[OrderV2] Starting order creation")
    logger.info(f"[OrderV2] User: {request.user.email} (ID: {request.user.id})")
    logger.info(f"[OrderV2] Request data type: {type(request.data)}")

    try:
        # Step 1: Validate and clean data
        logger.info("[OrderV2] Step 1: Validating data")
        cleaned_data, validation_errors = validate_and_clean_order_data(request.data)

        if validation_errors:
            logger.error(f"[OrderV2] Validation errors: {validation_errors}")
            return Response({
                'success': False,
                'errors': validation_errors
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"[OrderV2] Cleaned data: {cleaned_data}")

        # Step 2: Get business from items
        logger.info("[OrderV2] Step 2: Finding business")
        items = cleaned_data['items']
        if not items:
            return Response({
                'success': False,
                'error': 'No items in order'
            }, status=status.HTTP_400_BAD_REQUEST)

        business_id = items[0].get('business_id')
        if not business_id:
            return Response({
                'success': False,
                'error': 'Business ID not provided in items'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            business_listing = BusinessListing.objects.get(id=business_id)
            logger.info(f"[OrderV2] Found business listing: {business_listing.id}")

            # Debug the business field in detail
            logger.info(f"[OrderV2] Business field type: {type(business_listing.business)}")
            logger.info(f"[OrderV2] Business field value: {repr(business_listing.business)}")
            logger.info(f"[OrderV2] Business is None: {business_listing.business is None}")
            logger.info(f"[OrderV2] Business_id field: {business_listing.business_id}")

            if business_listing.business:
                logger.info(f"[OrderV2] Business user exists")
                logger.info(f"[OrderV2] Business user ID: {business_listing.business.id}")
                logger.info(f"[OrderV2] Business user email: {business_listing.business.email}")
                logger.info(f"[OrderV2] Business user type: {type(business_listing.business)}")
            else:
                logger.error(f"[OrderV2] Business user is None!")

            # Ensure business user exists and is valid
            if not business_listing.business or not business_listing.business.id:
                logger.error(f"[OrderV2] Business listing has invalid business user")
                return Response({
                    'success': False,
                    'error': 'Business configuration error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except BusinessListing.DoesNotExist:
            logger.error(f"[OrderV2] Business not found: {business_id}")
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Step 3: Generate order number
        logger.info("[OrderV2] Step 3: Generating order number")
        max_attempts = 10
        order_number = None

        for attempt in range(max_attempts):
            prefix = 'ORD'
            suffix = ''.join(random.choices(string.digits, k=8))
            potential_order_number = f"{prefix}{suffix}"

            if not ConsumerOrder.objects.filter(order_number=potential_order_number).exists():
                order_number = potential_order_number
                logger.info(f"[OrderV2] Generated order number: {order_number}")
                break

        if not order_number:
            import time
            order_number = f"ORD{int(time.time())}"
            logger.warning(f"[OrderV2] Using timestamp-based order number: {order_number}")

        # Step 4: Create order with transaction
        logger.info("[OrderV2] Step 4: Creating order in database")

        with transaction.atomic():
            try:
                # Log all values before creating order
                logger.info("[OrderV2] Creating order with values:")
                logger.info(f"  - consumer: {request.user} (ID: {request.user.id})")
                logger.info(f"  - consumer type: {type(request.user)}")
                logger.info(f"  - business_listing.business: {business_listing.business}")
                logger.info(f"  - business_listing.business type: {type(business_listing.business)}")
                logger.info(f"  - business_listing.business_id: {business_listing.business_id}")
                logger.info(f"  - business_listing.business is None: {business_listing.business is None}")

                # Get the business user object
                from django.contrib.auth import get_user_model
                User = get_user_model()

                business_user = None
                if business_listing.business:
                    business_user = business_listing.business
                    logger.info(f"  - Got business user from relationship: {business_user}")
                elif business_listing.business_id:
                    try:
                        business_user = User.objects.get(id=business_listing.business_id)
                        logger.info(f"  - Got business user by ID: {business_user} (ID: {business_listing.business_id})")
                    except User.DoesNotExist:
                        logger.error(f"  - Business user with ID {business_listing.business_id} does not exist!")

                logger.info(f"  - order_number: {order_number}")
                logger.info(f"  - items type: {type(cleaned_data['items'])}")
                logger.info(f"  - items value: {cleaned_data['items']}")

                # Ensure we have valid business user
                if not business_user:
                    logger.error(f"[OrderV2] Could not determine business user!")
                    return Response({
                        'success': False,
                        'error': 'Business configuration invalid - no business user'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # Final validation before creating order
                logger.info(f"[OrderV2] === FINAL VALIDATION BEFORE ORDER CREATION ===")
                logger.info(f"[OrderV2] business_user type: {type(business_user)}")
                logger.info(f"[OrderV2] business_user value: {business_user}")
                logger.info(f"[OrderV2] business_user.id: {business_user.id if business_user else 'N/A'}")
                logger.info(f"[OrderV2] business_user is User instance: {isinstance(business_user, User)}")

                # Additional check - ensure business_user is valid
                if not business_user or not hasattr(business_user, 'id'):
                    logger.error(f"[OrderV2] CRITICAL: business_user is invalid!")
                    return Response({
                        'success': False,
                        'error': 'Business user validation failed'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # Create the order - use the User object directly
                order = ConsumerOrder(
                    consumer=request.user,
                    business=business_user,  # Use the User object directly
                    order_number=order_number,
                    items=cleaned_data['items'],  # This is already a clean list
                    subtotal=cleaned_data['subtotal'],
                    tax_amount=cleaned_data['tax_amount'],
                    delivery_fee=cleaned_data['delivery_fee'],
                    service_fee=cleaned_data['service_fee'],
                    tip_amount=cleaned_data['tip_amount'],
                    discount_amount=cleaned_data['discount_amount'],
                    total_amount=cleaned_data['total_amount'],
                    order_status=cleaned_data['order_status'],
                    payment_status=cleaned_data['payment_status'],
                    payment_method=cleaned_data['payment_method'],
                    delivery_address=cleaned_data['delivery_address'],
                    delivery_notes=cleaned_data['delivery_notes'],
                    cancellation_reason=cleaned_data['cancellation_reason'],
                    created_from_chat=cleaned_data['created_from_chat'],
                    chat_conversation_id=cleaned_data['chat_conversation_id'],
                    # Explicitly set PIN fields to None
                    delivery_pin=None,
                    pickup_pin=None,
                    consumer_delivery_pin=None,
                    # Set other nullable fields
                    payment_intent_id=None,
                    payment_transaction_id=None,
                    courier=None,
                    courier_assigned_at=None,
                    courier_accepted_at=None,
                    courier_earnings=None,
                    estimated_delivery_time=None,
                    actual_delivery_time=None,
                    paid_at=None,
                    refunded_at=None,
                    refund_amount=None,
                    confirmed_at=None,
                    prepared_at=None,
                    delivered_at=None,
                    cancelled_at=None
                )

                # Log the order object before saving
                logger.info(f"[OrderV2] Order object created, items type: {type(order.items)}")
                logger.info(f"[OrderV2] Order items value: {order.items}")

                # Save the order
                order.save()
                logger.info(f"[OrderV2] Order saved successfully: {order.order_number}")

                # Generate PINs
                pins = order.generate_pins()
                logger.info(f"[OrderV2] PINs generated: {pins}")

                # Update consumer profile
                consumer_profile, _ = ConsumerProfile.objects.get_or_create(user=request.user)
                consumer_profile.total_orders += 1
                consumer_profile.total_spent += cleaned_data['total_amount']
                consumer_profile.last_order_at = timezone.now()
                consumer_profile.save()

                # Update business listing
                business_listing.total_orders += 1
                business_listing.save()

                # Try to send notifications (don't fail if they don't work)
                try:
                    from .notification_service import OrderNotificationService
                    OrderNotificationService.notify_business_new_order(order)
                    OrderNotificationService.broadcast_order_update(order, 'created')
                except Exception as e:
                    logger.warning(f"[OrderV2] Notification failed (non-critical): {e}")

                # Try to assign courier (don't fail if it doesn't work)
                if request.data.get('delivery_type') == 'delivery':
                    try:
                        from couriers.services import CourierAssignmentService
                        courier = CourierAssignmentService.assign_courier_to_order(
                            order.id,
                            auto_assign=True
                        )
                        if courier:
                            logger.info(f"[OrderV2] Courier {courier.id} assigned")
                    except Exception as e:
                        logger.warning(f"[OrderV2] Courier assignment failed (non-critical): {e}")

                # Return success response
                response_data = {
                    'success': True,
                    'order_id': str(order.id),
                    'order_number': order.order_number,
                    'total_amount': float(order.total_amount),
                    'estimated_delivery': '30-45 minutes',
                    'passcodes': {
                        'pickupCode': pins['pickup_pin'],
                        'deliveryCode': pins['delivery_pin'],
                        'consumerPin': pins['consumer_pin']
                    }
                }

                logger.info(f"[OrderV2] Success! Returning: {response_data}")
                return Response(response_data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"[OrderV2] Error in transaction: {str(e)}")
                logger.error(f"[OrderV2] Error type: {type(e).__name__}")
                import traceback
                logger.error(f"[OrderV2] Traceback: {traceback.format_exc()}")
                raise

    except Exception as e:
        logger.error(f"[OrderV2] Unexpected error: {str(e)}")
        logger.error(f"[OrderV2] Error type: {type(e).__name__}")
        import traceback
        logger.error(f"[OrderV2] Full traceback: {traceback.format_exc()}")

        return Response({
            'success': False,
            'error': f'Failed to create order: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)