"""
API views for Wise banking integration.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

from banking.models import WiseItem, BankAccount, PaymentSettlement
from banking.services.wise_service import WiseService, WiseSettlementService
from banking.services.stripe_bank_service import StripeBankService
from users.models import UserProfile

logger = logging.getLogger(__name__)

# List of countries where Plaid is available
PLAID_COUNTRIES = [
    'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 'IT', 'PL', 'DK', 'NO', 'SE', 'EE', 'LT', 'LV', 'PT', 'BE'
]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_banking_method(request):
    """
    Determine which banking method (Plaid or Wise) the user should use based on their country.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        country = user_profile.country_code or 'US'
        
        # Check if country supports Plaid
        use_plaid = country.upper() in PLAID_COUNTRIES
        
        # Check if user already has banking setup
        has_plaid = hasattr(request.user, 'plaiditem_set') and request.user.plaiditem_set.exists()
        has_wise = hasattr(request.user, 'wiseitem_set') and request.user.wiseitem_set.exists()
        
        return Response({
            'success': True,
            'data': {
                'recommended_method': 'plaid' if use_plaid else 'wise',
                'country': country,
                'plaid_available': use_plaid,
                'has_plaid_setup': has_plaid,
                'has_wise_setup': has_wise,
                'wise_countries_message': 'Wise is available for international banking in over 80 countries'
            }
        })
        
    except UserProfile.DoesNotExist:
        return Response({
            'success': False,
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error determining banking method: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_wise_account(request):
    """
    Set up Wise bank account details for the user.
    Stores sensitive data in Stripe, only last 4 digits locally.
    """
    try:
        data = request.data
        required_fields = ['bank_name', 'bank_country', 'account_holder_name', 'currency']
        
        # Validate required fields
        for field in required_fields:
            if field not in data:
                return Response({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # First, store bank details in Stripe
            stripe_service = StripeBankService()
            
            # Prepare bank details for Stripe
            bank_details = {
                'country': data['bank_country'].upper(),
                'currency': data['currency'].upper(),
                'account_holder_name': data['account_holder_name'],
                'bank_name': data['bank_name']
            }
            
            # Add country-specific fields
            country = data['bank_country'].upper()
            if country == 'US':
                bank_details['account_number'] = data.get('account_number', '')
                bank_details['routing_number'] = data.get('routing_number', '')
            elif country == 'GB':
                bank_details['account_number'] = data.get('account_number', '')
                bank_details['sort_code'] = data.get('sort_code', '')
            elif data.get('iban'):
                bank_details['iban'] = data.get('iban', '')
            else:
                bank_details['account_number'] = data.get('account_number', '')
            
            # Create bank account token in Stripe
            token_result = stripe_service.create_bank_account_token(bank_details)
            
            if not token_result['success']:
                return Response({
                    'success': False,
                    'error': f"Failed to secure bank details: {token_result.get('error', 'Unknown error')}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add as external account to Stripe Connect
            external_account_result = stripe_service.add_external_account(token_result['token_id'])
            
            if not external_account_result['success']:
                return Response({
                    'success': False,
                    'error': f"Failed to add bank account: {external_account_result.get('error', 'Unknown error')}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Now save only non-sensitive data locally
            wise_item, created = WiseItem.objects.get_or_create(
                user=request.user,
                defaults={
                    'tenant': request.user.userprofile.tenant,
                    'bank_name': data['bank_name'],
                    'bank_country': country,
                    'account_holder_name': data['account_holder_name'],
                    'currency': data['currency'].upper(),
                    'stripe_external_account_id': external_account_result['external_account_id'],
                    'stripe_bank_account_token': token_result['token_id']
                }
            )
            
            if not created:
                # Update existing account
                # First delete old Stripe external account if exists
                if wise_item.stripe_external_account_id:
                    stripe_service.delete_external_account(wise_item.stripe_external_account_id)
                
                wise_item.bank_name = data['bank_name']
                wise_item.bank_country = country
                wise_item.account_holder_name = data['account_holder_name']
                wise_item.currency = data['currency'].upper()
                wise_item.stripe_external_account_id = external_account_result['external_account_id']
                wise_item.stripe_bank_account_token = token_result['token_id']
            
            # Store only last 4 digits locally for display
            if country == 'US' and data.get('account_number'):
                wise_item.account_number_last4 = data['account_number'][-4:]
                if data.get('routing_number'):
                    wise_item.routing_number_last4 = data['routing_number'][-4:]
            elif data.get('iban'):
                wise_item.iban_last4 = data['iban'][-4:]
            elif data.get('account_number'):
                wise_item.account_number_last4 = data['account_number'][-4:]
            
            # Use Stripe's last4 if available
            if external_account_result.get('last4'):
                wise_item.account_number_last4 = external_account_result['last4']
            
            wise_item.is_verified = True  # Stripe has already verified
            wise_item.verification_date = timezone.now()
            wise_item.save()
            
            # Create Wise recipient (this doesn't store sensitive data at Wise)
            wise_service = WiseService()
            # Note: We'll need to modify WiseService to work with Stripe stored data
            # For now, we'll skip Wise recipient creation until transfer time
            
            # Create or update BankAccount record
            from django.contrib.contenttypes.models import ContentType
            bank_account, _ = BankAccount.objects.update_or_create(
                user=request.user,
                integration_type=ContentType.objects.get_for_model(WiseItem),
                integration_id=wise_item.id,
                defaults={
                    'tenant': request.user.userprofile.tenant,
                    'bank_name': wise_item.bank_name,
                    'account_number': wise_item.account_number or wise_item.iban or 'WISE',
                    'balance': 0,
                    'account_type': 'checking',
                    'purpose': 'payments'
                }
            )
            
            return Response({
                'success': True,
                'message': 'Wise bank account set up successfully',
                'data': {
                    'wise_account_id': str(wise_item.id),
                    'bank_account_id': str(bank_account.id),
                    'is_verified': wise_item.is_verified,
                    'recipient_id': wise_item.wise_recipient_id
                }
            })
            
    except Exception as e:
        logger.error(f"Error setting up Wise account: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wise_account(request):
    """
    Get user's Wise account details.
    """
    try:
        wise_item = WiseItem.objects.filter(user=request.user).first()
        
        if not wise_item:
            return Response({
                'success': True,
                'data': None,
                'message': 'No Wise account found'
            })
        
        return Response({
            'success': True,
            'data': {
                'id': str(wise_item.id),
                'bank_name': wise_item.bank_name,
                'bank_country': wise_item.bank_country,
                'account_holder_name': wise_item.account_holder_name,
                'currency': wise_item.currency,
                'is_verified': wise_item.is_verified,
                'last_transfer_date': wise_item.last_transfer_date,
                'has_recipient_id': bool(wise_item.wise_recipient_id)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting Wise account: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_transfer_quote(request):
    """
    Get a quote for transferring funds via Wise.
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        source_currency = request.data.get('source_currency', 'USD')
        
        # Get user's Wise account
        wise_item = WiseItem.objects.filter(user=request.user, is_verified=True).first()
        
        if not wise_item:
            return Response({
                'success': False,
                'error': 'No verified Wise account found. Please set up your bank details first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get quote from Wise
        wise_service = WiseService()
        quote = wise_service.create_quote(
            source_currency=source_currency,
            target_currency=wise_item.currency,
            amount=amount
        )
        
        # Calculate platform fees
        stripe_fee = (amount * Decimal('0.029')) + Decimal('0.30')
        platform_fee = (amount * Decimal('0.001')) + Decimal('0.30')
        settlement_amount = amount - stripe_fee - platform_fee
        wise_fee = Decimal(str(quote['fee']))
        user_receives = settlement_amount - wise_fee
        
        return Response({
            'success': True,
            'data': {
                'original_amount': str(amount),
                'stripe_fee': str(stripe_fee),
                'platform_fee': str(platform_fee),
                'settlement_amount': str(settlement_amount),
                'wise_fee_estimate': str(wise_fee),
                'user_receives_estimate': str(user_receives),
                'exchange_rate': quote['exchange_rate'],
                'delivery_estimate': quote['delivery_estimate'],
                'quote_expires_at': quote['expires_at']
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting transfer quote: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_settlements(request):
    """
    Get user's payment settlements.
    """
    try:
        settlements = PaymentSettlement.objects.filter(
            user=request.user
        ).order_by('-created_at')[:20]
        
        data = []
        for settlement in settlements:
            data.append({
                'id': str(settlement.id),
                'original_amount': str(settlement.original_amount),
                'platform_fee': str(settlement.platform_fee),
                'wise_fee': str(settlement.wise_fee_actual or settlement.wise_fee_estimate or 0),
                'user_receives': str(settlement.user_receives or 0),
                'status': settlement.status,
                'created_at': settlement.created_at.isoformat(),
                'completed_at': settlement.completed_at.isoformat() if settlement.completed_at else None,
                'pos_transaction_id': settlement.pos_transaction_id
            })
        
        return Response({
            'success': True,
            'data': data
        })
        
    except Exception as e:
        logger.error(f"Error getting settlements: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_manual_settlement(request):
    """
    Manually trigger settlement processing for a payment.
    For testing purposes.
    """
    try:
        settlement_id = request.data.get('settlement_id')
        
        if not settlement_id:
            return Response({
                'success': False,
                'error': 'Settlement ID required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        settlement = PaymentSettlement.objects.get(
            id=settlement_id,
            user=request.user,
            status='pending'
        )
        
        # Process the settlement
        settlement_service = WiseSettlementService()
        success = settlement_service.process_settlement(settlement)
        
        if success:
            return Response({
                'success': True,
                'message': 'Settlement processed successfully',
                'data': {
                    'settlement_id': str(settlement.id),
                    'status': settlement.status,
                    'user_receives': str(settlement.user_receives)
                }
            })
        else:
            return Response({
                'success': False,
                'error': settlement.failure_reason or 'Settlement processing failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except PaymentSettlement.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Settlement not found or not pending'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error processing manual settlement: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)