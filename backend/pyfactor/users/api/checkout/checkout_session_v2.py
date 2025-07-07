"""
Enhanced checkout session creation with regional discount support
"""
import stripe
import logging
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist

from users.models import Business, UserProfile
from users.stripe_discount_config import get_stripe_price_id


logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session_v2(request):
    """
    Create Stripe checkout session with regional discount support
    
    Expected data:
    {
        "plan_type": "professional" or "enterprise",
        "billing_cycle": "monthly" or "yearly"
    }
    """
    user = request.user
    plan_type = request.data.get("plan_type", "professional")
    billing_cycle = request.data.get("billing_cycle", "monthly")
    
    # Validate input
    if plan_type not in ['professional', 'enterprise']:
        return Response({"error": "Invalid plan type"}, status=400)
    
    if billing_cycle not in ['monthly', 'yearly']:
        return Response({"error": "Invalid billing cycle"}, status=400)
    
    try:
        # Check if user has discount eligibility
        is_discounted = False
        discount_percentage = 0
        
        # Get user's business
        try:
            user_profile = UserProfile.objects.get(user=user)
            if user_profile.business:
                business = user_profile.business
                is_discounted = business.regional_discount_eligible
                discount_percentage = business.regional_discount_percentage
        except (UserProfile.DoesNotExist, AttributeError):
            logger.warning(f"No business found for user {user.id}")
        
        # Get appropriate Stripe price ID
        price_id = get_stripe_price_id(plan_type, billing_cycle, is_discounted)
        
        if not price_id:
            logger.error(f"No price ID found for {plan_type} {billing_cycle} discounted={is_discounted}")
            return Response({"error": "Invalid pricing configuration"}, status=500)
        
        # Create or get Stripe customer
        if not hasattr(user, 'stripe_customer_id') or not user.stripe_customer_id:
            logger.info(f"Creating new Stripe customer for user {user.id}")
            customer = stripe.Customer.create(
                email=user.email,
                metadata={
                    "user_id": str(user.id),
                    "discount_eligible": str(is_discounted),
                    "discount_percentage": str(discount_percentage)
                }
            )
            user.stripe_customer_id = customer.id
            user.save()
        else:
            # Update customer metadata if discount status changed
            stripe.Customer.modify(
                user.stripe_customer_id,
                metadata={
                    "discount_eligible": str(is_discounted),
                    "discount_percentage": str(discount_percentage)
                }
            )
        
        # Build URLs
        success_url = request.build_absolute_uri('/dashboard/subscription/success')
        cancel_url = request.build_absolute_uri('/dashboard/subscription')
        
        # Create checkout session
        session_params = {
            'customer': user.stripe_customer_id,
            'client_reference_id': str(user.id),
            'payment_method_types': ['card'],
            'line_items': [{
                'price': price_id,
                'quantity': 1,
            }],
            'mode': 'subscription',
            'success_url': f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            'cancel_url': cancel_url,
            'metadata': {
                'user_id': str(user.id),
                'plan_type': plan_type,
                'billing_cycle': billing_cycle,
                'is_discounted': str(is_discounted),
                'discount_percentage': str(discount_percentage)
            }
        }
        
        # Add discount display if applicable
        if is_discounted and discount_percentage > 0:
            session_params['discounts'] = [{
                'coupon': f'REGIONAL_{discount_percentage}_PERCENT_OFF'
            }]
        
        session = stripe.checkout.Session.create(**session_params)
        
        logger.info(
            f"Checkout session created for user {user.id}: "
            f"plan={plan_type}, cycle={billing_cycle}, "
            f"discounted={is_discounted} ({discount_percentage}%)"
        )
        
        return Response({
            'sessionId': session.id,
            'is_discounted': is_discounted,
            'discount_percentage': discount_percentage,
            'plan_details': {
                'plan_type': plan_type,
                'billing_cycle': billing_cycle,
                'price_id': price_id
            }
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error for user {user.id}: {str(e)}")
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in create_checkout_session for user {user.id}: {str(e)}")
        return Response({"error": "An unexpected error occurred"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_pricing(request):
    """
    Get subscription pricing for the current user based on their discount eligibility
    """
    user = request.user
    
    try:
        # Check discount eligibility
        is_discounted = False
        discount_percentage = 0
        country_code = 'US'
        
        try:
            user_profile = UserProfile.objects.get(user=user)
            if user_profile.business:
                business = user_profile.business
                is_discounted = business.regional_discount_eligible
                discount_percentage = business.regional_discount_percentage
                
                # Get country from business details
                if hasattr(business, 'details') and business.details:
                    country_code = business.details.country
        except (UserProfile.DoesNotExist, AttributeError):
            pass
        
        # Calculate prices
        if is_discounted:
            professional_monthly = 7.50
            professional_yearly = 72.00
            enterprise_monthly = 22.50
            enterprise_yearly = 216.00
        else:
            professional_monthly = 15.00
            professional_yearly = 144.00
            enterprise_monthly = 45.00
            enterprise_yearly = 432.00
        
        return Response({
            'is_discounted': is_discounted,
            'discount_percentage': discount_percentage,
            'country_code': country_code,
            'pricing': {
                'professional': {
                    'monthly': professional_monthly,
                    'yearly': professional_yearly,
                    'monthly_display': f'${professional_monthly:.2f}',
                    'yearly_display': f'${professional_yearly:.2f}',
                    'monthly_savings': professional_yearly / 12 - professional_monthly
                },
                'enterprise': {
                    'monthly': enterprise_monthly,
                    'yearly': enterprise_yearly,
                    'monthly_display': f'${enterprise_monthly:.2f}',
                    'yearly_display': f'${enterprise_yearly:.2f}',
                    'monthly_savings': enterprise_yearly / 12 - enterprise_monthly
                }
            },
            'stripe_price_ids': {
                'professional': {
                    'monthly': get_stripe_price_id('professional', 'monthly', is_discounted),
                    'yearly': get_stripe_price_id('professional', 'yearly', is_discounted)
                },
                'enterprise': {
                    'monthly': get_stripe_price_id('enterprise', 'monthly', is_discounted),
                    'yearly': get_stripe_price_id('enterprise', 'yearly', is_discounted)
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting subscription pricing: {str(e)}")
        # Return default pricing on error
        return Response({
            'is_discounted': False,
            'discount_percentage': 0,
            'pricing': {
                'professional': {
                    'monthly': 15.00,
                    'yearly': 144.00,
                    'monthly_display': '$15.00',
                    'yearly_display': '$144.00'
                },
                'enterprise': {
                    'monthly': 45.00,
                    'yearly': 432.00,
                    'monthly_display': '$45.00',
                    'yearly_display': '$432.00'
                }
            }
        })