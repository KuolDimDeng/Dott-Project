"""
Stripe Connect Express onboarding for invoice payments
"""
import stripe
import logging
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import Business, UserProfile

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_stripe_connect_account(request):
    """
    Create a Stripe Connect Express account for the business
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response(
                {'error': 'No business associated with user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if business already has a Stripe account
        if business.stripe_account_id:
            return Response(
                {
                    'message': 'Business already has a Stripe Connect account',
                    'account_id': business.stripe_account_id,
                    'onboarding_complete': business.stripe_onboarding_complete
                },
                status=status.HTTP_200_OK
            )
        
        # Create Stripe Connect Express account
        account = stripe.Account.create(
            type='express',
            country='US',  # Default to US, can be made dynamic later
            email=request.user.email,
            business_profile={
                'name': business.name,
                'mcc': '5734',  # Computer Software Stores - appropriate for SaaS
                'url': f'https://dottapps.com',
            },
            capabilities={
                'card_payments': {'requested': True},
                'transfers': {'requested': True},
            },
        )
        
        # Save account ID to business
        business.stripe_account_id = account.id
        business.save(update_fields=['stripe_account_id'])
        
        logger.info(f"Created Stripe Connect account {account.id} for business {business.id}")
        
        return Response({
            'account_id': account.id,
            'onboarding_complete': False,
            'message': 'Stripe Connect account created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account: {str(e)}")
        return Response(
            {'error': 'Failed to create Stripe account', 'details': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error creating Stripe account: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_onboarding_link(request):
    """
    Create an onboarding link for Stripe Connect Express
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business or not business.stripe_account_id:
            return Response(
                {'error': 'No Stripe Connect account found for business'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=business.stripe_account_id,
            refresh_url=f'{settings.FRONTEND_URL}/dashboard/settings/payments?refresh=true',
            return_url=f'{settings.FRONTEND_URL}/dashboard/settings/payments?setup=complete',
            type='account_onboarding',
        )
        
        return Response({
            'onboarding_url': account_link.url,
            'expires_at': account_link.expires_at
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating onboarding link: {str(e)}")
        return Response(
            {'error': 'Failed to create onboarding link', 'details': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error creating onboarding link: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_account_status(request):
    """
    Get the current status of the Stripe Connect account
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response(
                {'error': 'No business associated with user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not business.stripe_account_id:
            return Response({
                'has_account': False,
                'onboarding_complete': False,
                'charges_enabled': False,
                'payouts_enabled': False
            }, status=status.HTTP_200_OK)
        
        # Fetch account details from Stripe
        account = stripe.Account.retrieve(business.stripe_account_id)
        
        # Update business model with latest status
        business.stripe_onboarding_complete = account.details_submitted
        business.stripe_charges_enabled = account.charges_enabled
        business.stripe_payouts_enabled = account.payouts_enabled
        business.save(update_fields=[
            'stripe_onboarding_complete', 
            'stripe_charges_enabled', 
            'stripe_payouts_enabled'
        ])
        
        return Response({
            'has_account': True,
            'account_id': business.stripe_account_id,
            'onboarding_complete': account.details_submitted,
            'charges_enabled': account.charges_enabled,
            'payouts_enabled': account.payouts_enabled,
            'requirements': {
                'currently_due': account.requirements.currently_due,
                'eventually_due': account.requirements.eventually_due,
                'past_due': account.requirements.past_due,
                'pending_verification': account.requirements.pending_verification
            }
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving account: {str(e)}")
        return Response(
            {'error': 'Failed to retrieve account status', 'details': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving account status: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_onboarding_link(request):
    """
    Create a refresh link for incomplete onboarding
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business or not business.stripe_account_id:
            return Response(
                {'error': 'No Stripe Connect account found for business'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create refresh link
        account_link = stripe.AccountLink.create(
            account=business.stripe_account_id,
            refresh_url=f'{settings.FRONTEND_URL}/dashboard/settings/payments?refresh=true',
            return_url=f'{settings.FRONTEND_URL}/dashboard/settings/payments?setup=complete',
            type='account_onboarding',
        )
        
        return Response({
            'onboarding_url': account_link.url,
            'expires_at': account_link.expires_at
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating refresh link: {str(e)}")
        return Response(
            {'error': 'Failed to create refresh link', 'details': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error creating refresh link: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )