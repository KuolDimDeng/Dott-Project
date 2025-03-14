import stripe
import logging
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    user = request.user
    billing_cycle = request.data.get("billingCycle", "monthly")
    
    PRICE_IDS = {
        "monthly": settings.STRIPE_PRICE_ID_MONTHLY,
        "annual": settings.STRIPE_PRICE_ID_ANNUAL
    }
    
    price_id = PRICE_IDS.get(billing_cycle)
    if not price_id:
        logger.warning(f"Invalid billing cycle: {billing_cycle}")
        return Response({"error": "Invalid billing cycle"}, status=400)

    try:
        # Create a customer in Stripe if not exists
        if not hasattr(user, 'stripe_customer_id') or not user.stripe_customer_id:
            logger.info(f"Creating new Stripe customer for user {user.id}")
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)}
            )
            user.stripe_customer_id = customer.id
            user.save()
        
        success_url = request.build_absolute_uri(reverse('onboarding:save_step4'))
        cancel_url = request.build_absolute_uri(reverse('onboarding:save_step3'))

        session = stripe.checkout.Session.create(
                customer=user.stripe_customer_id,
                client_reference_id=str(user.id),  # Add this line
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url,
                metadata={
                    "user_id": str(user.id),
                    "billing_cycle": billing_cycle
                }
            )
        logger.info(f"Checkout session created successfully for user {user.id}")
        return Response({"sessionId": session.id})
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error for user {user.id}: {str(e)}")
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in create_checkout_session for user {user.id}: {str(e)}")
        return Response({"error": "An unexpected error occurred"}, status=500)