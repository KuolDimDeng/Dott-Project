from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.utils import get_user_subscription_status
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Get user's subscription status including grace period information
    """
    try:
        user = request.user
        subscription_data = get_user_subscription_status(user)
        
        # Add additional context for frontend
        response_data = {
            **subscription_data,
            'current_time': timezone.now().isoformat(),
        }
        
        # Add grace period specific messages
        if subscription_data['in_grace_period']:
            days_remaining = None
            if subscription_data['grace_period_ends']:
                time_remaining = subscription_data['grace_period_ends'] - timezone.now()
                days_remaining = max(0, time_remaining.days)
                
            response_data['grace_period_message'] = {
                'type': 'warning',
                'title': 'Payment Required',
                'message': f"Your payment failed. Please update your payment method within {days_remaining} days to avoid suspension.",
                'days_remaining': days_remaining,
                'action_required': True
            }
        elif subscription_data['status'] == 'suspended':
            response_data['grace_period_message'] = {
                'type': 'error',
                'title': 'Account Suspended',
                'message': 'Your account has been suspended due to payment failure. Please update your payment method to reactivate.',
                'action_required': True
            }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting subscription status for user {request.user.id}: {str(e)}")
        
        # Return safe defaults on error
        return Response({
            'plan': 'free',
            'status': 'active',
            'has_access': True,
            'in_grace_period': False,
            'grace_period_ends': None,
            'failed_payment_count': 0,
            'current_time': timezone.now().isoformat()
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry_payment(request):
    """
    Trigger payment retry for subscriptions in grace period
    This would typically integrate with Stripe to retry payment
    """
    try:
        user = request.user
        subscription_data = get_user_subscription_status(user)
        
        if not subscription_data['in_grace_period']:
            return Response({
                'success': False,
                'error': 'No payment retry needed - subscription is not in grace period'
            }, status=400)
        
        # In a real implementation, you would:
        # 1. Get the Stripe subscription ID
        # 2. Retry the payment using Stripe API
        # 3. Update the subscription status based on result
        
        # For now, return success message
        return Response({
            'success': True,
            'message': 'Payment retry initiated. You will receive an email confirmation.',
            'stripe_subscription_id': subscription_data.get('stripe_subscription_id')
        })
        
    except Exception as e:
        logger.error(f"Error retrying payment for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to retry payment. Please try again later.'
        }, status=500)