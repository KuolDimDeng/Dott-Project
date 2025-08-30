"""
POS Payment Views for Stripe Integration
Handles credit card payments through Stripe for POS transactions
"""

import logging
import stripe
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from banking.models import PaymentSettlement
from users.models import Business
from sales.models import POSTransaction
from taxes.services.tax_posting_service import TaxPostingService

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Log Stripe configuration status (without exposing the key)
if stripe.api_key:
    key_prefix = stripe.api_key[:7] if len(stripe.api_key) > 7 else 'SHORT'
    logger.info(f"[POS Payment] Stripe configured with key starting: {key_prefix}...")
else:
    logger.error("[POS Payment] WARNING: Stripe API key not configured!")

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_pos_payment_intent(request):
    """
    Create a Stripe payment intent for POS credit card payment
    This handles the Stripe → Platform → Wise flow
    """
    try:
        logger.info(f"[POS Payment] Creating payment intent for user: {request.user.email}")
        
        # Get request data
        amount = request.data.get('amount')  # Amount in cents
        currency = request.data.get('currency', 'usd')
        platform_fee = request.data.get('platform_fee', 0)
        sale_data = request.data.get('sale_data', {})
        customer_name = request.data.get('customer_name', 'Walk-In Customer')
        description = request.data.get('description', 'POS Sale')
        metadata = request.data.get('metadata', {})
        
        if not amount:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's business for Stripe account
        business = Business.objects.filter(
            owner_id=request.user.id
        ).first()
        
        if not business:
            business = Business.objects.filter(
                tenant_id=request.user.tenant_id
            ).first()
        
        # Calculate amounts
        amount_cents = int(amount)
        stripe_fee_cents = int(amount_cents * 0.029 + 30)  # 2.9% + $0.30
        platform_fee_cents = int(platform_fee)
        
        # Amount merchant will receive after all fees
        merchant_receives_cents = amount_cents - stripe_fee_cents - platform_fee_cents
        
        logger.info(f"[POS Payment] Amount breakdown:")
        logger.info(f"  - Total: ${amount_cents/100:.2f}")
        logger.info(f"  - Stripe fee: ${stripe_fee_cents/100:.2f}")
        logger.info(f"  - Platform fee: ${platform_fee_cents/100:.2f}")
        logger.info(f"  - Merchant receives: ${merchant_receives_cents/100:.2f}")
        
        # Create Stripe payment intent
        try:
            # Clean metadata to ensure all values are strings (Stripe requirement)
            stripe_metadata = {
                'source': 'pos',  # Important: Mark as POS transaction for webhook
                'user_id': str(request.user.id),
                'business_id': str(business.id) if business else '',
                'tenant_id': str(request.user.tenant_id),
                'customer_name': customer_name,
                'platform_fee': str(platform_fee_cents),
                'merchant_receives': str(merchant_receives_cents),
                'pos_transaction_id': sale_data.get('transaction_id', ''),  # Include POS transaction ID
            }
            
            # Add any additional metadata, ensuring all values are strings
            if metadata:
                for key, value in metadata.items():
                    # Skip complex objects, only add string values
                    if isinstance(value, (str, int, float, bool)):
                        stripe_metadata[key] = str(value)
                    else:
                        logger.warning(f"[POS Payment] Skipping non-string metadata key: {key}")
            
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                description=description,
                metadata=stripe_metadata,
                # Enable automatic payment methods
                automatic_payment_methods={
                    'enabled': True,
                },
                # Capture immediately (not just authorize)
                capture_method='automatic',
            )
            
            logger.info(f"[POS Payment] Payment intent created: {payment_intent.id}")
            
            # Create settlement record for tracking
            # This will be processed by the daily settlement cron job
            try:
                settlement = PaymentSettlement.objects.create(
                    user=request.user,
                    stripe_payment_intent_id=payment_intent.id,  # Fixed field name
                    original_amount=Decimal(amount_cents) / 100,
                    stripe_fee=Decimal(stripe_fee_cents) / 100,
                    platform_fee=Decimal(platform_fee_cents) / 100,
                    settlement_amount=Decimal(merchant_receives_cents) / 100,
                    currency=currency.upper(),
                    status='pending'
                    # Note: metadata and stripe_payment_method fields don't exist in model
                )
                
                logger.info(f"[POS Payment] Settlement record created successfully:")
                logger.info(f"  - ID: {settlement.id}")
                logger.info(f"  - User: {settlement.user_id}")
                logger.info(f"  - Amount: ${settlement.settlement_amount}")
                logger.info(f"  - Status: {settlement.status}")
                logger.info(f"  - Tenant: {settlement.tenant_id if hasattr(settlement, 'tenant_id') else 'N/A'}")
                
            except Exception as e:
                logger.error(f"[POS Payment] Failed to create settlement: {str(e)}")
                # Don't fail the payment, just log the error
                settlement = None
            
            return Response({
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'settlement_id': str(settlement.id) if settlement else None,
                'amount': amount_cents,
                'platform_fee': platform_fee_cents,
                'merchant_receives': merchant_receives_cents
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"[POS Payment] Stripe error: {str(e)}")
            return Response(
                {"error": f"Stripe error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[POS Payment] Error creating payment intent: {str(e)}")
        logger.error(f"[POS Payment] Full traceback:\n{error_details}")
        
        # Return more detailed error in staging/development
        if settings.DEBUG or settings.CURRENT_ENVIRONMENT == 'staging':
            return Response(
                {
                    "error": "Failed to create payment intent",
                    "details": str(e),
                    "type": type(e).__name__
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        else:
            return Response(
                {"error": "Failed to create payment intent"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_apple_pay_merchant(request):
    """
    Validate merchant session for Apple Pay
    Required for Apple Pay to work in POS
    """
    try:
        validation_url = request.data.get('validationURL')
        domain_name = request.data.get('domainName', 'app.dottapps.com')
        
        if not validation_url:
            return Response(
                {"error": "Validation URL is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"[Apple Pay] Validating merchant session for domain: {domain_name}")
        
        # For Stripe, we use their Apple Pay domain association
        # This is a simplified implementation - in production you'd need proper certificates
        return Response({
            'success': True,
            'merchantSession': {
                'merchantIdentifier': 'merchant.com.dott.pos',
                'merchantSessionIdentifier': f'merchant-session-{timezone.now().timestamp()}',
                'nonce': f'nonce-{timezone.now().timestamp()}',
                'epochTimestamp': int(timezone.now().timestamp() * 1000),
                'expiresAt': int((timezone.now().timestamp() + 300) * 1000),  # 5 minutes
                'domainName': domain_name,
                'displayName': 'Dott POS',
                'signature': 'mock-signature'  # In production, this would be properly signed
            }
        })
        
    except Exception as e:
        logger.error(f"[Apple Pay] Error validating merchant: {str(e)}")
        return Response(
            {"error": "Failed to validate merchant session"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_pos_payment(request):
    """
    Confirm that a payment was successful and update records
    Called after Stripe confirms the payment on frontend
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        transaction_id = request.data.get('transaction_id')
        
        if not payment_intent_id:
            return Response(
                {"error": "Payment intent ID required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify payment with Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != 'succeeded':
            return Response(
                {"error": f"Payment not successful. Status: {payment_intent.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update settlement record
        try:
            settlement = PaymentSettlement.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )
            # Update with correct field names from model
            settlement.status = 'processing'  # Mark as processing (will be completed after Wise transfer)
            settlement.pos_transaction_id = transaction_id if transaction_id else ''
            settlement.processed_at = timezone.now()
            settlement.save()
            
            logger.info(f"[POS Payment] Payment confirmed for settlement: {settlement.id}")
            
            # Post tax entries if POS transaction has tax
            if transaction_id:
                try:
                    pos_transaction = POSTransaction.objects.get(
                        id=transaction_id,
                        tenant_id=request.user.tenant_id
                    )
                    
                    # Only post tax if there's tax to post
                    if pos_transaction.tax_total and pos_transaction.tax_total > 0:
                        tax_service = TaxPostingService()
                        journal_entry = tax_service.post_pos_sale_tax(pos_transaction)
                        
                        if journal_entry:
                            logger.info(f"[POS Payment] Tax posted to journal entry: {journal_entry.id}")
                        else:
                            logger.warning(f"[POS Payment] Tax posting failed for transaction: {transaction_id}")
                    else:
                        logger.info(f"[POS Payment] No tax to post for transaction: {transaction_id}")
                        
                except POSTransaction.DoesNotExist:
                    logger.warning(f"[POS Payment] POS transaction not found: {transaction_id}")
                except Exception as e:
                    logger.error(f"[POS Payment] Error posting tax: {str(e)}")
                    # Don't fail the payment confirmation if tax posting fails
                    # Tax can be posted later via management command
            
        except PaymentSettlement.DoesNotExist:
            logger.warning(f"[POS Payment] Settlement not found for intent: {payment_intent_id}")
        
        return Response({
            'success': True,
            'payment_intent_id': payment_intent_id,
            'amount_paid': payment_intent.amount / 100,
            'status': payment_intent.status
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"[POS Payment] Stripe error: {str(e)}")
        return Response(
            {"error": f"Stripe error: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"[POS Payment] Error confirming payment: {str(e)}")
        return Response(
            {"error": "Failed to confirm payment"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )