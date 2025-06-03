from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import Subscription, Business, UserProfile
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Check the subscription status for the current user's business.
    If the subscription has expired, update the status and downgrade to free plan.
    """
    # Get the user's business
    business = None
    try:
        business = request.user.profile.business
    except Exception as e:
        logger.error(f"Failed to get business profile: {str(e)}")
        return Response({"expired": False, "error": "No business profile found"})
    
    if not business:
        logger.info(f"No business associated with user {request.user.email}")
        return Response({"expired": False, "error": "No business associated with user"})
    
    # Check subscription status
    try:
        subscription = Subscription.objects.filter(business=business, is_active=True).latest('start_date')
        
        # If end_date is set and has passed, subscription has expired
        if subscription.end_date and subscription.end_date < timezone.now().date():
            logger.info(f"Subscription expired for business {business.id}, downgrading to free plan")
            
            # Update subscription status
            subscription.is_active = False
            subscription.save()
            
            # Update Cognito attributes
            try:
                from custom_auth.cognito import update_user_attributes
                update_user_attributes(request.user.username, {
                    'custom:subplan': 'free'
                })
                logger.info(f"Updated Cognito attributes for user {request.user.username}")
            except Exception as e:
                logger.error(f"Failed to update Cognito attributes: {str(e)}")
                
            return Response({
                "expired": True,
                "plan": "free",
                "previously": subscription.selected_plan,
                "expiry_date": subscription.end_date.isoformat()
            })
        
        # Subscription is still active
        return Response({
            "expired": False,
            "plan": subscription.selected_plan,
            "is_active": subscription.is_active,
            "expiry_date": subscription.end_date.isoformat() if subscription.end_date else None
        })
        
    except Subscription.DoesNotExist:
        # No subscription found, assume free plan
        logger.info(f"No subscription found for business {business.id}, assuming free plan")
        return Response({"expired": False, "plan": "free"})