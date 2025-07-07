"""
Mobile money checkout session creation
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from users.models import Business, UserProfile
from users.mobile_money_models import MobileMoneyCountry
from payroll.paystack_integration import paystack_service, PaystackError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_mobile_money_checkout(request):
    """
    Create a mobile money checkout session via Paystack
    
    Expected data:
    {
        "plan_type": "professional" or "enterprise",
        "billing_cycle": "monthly", "six_month", or "yearly",
        "phone_number": "+254712345678",
        "provider": "mpesa" (optional, defaults based on country)
    }
    """
    user = request.user
    plan_type = request.data.get("plan_type", "professional")
    billing_cycle = request.data.get("billing_cycle", "monthly")
    phone_number = request.data.get("phone_number")
    provider = request.data.get("provider", "mpesa")
    
    # Validate input
    if plan_type not in ['professional', 'enterprise']:
        return Response({"error": "Invalid plan type"}, status=400)
    
    if billing_cycle not in ['monthly', 'six_month', 'yearly']:
        return Response({"error": "Invalid billing cycle"}, status=400)
    
    if not phone_number:
        return Response({"error": "Phone number is required"}, status=400)
    
    try:
        # Get user's business and country
        country_code = 'KE'  # Default to Kenya
        currency = 'KES'
        
        try:
            user_profile = UserProfile.objects.get(user=user)
            if user_profile.business:
                business = user_profile.business
                if hasattr(business, 'details') and business.details:
                    country_code = business.details.country
                    
                    # Get currency for country
                    try:
                        mm_country = MobileMoneyCountry.objects.get(
                            country_code=country_code,
                            is_active=True
                        )
                        currency = mm_country.currency_code
                        # Use first provider if not specified
                        if not provider and mm_country.providers:
                            provider = mm_country.providers[0].lower().replace(' ', '_')
                    except MobileMoneyCountry.DoesNotExist:
                        return Response({
                            "error": f"Mobile money not available in {country_code}"
                        }, status=400)
        except (UserProfile.DoesNotExist, AttributeError):
            logger.warning(f"No business found for user {user.id}")
        
        # Check if user has regional discount
        is_discounted = False
        discount_percentage = 0
        
        if hasattr(business, 'regional_discount_eligible'):
            is_discounted = business.regional_discount_eligible
            discount_percentage = business.regional_discount_percentage
        
        # Format phone number
        formatted_phone = paystack_service.format_phone_number(phone_number, country_code)
        
        # Create metadata
        metadata = {
            'user_id': str(user.id),
            'business_id': str(business.id) if business else None,
            'plan_type': plan_type,
            'billing_cycle': billing_cycle,
            'is_discounted': is_discounted,
            'discount_percentage': discount_percentage,
            'country_code': country_code
        }
        
        # Create Paystack charge
        charge_response = paystack_service.create_subscription_charge(
            plan_type=plan_type,
            billing_cycle=billing_cycle,
            email=user.email,
            phone_number=formatted_phone,
            currency=currency,
            provider=provider,
            metadata=metadata
        )
        
        logger.info(
            f"Mobile money checkout created for user {user.id}: "
            f"plan={plan_type}, cycle={billing_cycle}, "
            f"provider={provider}, currency={currency}"
        )
        
        # Return response with payment instructions
        return Response({
            'reference': charge_response.get('reference'),
            'access_code': charge_response.get('access_code'),
            'authorization_url': charge_response.get('authorization_url'),
            'display_text': charge_response.get('display_text', 'Check your phone for payment prompt'),
            'ussd_code': charge_response.get('ussd_code'),
            'mobile_money': {
                'phone': formatted_phone,
                'provider': provider,
                'currency': currency
            },
            'plan_details': {
                'plan_type': plan_type,
                'billing_cycle': billing_cycle,
                'is_discounted': is_discounted,
                'discount_percentage': discount_percentage
            }
        })
        
    except PaystackError as e:
        logger.error(f"Paystack error for user {user.id}: {str(e)}")
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in mobile money checkout for user {user.id}: {str(e)}")
        return Response({"error": "An unexpected error occurred"}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_mobile_money_payment(request):
    """
    Verify a mobile money payment
    
    Expected data:
    {
        "reference": "payment_reference"
    }
    """
    reference = request.data.get('reference')
    
    if not reference:
        return Response({"error": "Reference is required"}, status=400)
    
    try:
        # Verify transaction with Paystack
        transaction = paystack_service.verify_transaction(reference)
        
        # Check transaction status
        if transaction.get('status') == 'success':
            # TODO: Update user subscription based on transaction metadata
            return Response({
                'status': 'success',
                'message': 'Payment verified successfully',
                'transaction': {
                    'reference': transaction.get('reference'),
                    'amount': transaction.get('amount'),
                    'currency': transaction.get('currency'),
                    'paid_at': transaction.get('paid_at')
                }
            })
        else:
            return Response({
                'status': transaction.get('status', 'failed'),
                'message': transaction.get('gateway_response', 'Payment verification failed')
            }, status=400)
            
    except PaystackError as e:
        logger.error(f"Error verifying payment {reference}: {str(e)}")
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error verifying payment: {str(e)}")
        return Response({"error": "An unexpected error occurred"}, status=500)