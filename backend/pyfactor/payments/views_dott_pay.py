"""
Dott Pay QR Payment System API Views
"""
import json
import base64
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from .models_dott_pay import DottPayProfile, DottPayTransaction, DottPaySecurityLog
from .models import PaymentMethod
from .serializers_dott_pay import (
    DottPayProfileSerializer,
    DottPayTransactionSerializer,
    DottPayQRCodeSerializer,
    DottPayProcessPaymentSerializer
)

logger = logging.getLogger(__name__)

class DottPayProfileViewSet(TenantIsolatedViewSet):
    """
    ViewSet for managing Dott Pay profiles
    """
    queryset = DottPayProfile.objects.all()
    serializer_class = DottPayProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by current user"""
        return super().get_queryset().filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        """Get or create the current user's Dott Pay profile"""
        profile, created = DottPayProfile.objects.get_or_create(
            user=request.user,
            tenant_id=request.user.tenant_id,
            defaults={
                'is_active': True,
            }
        )
        
        if created:
            logger.info(f"Created new Dott Pay profile for user {request.user.email}")
            # Generate initial QR code
            profile.generate_qr_payload()
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def qr_code(self, request):
        """Get the user's QR code data"""
        profile = get_object_or_404(
            DottPayProfile,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        if not profile.qr_code_encrypted:
            profile.generate_qr_payload()
        
        # Return the QR code payload
        data = {
            'qr_code': profile.qr_code_encrypted,
            'qr_code_id': str(profile.qr_code_id),
            'version': profile.qr_code_version,
            'limits': {
                'daily_limit': str(profile.daily_limit),
                'single_transaction_limit': str(profile.single_transaction_limit),
                'daily_spent': str(profile.daily_spent),
                'daily_remaining': str(profile.daily_limit - profile.daily_spent),
            }
        }
        
        return Response(data)
    
    @action(detail=False, methods=['post'])
    def update_limits(self, request):
        """Update transaction limits"""
        profile = get_object_or_404(
            DottPayProfile,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        daily_limit = request.data.get('daily_limit')
        single_limit = request.data.get('single_transaction_limit')
        auto_approve = request.data.get('auto_approve_under')
        
        if daily_limit:
            profile.daily_limit = Decimal(str(daily_limit))
        if single_limit:
            profile.single_transaction_limit = Decimal(str(single_limit))
        if auto_approve:
            profile.auto_approve_under = Decimal(str(auto_approve))
        
        profile.save()
        
        # Log security event
        DottPaySecurityLog.objects.create(
            profile=profile,
            tenant_id=request.user.tenant_id,
            event_type='profile_updated',
            event_data={
                'limits_updated': True,
                'daily_limit': str(profile.daily_limit),
                'single_limit': str(profile.single_transaction_limit),
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def set_default_payment_method(self, request):
        """Set default payment method for Dott Pay"""
        profile = get_object_or_404(
            DottPayProfile,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_method = get_object_or_404(
            PaymentMethod,
            id=payment_method_id,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        profile.default_payment_method = payment_method
        profile.save()
        
        return Response({
            'message': 'Default payment method updated',
            'payment_method': {
                'id': str(payment_method.id),
                'type': payment_method.method_type,
                'nickname': payment_method.nickname,
            }
        })
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get user's Dott Pay transaction history"""
        profile = get_object_or_404(
            DottPayProfile,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        transactions = DottPayTransaction.objects.filter(
            consumer_profile=profile,
            tenant_id=request.user.tenant_id
        ).order_by('-created_at')[:50]  # Last 50 transactions
        
        serializer = DottPayTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class DottPayMerchantViewSet(TenantIsolatedViewSet):
    """
    ViewSet for merchants to process Dott Pay transactions
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def scan_qr(self, request):
        """Process a scanned QR code and initiate payment"""
        qr_data = request.data.get('qr_data')
        amount = request.data.get('amount')
        pos_transaction_id = request.data.get('pos_transaction_id')
        
        if not qr_data or not amount:
            return Response(
                {'error': 'qr_data and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode the QR data
            decoded = base64.b64decode(qr_data).decode()
            qr_payload = json.loads(decoded)
            
            # Validate QR code
            if qr_payload.get('type') != 'DOTT_PAY':
                return Response(
                    {'error': 'Invalid QR code type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check QR code age (60 seconds max)
            qr_timestamp = qr_payload.get('timestamp', 0)
            current_timestamp = int(timezone.now().timestamp() * 1000)
            if current_timestamp - qr_timestamp > 60000:
                return Response(
                    {'error': 'QR code has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get consumer profile
            consumer_profile = get_object_or_404(
                DottPayProfile,
                qr_code_id=qr_payload.get('qrId')
            )
            
            # Check if consumer can transact
            can_transact, message = consumer_profile.can_transact(Decimal(str(amount)))
            if not can_transact:
                # Log security event
                DottPaySecurityLog.objects.create(
                    profile=consumer_profile,
                    tenant_id=request.user.tenant_id,
                    event_type='limit_exceeded' if 'limit' in message else 'transaction_declined',
                    event_data={
                        'amount': str(amount),
                        'reason': message,
                        'merchant': request.user.email,
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                )
                
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if auto-approval applies
            auto_approve = Decimal(str(amount)) <= consumer_profile.auto_approve_under
            
            # Create transaction
            with transaction.atomic():
                dott_transaction = DottPayTransaction.objects.create(
                    tenant_id=request.user.tenant_id,
                    consumer_profile=consumer_profile,
                    merchant_user=request.user,
                    payment_method=consumer_profile.default_payment_method,
                    amount=Decimal(str(amount)),
                    currency=request.data.get('currency', 'USD'),
                    status='approved' if auto_approve else 'pending',
                    approval_required=not auto_approve,
                    qr_scan_timestamp=timezone.now(),
                    merchant_location=request.data.get('location', {}),
                    notes=request.data.get('notes', ''),
                )
                
                if pos_transaction_id:
                    # Link to POS transaction if provided
                    from sales.models import POSTransaction
                    try:
                        pos_trans = POSTransaction.objects.get(
                            id=pos_transaction_id,
                            tenant_id=request.user.tenant_id
                        )
                        dott_transaction.pos_transaction = pos_trans
                        dott_transaction.save()
                    except POSTransaction.DoesNotExist:
                        logger.warning(f"POS transaction {pos_transaction_id} not found")
                
                # Log security event
                DottPaySecurityLog.objects.create(
                    profile=consumer_profile,
                    tenant_id=request.user.tenant_id,
                    event_type='qr_scan',
                    transaction=dott_transaction,
                    event_data={
                        'merchant': request.user.email,
                        'amount': str(amount),
                        'auto_approved': auto_approve,
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
                
                if auto_approve:
                    # Process payment immediately
                    success, payment_result = self._process_payment(dott_transaction)
                    
                    if success:
                        consumer_profile.record_transaction(dott_transaction.amount)
                        
                        return Response({
                            'success': True,
                            'transaction_id': dott_transaction.transaction_id,
                            'status': 'approved',
                            'message': 'Payment processed successfully',
                            'consumer': {
                                'email': consumer_profile.user.email,
                                'id': str(consumer_profile.user.id),
                            },
                            'amount': str(dott_transaction.amount),
                            'net_amount': str(dott_transaction.net_amount),
                        })
                    else:
                        dott_transaction.status = 'declined'
                        dott_transaction.save()
                        
                        return Response({
                            'success': False,
                            'error': payment_result,
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    # Requires consumer approval
                    return Response({
                        'success': True,
                        'transaction_id': dott_transaction.transaction_id,
                        'status': 'pending_approval',
                        'message': 'Transaction requires consumer approval',
                        'consumer': {
                            'email': consumer_profile.user.email,
                            'id': str(consumer_profile.user.id),
                        },
                        'amount': str(dott_transaction.amount),
                        'approval_required': True,
                    })
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Error processing QR code: {e}")
            return Response(
                {'error': 'Invalid QR code data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in Dott Pay: {e}")
            return Response(
                {'error': 'Failed to process payment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_payment(self, dott_transaction):
        """
        Process the actual payment through the payment gateway
        """
        try:
            payment_method = dott_transaction.payment_method
            
            if payment_method.method_type == 'card':
                # Process card payment through Stripe
                from .stripe_payment_service import StripePaymentService
                stripe_service = StripePaymentService()
                
                result = stripe_service.charge_card(
                    payment_method=payment_method,
                    amount=dott_transaction.amount,
                    currency=dott_transaction.currency,
                    description=f"Dott Pay Transaction {dott_transaction.transaction_id}",
                    metadata={
                        'dott_pay_transaction_id': str(dott_transaction.id),
                        'merchant': dott_transaction.merchant_user.email,
                        'consumer': dott_transaction.consumer_profile.user.email,
                    }
                )
                
                if result.get('success'):
                    dott_transaction.status = 'approved'
                    dott_transaction.gateway_transaction_id = result.get('charge_id')
                    dott_transaction.gateway_response = result
                    dott_transaction.completed_at = timezone.now()
                    dott_transaction.save()
                    return True, result
                else:
                    return False, result.get('error', 'Payment failed')
                    
            elif payment_method.method_type == 'mobile_money':
                # Process mobile money payment
                if payment_method.mobile_provider == 'M-PESA':
                    from .mpesa_service import MPesaService
                    mpesa_service = MPesaService()
                    
                    result = mpesa_service.process_payment(
                        phone_number=payment_method.phone_number,
                        amount=dott_transaction.amount,
                        reference=dott_transaction.transaction_id,
                        description=f"Dott Pay to {dott_transaction.merchant_user.email}",
                    )
                    
                    if result.get('success'):
                        dott_transaction.status = 'processing'  # Will be updated by webhook
                        dott_transaction.gateway_transaction_id = result.get('transaction_id')
                        dott_transaction.gateway_response = result
                        dott_transaction.save()
                        return True, result
                    else:
                        return False, result.get('error', 'Mobile money payment failed')
                        
                elif payment_method.mobile_provider == 'MTN':
                    from .momo_service import MTNMoMoService
                    mtn_service = MTNMoMoService()
                    
                    result = mtn_service.request_payment(
                        phone_number=payment_method.phone_number,
                        amount=dott_transaction.amount,
                        currency=dott_transaction.currency,
                        external_id=dott_transaction.transaction_id,
                        payee_note=f"Dott Pay to {dott_transaction.merchant_user.email}",
                    )
                    
                    if result.get('success'):
                        dott_transaction.status = 'processing'
                        dott_transaction.gateway_transaction_id = result.get('reference_id')
                        dott_transaction.gateway_response = result
                        dott_transaction.save()
                        return True, result
                    else:
                        return False, result.get('error', 'MTN payment failed')
                else:
                    return False, f"Unsupported mobile provider: {payment_method.mobile_provider}"
                    
            else:
                return False, f"Unsupported payment method: {payment_method.method_type}"
                
        except Exception as e:
            logger.error(f"Error processing Dott Pay payment: {e}")
            return False, str(e)
    
    @action(detail=False, methods=['get'])
    def transaction_status(self, request):
        """Check the status of a Dott Pay transaction"""
        transaction_id = request.query_params.get('transaction_id')
        
        if not transaction_id:
            return Response(
                {'error': 'transaction_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dott_transaction = get_object_or_404(
            DottPayTransaction,
            transaction_id=transaction_id,
            merchant_user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        serializer = DottPayTransactionSerializer(dott_transaction)
        return Response(serializer.data)