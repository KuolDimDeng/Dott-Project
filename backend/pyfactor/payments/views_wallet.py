"""
Mobile Money Wallet API Views
Handles wallet operations for MTN and M-Pesa mobile money
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging
import uuid

from .models_mobile_money import MobileMoneyProvider
from .models_wallet import (
    MobileMoneyWallet,
    WalletTransaction,
    WalletTransferRequest,
    WalletTopUp
)
from .serializers_wallet import (
    MobileMoneyProviderSerializer,
    MobileMoneyWalletSerializer,
    WalletTransactionSerializer,
    WalletTransferRequestSerializer,
    WalletTopUpSerializer
)
from .stripe_payment_service import StripePaymentService
from .momo_service import momo_service
from custom_auth.models import User

logger = logging.getLogger(__name__)


class WalletViewSet(viewsets.ViewSet):
    """Mobile Money Wallet operations"""
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, pk=None):
        """Get user's wallet details"""
        try:
            # Get or create wallet for user
            provider_code = request.query_params.get('provider', 'MTN_MOMO')
            provider = MobileMoneyProvider.objects.filter(
                name=provider_code,
                is_active=True
            ).first()
            
            if not provider:
                return Response({
                    'success': False,
                    'error': f'Provider {provider_code} not available'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            wallet, created = MobileMoneyWallet.objects.get_or_create(
                user=request.user,
                provider=provider,
                defaults={
                    'phone_number': request.user.profile.phone_number or '',
                    'tenant': request.tenant
                }
            )
            
            if created:
                logger.info(f"Created new wallet for user {request.user.email}")
            
            serializer = MobileMoneyWalletSerializer(wallet)
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error retrieving wallet: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Get wallet balance"""
        try:
            provider_code = request.query_params.get('provider', 'MTN_MOMO')
            wallet = MobileMoneyWallet.objects.filter(
                user=request.user,
                provider__name=provider_code
            ).first()
            
            if not wallet:
                return Response({
                    'success': True,
                    'data': {
                        'balance': '0.00',
                        'available_balance': '0.00',
                        'pending_balance': '0.00',
                        'currency': 'USD',
                        'has_wallet': False
                    }
                })
            
            return Response({
                'success': True,
                'data': {
                    'balance': str(wallet.balance),
                    'available_balance': str(wallet.available_balance),
                    'pending_balance': str(wallet.pending_balance),
                    'currency': 'USD',  # Default currency, will be updated based on provider
                    'has_wallet': True,
                    'verified': wallet.verification_status == 'verified'
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def topup(self, request):
        """Top up wallet using Stripe"""
        try:
            amount = Decimal(str(request.data.get('amount', 0)))
            provider_code = request.data.get('provider', 'MTN_MOMO')
            
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': 'Amount must be greater than 0'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create wallet
            provider = MobileMoneyProvider.objects.get(name=provider_code)
            wallet, _ = MobileMoneyWallet.objects.get_or_create(
                user=request.user,
                provider=provider,
                defaults={
                    'phone_number': request.user.profile.phone_number or '',
                    'tenant': request.tenant
                }
            )
            
            # Create top-up record
            topup = WalletTopUp.objects.create(
                wallet=wallet,
                amount=amount,
                currency='USD',  # Default currency
                tenant=request.tenant
            )
            
            # Create Stripe payment intent
            stripe_service = StripePaymentService()
            payment_data = {
                'amount': amount,
                'currency': 'usd',
                'description': f'Wallet top-up for {request.user.email}',
                'metadata': {
                    'topup_id': str(topup.id),
                    'wallet_id': str(wallet.id),
                    'user_id': str(request.user.id),
                    'provider': provider_code
                }
            }
            
            # Create payment intent
            result = stripe_service.create_invoice_payment_intent(
                type('Invoice', (), {
                    'amount': amount,
                    'currency': 'usd',
                    'invoice_number': f'TOPUP-{topup.id}',
                    'business_id': request.user.id,
                    'id': topup.id
                })()
            )
            
            if result['success']:
                topup.stripe_payment_intent_id = result['payment_intent_id']
                topup.save()
                
                return Response({
                    'success': True,
                    'data': {
                        'topup_id': str(topup.id),
                        'client_secret': result['client_secret'],
                        'amount': str(amount),
                        'currency': 'USD',
                        'fee_breakdown': result.get('fee_breakdown', {})
                    }
                })
            else:
                topup.status = 'failed'
                topup.failure_reason = result.get('error', 'Payment intent creation failed')
                topup.save()
                
                return Response({
                    'success': False,
                    'error': result.get('error', 'Failed to create payment')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except MobileMoneyProvider.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Provider {provider_code} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating top-up: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def send(self, request):
        """Send money to another user"""
        try:
            recipient_phone = request.data.get('recipient_phone')
            amount = Decimal(str(request.data.get('amount', 0)))
            description = request.data.get('description', 'Money transfer')
            provider_code = request.data.get('provider', 'MTN_MOMO')
            
            if not recipient_phone:
                return Response({
                    'success': False,
                    'error': 'Recipient phone number required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': 'Amount must be greater than 0'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get sender's wallet
            wallet = MobileMoneyWallet.objects.filter(
                user=request.user,
                provider__name=provider_code
            ).first()
            
            if not wallet:
                return Response({
                    'success': False,
                    'error': 'Wallet not found. Please set up your wallet first.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check balance
            if wallet.available_balance < amount:
                return Response({
                    'success': False,
                    'error': 'Insufficient balance'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find recipient user
            recipient_user = User.objects.filter(
                profile__phone_number=recipient_phone
            ).first()
            
            with transaction.atomic():
                # Create transfer request
                transfer_request = WalletTransferRequest.objects.create(
                    requester=request.user,
                    recipient_phone=recipient_phone,
                    recipient_user=recipient_user,
                    amount=amount,
                    currency='USD',  # Default currency
                    description=description,
                    expires_at=timezone.now() + timedelta(hours=24),
                    tenant=request.tenant
                )
                
                # If recipient is a Dott user, process immediately
                if recipient_user:
                    # Get or create recipient wallet
                    recipient_wallet, _ = MobileMoneyWallet.objects.get_or_create(
                        user=recipient_user,
                        provider=wallet.provider,
                        defaults={
                            'phone_number': recipient_phone,
                            'tenant': recipient_user.tenant
                        }
                    )
                    
                    # Process transfer
                    reference = f"TRF-{uuid.uuid4().hex[:8].upper()}"
                    
                    # Deduct from sender
                    wallet.deduct_funds(
                        amount=amount,
                        reference=reference,
                        description=f"Transfer to {recipient_phone}"
                    )
                    
                    # Add to recipient
                    recipient_wallet.add_funds(
                        amount=amount,
                        reference=reference,
                        description=f"Transfer from {request.user.profile.phone_number or request.user.email}"
                    )
                    
                    # Update transfer request
                    transfer_request.status = 'accepted'
                    transfer_request.responded_at = timezone.now()
                    transfer_request.save()
                    
                    return Response({
                        'success': True,
                        'data': {
                            'transfer_id': str(transfer_request.id),
                            'reference': reference,
                            'amount': str(amount),
                            'recipient': recipient_phone,
                            'status': 'completed',
                            'message': 'Transfer completed successfully'
                        }
                    })
                else:
                    # Recipient is not a Dott user - send invitation
                    # TODO: Send SMS invitation
                    return Response({
                        'success': True,
                        'data': {
                            'transfer_id': str(transfer_request.id),
                            'amount': str(amount),
                            'recipient': recipient_phone,
                            'status': 'pending',
                            'message': 'Transfer request created. Recipient will be notified.'
                        }
                    })
                    
        except Exception as e:
            logger.error(f"Error sending money: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get wallet transaction history"""
        try:
            provider_code = request.query_params.get('provider', 'MTN_MOMO')
            limit = int(request.query_params.get('limit', 20))
            offset = int(request.query_params.get('offset', 0))
            
            wallet = MobileMoneyWallet.objects.filter(
                user=request.user,
                provider__name=provider_code
            ).first()
            
            if not wallet:
                return Response({
                    'success': True,
                    'data': []
                })
            
            transactions = WalletTransaction.objects.filter(
                wallet=wallet
            ).order_by('-created_at')[offset:offset+limit]
            
            serializer = WalletTransactionSerializer(transactions, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error getting transactions: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def requests(self, request):
        """Get money transfer requests"""
        try:
            request_type = request.query_params.get('type', 'received')  # 'sent' or 'received'
            
            if request_type == 'sent':
                requests = WalletTransferRequest.objects.filter(
                    requester=request.user,
                    status='pending'
                ).order_by('-created_at')
            else:
                requests = WalletTransferRequest.objects.filter(
                    recipient_user=request.user,
                    status='pending'
                ).order_by('-created_at')
            
            # Check for expired requests
            for req in requests:
                if req.is_expired():
                    req.status = 'expired'
                    req.save()
            
            # Filter out expired
            requests = requests.exclude(status='expired')
            
            serializer = WalletTransferRequestSerializer(requests, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error getting requests: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def accept_request(self, request):
        """Accept a money transfer request"""
        try:
            request_id = request.data.get('request_id')
            
            transfer_request = WalletTransferRequest.objects.get(
                id=request_id,
                recipient_user=request.user,
                status='pending'
            )
            
            if transfer_request.is_expired():
                transfer_request.status = 'expired'
                transfer_request.save()
                return Response({
                    'success': False,
                    'error': 'Request has expired'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get requester's wallet - match by user and provider
            requester_wallet = MobileMoneyWallet.objects.filter(
                user=transfer_request.requester
            ).first()
            
            if not requester_wallet or requester_wallet.available_balance < transfer_request.amount:
                return Response({
                    'success': False,
                    'error': 'Requester has insufficient balance'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get recipient's wallet
            recipient_wallet, _ = MobileMoneyWallet.objects.get_or_create(
                user=request.user,
                provider=requester_wallet.provider,
                defaults={
                    'phone_number': request.user.profile.phone_number or '',
                    'tenant': request.tenant
                }
            )
            
            with transaction.atomic():
                reference = f"TRF-{uuid.uuid4().hex[:8].upper()}"
                
                # Process transfer
                requester_wallet.deduct_funds(
                    amount=transfer_request.amount,
                    reference=reference,
                    description=f"Transfer to {transfer_request.recipient_phone}"
                )
                
                recipient_wallet.add_funds(
                    amount=transfer_request.amount,
                    reference=reference,
                    description=f"Transfer from {transfer_request.requester.profile.phone_number or transfer_request.requester.email}"
                )
                
                # Update request
                transfer_request.status = 'accepted'
                transfer_request.responded_at = timezone.now()
                transfer_request.response_message = 'Transfer accepted'
                transfer_request.save()
                
                return Response({
                    'success': True,
                    'data': {
                        'reference': reference,
                        'amount': str(transfer_request.amount),
                        'message': 'Transfer completed successfully'
                    }
                })
                
        except WalletTransferRequest.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error accepting request: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def reject_request(self, request):
        """Reject a money transfer request"""
        try:
            request_id = request.data.get('request_id')
            reason = request.data.get('reason', 'Request rejected by recipient')
            
            transfer_request = WalletTransferRequest.objects.get(
                id=request_id,
                recipient_user=request.user,
                status='pending'
            )
            
            transfer_request.status = 'rejected'
            transfer_request.responded_at = timezone.now()
            transfer_request.response_message = reason
            transfer_request.save()
            
            return Response({
                'success': True,
                'message': 'Request rejected successfully'
            })
            
        except WalletTransferRequest.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error rejecting request: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def providers(self, request):
        """Get available mobile money providers"""
        try:
            providers = MobileMoneyProvider.objects.filter(is_active=True)
            serializer = MobileMoneyProviderSerializer(providers, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error getting providers: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
