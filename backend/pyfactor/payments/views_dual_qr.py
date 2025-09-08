"""
Dual QR System API Views
Handles both Payment and Receive QR operations with color safety checks
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
from custom_auth.tenant_isolation import TenantIsolatedViewSet
from .models_dual_qr import (
    MerchantProfile, DynamicQR, UniversalQR, 
    P2PTransaction, QRSafetyLog
)
from .models_dott_pay import DottPayProfile, DottPayTransaction
from .serializers_dual_qr import (
    MerchantProfileSerializer, UniversalQRSerializer,
    P2PTransactionSerializer, QRScanRequestSerializer,
    DynamicQRSerializer
)

logger = logging.getLogger(__name__)

class MerchantProfileViewSet(TenantIsolatedViewSet):
    """
    ViewSet for managing Merchant Profiles (Receive QR)
    """
    queryset = MerchantProfile.objects.all()
    serializer_class = MerchantProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by current user"""
        return super().get_queryset().filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def activate(self, request):
        """Activate or create merchant profile"""
        merchant_profile, created = MerchantProfile.objects.get_or_create(
            user=request.user,
            tenant_id=request.user.tenant_id,
            defaults={
                'merchant_type': request.data.get('merchant_type', 'personal'),
                'business_category': request.data.get('business_category'),
            }
        )
        
        if created:
            logger.info(f"Created merchant profile for {request.user.email}")
            # Generate static QR
            merchant_profile.generate_static_qr()
        
        serializer = self.get_serializer(merchant_profile)
        return Response({
            'created': created,
            'profile': serializer.data,
            'static_qr': merchant_profile.static_qr_code,
        })
    
    @action(detail=False, methods=['get'])
    def my_receive_qr(self, request):
        """Get user's Receive QR (Green)"""
        try:
            merchant_profile = MerchantProfile.objects.get(
                user=request.user,
                tenant_id=request.user.tenant_id
            )
            
            if not merchant_profile.static_qr_code:
                merchant_profile.generate_static_qr()
            
            return Response({
                'qr_type': 'receive_static',
                'qr_color': '#10b981',  # Green
                'qr_data': merchant_profile.static_qr_code,
                'merchant_id': merchant_profile.merchant_id,
                'merchant_name': merchant_profile.merchant_name,
                'limits': {
                    'daily_limit': str(merchant_profile.daily_receive_limit),
                    'single_limit': str(merchant_profile.single_receive_limit),
                    'daily_received': str(merchant_profile.daily_received),
                },
                'message': 'Show this GREEN QR to receive payments',
            })
        except MerchantProfile.DoesNotExist:
            return Response({
                'error': 'Merchant profile not activated',
                'message': 'Activate your merchant profile to receive payments',
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def generate_dynamic_qr(self, request):
        """Generate dynamic Receive QR with amount (Green)"""
        merchant_profile = get_object_or_404(
            MerchantProfile,
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        amount = Decimal(str(request.data.get('amount', 0)))
        reference = request.data.get('reference')
        expires_minutes = request.data.get('expires_minutes', 5)
        
        if amount <= 0:
            return Response({
                'error': 'Invalid amount',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        qr_data = merchant_profile.generate_dynamic_qr(amount, reference, expires_minutes)
        
        return Response({
            'qr_type': 'receive_dynamic',
            'qr_color': '#10b981',  # Green
            'qr_data': qr_data,
            'amount': str(amount),
            'reference': reference,
            'expires_at': (timezone.now() + timedelta(minutes=expires_minutes)).isoformat(),
            'message': 'Show this GREEN QR to receive specific amount',
        })


class UniversalQRViewSet(TenantIsolatedViewSet):
    """
    Universal QR management - handles all QR types
    """
    queryset = UniversalQR.objects.all()
    serializer_class = UniversalQRSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def my_qr_codes(self, request):
        """Get both Payment (Blue) and Receive (Green) QRs"""
        # Get or create Payment QR (Blue)
        payment_profile, _ = DottPayProfile.objects.get_or_create(
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        if not payment_profile.qr_code_encrypted:
            payment_profile.generate_qr_payload()
        
        # Get or create Receive QR (Green)
        merchant_profile, _ = MerchantProfile.objects.get_or_create(
            user=request.user,
            tenant_id=request.user.tenant_id
        )
        
        if not merchant_profile.static_qr_code:
            merchant_profile.generate_static_qr()
        
        return Response({
            'payment_qr': {
                'type': 'payment',
                'color': '#2563eb',  # Blue
                'data': payment_profile.qr_code_encrypted,
                'label': 'SCAN TO PAY',
                'description': 'Show this BLUE QR when you want to pay',
                'icon': '💳',
            },
            'receive_qr': {
                'type': 'receive',
                'color': '#10b981',  # Green
                'data': merchant_profile.static_qr_code,
                'label': 'SCAN TO PAY ME',
                'description': 'Show this GREEN QR to receive payments',
                'icon': '💰',
                'merchant_id': merchant_profile.merchant_id,
            },
            'safety_tip': 'Remember: Blue to Pay, Green to Get Paid!',
        })


class UniversalScannerViewSet(viewsets.ViewSet):
    """
    Universal scanner that handles all QR types with safety checks
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """Universal QR scanner with color safety validation"""
        serializer = QRScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        my_qr_type = serializer.validated_data['my_qr_type']
        scanned_qr_data = serializer.validated_data['scanned_qr_data']
        amount = serializer.validated_data.get('amount')
        
        try:
            # Decode scanned QR
            decoded = base64.b64decode(scanned_qr_data).decode()
            scanned_qr = json.loads(decoded)
            
            # CRITICAL: Color Safety Check
            safety_result = self.validate_qr_combination(
                my_qr_type, 
                scanned_qr.get('type'),
                request.user
            )
            
            if not safety_result['valid']:
                # Log safety error
                QRSafetyLog.objects.create(
                    tenant_id=request.user.tenant_id,
                    scanner_user=request.user,
                    error_type=safety_result['error_type'],
                    scanner_qr_type=my_qr_type,
                    scanned_qr_type=scanned_qr.get('type'),
                    error_message=safety_result['message'],
                    device_info=request.data.get('device_info', {}),
                )
                
                return Response({
                    'success': False,
                    'error': safety_result['error'],
                    'error_type': safety_result['error_type'],
                    'title': safety_result['title'],
                    'message': safety_result['message'],
                    'instruction': safety_result['instruction'],
                    'visual': safety_result['visual'],
                    'auto_switch_available': safety_result.get('auto_switch', False),
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process based on QR combination
            return self.process_valid_scan(
                my_qr_type,
                scanned_qr,
                amount,
                request.user,
                request
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Invalid QR data: {e}")
            return Response({
                'error': 'Invalid QR code format',
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def validate_qr_combination(self, my_qr_type, their_qr_type, user):
        """Validate QR color combination for safety"""
        
        # Both BLUE (Payment) - Both trying to pay!
        if 'PAY' in my_qr_type and 'PAY' in their_qr_type:
            return {
                'valid': False,
                'error': 'BOTH_PAYING',
                'error_type': 'both_paying',
                'title': '🔵🔵 Both Showing BLUE QR!',
                'message': "You're both trying to PAY! One person must show GREEN (Receive) QR",
                'instruction': 'Ask them to switch to their GREEN Receive QR',
                'visual': '💙 + 💙 = ❌',
                'auto_switch': True,  # Can auto-switch to receive
            }
        
        # Both GREEN (Receive) - Both trying to receive!
        if 'RECEIVE' in my_qr_type and 'RECEIVE' in their_qr_type:
            return {
                'valid': False,
                'error': 'BOTH_RECEIVING',
                'error_type': 'both_receiving',
                'title': '🟢🟢 Both Showing GREEN QR!',
                'message': "You're both trying to RECEIVE! One person must show BLUE (Payment) QR",
                'instruction': 'You should switch to your BLUE Payment QR',
                'visual': '💚 + 💚 = ❌',
                'auto_switch': True,  # Can auto-switch to payment
            }
        
        # Valid combinations
        if ('PAY' in my_qr_type and 'RECEIVE' in their_qr_type) or \
           ('RECEIVE' in my_qr_type and 'PAY' in their_qr_type):
            return {
                'valid': True,
                'message': 'Valid QR combination',
            }
        
        # Other combinations (request, split, etc.)
        return {
            'valid': True,
            'message': 'Special QR type detected',
        }
    
    def process_valid_scan(self, my_qr_type, scanned_qr, amount, user, request):
        """Process valid QR scan after safety check"""
        
        # I'm PAYING (Blue), they're RECEIVING (Green)
        if 'PAY' in my_qr_type and 'RECEIVE' in scanned_qr.get('type'):
            return self.process_payment(user, scanned_qr, amount, request)
        
        # I'm RECEIVING (Green), they're PAYING (Blue)
        elif 'RECEIVE' in my_qr_type and 'PAY' in scanned_qr.get('type'):
            return self.process_receive(user, scanned_qr, amount, request)
        
        # Special QR types
        elif scanned_qr.get('type') == 'DOTT_REQUEST':
            return self.process_payment_request(user, scanned_qr, request)
        
        elif scanned_qr.get('type') == 'DOTT_SPLIT':
            return self.process_bill_split(user, scanned_qr, request)
        
        else:
            return Response({
                'error': 'Unsupported QR type combination',
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def process_payment(self, payer, receiver_qr, amount, request):
        """Process payment from Blue QR to Green QR"""
        try:
            # Get receiver's merchant profile
            merchant_profile = get_object_or_404(
                MerchantProfile,
                merchant_id=receiver_qr.get('merchantId')
            )
            
            # Check if it's a dynamic QR with amount
            if receiver_qr.get('type') == 'DOTT_RECEIVE_DYNAMIC':
                amount = Decimal(receiver_qr.get('amount', amount))
                
                # Validate dynamic QR
                dynamic_qr = DynamicQR.objects.filter(
                    merchant_profile=merchant_profile,
                    reference=receiver_qr.get('reference'),
                    is_used=False
                ).first()
                
                if not dynamic_qr:
                    return Response({
                        'error': 'Invalid or expired dynamic QR',
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                is_valid, message = dynamic_qr.is_valid()
                if not is_valid:
                    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check merchant can receive
            can_receive, message = merchant_profile.can_receive(Decimal(str(amount)))
            if not can_receive:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create P2P transaction
            with transaction.atomic():
                p2p_transaction = P2PTransaction.objects.create(
                    tenant_id=request.user.tenant_id,
                    sender=payer,
                    receiver=merchant_profile.user,
                    sender_qr_type='payment',
                    receiver_qr_type='receive',
                    amount=Decimal(str(amount)),
                    currency=request.data.get('currency', 'USD'),
                    description=request.data.get('description', f'Payment to {merchant_profile.merchant_name}'),
                    status='processing',
                )
                
                # Process actual payment (integrate with payment gateway)
                # TODO: Implement actual payment processing
                
                # Update transaction status
                p2p_transaction.status = 'completed'
                p2p_transaction.completed_at = timezone.now()
                p2p_transaction.save()
                
                # Record in merchant profile
                merchant_profile.record_received(p2p_transaction.amount)
                
                # Mark dynamic QR as used if applicable
                if receiver_qr.get('type') == 'DOTT_RECEIVE_DYNAMIC' and dynamic_qr:
                    dynamic_qr.mark_used(payer)
                
                return Response({
                    'success': True,
                    'transaction_id': p2p_transaction.transaction_id,
                    'amount': str(p2p_transaction.amount),
                    'receiver': merchant_profile.merchant_name,
                    'status': 'completed',
                    'visual': '💙 → 💚 ✅',
                    'message': f'Payment of {amount} sent successfully!',
                })
                
        except Exception as e:
            logger.error(f"Payment processing error: {e}")
            return Response({
                'error': 'Payment processing failed',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def process_receive(self, receiver, payer_qr, amount, request):
        """Process receiving payment when scanner has Green QR"""
        # This is the reverse flow - handled similarly
        # The payer's app would typically initiate this
        return Response({
            'success': True,
            'message': 'Ready to receive payment',
            'instruction': 'Waiting for payer to confirm',
            'visual': '💚 ← 💙',
        })


class P2PTransactionViewSet(TenantIsolatedViewSet):
    """
    Person-to-Person transaction management
    """
    queryset = P2PTransaction.objects.all()
    serializer_class = P2PTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get user's P2P transactions"""
        return super().get_queryset().filter(
            models.Q(sender=self.request.user) | 
            models.Q(receiver=self.request.user)
        )
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get P2P transaction history"""
        sent = P2PTransaction.objects.filter(
            sender=request.user,
            tenant_id=request.user.tenant_id
        ).order_by('-created_at')[:20]
        
        received = P2PTransaction.objects.filter(
            receiver=request.user,
            tenant_id=request.user.tenant_id
        ).order_by('-created_at')[:20]
        
        return Response({
            'sent': P2PTransactionSerializer(sent, many=True).data,
            'received': P2PTransactionSerializer(received, many=True).data,
        })


class QREducationViewSet(viewsets.ViewSet):
    """
    Educational endpoints for QR system
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def color_rules(self, request):
        """Get QR color rules and safety tips"""
        return Response({
            'rules': [
                {
                    'rule': 'Payment QR',
                    'color': '#2563eb',
                    'color_name': 'BLUE',
                    'purpose': 'To make payments',
                    'icon': '💳',
                    'remember': 'Blue = Bye bye money',
                },
                {
                    'rule': 'Receive QR',
                    'color': '#10b981',
                    'color_name': 'GREEN',
                    'purpose': 'To receive payments',
                    'icon': '💰',
                    'remember': 'Green = Getting money',
                },
            ],
            'safety': [
                {
                    'scenario': 'Correct',
                    'visual': '💙 + 💚 = ✅',
                    'description': 'Blue pays Green',
                },
                {
                    'scenario': 'Wrong',
                    'visual': '💙 + 💙 = ❌',
                    'description': 'Both trying to pay!',
                },
                {
                    'scenario': 'Wrong',
                    'visual': '💚 + 💚 = ❌',
                    'description': 'Both trying to receive!',
                },
            ],
            'tips': [
                'Always check colors before scanning',
                'Blue QR should scan Green QR to pay',
                'Green QR should be scanned by Blue QR to receive',
                'If both show same color, one must switch',
            ],
        })