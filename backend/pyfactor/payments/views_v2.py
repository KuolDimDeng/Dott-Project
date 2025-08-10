# payments/views_v2.py - Enhanced Payment System Views
import json
import logging
from decimal import Decimal
from typing import Dict, Any

from django.conf import settings
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpRequest

from rest_framework import status, permissions, viewsets
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    PaymentGateway, PaymentMethod, Transaction, WebhookEvent,
    PaymentAuditLog, PaymentReconciliation, PaymentConfiguration
)
from .serializers import (
    PaymentGatewaySerializer, PaymentMethodSerializer, TransactionSerializer,
    WebhookEventSerializer, PaymentAuditLogSerializer, PaymentReconciliationSerializer,
    PaymentConfigurationSerializer, ProcessPaymentRequestSerializer,
    ProcessPaymentResponseSerializer, AddPaymentMethodRequestSerializer,
    WebhookProcessingResponseSerializer, TransactionSummarySerializer,
    GatewaySummarySerializer
)
from .utils import PaymentProcessorFactory, get_client_ip, create_audit_log

logger = logging.getLogger(__name__)

class PaymentGatewayViewSet(TenantIsolatedViewSet):
    """ViewSet for managing payment gateways"""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentGatewaySerializer
    
    def get_queryset(self):
        return PaymentGateway.objects.filter(status='active').order_by('priority')
    
    @action(detail=True, methods=['post'])
    def test_credentials(self, request, pk=None):
        """Test gateway credentials"""
        logger.debug("🎯 [PaymentGatewayViewSet.test_credentials] === START ===")
        
        gateway = self.get_object()
        logger.debug(f"🎯 [PaymentGatewayViewSet.test_credentials] Testing gateway: {gateway.display_name}")
        
        try:
            processor = PaymentProcessorFactory.get_processor(gateway)
            is_valid = processor.validate_credentials()
            
            # Log the test
            create_audit_log(
                user=request.user,
                action='gateway_credential_test',
                description=f"Tested credentials for {gateway.display_name}",
                gateway=gateway,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'result': is_valid}
            )
            
            logger.debug(f"🎯 [PaymentGatewayViewSet.test_credentials] Credentials valid: {is_valid}")
            
            return Response({
                "success": True,
                "data": {"valid": is_valid},
                "message": "Credentials are valid" if is_valid else "Credentials are invalid"
            })
            
        except Exception as e:
            logger.error(f"🎯 [PaymentGatewayViewSet.test_credentials] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error testing credentials: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def supported_features(self, request, pk=None):
        """Get supported features for a gateway"""
        gateway = self.get_object()
        
        try:
            processor = PaymentProcessorFactory.get_processor(gateway)
            
            features = {
                "currencies": processor.get_supported_currencies(),
                "countries": processor.get_supported_countries(),
                "payment_methods": [],
                "capabilities": {
                    "payments": gateway.supports_payments,
                    "payouts": gateway.supports_payouts,
                    "refunds": gateway.supports_refunds,
                    "recurring": gateway.supports_recurring,
                    "webhooks": gateway.supports_webhooks
                }
            }
            
            return Response({
                "success": True,
                "data": features,
                "message": "Features retrieved successfully"
            })
            
        except Exception as e:
            logger.error(f"Error getting gateway features: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error retrieving features: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentMethodViewSet(TenantIsolatedViewSet):
    """ViewSet for managing payment methods"""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentMethodSerializer
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        """Create payment method with audit logging"""
        payment_method = serializer.save(user=self.request.user)
        
        create_audit_log(
            user=self.request.user,
            action='method_added',
            description=f"Added {payment_method.method_type} payment method",
            payment_method=payment_method,
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a payment method"""
        logger.debug("🎯 [PaymentMethodViewSet.verify] === START ===")
        
        payment_method = self.get_object()
        verification_data = request.data
        
        logger.debug(f"🎯 [PaymentMethodViewSet.verify] Verifying method: {payment_method.id}")
        
        try:
            processor = PaymentProcessorFactory.get_processor(payment_method.gateway)
            result = processor.verify_payment_method(payment_method, verification_data)
            
            if result.success:
                payment_method.verification_status = 'verified'
                payment_method.save(update_fields=['verification_status'])
                
                create_audit_log(
                    user=request.user,
                    action='method_verified',
                    description=f"Verified {payment_method.method_type} payment method",
                    payment_method=payment_method,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                logger.debug("🎯 [PaymentMethodViewSet.verify] Verification successful")
                
                return Response({
                    "success": True,
                    "data": {"verified": True},
                    "message": "Payment method verified successfully"
                })
            else:
                payment_method.verification_status = 'failed'
                payment_method.verification_attempts += 1
                payment_method.save(update_fields=['verification_status', 'verification_attempts'])
                
                logger.debug(f"🎯 [PaymentMethodViewSet.verify] Verification failed: {result.error_message}")
                
                return Response({
                    "success": False,
                    "data": {"verified": False},
                    "message": result.error_message or "Verification failed"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"🎯 [PaymentMethodViewSet.verify] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error verifying payment method: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default"""
        payment_method = self.get_object()
        
        # Remove default from other methods
        PaymentMethod.objects.filter(
            user=request.user,
            is_default=True
        ).update(is_default=False)
        
        # Set this as default
        payment_method.is_default = True
        payment_method.save(update_fields=['is_default'])
        
        return Response({
            "success": True,
            "data": {"is_default": True},
            "message": "Payment method set as default"
        })

class TransactionViewSet(TenantIsolatedViewSet):
    """ViewSet for managing transactions"""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related(
            'gateway', 'payment_method', 'reconciled_by'
        ).order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get real-time transaction status from gateway"""
        logger.debug("🎯 [TransactionViewSet.status] === START ===")
        
        transaction_obj = self.get_object()
        logger.debug(f"🎯 [TransactionViewSet.status] Checking status for: {transaction_obj.reference_number}")
        
        try:
            if not transaction_obj.gateway_transaction_id:
                return Response({
                    "success": False,
                    "data": {},
                    "message": "No gateway transaction ID available"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            processor = PaymentProcessorFactory.get_processor(transaction_obj.gateway)
            result = processor.get_transaction_status(transaction_obj.gateway_transaction_id)
            
            if result.success:
                # Update local transaction if status changed
                gateway_status = result.gateway_response.get('status')
                if gateway_status and gateway_status != transaction_obj.status:
                    transaction_obj.status = gateway_status
                    transaction_obj.gateway_response = result.gateway_response
                    transaction_obj.save(update_fields=['status', 'gateway_response'])
                
                logger.debug(f"🎯 [TransactionViewSet.status] Status: {gateway_status}")
                
                return Response({
                    "success": True,
                    "data": {
                        "status": gateway_status,
                        "gateway_response": result.gateway_response
                    },
                    "message": "Status retrieved successfully"
                })
            else:
                return Response({
                    "success": False,
                    "data": {},
                    "message": result.error_message or "Failed to get status"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"🎯 [TransactionViewSet.status] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error getting transaction status: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed transaction"""
        logger.debug("🎯 [TransactionViewSet.retry] === START ===")
        
        transaction_obj = self.get_object()
        
        if not transaction_obj.can_be_retried():
            return Response({
                "success": False,
                "data": {},
                "message": "Transaction cannot be retried"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            processor = PaymentProcessorFactory.get_processor(transaction_obj.gateway)
            
            if transaction_obj.transaction_type == 'payment':
                result = processor.process_payment(transaction_obj, transaction_obj.payment_method)
            elif transaction_obj.transaction_type == 'payout':
                result = processor.process_payout(transaction_obj, transaction_obj.payment_method)
            else:
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Unsupported transaction type for retry"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if result.success:
                transaction_obj.status = 'processing'
                transaction_obj.gateway_transaction_id = result.transaction_id
                transaction_obj.gateway_response = result.gateway_response
                transaction_obj.retry_count += 1
                transaction_obj.save()
                
                logger.debug("🎯 [TransactionViewSet.retry] Retry successful")
                
                return Response({
                    "success": True,
                    "data": {"transaction_id": result.transaction_id},
                    "message": "Transaction retry initiated successfully"
                })
            else:
                transaction_obj.mark_as_failed(result.error_message, result.error_code)
                
                return Response({
                    "success": False,
                    "data": {},
                    "message": result.error_message or "Retry failed"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"🎯 [TransactionViewSet.retry] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error retrying transaction: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProcessPaymentView(APIView):
    """Unified payment processing endpoint"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Process a payment transaction"""
        logger.debug("🎯 [ProcessPaymentView] === START ===")
        logger.debug(f"🎯 [ProcessPaymentView] User: {request.user.id}")
        logger.debug(f"🎯 [ProcessPaymentView] Request data: {request.data}")
        
        # Validate request data
        serializer = ProcessPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.debug(f"🎯 [ProcessPaymentView] Validation errors: {serializer.errors}")
            return Response({
                "success": False,
                "data": {},
                "message": "Invalid request data",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            with db_transaction.atomic():
                # Determine gateway
                gateway = None
                if data.get('gateway_id'):
                    gateway = get_object_or_404(PaymentGateway, id=data['gateway_id'], status='active')
                else:
                    # Use default gateway for user's configuration
                    try:
                        config = PaymentConfiguration.objects.get(tenant_id=getattr(request.user, 'tenant_id', None))
                        gateway = config.default_gateway
                    except PaymentConfiguration.DoesNotExist:
                        # Fall back to highest priority active gateway
                        gateway = PaymentGateway.objects.filter(status='active').order_by('priority').first()
                
                if not gateway:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "No payment gateway available"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.debug(f"🎯 [ProcessPaymentView] Using gateway: {gateway.display_name}")
                
                # Get payment method if specified
                payment_method = None
                if data.get('payment_method_id'):
                    payment_method = get_object_or_404(
                        PaymentMethod, 
                        id=data['payment_method_id'], 
                        user=request.user,
                        is_active=True
                    )
                
                # Calculate fees
                fee_breakdown = gateway.calculate_fees(data['amount'])
                
                # Create transaction record
                transaction_obj = Transaction.objects.create(
                    user=request.user,
                    transaction_type='payment',
                    amount=data['amount'],
                    gross_amount=data['amount'],
                    fee_amount=fee_breakdown['total_fee'],
                    currency=data['currency'].upper(),
                    description=data.get('description', ''),
                    priority=data.get('priority', 'normal'),
                    gateway=gateway,
                    payment_method=payment_method,
                    recipient_email=data.get('recipient_email'),
                    recipient_phone=data.get('recipient_phone'),
                    metadata=data.get('metadata', {}),
                    client_ip=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                logger.debug(f"🎯 [ProcessPaymentView] Created transaction: {transaction_obj.reference_number}")
                
                # Process payment
                processor = PaymentProcessorFactory.get_processor(gateway)
                result = processor.process_payment(transaction_obj, payment_method)
                
                if result.success:
                    transaction_obj.status = 'processing' if not result.requires_action else 'requires_action'
                    transaction_obj.gateway_transaction_id = result.transaction_id
                    transaction_obj.gateway_response = result.gateway_response
                    transaction_obj.processed_at = timezone.now()
                    transaction_obj.save()
                    
                    # Create audit log
                    create_audit_log(
                        user=request.user,
                        action='transaction_created',
                        description=f"Created payment transaction for {data['amount']} {data['currency']}",
                        transaction=transaction_obj,
                        gateway=gateway,
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={'amount': str(data['amount']), 'currency': data['currency']}
                    )
                    
                    logger.debug("🎯 [ProcessPaymentView] Payment processing successful")
                    
                    response_data = {
                        "transaction_id": transaction_obj.id,
                        "gateway_transaction_id": result.transaction_id,
                        "status": transaction_obj.status,
                        "requires_action": result.requires_action,
                        "action_data": result.action_data,
                        "fee_breakdown": fee_breakdown,
                        "reference_number": transaction_obj.reference_number
                    }
                    
                    return Response({
                        "success": True,
                        "data": response_data,
                        "message": "Payment processed successfully"
                    })
                    
                else:
                    transaction_obj.mark_as_failed(result.error_message, result.error_code)
                    
                    logger.debug(f"🎯 [ProcessPaymentView] Payment processing failed: {result.error_message}")
                    
                    return Response({
                        "success": False,
                        "data": {
                            "transaction_id": transaction_obj.id,
                            "reference_number": transaction_obj.reference_number
                        },
                        "message": result.error_message or "Payment processing failed"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            logger.error(f"🎯 [ProcessPaymentView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while processing the payment"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProcessPayoutView(APIView):
    """Unified payout processing endpoint"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Process a payout transaction"""
        logger.debug("🎯 [ProcessPayoutView] === START ===")
        logger.debug(f"🎯 [ProcessPayoutView] User: {request.user.id}")
        logger.debug(f"🎯 [ProcessPayoutView] Request data: {request.data}")
        
        # Validate request data (reuse payment request structure)
        serializer = ProcessPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "data": {},
                "message": "Invalid request data",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            with db_transaction.atomic():
                # Get payment method (required for payouts)
                if not data.get('payment_method_id'):
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Payment method is required for payouts"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                payment_method = get_object_or_404(
                    PaymentMethod,
                    id=data['payment_method_id'],
                    user=request.user,
                    is_active=True,
                    verification_status='verified'
                )
                
                gateway = payment_method.gateway
                
                if not gateway.supports_payouts:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": f"Gateway {gateway.display_name} does not support payouts"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.debug(f"🎯 [ProcessPayoutView] Using gateway: {gateway.display_name}")
                
                # Calculate fees
                fee_breakdown = gateway.calculate_fees(data['amount'])
                
                # Create transaction record
                transaction_obj = Transaction.objects.create(
                    user=request.user,
                    transaction_type='payout',
                    amount=data['amount'],
                    gross_amount=data['amount'],
                    fee_amount=fee_breakdown['total_fee'],
                    currency=data['currency'].upper(),
                    description=data.get('description', ''),
                    priority=data.get('priority', 'normal'),
                    gateway=gateway,
                    payment_method=payment_method,
                    recipient_type='user',
                    recipient_id=request.user.id,
                    recipient_name=f"{request.user.first_name} {request.user.last_name}".strip(),
                    recipient_email=data.get('recipient_email') or request.user.email,
                    recipient_phone=data.get('recipient_phone'),
                    metadata=data.get('metadata', {}),
                    client_ip=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                logger.debug(f"🎯 [ProcessPayoutView] Created transaction: {transaction_obj.reference_number}")
                
                # Process payout
                processor = PaymentProcessorFactory.get_processor(gateway)
                result = processor.process_payout(transaction_obj, payment_method)
                
                if result.success:
                    transaction_obj.status = 'processing'
                    transaction_obj.gateway_transaction_id = result.transaction_id
                    transaction_obj.gateway_response = result.gateway_response
                    transaction_obj.processed_at = timezone.now()
                    transaction_obj.save()
                    
                    # Create audit log
                    create_audit_log(
                        user=request.user,
                        action='transaction_created',
                        description=f"Created payout transaction for {data['amount']} {data['currency']}",
                        transaction=transaction_obj,
                        gateway=gateway,
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={'amount': str(data['amount']), 'currency': data['currency']}
                    )
                    
                    logger.debug("🎯 [ProcessPayoutView] Payout processing successful")
                    
                    response_data = {
                        "transaction_id": transaction_obj.id,
                        "gateway_transaction_id": result.transaction_id,
                        "status": transaction_obj.status,
                        "fee_breakdown": fee_breakdown,
                        "reference_number": transaction_obj.reference_number,
                        "estimated_completion": transaction_obj.gateway_response.get('estimated_completion')
                    }
                    
                    return Response({
                        "success": True,
                        "data": response_data,
                        "message": "Payout processed successfully"
                    })
                    
                else:
                    transaction_obj.mark_as_failed(result.error_message, result.error_code)
                    
                    logger.debug(f"🎯 [ProcessPayoutView] Payout processing failed: {result.error_message}")
                    
                    return Response({
                        "success": False,
                        "data": {
                            "transaction_id": transaction_obj.id,
                            "reference_number": transaction_obj.reference_number
                        },
                        "message": result.error_message or "Payout processing failed"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            logger.error(f"🎯 [ProcessPayoutView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while processing the payout"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AddPaymentMethodView(APIView):
    """Add and validate payment methods"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Add a new payment method"""
        logger.debug("🎯 [AddPaymentMethodView] === START ===")
        logger.debug(f"🎯 [AddPaymentMethodView] User: {request.user.id}")
        
        # Validate request data
        serializer = AddPaymentMethodRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "data": {},
                "message": "Invalid request data",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            gateway = get_object_or_404(PaymentGateway, id=data['gateway_id'], status='active')
            
            logger.debug(f"🎯 [AddPaymentMethodView] Using gateway: {gateway.display_name}")
            
            # Process with gateway
            processor = PaymentProcessorFactory.get_processor(gateway)
            result = processor.add_payment_method(request.user, data['method_data'])
            
            if result.success:
                # Create payment method record
                payment_method = PaymentMethod.objects.create(
                    user=request.user,
                    gateway=gateway,
                    method_type=data['method_type'],
                    nickname=data.get('nickname', ''),
                    currency=data.get('currency', 'USD'),
                    is_default=data.get('is_default', False),
                    provider_account_id=result.transaction_id,
                    verification_status='pending'
                )
                
                # Store sensitive data encrypted
                payment_method.encrypt_sensitive_data(data['method_data'])
                payment_method.save()
                
                # Extract safe display data from gateway response
                gateway_response = result.gateway_response
                if gateway_response.get('account_name'):
                    payment_method.bank_name = gateway_response['account_name']
                if gateway_response.get('account_number'):
                    payment_method.account_last_four = gateway_response['account_number'][-4:]
                
                payment_method.save()
                
                # Create audit log
                create_audit_log(
                    user=request.user,
                    action='method_added',
                    description=f"Added {data['method_type']} payment method",
                    payment_method=payment_method,
                    gateway=gateway,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={'method_type': data['method_type']}
                )
                
                logger.debug("🎯 [AddPaymentMethodView] Payment method added successfully")
                
                return Response({
                    "success": True,
                    "data": {
                        "payment_method_id": payment_method.id,
                        "verification_required": payment_method.verification_status == 'pending',
                        "gateway_response": gateway_response
                    },
                    "message": "Payment method added successfully"
                })
                
            else:
                logger.debug(f"🎯 [AddPaymentMethodView] Failed to add payment method: {result.error_message}")
                
                return Response({
                    "success": False,
                    "data": {},
                    "message": result.error_message or "Failed to add payment method"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"🎯 [AddPaymentMethodView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while adding the payment method"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReconciliationView(APIView):
    """Payment reconciliation endpoints"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get reconciliation report"""
        logger.debug("🎯 [ReconciliationView] === START ===")
        
        try:
            period_start = request.query_params.get('period_start')
            period_end = request.query_params.get('period_end')
            status_filter = request.query_params.get('status', 'all')
            
            queryset = PaymentReconciliation.objects.all()
            
            if period_start:
                queryset = queryset.filter(period_start__gte=period_start)
            if period_end:
                queryset = queryset.filter(period_end__lte=period_end)
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            reconciliations = queryset.select_related('transaction', 'reconciled_by').order_by('-created_at')
            serializer = PaymentReconciliationSerializer(reconciliations, many=True)
            
            return Response({
                "success": True,
                "data": serializer.data,
                "message": "Reconciliation data retrieved successfully"
            })
            
        except Exception as e:
            logger.error(f"🎯 [ReconciliationView] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error retrieving reconciliation data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReportsView(APIView):
    """Payment reporting and analytics"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get payment reports and analytics"""
        logger.debug("🎯 [ReportsView] === START ===")
        
        try:
            report_type = request.query_params.get('type', 'summary')
            period_start = request.query_params.get('period_start')
            period_end = request.query_params.get('period_end')
            
            if report_type == 'summary':
                return self._get_transaction_summary(request, period_start, period_end)
            elif report_type == 'gateway_performance':
                return self._get_gateway_performance(request, period_start, period_end)
            elif report_type == 'fees':
                return self._get_fee_analysis(request, period_start, period_end)
            else:
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Invalid report type"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"🎯 [ReportsView] Error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": f"Error generating report: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_transaction_summary(self, request, period_start, period_end):
        """Get transaction summary statistics"""
        from django.db.models import Count, Sum, Avg, Q
        
        queryset = Transaction.objects.filter(user=request.user)
        
        if period_start:
            queryset = queryset.filter(created_at__gte=period_start)
        if period_end:
            queryset = queryset.filter(created_at__lte=period_end)
        
        # Calculate aggregates
        total_stats = queryset.aggregate(
            total_count=Count('id'),
            total_amount=Sum('amount'),
            total_fees=Sum('fee_amount'),
            average_amount=Avg('amount')
        )
        
        successful_stats = queryset.filter(status='completed').aggregate(
            successful_count=Count('id'),
            successful_amount=Sum('amount')
        )
        
        failed_stats = queryset.filter(status='failed').aggregate(
            failed_count=Count('id'),
            failed_amount=Sum('amount')
        )
        
        pending_stats = queryset.filter(status__in=['pending', 'processing']).aggregate(
            pending_count=Count('id'),
            pending_amount=Sum('amount')
        )
        
        # Calculate success rate
        success_rate = 0
        if total_stats['total_count'] > 0:
            success_rate = (successful_stats['successful_count'] or 0) / total_stats['total_count'] * 100
        
        summary = {
            'total_count': total_stats['total_count'] or 0,
            'total_amount': total_stats['total_amount'] or 0,
            'successful_count': successful_stats['successful_count'] or 0,
            'successful_amount': successful_stats['successful_amount'] or 0,
            'failed_count': failed_stats['failed_count'] or 0,
            'failed_amount': failed_stats['failed_amount'] or 0,
            'pending_count': pending_stats['pending_count'] or 0,
            'pending_amount': pending_stats['pending_amount'] or 0,
            'total_fees': total_stats['total_fees'] or 0,
            'average_amount': total_stats['average_amount'] or 0,
            'success_rate': round(success_rate, 2)
        }
        
        return Response({
            "success": True,
            "data": summary,
            "message": "Transaction summary retrieved successfully"
        })
    
    def _get_gateway_performance(self, request, period_start, period_end):
        """Get gateway performance metrics"""
        from django.db.models import Count, Sum, Avg, Q
        
        queryset = Transaction.objects.filter(user=request.user)
        
        if period_start:
            queryset = queryset.filter(created_at__gte=period_start)
        if period_end:
            queryset = queryset.filter(created_at__lte=period_end)
        
        # Group by gateway
        gateway_stats = queryset.values(
            'gateway__id', 'gateway__display_name'
        ).annotate(
            transaction_count=Count('id'),
            total_amount=Sum('amount'),
            successful_count=Count('id', filter=Q(status='completed')),
            total_fees=Sum('fee_amount'),
            avg_processing_time=Avg('gateway__average_processing_time')
        ).order_by('-transaction_count')
        
        # Calculate success rates
        for stat in gateway_stats:
            if stat['transaction_count'] > 0:
                stat['success_rate'] = round(
                    (stat['successful_count'] / stat['transaction_count']) * 100, 2
                )
            else:
                stat['success_rate'] = 0
        
        return Response({
            "success": True,
            "data": list(gateway_stats),
            "message": "Gateway performance data retrieved successfully"
        })
    
    def _get_fee_analysis(self, request, period_start, period_end):
        """Get fee analysis report"""
        from django.db.models import Sum, Avg, Count
        
        queryset = Transaction.objects.filter(user=request.user)
        
        if period_start:
            queryset = queryset.filter(created_at__gte=period_start)
        if period_end:
            queryset = queryset.filter(created_at__lte=period_end)
        
        # Fee analysis by gateway
        fee_analysis = queryset.values(
            'gateway__id', 'gateway__display_name'
        ).annotate(
            total_fees=Sum('fee_amount'),
            avg_fee=Avg('fee_amount'),
            transaction_count=Count('id'),
            total_volume=Sum('amount')
        ).order_by('-total_fees')
        
        # Calculate effective fee rates
        for analysis in fee_analysis:
            if analysis['total_volume'] and analysis['total_volume'] > 0:
                analysis['effective_fee_rate'] = round(
                    (analysis['total_fees'] / analysis['total_volume']) * 100, 4
                )
            else:
                analysis['effective_fee_rate'] = 0
        
        return Response({
            "success": True,
            "data": list(fee_analysis),
            "message": "Fee analysis retrieved successfully"
        })