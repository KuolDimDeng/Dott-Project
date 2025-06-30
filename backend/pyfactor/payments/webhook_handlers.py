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
from taxes.models import TaxFiling, FilingStatusHistory
from django.core.mail import send_mail
from django.template.loader import render_to_string

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
        
        # Create status history record
        FilingStatusHistory.objects.create(
            filing=filing,
            previous_status=previous_status,
            new_status='documents_pending',
            changed_by='system',
            notes=f"Payment completed via Stripe session: {session['id']}"
        )
        
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