# payments/webhook_handlers.py
"""
Stripe webhook handlers for tax filing payments

Webhook URL: /api/payments/webhooks/stripe/tax-filing/
Configure this URL in Stripe Dashboard with events:
- checkout.session.completed
- checkout.session.expired  
- payment_intent.payment_failed
"""
import stripe
import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from taxes.models import TaxFiling
from django.core.mail import send_mail
from django.template.loader import render_to_string
from decimal import Decimal
from banking.models import PaymentSettlement, WiseItem
from custom_auth.models import User

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook_handler(request):
    """
    Handle Stripe webhook events for tax filing payments
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = None
    
    # Log the webhook event for audit purposes
    logger.info(f"Received Stripe webhook: {request.META.get('HTTP_STRIPE_SIGNATURE', 'No signature')}")
    
    try:
        # Verify webhook signature for security
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe webhook payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe webhook signature: {str(e)}")
        return HttpResponse(status=400)
    
    # Log the event type and ID
    logger.info(f"Processing Stripe event: {event['type']} - ID: {event['id']}")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        # Payment was successful
        session = event['data']['object']
        handle_successful_payment(session)
    
    elif event['type'] == 'checkout.session.expired':
        # Payment session expired
        session = event['data']['object']
        handle_expired_payment(session)
    
    elif event['type'] == 'payment_intent.payment_failed':
        # Payment failed
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    
    elif event['type'] == 'payment_intent.succeeded':
        # Payment succeeded - create settlement for Wise transfer
        payment_intent = event['data']['object']
        handle_payment_intent_for_settlement(payment_intent)
    
    elif event['type'] == 'charge.succeeded':
        # Charge succeeded - alternative for older integrations
        charge = event['data']['object']
        handle_charge_for_settlement(charge)
    
    else:
        # Unexpected event type
        logger.info(f"Unhandled Stripe event type: {event['type']}")
    
    return HttpResponse(status=200)


def handle_successful_payment(session):
    """
    Handle successful payment for tax filing
    """
    try:
        # Extract metadata from session
        metadata = session.get('metadata', {})
        filing_id = metadata.get('filing_id')
        
        if not filing_id:
            logger.error(f"No filing_id in checkout session metadata: {session['id']}")
            return
        
        # Get the tax filing
        try:
            filing = TaxFiling.objects.get(filing_id=filing_id)
        except TaxFiling.DoesNotExist:
            logger.error(f"TaxFiling not found for ID: {filing_id}")
            return
        
        # Check for idempotency - don't process if already completed
        if filing.payment_status == 'completed':
            logger.info(f"Payment already processed for filing: {filing_id}")
            return
        
        # Update filing status
        previous_status = filing.status
        filing.payment_status = 'completed'
        filing.payment_completed_at = timezone.now()
        filing.payment_session_id = session['id']
        filing.status = 'documents_pending'
        filing.save()
        
        # Log status change
        logger.info(f"Filing status changed from {previous_status} to documents_pending for filing {filing_id}")
        
        # Send confirmation email (placeholder)
        send_payment_confirmation_email(filing, session)
        
        # Log successful processing
        logger.info(f"Successfully processed payment for filing: {filing_id}")
        
    except Exception as e:
        logger.error(f"Error processing successful payment: {str(e)}", exc_info=True)


def handle_expired_payment(session):
    """
    Handle expired payment session
    """
    try:
        metadata = session.get('metadata', {})
        filing_id = metadata.get('filing_id')
        
        if not filing_id:
            return
        
        try:
            filing = TaxFiling.objects.get(filing_id=filing_id)
            
            # Only update if still in payment_pending status
            if filing.status == 'payment_pending':
                # Add note about expired session
                filing.notes += f"\nPayment session expired at {timezone.now()}: {session['id']}"
                filing.save()
                
                logger.info(f"Payment session expired for filing: {filing_id}")
        except TaxFiling.DoesNotExist:
            pass
            
    except Exception as e:
        logger.error(f"Error handling expired payment: {str(e)}", exc_info=True)


def handle_failed_payment(payment_intent):
    """
    Handle failed payment
    """
    try:
        metadata = payment_intent.get('metadata', {})
        filing_id = metadata.get('filing_id')
        
        if not filing_id:
            return
        
        try:
            filing = TaxFiling.objects.get(filing_id=filing_id)
            
            # Add note about failed payment
            filing.notes += f"\nPayment failed at {timezone.now()}: {payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')}"
            filing.save()
            
            # Send failure notification email (placeholder)
            send_payment_failure_email(filing, payment_intent)
            
            logger.info(f"Payment failed for filing: {filing_id}")
        except TaxFiling.DoesNotExist:
            pass
            
    except Exception as e:
        logger.error(f"Error handling failed payment: {str(e)}", exc_info=True)


def send_payment_confirmation_email(filing, session):
    """
    Send payment confirmation email to user
    """
    try:
        # Placeholder for email sending
        # In production, this would use proper email templates
        subject = f"Payment Confirmed - {filing.get_tax_type_display()} Filing"
        message = f"""
        Your payment has been confirmed for your {filing.get_tax_type_display()} filing.
        
        Filing Period: {filing.filing_period}
        Amount Paid: ${filing.price}
        Payment ID: {session['id']}
        
        Next Steps:
        - Upload required documents
        - Our team will begin preparation once documents are received
        
        Thank you for using Dott Tax Services!
        """
        
        # send_mail(
        #     subject,
        #     message,
        #     settings.DEFAULT_FROM_EMAIL,
        #     [filing.user_email],
        #     fail_silently=False,
        # )
        
        logger.info(f"Payment confirmation email queued for: {filing.user_email}")
        
    except Exception as e:
        logger.error(f"Error sending payment confirmation email: {str(e)}", exc_info=True)


def send_payment_failure_email(filing, payment_intent):
    """
    Send payment failure notification email
    """
    try:
        # Placeholder for email sending
        error_message = payment_intent.get('last_payment_error', {}).get('message', 'Payment processing error')
        
        subject = f"Payment Failed - {filing.get_tax_type_display()} Filing"
        message = f"""
        Unfortunately, your payment for {filing.get_tax_type_display()} filing was not successful.
        
        Error: {error_message}
        
        Please try again or contact support if you continue to experience issues.
        
        Filing Period: {filing.filing_period}
        Amount: ${filing.price}
        
        Your filing is still saved and you can complete payment at any time.
        """
        
        # send_mail(
        #     subject,
        #     message,
        #     settings.DEFAULT_FROM_EMAIL,
        #     [filing.user_email],
        #     fail_silently=False,
        # )
        
        logger.info(f"Payment failure email queued for: {filing.user_email}")
        
    except Exception as e:
        logger.error(f"Error sending payment failure email: {str(e)}", exc_info=True)


def handle_payment_intent_for_settlement(payment_intent):
    """
    Handle successful payment intent from Stripe for Wise settlements.
    Creates a PaymentSettlement for processing.
    """
    try:
        # Extract metadata to identify the user
        metadata = payment_intent.get('metadata', {})
        user_id = metadata.get('user_id')
        pos_transaction_id = metadata.get('pos_transaction_id')
        
        if not user_id:
            logger.info(f"No user_id in payment intent metadata: {payment_intent['id']} - skipping settlement")
            return
        
        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User not found: {user_id}")
            return
        
        # Check if user has Wise account set up (don't require verified for now)
        wise_item = WiseItem.objects.filter(user=user).first()
        if not wise_item:
            logger.info(f"User {user_id} doesn't have Wise account set up. Creating settlement anyway for future processing.")
            # Still create the settlement so it can be processed once bank account is added
        
        # Check if settlement already exists
        if PaymentSettlement.objects.filter(stripe_payment_intent_id=payment_intent['id']).exists():
            logger.info(f"Settlement already exists for payment intent: {payment_intent['id']}")
            return
        
        # Create settlement record
        amount = Decimal(str(payment_intent['amount'] / 100))  # Convert from cents
        currency = payment_intent['currency'].upper()
        
        # Get user's tenant
        from users.models import UserProfile
        try:
            user_profile = UserProfile.objects.get(user=user)
            tenant = user_profile.tenant
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for user: {user_id}")
            return
        
        settlement = PaymentSettlement.objects.create(
            user=user,
            tenant=tenant,
            stripe_payment_intent_id=payment_intent['id'],
            original_amount=amount,
            currency=currency,
            pos_transaction_id=pos_transaction_id or '',
            customer_email=payment_intent.get('receipt_email', ''),
            notes=f"Auto-created from Stripe payment {payment_intent['id']}"
        )
        
        # Calculate fees
        settlement.calculate_fees()
        
        logger.info(f"Created settlement {settlement.id} for payment {payment_intent['id']}")
        
        # Process immediately if amount is above threshold
        if settlement.settlement_amount >= 10:  # $10 minimum for immediate processing
            process_settlement_async(str(settlement.id))
        
    except Exception as e:
        logger.error(f"Error handling payment intent for settlement: {str(e)}", exc_info=True)


def handle_charge_for_settlement(charge):
    """
    Handle successful charge from Stripe for Wise settlements.
    Alternative to payment_intent for older integrations.
    """
    try:
        # If there's an associated payment intent, skip (handled by payment_intent webhook)
        if charge.get('payment_intent'):
            return
        
        metadata = charge.get('metadata', {})
        user_id = metadata.get('user_id')
        
        if not user_id:
            logger.info(f"No user_id in charge metadata: {charge['id']} - skipping settlement")
            return
        
        # Similar processing as payment_intent
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User not found: {user_id}")
            return
        
        # Check if user has Wise account (don't require verified for now)
        wise_item = WiseItem.objects.filter(user=user).first()
        if not wise_item:
            logger.info(f"User {user_id} doesn't have Wise account set up. Creating settlement anyway for future processing.")
            # Still create the settlement so it can be processed once bank account is added
        
        # Check if settlement exists (use charge ID as unique identifier)
        if PaymentSettlement.objects.filter(stripe_payment_intent_id=charge['id']).exists():
            return
        
        amount = Decimal(str(charge['amount'] / 100))
        currency = charge['currency'].upper()
        
        # Get user's tenant
        from users.models import UserProfile
        try:
            user_profile = UserProfile.objects.get(user=user)
            tenant = user_profile.tenant
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for user: {user_id}")
            return
        
        settlement = PaymentSettlement.objects.create(
            user=user,
            tenant=tenant,
            stripe_payment_intent_id=charge['id'],  # Using charge ID
            original_amount=amount,
            currency=currency,
            customer_email=charge.get('receipt_email', ''),
            notes=f"Auto-created from Stripe charge {charge['id']}"
        )
        
        settlement.calculate_fees()
        
        logger.info(f"Created settlement {settlement.id} for charge {charge['id']}")
        
    except Exception as e:
        logger.error(f"Error handling charge for settlement: {str(e)}", exc_info=True)


def process_settlement_async(settlement_id):
    """
    Process settlement asynchronously.
    In production, this should be queued to Celery.
    """
    try:
        from threading import Thread
        
        def process():
            try:
                from banking.services.wise_service import WiseSettlementService
                settlement = PaymentSettlement.objects.get(id=settlement_id)
                service = WiseSettlementService()
                service.process_settlement(settlement)
            except Exception as e:
                logger.error(f"Error processing settlement {settlement_id}: {str(e)}")
        
        # Start in background thread (use Celery in production)
        thread = Thread(target=process)
        thread.daemon = True
        thread.start()
        
    except Exception as e:
        logger.error(f"Error starting settlement processing: {str(e)}")


@csrf_exempt
@require_http_methods(["POST"])
def stripe_pos_settlement_webhook(request):
    """
    Dedicated webhook handler for POS payment settlements.
    This handles payments from POS sales that need to be settled to users via Wise.
    
    Webhook URL: /api/payments/webhooks/stripe/pos-settlements/
    Configure in Stripe Dashboard with events:
    - payment_intent.succeeded
    - charge.succeeded
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = None
    
    logger.info(f"Received POS settlement webhook")
    
    # Use POS-specific webhook secret if available, otherwise fall back to default
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET_POS', settings.STRIPE_WEBHOOK_SECRET)
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        logger.error(f"Invalid POS webhook payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid POS webhook signature: {str(e)}")
        return HttpResponse(status=400)
    
    # Log the event
    logger.info(f"Processing POS settlement event: {event['type']} - ID: {event['id']}")
    
    # Handle POS payment events
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        
        # Check if this is a POS payment (has specific metadata)
        metadata = payment_intent.get('metadata', {})
        if metadata.get('source') == 'pos' or metadata.get('pos_transaction_id'):
            handle_payment_intent_for_settlement(payment_intent)
        else:
            logger.info(f"Payment intent {payment_intent['id']} is not a POS transaction, skipping")
    
    elif event['type'] == 'charge.succeeded':
        charge = event['data']['object']
        
        # Check if this is a POS charge
        metadata = charge.get('metadata', {})
        if metadata.get('source') == 'pos' or metadata.get('pos_transaction_id'):
            handle_charge_for_settlement(charge)
        else:
            logger.info(f"Charge {charge['id']} is not a POS transaction, skipping")
    
    else:
        logger.info(f"Unhandled POS webhook event type: {event['type']}")
    
    return HttpResponse(status=200)