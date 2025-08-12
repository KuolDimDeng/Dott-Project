"""
Paystack webhook handler for payment notifications
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status

from payroll.paystack_integration import paystack_service, PaystackError
from users.models import UserProfile, Subscription, Business
from payments.models import Transaction, PaymentProvider, WebhookEvent
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def paystack_webhook_handler(request):
    """
    Handle Paystack webhook events
    
    Paystack sends webhooks for various events like:
    - charge.success: Payment was successful
    - subscription.create: Subscription was created
    - subscription.disable: Subscription was cancelled
    """
    logger.info("🎯 [PaystackWebhook] === START ===")
    logger.info(f"🎯 [PaystackWebhook] Request path: {request.path}")
    logger.info(f"🎯 [PaystackWebhook] Request method: {request.method}")
    logger.info(f"🎯 [PaystackWebhook] Headers: {dict(request.headers)}")
    
    try:
        # Get the webhook signature from headers
        signature = request.headers.get('X-Paystack-Signature', '')
        
        if not signature:
            logger.error("Missing Paystack signature header")
            return JsonResponse({'error': 'Missing signature'}, status=400)
        
        # Get raw request body
        payload = request.body
        
        # Verify the signature
        if not paystack_service.verify_webhook_signature(payload, signature):
            logger.error("Invalid Paystack webhook signature")
            return JsonResponse({'error': 'Invalid signature'}, status=400)
        
        # Parse the JSON payload
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in Paystack webhook")
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
        event_type = data.get('event')
        event_data = data.get('data', {})
        
        logger.info(f"Received Paystack webhook: {event_type}")
        
        # Record the webhook event
        try:
            paystack_provider = PaymentProvider.objects.get(code='paystack')
            webhook_event = WebhookEvent.objects.create(
                provider=paystack_provider,
                event_type=event_type,
                event_id=event_data.get('id', ''),
                payload=data
            )
        except PaymentProvider.DoesNotExist:
            logger.warning("Paystack provider not found in database")
            webhook_event = None
        except Exception as e:
            logger.error(f"Error recording webhook event: {str(e)}")
            webhook_event = None
        
        # Handle specific event types
        if event_type == 'charge.success':
            handle_charge_success(event_data, webhook_event)
        elif event_type == 'subscription.create':
            handle_subscription_create(event_data, webhook_event)
        elif event_type == 'subscription.disable':
            handle_subscription_disable(event_data, webhook_event)
        else:
            logger.info(f"Unhandled Paystack event type: {event_type}")
        
        # Mark webhook as processed
        if webhook_event:
            webhook_event.processed = True
            webhook_event.processed_at = timezone.now()
            webhook_event.save()
        
        return JsonResponse({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Error processing Paystack webhook: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Internal server error'}, status=500)


def handle_charge_success(event_data, webhook_event=None):
    """Handle successful charge events"""
    logger.info("🎯 [ChargeSuccess] === START ===")
    logger.info(f"🎯 [ChargeSuccess] Event data: {json.dumps(event_data, indent=2)}")
    
    try:
        # Get transaction details
        reference = event_data.get('reference')
        metadata = event_data.get('metadata', {})
        
        logger.info(f"🎯 [ChargeSuccess] Reference: {reference}")
        logger.info(f"🎯 [ChargeSuccess] Metadata: {json.dumps(metadata, indent=2)}")
        
        # Check if this is a subscription payment
        if not metadata.get('subscription'):
            logger.info(f"Charge {reference} is not a subscription payment, skipping")
            return
        
        # Get user and business info from metadata
        user_id = metadata.get('user_id')
        business_id = metadata.get('business_id')
        plan_type = metadata.get('plan_type', 'professional')
        billing_cycle = metadata.get('billing_cycle', 'monthly')
        
        if not business_id:
            logger.error(f"No business_id in charge metadata for reference {reference}")
            return
        
        try:
            # Get the business
            business = Business.objects.get(id=business_id)
            
            # Get or create subscription
            subscription, created = Subscription.objects.get_or_create(
                business=business,
                defaults={
                    'selected_plan': plan_type,
                    'billing_cycle': billing_cycle,
                    'start_date': timezone.now().date(),
                    'is_active': True,
                    'status': 'active'
                }
            )
            
            if not created:
                # Update existing subscription
                subscription.selected_plan = plan_type
                subscription.billing_cycle = billing_cycle
                subscription.is_active = True
                subscription.status = 'active'
                subscription.grace_period_ends = None
                subscription.failed_payment_count = 0
                
                # Calculate end date based on billing cycle
                # Handle variations in billing cycle naming
                if billing_cycle == 'monthly':
                    subscription.end_date = timezone.now().date() + timedelta(days=30)
                elif billing_cycle in ['six_month', '6month']:
                    subscription.end_date = timezone.now().date() + timedelta(days=180)
                elif billing_cycle in ['yearly', 'annual']:
                    subscription.end_date = timezone.now().date() + timedelta(days=365)
                
                subscription.save()
            
            logger.info(f"Updated subscription for business {business_id} via webhook: plan={plan_type}, cycle={billing_cycle}")
            
            # Record the payment transaction
            if webhook_event:
                try:
                    payment_transaction = Transaction.objects.create(
                        user=business.owner,  # Transaction needs user, not business
                        tenant_id=business.id,  # Set tenant_id for TenantAwareModel
                        transaction_type='payment',
                        amount=event_data.get('amount', 0) / 100,  # Convert from smallest unit
                        gross_amount=event_data.get('amount', 0) / 100,
                        currency=event_data.get('currency', 'KES'),
                        description=f"Subscription payment - {plan_type} ({billing_cycle})",
                        gateway=webhook_event.gateway,  # Use gateway instead of provider
                        status='completed',
                        gateway_transaction_id=event_data.get('id'),
                        gateway_reference=reference,
                        processed_at=timezone.now(),
                        metadata={
                            'plan_type': plan_type,
                            'billing_cycle': billing_cycle,
                            'paystack_data': event_data,
                            'webhook_event_id': str(webhook_event.id)
                        }
                    )
                    
                    # Link webhook to transaction
                    webhook_event.transaction = payment_transaction
                    webhook_event.save()
                    
                    logger.info(f"Recorded payment transaction {payment_transaction.id} for webhook charge {reference}")
                except Exception as e:
                    logger.error(f"Error recording payment transaction from webhook: {str(e)}")
            
        except Business.DoesNotExist:
            logger.error(f"Business {business_id} not found for charge {reference}")
        except Exception as e:
            logger.error(f"Error handling charge success: {str(e)}")
            
    except Exception as e:
        logger.error(f"Unexpected error in handle_charge_success: {str(e)}", exc_info=True)


def handle_subscription_create(event_data, webhook_event=None):
    """Handle subscription creation events"""
    logger.info(f"Handling subscription create event: {event_data.get('subscription_code')}")
    # Subscription handling is done via charge.success events
    # This is just for logging/tracking purposes


def handle_subscription_disable(event_data, webhook_event=None):
    """Handle subscription disable events"""
    try:
        subscription_code = event_data.get('subscription_code')
        customer_email = event_data.get('customer', {}).get('email')
        
        logger.info(f"Handling subscription disable for {customer_email}, code: {subscription_code}")
        
        # Find the user by email
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(email=customer_email)
            user_profile = UserProfile.objects.get(user=user)
            
            if user_profile.business:
                # Find and disable the subscription
                subscription = Subscription.objects.filter(
                    business=user_profile.business,
                    is_active=True
                ).first()
                
                if subscription:
                    subscription.status = 'canceled'
                    subscription.is_active = False
                    subscription.end_date = timezone.now().date()
                    subscription.save()
                    
                    logger.info(f"Disabled subscription for business {user_profile.business.id}")
                else:
                    logger.warning(f"No active subscription found for business {user_profile.business.id}")
            else:
                logger.warning(f"No business found for user {user.id}")
                
        except User.DoesNotExist:
            logger.error(f"User not found with email {customer_email}")
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for email {customer_email}")
            
    except Exception as e:
        logger.error(f"Error handling subscription disable: {str(e)}", exc_info=True)