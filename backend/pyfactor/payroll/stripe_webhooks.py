"""
Stripe Webhook Handlers for Payroll Events
"""
import stripe
import logging
import json
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from decimal import Decimal

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_payroll_webhook(request):
    """
    Handle Stripe webhook events for payroll
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = None
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_PAYROLL_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        return HttpResponse(status=400)
    
    # Handle the event
    try:
        handler_map = {
            'payment_intent.succeeded': handle_payment_intent_succeeded,
            'payment_intent.payment_failed': handle_payment_intent_failed,
            'transfer.created': handle_transfer_created,
            'transfer.updated': handle_transfer_updated,
            'transfer.failed': handle_transfer_failed,
            'payout.created': handle_payout_created,
            'payout.updated': handle_payout_updated,
            'payout.failed': handle_payout_failed,
            'payout.paid': handle_payout_paid,
            'account.updated': handle_account_updated,
            'charge.succeeded': handle_charge_succeeded,
            'charge.failed': handle_charge_failed,
        }
        
        handler = handler_map.get(event['type'])
        if handler:
            handler(event)
        else:
            logger.info(f"Unhandled event type: {event['type']}")
        
        return HttpResponse(status=200)
        
    except Exception as e:
        logger.error(f"Webhook handler error: {str(e)}")
        return HttpResponse(status=500)


def handle_payment_intent_succeeded(event):
    """
    Handle successful ACH debit from employer
    """
    payment_intent = event['data']['object']
    
    # Check if this is payroll funding
    if payment_intent.get('metadata', {}).get('type') != 'payroll_funding':
        return
    
    business_id = payment_intent['metadata'].get('business_id')
    amount = Decimal(payment_intent['amount']) / 100
    
    logger.info(f"Payroll funding successful for business {business_id}: ${amount}")
    
    # Update payroll run status
    from .models import PayrollRun
    try:
        payroll_runs = PayrollRun.objects.filter(
            business_id=business_id,
            status='approved',
            total_amount=amount
        ).order_by('-created_at')
        
        if payroll_runs.exists():
            payroll_run = payroll_runs.first()
            payroll_run.status = 'funded'
            payroll_run.funded_at = timezone.now()
            payroll_run.stripe_payment_intent_id = payment_intent['id']
            payroll_run.save()
            
            # Trigger employee distributions
            from .payroll_service import PayrollService
            service = PayrollService()
            service.distribute_payroll(payroll_run)
            
    except Exception as e:
        logger.error(f"Error updating payroll run: {str(e)}")


def handle_payment_intent_failed(event):
    """
    Handle failed ACH debit from employer
    """
    payment_intent = event['data']['object']
    
    if payment_intent.get('metadata', {}).get('type') != 'payroll_funding':
        return
    
    business_id = payment_intent['metadata'].get('business_id')
    error_message = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
    
    logger.error(f"Payroll funding failed for business {business_id}: {error_message}")
    
    # Update payroll run status
    from .models import PayrollRun
    try:
        payroll_runs = PayrollRun.objects.filter(
            business_id=business_id,
            status='approved'
        ).order_by('-created_at')
        
        if payroll_runs.exists():
            payroll_run = payroll_runs.first()
            payroll_run.status = 'funding_failed'
            payroll_run.error_message = error_message
            payroll_run.save()
            
    except Exception as e:
        logger.error(f"Error updating payroll run: {str(e)}")


def handle_transfer_created(event):
    """
    Handle transfer creation to employee
    """
    transfer = event['data']['object']
    payroll_payment_id = transfer.get('metadata', {}).get('payroll_payment_id')
    
    if not payroll_payment_id:
        return
    
    logger.info(f"Transfer created for payroll payment {payroll_payment_id}")


def handle_transfer_updated(event):
    """
    Handle transfer status updates
    """
    transfer = event['data']['object']
    payroll_payment_id = transfer.get('metadata', {}).get('payroll_payment_id')
    
    if not payroll_payment_id:
        return
    
    # Update payout record status
    from .stripe_models import EmployeePayoutRecord
    try:
        payout_record = EmployeePayoutRecord.objects.get(
            payroll_transaction_id=payroll_payment_id,
            stripe_transfer_id=transfer['id']
        )
        
        if transfer['amount_reversed'] > 0:
            payout_record.payout_status = 'reversed'
            payout_record.failure_reason = 'Transfer reversed'
        
        payout_record.save()
        
    except EmployeePayoutRecord.DoesNotExist:
        logger.warning(f"Payout record not found for transfer {transfer['id']}")


def handle_transfer_failed(event):
    """
    Handle failed transfer to employee
    """
    transfer = event['data']['object']
    payroll_payment_id = transfer.get('metadata', {}).get('payroll_payment_id')
    
    if not payroll_payment_id:
        return
    
    logger.error(f"Transfer failed for payroll payment {payroll_payment_id}")
    
    # Update payout record
    from .stripe_models import EmployeePayoutRecord
    try:
        payout_record = EmployeePayoutRecord.objects.get(
            payroll_transaction_id=payroll_payment_id,
            stripe_transfer_id=transfer['id']
        )
        
        payout_record.payout_status = 'failed'
        payout_record.failure_reason = 'Transfer failed'
        payout_record.save()
        
    except EmployeePayoutRecord.DoesNotExist:
        logger.warning(f"Payout record not found for transfer {transfer['id']}")


def handle_payout_created(event):
    """
    Handle payout creation to employee bank
    """
    payout = event['data']['object']
    payroll_payment_id = payout.get('metadata', {}).get('payroll_payment_id')
    
    if not payroll_payment_id:
        return
    
    logger.info(f"Payout created for payroll payment {payroll_payment_id}")


def handle_payout_updated(event):
    """
    Handle payout status updates
    """
    payout = event['data']['object']
    payroll_payment_id = payout.get('metadata', {}).get('payroll_payment_id')
    
    if not payroll_payment_id:
        return
    
    # Update payout record
    from .stripe_models import EmployeePayoutRecord
    try:
        payout_record = EmployeePayoutRecord.objects.get(
            stripe_payout_id=payout['id']
        )
        
        # Map Stripe status to our status
        status_map = {
            'pending': 'processing',
            'in_transit': 'processing',
            'paid': 'completed',
            'failed': 'failed',
            'canceled': 'failed'
        }
        
        payout_record.payout_status = status_map.get(payout['status'], 'processing')
        
        if payout['status'] == 'paid':
            payout_record.completed_at = timezone.now()
        
        if payout.get('failure_message'):
            payout_record.failure_reason = payout['failure_message']
        
        payout_record.save()
        
    except EmployeePayoutRecord.DoesNotExist:
        logger.warning(f"Payout record not found for payout {payout['id']}")


def handle_payout_failed(event):
    """
    Handle failed payout to employee bank
    """
    payout = event['data']['object']
    
    logger.error(f"Payout failed: {payout['id']}")
    
    # Update payout record
    from .stripe_models import EmployeePayoutRecord
    try:
        payout_record = EmployeePayoutRecord.objects.get(
            stripe_payout_id=payout['id']
        )
        
        payout_record.payout_status = 'failed'
        payout_record.failure_reason = payout.get('failure_message', 'Payout failed')
        payout_record.save()
        
        # TODO: Notify employee and employer of failed payout
        
    except EmployeePayoutRecord.DoesNotExist:
        logger.warning(f"Payout record not found for payout {payout['id']}")


def handle_payout_paid(event):
    """
    Handle successful payout to employee bank
    """
    payout = event['data']['object']
    
    logger.info(f"Payout completed: {payout['id']}")
    
    # Update payout record
    from .stripe_models import EmployeePayoutRecord
    try:
        payout_record = EmployeePayoutRecord.objects.get(
            stripe_payout_id=payout['id']
        )
        
        payout_record.payout_status = 'completed'
        payout_record.completed_at = timezone.now()
        payout_record.save()
        
        # Update payroll transaction
        transaction = payout_record.payroll_transaction
        transaction.payment_status = 'completed'
        transaction.save()
        
    except EmployeePayoutRecord.DoesNotExist:
        logger.warning(f"Payout record not found for payout {payout['id']}")


def handle_account_updated(event):
    """
    Handle Connect account updates (employee accounts)
    """
    account = event['data']['object']
    
    # Check if this is a payroll recipient account
    if account.get('metadata', {}).get('type') != 'payroll_recipient':
        return
    
    employee_id = account['metadata'].get('employee_id')
    
    # Update employee's Stripe account status
    from .stripe_models import EmployeeStripeAccount
    try:
        stripe_account = EmployeeStripeAccount.objects.get(
            stripe_account_id=account['id']
        )
        
        # Update verification status
        stripe_account.onboarding_complete = account.get('details_submitted', False)
        stripe_account.charges_enabled = account.get('charges_enabled', False)
        stripe_account.payouts_enabled = account.get('payouts_enabled', False)
        
        if account.get('requirements', {}).get('disabled_reason'):
            stripe_account.verification_status = 'rejected'
        elif stripe_account.payouts_enabled:
            stripe_account.verification_status = 'verified'
        else:
            stripe_account.verification_status = 'pending'
        
        stripe_account.save()
        
    except EmployeeStripeAccount.DoesNotExist:
        logger.warning(f"Stripe account record not found for {account['id']}")


def handle_charge_succeeded(event):
    """
    Handle successful ACH charge (alternative to payment_intent)
    """
    charge = event['data']['object']
    
    # Check if this is payroll related
    if charge.get('metadata', {}).get('type') != 'payroll_funding':
        return
    
    logger.info(f"Payroll charge succeeded: {charge['id']}")


def handle_charge_failed(event):
    """
    Handle failed ACH charge
    """
    charge = event['data']['object']
    
    # Check if this is payroll related
    if charge.get('metadata', {}).get('type') != 'payroll_funding':
        return
    
    logger.error(f"Payroll charge failed: {charge['id']} - {charge.get('failure_message')}")