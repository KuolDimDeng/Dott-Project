"""
Wise Banking Integration Views
Handles bank account setup and settlement processing for non-Plaid countries
"""

import logging
import json
import stripe
from decimal import Decimal
from django.conf import settings
from django.db import transaction, models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from banking.models import WiseItem, PaymentSettlement, BankAccount
from django.utils import timezone

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_banking_method(request):
    """
    Determine which banking method is available for the user's country.
    """
    try:
        user = request.user
        user_country = getattr(user, 'country', 'US')
        
        # Countries where Plaid is available
        PLAID_COUNTRIES = [
            'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 
            'IT', 'PL', 'DK', 'NO', 'SE', 'EE', 'LT', 'LV', 'PT', 'BE'
        ]
        
        plaid_available = user_country in PLAID_COUNTRIES
        
        return Response({
            'success': True,
            'data': {
                'plaid_available': plaid_available,
                'wise_available': not plaid_available,
                'country': user_country,
                'recommended_method': 'plaid' if plaid_available else 'wise'
            }
        })
    except Exception as e:
        logger.error(f"[Banking Method] Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to determine banking method'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_wise_account(request):
    """
    Set up a Wise bank account for the user.
    Stores sensitive data in Stripe, only last 4 digits locally.
    """
    try:
        user = request.user
        data = request.data
        
        logger.info(f"[Wise Setup] User {user.email} setting up bank account")
        
        # Validate required fields
        required_fields = ['bank_name', 'bank_country', 'account_holder_name', 'currency']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'success': False,
                    'error': f'{field} is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the user's Stripe Express account
        express_account_id = settings.STRIPE_EXPRESS_ACCOUNT_ID
        
        # Prepare bank account data for Stripe
        bank_data = {
            'account_holder_name': data['account_holder_name'],
            'account_holder_type': 'individual',  # or 'company'
            'currency': data['currency'].lower(),
            'country': data['bank_country'].upper(),
        }
        
        # Add country-specific fields
        country = data['bank_country'].upper()
        if country == 'US':
            bank_data['routing_number'] = data.get('routing_number', '')
            bank_data['account_number'] = data.get('account_number', '')
        elif country == 'GB':
            bank_data['routing_number'] = data.get('sort_code', '').replace('-', '')
            bank_data['account_number'] = data.get('account_number', '')
        elif country == 'IN':
            # For India, IFSC code acts as routing number
            bank_data['routing_number'] = data.get('ifsc_code', '')
            bank_data['account_number'] = data.get('account_number', '')
        elif data.get('iban'):
            # For IBAN countries
            bank_data['iban'] = data.get('iban', '').replace(' ', '')
        else:
            # Fallback for other countries
            bank_data['account_number'] = data.get('account_number', '')
            if data.get('swift_code'):
                bank_data['routing_number'] = data.get('swift_code', '')
        
        # Create bank account token in Stripe
        try:
            # Create a bank account token
            token = stripe.Token.create(
                bank_account=bank_data,
                stripe_account=express_account_id
            )
            
            # Attach the bank account to the Express account as an external account
            external_account = stripe.Account.create_external_account(
                express_account_id,
                external_account=token.id
            )
            
            logger.info(f"[Wise Setup] Created Stripe external account: {external_account.id}")
            
        except stripe.error.StripeError as e:
            logger.error(f"[Wise Setup] Stripe error: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to set up bank account: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract last 4 digits for local storage
        account_last4 = ''
        routing_last4 = ''
        iban_last4 = ''
        
        if data.get('account_number'):
            account_last4 = data['account_number'][-4:] if len(data['account_number']) >= 4 else data['account_number']
        if data.get('routing_number'):
            routing_last4 = data['routing_number'][-4:] if len(data['routing_number']) >= 4 else data['routing_number']
        if data.get('iban'):
            clean_iban = data['iban'].replace(' ', '')
            iban_last4 = clean_iban[-4:] if len(clean_iban) >= 4 else clean_iban
        
        # Create or update WiseItem
        with transaction.atomic():
            wise_item, created = WiseItem.objects.update_or_create(
                user=user,
                defaults={
                    'bank_name': data['bank_name'],
                    'bank_country': data['bank_country'].upper(),
                    'account_holder_name': data['account_holder_name'],
                    'currency': data['currency'].upper(),
                    'account_number_last4': account_last4,
                    'routing_number_last4': routing_last4,
                    'iban_last4': iban_last4,
                    'stripe_external_account_id': external_account.id,
                    'stripe_bank_account_token': token.id,
                    'is_verified': False,
                    'tenant': user.tenant
                }
            )
            
            # Also create a BankAccount record for compatibility
            from django.contrib.contenttypes.models import ContentType
            bank_account, _ = BankAccount.objects.update_or_create(
                user=user,
                bank_name=data['bank_name'],
                defaults={
                    'account_number': f"****{account_last4}",
                    'balance': Decimal('0.00'),
                    'account_type': 'checking',
                    'purpose': 'payments',
                    'integration_type': ContentType.objects.get_for_model(WiseItem),
                    'integration_id': wise_item.id,
                    'tenant': user.tenant
                }
            )
        
        logger.info(f"[Wise Setup] Successfully created Wise account for user {user.email}")
        
        return Response({
            'success': True,
            'message': 'Bank account set up successfully',
            'data': {
                'id': str(wise_item.id),
                'bank_name': wise_item.bank_name,
                'bank_country': wise_item.bank_country,
                'account_holder_name': wise_item.account_holder_name,
                'currency': wise_item.currency,
                'account_number_last4': wise_item.account_number_last4,
                'iban_last4': wise_item.iban_last4,
                'is_verified': wise_item.is_verified
            }
        })
        
    except Exception as e:
        logger.error(f"[Wise Setup] Unexpected error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to set up bank account'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wise_account(request):
    """
    Get the user's Wise bank account details.
    """
    try:
        user = request.user
        wise_item = WiseItem.objects.filter(user=user).first()
        
        if not wise_item:
            return Response({
                'success': True,
                'data': None
            })
        
        return Response({
            'success': True,
            'data': {
                'id': str(wise_item.id),
                'bank_name': wise_item.bank_name,
                'bank_country': wise_item.bank_country,
                'account_holder_name': wise_item.account_holder_name,
                'currency': wise_item.currency,
                'account_number_last4': wise_item.account_number_last4,
                'routing_number_last4': wise_item.routing_number_last4,
                'iban_last4': wise_item.iban_last4,
                'is_verified': wise_item.is_verified,
                'verification_date': wise_item.verification_date,
                'last_transfer_date': wise_item.last_transfer_date
            }
        })
        
    except Exception as e:
        logger.error(f"[Get Wise Account] Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to fetch bank account'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_settlements(request):
    """
    Get the user's payment settlements.
    """
    try:
        user = request.user
        
        # Get query parameters
        status_filter = request.query_params.get('status', None)
        limit = int(request.query_params.get('limit', 20))
        
        # Build query
        settlements_query = PaymentSettlement.objects.filter(user=user)
        
        if status_filter:
            settlements_query = settlements_query.filter(status=status_filter)
        
        settlements = settlements_query.order_by('-created_at')[:limit]
        
        # Serialize settlements
        settlements_data = []
        for settlement in settlements:
            settlements_data.append({
                'id': str(settlement.id),
                'created_at': settlement.created_at.isoformat(),
                'original_amount': float(settlement.original_amount),
                'currency': settlement.currency,
                'stripe_fee': float(settlement.stripe_fee),
                'platform_fee': float(settlement.platform_fee),
                'wise_fee': float(settlement.wise_fee_estimate or 0),
                'settlement_amount': float(settlement.settlement_amount),
                'user_receives': float(settlement.user_receives or settlement.settlement_amount),
                'status': settlement.status,
                'pos_transaction_id': settlement.pos_transaction_id,
                'customer_email': settlement.customer_email,
                'processed_at': settlement.processed_at.isoformat() if settlement.processed_at else None,
                'completed_at': settlement.completed_at.isoformat() if settlement.completed_at else None,
                'failure_reason': settlement.failure_reason
            })
        
        # Calculate summary stats
        from django.db.models import Sum, Q
        stats = PaymentSettlement.objects.filter(user=user).aggregate(
            total_pending=Sum('settlement_amount', filter=Q(status='pending')),
            total_processing=Sum('settlement_amount', filter=Q(status='processing')),
            total_completed=Sum('user_receives', filter=Q(status='completed')),
        )
        
        return Response({
            'success': True,
            'data': settlements_data,
            'stats': {
                'total_pending': float(stats['total_pending'] or 0),
                'total_processing': float(stats['total_processing'] or 0),
                'total_completed': float(stats['total_completed'] or 0),
            }
        })
        
    except Exception as e:
        logger.error(f"[Get Settlements] Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to fetch settlements'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_manual_settlement(request):
    """
    Manually trigger settlement processing for testing.
    In production, this is handled by the cron job.
    """
    try:
        user = request.user
        settlement_id = request.data.get('settlement_id')
        
        if not settlement_id:
            return Response({
                'success': False,
                'error': 'settlement_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the settlement
        settlement = PaymentSettlement.objects.get(
            id=settlement_id,
            user=user,
            status='pending'
        )
        
        # Check if user has a Wise account
        wise_item = WiseItem.objects.filter(user=user).first()
        if not wise_item:
            return Response({
                'success': False,
                'error': 'No bank account found. Please set up your bank account first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, just mark as processing (actual Wise transfer would happen here)
        settlement.status = 'processing'
        settlement.processed_at = timezone.now()
        settlement.save()
        
        logger.info(f"[Manual Settlement] Processed settlement {settlement_id} for user {user.email}")
        
        return Response({
            'success': True,
            'message': 'Settlement is being processed',
            'data': {
                'settlement_id': str(settlement.id),
                'status': settlement.status,
                'amount': float(settlement.settlement_amount)
            }
        })
        
    except PaymentSettlement.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Settlement not found or not eligible for processing'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"[Manual Settlement] Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to process settlement'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transfer_quote(request):
    """
    Get a quote for how much the user will receive after all fees.
    """
    try:
        amount = Decimal(request.query_params.get('amount', '100'))
        currency = request.query_params.get('currency', 'USD')
        
        # Calculate fees
        stripe_fee = (amount * Decimal('0.029')) + Decimal('0.30')
        platform_fee = (amount * Decimal('0.001')) + Decimal('0.30')
        wise_fee_estimate = Decimal('1.20')  # Approximate Wise fee
        
        settlement_amount = amount - stripe_fee - platform_fee
        user_receives = settlement_amount - wise_fee_estimate
        
        return Response({
            'success': True,
            'data': {
                'original_amount': float(amount),
                'currency': currency,
                'stripe_fee': float(stripe_fee),
                'platform_fee': float(platform_fee),
                'wise_fee_estimate': float(wise_fee_estimate),
                'settlement_amount': float(settlement_amount),
                'user_receives': float(user_receives),
                'total_fees': float(stripe_fee + platform_fee + wise_fee_estimate),
                'fee_percentage': float(((stripe_fee + platform_fee + wise_fee_estimate) / amount) * 100)
            }
        })
        
    except Exception as e:
        logger.error(f"[Transfer Quote] Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to calculate quote'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)