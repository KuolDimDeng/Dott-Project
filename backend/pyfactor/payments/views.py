# payments/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .providers import PaymentProviderRegistry
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from hr.models import Employee
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import json
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def country_payment_providers(request, country_code):
    """Get available payment providers for a country"""
    try:
        # Get available providers for this country
        country_providers = PaymentProviderRegistry.COUNTRY_PROVIDER_MAP.get(
            country_code,
            PaymentProviderRegistry.COUNTRY_PROVIDER_MAP['default']
        )
        
        # Format response data
        providers = []
        for key, provider_name in country_providers.items():
            if key != 'default':
                providers.append({
                    'id': provider_name,
                    'name': provider_name.replace('_', ' ').title(),
                    'type': key
                })
                
        return Response({
            'providers': providers,
            'primary_provider': country_providers.get('primary')
        })
    except Exception as e:
        logger.error(f"Error getting country payment providers: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def provider_form(request, provider_name):
    """Get form fields for a specific payment provider"""
    try:
        provider = PaymentProviderRegistry.get_provider_by_name(provider_name)
        fields = provider.get_employee_account_form()
        
        return Response({'fields': fields})
    except Exception as e:
        logger.error(f"Error getting provider form for {provider_name}: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_payment_method(request, employee_id):
    """
    Get or set payment method information for an employee.
    
    Args:
        request: HTTP request object
        employee_id: UUID of the employee
        
    Returns:
        For GET requests: Payment method information for the employee
        For POST requests: Success message or error details
        
    Raises:
        HTTP 404: If employee not found
        HTTP 403: If employee doesn't belong to user's company
        HTTP 400: If required payment details are missing
        HTTP 500: If storing payment details fails
    """
    # Get the employee or return 404
    employee = get_object_or_404(Employee, id=employee_id)
    
    # Verify the employee belongs to the user's company
    if request.user.business_id and employee.business_id != request.user.business_id:
        return Response({
            'error': 'You do not have permission to manage this employee\'s payment method'
        }, status=status.HTTP_403_FORBIDDEN)
        
    # Handle GET request
    if request.method == 'GET':
        payment_info = {
            'provider': employee.payment_provider,
        }
        
        # Include provider-specific details
        if employee.payment_provider:
            if employee.payment_provider == 'mpesa':
                payment_info['mpesa_phone_number'] = employee.mpesa_phone_number
            elif employee.payment_provider == 'paypal':
                payment_info['paypal_email'] = employee.paypal_email
            elif employee.payment_provider in ['bank', 'stripe', 'wise']:
                payment_info['bank_name'] = employee.bank_name
                payment_info['bank_account_last_four'] = employee.bank_account_last_four
                payment_info['bank_account_stored_in_stripe'] = employee.bank_account_stored_in_stripe
            elif employee.payment_provider in ['mobile_money', 'orange_money', 'mtn_money']:
                payment_info['mobile_wallet_provider'] = employee.mobile_wallet_provider
                payment_info['mobile_wallet_id'] = employee.mobile_wallet_id
        
        return Response(payment_info)
    
    # Handle POST request
    elif request.method == 'POST':
        data = request.data
        provider_name = data.get('provider')
        
        if not provider_name:
            return Response({
                'error': 'Payment provider is required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Get provider details and validate
        try:
            provider = PaymentProviderRegistry.get_provider_by_name(provider_name)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate and process provider-specific details
        if provider_name == 'mpesa':
            phone_number = data.get('phone_number')
            if not phone_number:
                return Response({
                    'error': 'Phone number is required for M-Pesa payments'
                }, status=status.HTTP_400_BAD_REQUEST)
            employee.mpesa_phone_number = phone_number
            
        elif provider_name == 'paypal':
            email = data.get('email')
            if not email:
                return Response({
                    'error': 'Email is required for PayPal payments'
                }, status=status.HTTP_400_BAD_REQUEST)
            employee.paypal_email = email
            
        elif provider_name in ['bank', 'stripe', 'wise']:
            # Use Stripe for secure storage
            account_number = data.get('account_number')
            routing_number = data.get('routing_number')
            bank_name = data.get('bank_name')
            
            if not all([account_number, routing_number, bank_name]):
                return Response({
                    'error': 'Bank account details are incomplete'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                # Store securely in Stripe
                success = employee.save_bank_account_to_stripe(account_number, routing_number)
                if not success:
                    raise ValueError("Failed to store bank details in Stripe")
                
                # Only store bank name locally
                employee.bank_name = bank_name
            except Exception as e:
                logger.error(f"Failed to store bank details for employee {employee_id}: {str(e)}")
                return Response({
                    'error': f'Failed to store bank details: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        elif provider_name in ['mobile_money', 'orange_money', 'mtn_money']:
            wallet_id = data.get('wallet_id')
            if not wallet_id:
                return Response({
                    'error': 'Mobile wallet ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            employee.mobile_wallet_provider = provider_name
            employee.mobile_wallet_id = wallet_id
        else:
            # Handle other or unknown providers
            logger.warning(f"Unhandled payment provider type: {provider_name}")
            return Response({
                'error': f'Payment provider {provider_name} is not fully supported yet'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save the provider and common fields
        employee.payment_provider = provider_name
        employee.save()
        
        return Response({
            'success': True,
            'message': f'Payment method updated to {provider_name}'
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_payment(request):
    """
    Record a payment transaction in the database.
    
    This endpoint is called after Stripe payment processing is complete
    to record the payment details in the local database.
    """
    try:
        data = request.data
        tenant_id = data.get('tenantId')
        
        # Validate required fields
        required_fields = ['customerId', 'amount', 'paymentDate', 'paymentMethod']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'error': f'{field} is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, we'll just log the payment details
        # In a full implementation, this would save to a Payment model
        logger.info(f"Recording payment for tenant {tenant_id}: {data}")
        
        # TODO: Implement actual payment recording to database
        # payment = Payment.objects.create(
        #     tenant_id=tenant_id,
        #     customer_id=data['customerId'],
        #     amount=Decimal(data['amount']),
        #     payment_date=data['paymentDate'],
        #     payment_method=data['paymentMethod'],
        #     reference=data.get('reference', ''),
        #     notes=data.get('notes', ''),
        #     stripe_payment_intent_id=data.get('stripePaymentIntentId'),
        #     status='completed'
        # )
        
        return Response({
            'success': True,
            'message': 'Payment recorded successfully',
            'payment_id': 'temp_id_123'  # TODO: Return actual payment ID
        })
        
    except Exception as e:
        logger.error(f"Error recording payment: {str(e)}")
        return Response({
            'error': f'Failed to record payment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_paystack_payment(request):
    """
    Verify a Paystack payment and update user subscription
    
    Expected data:
    {
        "reference": "payment_reference"
    }
    """
    from payroll.paystack_integration import paystack_service, PaystackError
    from users.models import UserProfile, Subscription
    from django.utils import timezone
    from datetime import timedelta
    import os
    
    reference = request.data.get('reference')
    
    if not reference:
        return Response(
            {"error": "Payment reference is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if PAYSTACK_SECRET_KEY is configured
    if not os.getenv('PAYSTACK_SECRET_KEY'):
        logger.error("PAYSTACK_SECRET_KEY not configured")
        return Response(
            {"error": "Paystack is not properly configured"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        # Verify transaction with Paystack
        logger.info(f"Verifying Paystack payment with reference: {reference}")
        transaction = paystack_service.verify_transaction(reference)
        
        # Check transaction status
        if transaction.get('status') != 'success':
            logger.warning(f"Payment verification failed for reference {reference}: {transaction.get('gateway_response')}")
            return Response({
                'status': transaction.get('status', 'failed'),
                'message': transaction.get('gateway_response', 'Payment verification failed')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transaction metadata
        metadata = transaction.get('metadata', {})
        user_id = metadata.get('user_id')
        business_id = metadata.get('business_id')
        plan_type = metadata.get('plan_type', 'professional')
        billing_cycle = metadata.get('billing_cycle', 'monthly')
        is_subscription = metadata.get('subscription', False)
        
        # Validate user matches authenticated user
        if user_id and str(request.user.id) != user_id:
            logger.error(f"User mismatch: authenticated {request.user.id} vs metadata {user_id}")
            return Response(
                {"error": "Payment reference does not belong to authenticated user"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get user's business
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            business = user_profile.business
            
            if not business:
                logger.error(f"No business found for user {request.user.id}")
                return Response(
                    {"error": "No business associated with user"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Verify business matches if provided in metadata
            if business_id and str(business.id) != business_id:
                logger.error(f"Business mismatch: user business {business.id} vs metadata {business_id}")
                return Response(
                    {"error": "Payment reference does not belong to user's business"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for user {request.user.id}")
            return Response(
                {"error": "User profile not found"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update subscription if this is a subscription payment
        if is_subscription:
            try:
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
                    
                    logger.info(f"Updated subscription for business {business.id}: plan={plan_type}, cycle={billing_cycle}")
                else:
                    logger.info(f"Created new subscription for business {business.id}: plan={plan_type}, cycle={billing_cycle}")
                
                # Record the payment transaction
                from payments.models import Transaction, PaymentProvider
                try:
                    # Get Paystack provider
                    paystack_provider = PaymentProvider.objects.get(code='paystack')
                    
                    # Create transaction record
                    payment_transaction = Transaction.objects.create(
                        user=business.owner,  # Transaction needs user, not business
                        tenant_id=business.id,  # Set tenant_id for TenantAwareModel
                        transaction_type='payment',
                        amount=transaction.get('amount', 0) / 100,  # Convert from smallest unit
                        gross_amount=transaction.get('amount', 0) / 100,
                        currency=transaction.get('currency', 'KES'),
                        description=f"Subscription payment - {plan_type} ({billing_cycle})",
                        gateway=None,  # We need to get the PaymentGateway, not PaymentProvider
                        status='completed',
                        gateway_transaction_id=transaction.get('id'),
                        gateway_reference=reference,
                        processed_at=timezone.now(),
                        metadata={
                            'plan_type': plan_type,
                            'billing_cycle': billing_cycle,
                            'paystack_data': transaction
                        }
                    )
                    logger.info(f"Recorded payment transaction {payment_transaction.id} for reference {reference}")
                except PaymentProvider.DoesNotExist:
                    logger.warning("Paystack provider not found in database, skipping transaction record")
                except Exception as e:
                    logger.error(f"Error recording payment transaction: {str(e)}")
                    # Continue even if transaction recording fails
                
            except Exception as e:
                logger.error(f"Error updating subscription: {str(e)}")
                return Response(
                    {"error": "Failed to update subscription"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Return success response
        return Response({
            'status': 'success',
            'message': 'Payment verified successfully',
            'transaction': {
                'reference': transaction.get('reference'),
                'amount': transaction.get('amount'),
                'currency': transaction.get('currency'),
                'paid_at': transaction.get('paid_at'),
                'channel': transaction.get('channel'),
                'customer': {
                    'email': transaction.get('customer', {}).get('email'),
                    'phone': transaction.get('customer', {}).get('phone')
                }
            },
            'subscription': {
                'plan_type': plan_type,
                'billing_cycle': billing_cycle,
                'is_active': True,
                'status': 'active'
            } if is_subscription else None
        })
        
    except PaystackError as e:
        logger.error(f"Paystack error verifying payment {reference}: {str(e)}")
        return Response(
            {"error": f"Payment verification failed: {str(e)}"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying Paystack payment: {str(e)}", exc_info=True)
        return Response(
            {"error": "An unexpected error occurred"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )