"""
Mobile Money Payment Views
API endpoints for MTN MoMo and M-Pesa payments
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from decimal import Decimal
import json
import logging
import uuid

from .services.mtn_momo_service import MTNMoMoService
from .services.mpesa_service import MPesaService
from .models_mobile_money import (
    MobileMoneyTransaction,
    PaymentProvider,
    PaymentWebhook
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_payment(request):
    """Initialize payment with auto-detection of provider"""
    try:
        phone_number = request.data.get('phone')
        amount = Decimal(str(request.data.get('amount', 0)))
        currency = request.data.get('currency', 'USD')
        message = request.data.get('message', '')
        provider_type = request.data.get('provider', 'auto')
        
        # Validate inputs
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if amount <= 0:
            return Response({
                'success': False,
                'error': 'Invalid amount'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Auto-detect provider based on phone number
        if provider_type == 'auto':
            provider_type = detect_provider(phone_number)
        
        # Get or create provider
        provider, created = PaymentProvider.objects.get_or_create(
            name=provider_type,
            defaults={
                'sandbox_url': 'https://sandbox.momodeveloper.mtn.com' if provider_type == 'MTN_MOMO' else 'https://sandbox.safaricom.co.ke',
                'production_url': 'https://proxy.momoapi.mtn.com' if provider_type == 'MTN_MOMO' else 'https://api.safaricom.co.ke',
                'supported_countries': ['UG', 'GH', 'ZA', 'CM'] if provider_type == 'MTN_MOMO' else ['KE'],
                'supported_currencies': ['UGX', 'GHS', 'ZAR', 'XAF'] if provider_type == 'MTN_MOMO' else ['KES']
            }
        )
        
        # Create transaction record
        reference_id = str(uuid.uuid4())
        
        with transaction.atomic():
            txn = MobileMoneyTransaction.objects.create(
                reference_id=reference_id,
                user=request.user,
                tenant_id=request.user.tenant_id,
                provider=provider,
                transaction_type='PAYMENT',
                status='PENDING',
                amount=amount,
                currency=currency,
                phone_number=phone_number,
                payment_message=message,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Calculate fees
            txn.calculate_fees()
            txn.save()
        
        # Initialize payment with provider
        if provider_type == 'MTN_MOMO':
            service = MTNMoMoService()
        elif provider_type == 'MPESA':
            service = MPesaService()
        else:
            return Response({
                'success': False,
                'error': f'Unsupported provider: {provider_type}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Request payment
        result = service.request_payment(
            amount=amount,
            phone_number=phone_number,
            reference=reference_id,
            currency=currency,
            message=message
        )
        
        if result['success']:
            # Update transaction with provider response
            txn.external_reference = result.get('reference_id', '')
            txn.provider_response = result
            txn.status = 'PROCESSING'
            txn.save()
            
            return Response({
                'success': True,
                'reference_id': reference_id,
                'external_reference': result.get('reference_id'),
                'message': result.get('message', 'Payment initiated'),
                'provider': provider_type
            })
        else:
            # Mark transaction as failed
            txn.mark_failed(
                error_message=result.get('error', 'Payment initiation failed')
            )
            
            return Response({
                'success': False,
                'error': result.get('error', 'Payment failed')
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Payment initialization error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_status(request, reference_id):
    """Check payment status"""
    try:
        # Get transaction
        txn = MobileMoneyTransaction.objects.get(
            reference_id=reference_id,
            user=request.user
        )
        
        # If already completed, return cached status
        if txn.status in ['SUCCESSFUL', 'FAILED', 'CANCELLED']:
            return Response({
                'success': True,
                'status': txn.status,
                'amount': str(txn.amount),
                'currency': txn.currency,
                'completed_at': txn.completed_at
            })
        
        # Check with provider
        if txn.provider.name == 'MTN_MOMO':
            service = MTNMoMoService()
        elif txn.provider.name == 'MPESA':
            service = MPesaService()
        else:
            return Response({
                'success': False,
                'error': 'Unknown provider'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check status with provider
        result = service.check_payment_status(
            txn.external_reference or txn.reference_id
        )
        
        if result['success']:
            # Update transaction status
            new_status = result['status']
            if new_status != txn.status:
                txn.status = new_status
                txn.provider_response = result.get('data', {})
                
                if new_status == 'SUCCESSFUL':
                    txn.mark_successful()
                elif new_status in ['FAILED', 'CANCELLED', 'EXPIRED']:
                    txn.mark_failed()
                else:
                    txn.save()
            
            return Response({
                'success': True,
                'status': txn.status,
                'amount': str(txn.amount),
                'currency': txn.currency,
                'completed_at': txn.completed_at
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Status check failed')
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except MobileMoneyTransaction.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Transaction not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_refund(request, reference_id):
    """Process refund for a payment"""
    try:
        # Get original transaction
        original_txn = MobileMoneyTransaction.objects.get(
            reference_id=reference_id,
            user=request.user,
            status='SUCCESSFUL'
        )
        
        amount = Decimal(str(request.data.get('amount', original_txn.amount)))
        reason = request.data.get('reason', 'Customer requested refund')
        
        # Validate refund amount
        if amount > original_txn.amount:
            return Response({
                'success': False,
                'error': 'Refund amount exceeds original payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create refund transaction
        refund_reference = str(uuid.uuid4())
        
        with transaction.atomic():
            refund_txn = MobileMoneyTransaction.objects.create(
                reference_id=refund_reference,
                user=request.user,
                tenant_id=request.user.tenant_id,
                provider=original_txn.provider,
                transaction_type='REFUND',
                status='PENDING',
                amount=amount,
                currency=original_txn.currency,
                phone_number=original_txn.phone_number,
                payment_message=reason,
                metadata={'original_transaction': reference_id},
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        # Process refund with provider
        if original_txn.provider.name == 'MTN_MOMO':
            service = MTNMoMoService()
        elif original_txn.provider.name == 'MPESA':
            service = MPesaService()
        else:
            return Response({
                'success': False,
                'error': 'Unknown provider'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = service.process_refund(
            original_reference=original_txn.external_reference or original_txn.reference_id,
            amount=amount,
            reason=reason
        )
        
        if result['success']:
            refund_txn.external_reference = result.get('reference_id', '')
            refund_txn.provider_response = result
            refund_txn.status = 'PROCESSING'
            refund_txn.save()
            
            return Response({
                'success': True,
                'refund_reference': refund_reference,
                'message': 'Refund initiated successfully'
            })
        else:
            refund_txn.mark_failed(
                error_message=result.get('error', 'Refund failed')
            )
            
            return Response({
                'success': False,
                'error': result.get('error', 'Refund failed')
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except MobileMoneyTransaction.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Transaction not found or not eligible for refund'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Refund error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
def momo_webhook(request):
    """Handle MTN MoMo webhooks"""
    if request.method == 'POST':
        try:
            # Log webhook
            payload = request.body.decode('utf-8')
            headers = dict(request.headers)
            
            # Create webhook record
            webhook = PaymentWebhook.objects.create(
                provider=PaymentProvider.objects.get(name='MTN_MOMO'),
                webhook_type='STATUS_UPDATE',
                headers=headers,
                payload=json.loads(payload) if payload else {},
                ip_address=get_client_ip(request)
            )
            
            # Verify webhook
            service = MTNMoMoService()
            signature = headers.get('X-Signature', '')
            
            if service.verify_webhook(headers, payload, signature):
                webhook.is_valid = True
                webhook.save()
                
                # Process webhook
                process_momo_webhook(webhook)
                
                return JsonResponse({'success': True})
            else:
                webhook.error_message = 'Invalid signature'
                webhook.save()
                
                return JsonResponse({'success': False, 'error': 'Invalid signature'}, status=401)
        
        except Exception as e:
            logger.error(f"MoMo webhook error: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)


@csrf_exempt
def mpesa_webhook(request):
    """Handle M-Pesa webhooks"""
    if request.method == 'POST':
        try:
            # Log webhook
            payload = request.body.decode('utf-8')
            headers = dict(request.headers)
            
            # Create webhook record
            webhook = PaymentWebhook.objects.create(
                provider=PaymentProvider.objects.get(name='MPESA'),
                webhook_type='STATUS_UPDATE',
                headers=headers,
                payload=json.loads(payload) if payload else {},
                ip_address=get_client_ip(request)
            )
            
            # Verify webhook
            service = MPesaService()
            
            if service.verify_webhook(headers, payload, ''):
                webhook.is_valid = True
                webhook.save()
                
                # Process webhook
                process_mpesa_webhook(webhook)
                
                return JsonResponse({'ResultCode': 0, 'ResultDesc': 'Success'})
            else:
                webhook.error_message = 'Invalid request'
                webhook.save()
                
                return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Invalid request'}, status=401)
        
        except Exception as e:
            logger.error(f"M-Pesa webhook error: {str(e)}")
            return JsonResponse({'ResultCode': 1, 'ResultDesc': str(e)}, status=500)
    
    return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Method not allowed'}, status=405)


def process_momo_webhook(webhook):
    """Process MTN MoMo webhook"""
    try:
        data = webhook.payload
        reference_id = data.get('externalId') or data.get('referenceId')
        status = data.get('status', '').upper()
        
        if reference_id:
            # Update transaction
            txn = MobileMoneyTransaction.objects.filter(
                reference_id=reference_id
            ).first()
            
            if txn:
                webhook.transaction = txn
                webhook.save()
                
                if status == 'SUCCESSFUL':
                    txn.mark_successful(data.get('transactionId'))
                elif status in ['FAILED', 'REJECTED']:
                    txn.mark_failed(data.get('reason'))
        
        webhook.is_processed = True
        webhook.processed_at = timezone.now()
        webhook.save()
        
    except Exception as e:
        webhook.error_message = str(e)
        webhook.save()
        logger.error(f"Error processing MoMo webhook: {e}")


def process_mpesa_webhook(webhook):
    """Process M-Pesa webhook"""
    try:
        data = webhook.payload
        
        # Extract callback data
        if 'Body' in data and 'stkCallback' in data['Body']:
            callback = data['Body']['stkCallback']
            checkout_request_id = callback.get('CheckoutRequestID')
            result_code = callback.get('ResultCode')
            
            if checkout_request_id:
                # Update transaction
                txn = MobileMoneyTransaction.objects.filter(
                    external_reference=checkout_request_id
                ).first()
                
                if txn:
                    webhook.transaction = txn
                    webhook.save()
                    
                    if result_code == 0:
                        # Extract transaction ID from metadata
                        metadata = callback.get('CallbackMetadata', {}).get('Item', [])
                        mpesa_receipt = next((item['Value'] for item in metadata if item['Name'] == 'MpesaReceiptNumber'), None)
                        
                        txn.mark_successful(mpesa_receipt)
                    else:
                        txn.mark_failed(callback.get('ResultDesc'))
        
        webhook.is_processed = True
        webhook.processed_at = timezone.now()
        webhook.save()
        
    except Exception as e:
        webhook.error_message = str(e)
        webhook.save()
        logger.error(f"Error processing M-Pesa webhook: {e}")


def detect_provider(phone_number):
    """Auto-detect payment provider based on phone number"""
    # Remove non-digits
    phone = ''.join(filter(str.isdigit, phone_number))
    
    # Kenya (254) - M-Pesa
    if phone.startswith('254') or (len(phone) == 9 and phone.startswith('7')):
        return 'MPESA'
    
    # Uganda (256), Ghana (233), South Africa (27) - MTN MoMo
    elif any(phone.startswith(code) for code in ['256', '233', '27', '237']):
        return 'MTN_MOMO'
    
    # Default to MTN MoMo for other African countries
    else:
        return 'MTN_MOMO'


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip