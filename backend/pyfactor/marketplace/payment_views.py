from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .payment_service import MarketplacePaymentService
from .order_models import ConsumerOrder
import logging

logger = logging.getLogger(__name__)
payment_service = MarketplacePaymentService()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """
    Create a payment intent for an order
    """
    try:
        order_id = request.data.get('order_id')
        payment_method = request.data.get('payment_method', 'card')
        
        # Get order
        order = ConsumerOrder.objects.get(
            id=order_id,
            consumer=request.user
        )
        
        # Check if already paid
        if order.payment_status == 'paid':
            return Response({
                'success': False,
                'error': 'Order already paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create payment intent
        result = payment_service.create_payment_intent(order, payment_method)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except ConsumerOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to create payment intent'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_mpesa_payment(request):
    """
    Process M-Pesa payment for Kenya
    """
    try:
        order_id = request.data.get('order_id')
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Phone number required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get order
        order = ConsumerOrder.objects.get(
            id=order_id,
            consumer=request.user
        )
        
        # Check if already paid
        if order.payment_status == 'paid':
            return Response({
                'success': False,
                'error': 'Order already paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Process M-Pesa payment
        result = payment_service.process_mpesa_payment(order, phone_number)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except ConsumerOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error processing M-Pesa payment: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to process payment'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    """
    Confirm payment completion
    """
    try:
        order_id = request.data.get('order_id')
        payment_intent_id = request.data.get('payment_intent_id')
        transaction_id = request.data.get('transaction_id')
        
        # Get order
        order = ConsumerOrder.objects.get(
            id=order_id,
            consumer=request.user
        )
        
        # Confirm payment
        result = payment_service.confirm_payment(
            order, 
            payment_intent_id=payment_intent_id,
            transaction_id=transaction_id
        )
        
        if result['success']:
            # Also confirm the order
            order.confirm_order()
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except ConsumerOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to confirm payment'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_order(request):
    """
    Process a refund for an order
    """
    try:
        order_id = request.data.get('order_id')
        amount = request.data.get('amount')
        reason = request.data.get('reason', '')
        
        # Get order
        order = ConsumerOrder.objects.get(
            id=order_id,
            consumer=request.user
        )
        
        # Check if can be refunded
        if order.payment_status != 'paid':
            return Response({
                'success': False,
                'error': 'Order not paid, cannot refund'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Process refund
        result = payment_service.refund_payment(order, amount=amount, reason=reason)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except ConsumerOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to process refund'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_methods(request):
    """
    Get available payment methods for user's country
    """
    try:
        country_code = request.query_params.get('country', 'US')
        
        methods = payment_service.get_payment_methods_for_country(country_code)
        
        return Response({
            'success': True,
            'payment_methods': methods,
            'country': country_code
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to get payment methods'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)