# payments/views_qr_payment.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
import logging

from .models import QRPaymentTransaction
from .serializers import (
    CreateQRPaymentRequestSerializer,
    CreateQRPaymentResponseSerializer,
    QRPaymentStatusSerializer,
    CompleteQRPaymentRequestSerializer,
    CompleteQRPaymentResponseSerializer,
    QRPaymentTransactionSerializer
)

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_qr_payment(request):
    """
    Create a new QR payment transaction
    
    Expected data:
    {
        'business_id': 'uuid',
        'business_name': 'string',
        'amount': float,
        'currency': 'SSP/KES/etc',
        'tax': float,
        'subtotal': float,
        'items': [{'name': str, 'quantity': int, 'price': float}],
        'metadata': {}
    }
    """
    try:
        # Log request start
        logger.info(f"🎯 [QR Payment] === CREATE QR PAYMENT START === User: {request.user.id}")
        logger.info(f"🎯 [QR Payment] Request data: {request.data}")
        
        # Validate request data
        serializer = CreateQRPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"🎯 [QR Payment] Validation failed: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        logger.info(f"🎯 [QR Payment] Validated data: {validated_data}")
        
        # Create QR payment transaction
        with transaction.atomic():
            qr_transaction = QRPaymentTransaction.objects.create(
                user=request.user,
                tenant=request.user.userprofile.business,
                business_id=validated_data['business_id'],
                business_name=validated_data['business_name'],
                amount=validated_data['amount'],
                currency=validated_data['currency'],
                tax=validated_data['tax'],
                subtotal=validated_data['subtotal'],
                items=validated_data['items'],
                metadata=validated_data.get('metadata', {})
            )
            
            logger.info(f"🎯 [QR Payment] Created transaction: {qr_transaction.transaction_id}")
            
            # Calculate time remaining
            time_remaining = int((qr_transaction.expires_at - timezone.now()).total_seconds())
            
            # Prepare response
            response_data = {
                'success': True,
                'transaction_id': qr_transaction.transaction_id,
                'qr_transaction_id': qr_transaction.id,
                'expires_at': qr_transaction.expires_at,
                'time_remaining': max(0, time_remaining),
                'message': 'QR payment transaction created successfully'
            }
            
            logger.info(f"🎯 [QR Payment] Response data: {response_data}")
            
            # Validate response data
            response_serializer = CreateQRPaymentResponseSerializer(data=response_data)
            if response_serializer.is_valid():
                return Response(response_serializer.validated_data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"🎯 [QR Payment] Response validation failed: {response_serializer.errors}")
                return Response(response_data, status=status.HTTP_201_CREATED)
                
    except Exception as e:
        logger.error(f"🎯 [QR Payment] Error creating QR payment: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'Failed to create QR payment transaction',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_qr_payment_status(request, transaction_id):
    """
    Get the status of a QR payment transaction
    
    URL: /payments/qr/status/{transaction_id}/
    """
    try:
        logger.info(f"🎯 [QR Payment] === GET STATUS START === Transaction: {transaction_id}")
        
        # Get the transaction (ensure it belongs to the requesting user/tenant)
        qr_transaction = get_object_or_404(
            QRPaymentTransaction,
            transaction_id=transaction_id,
            tenant=request.user.userprofile.business
        )
        
        logger.info(f"🎯 [QR Payment] Found transaction: {qr_transaction.id} - Status: {qr_transaction.status}")
        
        # Check if transaction has expired and update status
        if qr_transaction.is_expired() and qr_transaction.status == 'pending':
            qr_transaction.mark_as_expired()
            logger.info(f"🎯 [QR Payment] Marked transaction as expired: {transaction_id}")
        
        # Calculate time remaining
        time_remaining = 0
        if not qr_transaction.is_expired():
            remaining = qr_transaction.expires_at - timezone.now()
            time_remaining = int(remaining.total_seconds()) if remaining.total_seconds() > 0 else 0
        
        # Prepare response
        response_data = {
            'success': True,
            'transaction_id': qr_transaction.transaction_id,
            'status': qr_transaction.status,
            'amount': qr_transaction.amount,
            'currency': qr_transaction.currency,
            'business_name': qr_transaction.business_name,
            'is_expired': qr_transaction.is_expired(),
            'time_remaining': time_remaining,
            'completed_at': qr_transaction.completed_at,
            'customer_name': qr_transaction.customer_name,
            'items': qr_transaction.items,
            'message': f'Transaction status: {qr_transaction.get_status_display()}'
        }
        
        logger.info(f"🎯 [QR Payment] Status response: {response_data}")
        
        # Validate response data
        response_serializer = QRPaymentStatusSerializer(data=response_data)
        if response_serializer.is_valid():
            return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
        else:
            logger.error(f"🎯 [QR Payment] Response validation failed: {response_serializer.errors}")
            return Response(response_data, status=status.HTTP_200_OK)
            
    except QRPaymentTransaction.DoesNotExist:
        logger.error(f"🎯 [QR Payment] Transaction not found: {transaction_id}")
        return Response({
            'success': False,
            'message': 'QR payment transaction not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"🎯 [QR Payment] Error getting status: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'Failed to get transaction status',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_qr_payment(request):
    """
    Complete a QR payment transaction (called by customer app)
    
    Expected data:
    {
        'transaction_id': 'string',
        'customer_name': 'string (optional)',
        'customer_email': 'string (optional)',
        'customer_phone': 'string (optional)',
        'payment_method': 'string',
        'metadata': {}
    }
    """
    try:
        logger.info(f"🎯 [QR Payment] === COMPLETE PAYMENT START === User: {request.user.id}")
        logger.info(f"🎯 [QR Payment] Request data: {request.data}")
        
        # Validate request data
        serializer = CompleteQRPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"🎯 [QR Payment] Validation failed: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        transaction_id = validated_data['transaction_id']
        
        # Get the transaction
        qr_transaction = get_object_or_404(
            QRPaymentTransaction,
            transaction_id=transaction_id
        )
        
        logger.info(f"🎯 [QR Payment] Found transaction: {qr_transaction.id} - Current status: {qr_transaction.status}")
        
        # Check if transaction can be completed
        if qr_transaction.is_expired():
            qr_transaction.mark_as_expired()
            logger.error(f"🎯 [QR Payment] Transaction expired: {transaction_id}")
            return Response({
                'success': False,
                'message': 'Transaction has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if qr_transaction.status != 'pending':
            logger.error(f"🎯 [QR Payment] Transaction not pending: {transaction_id} - Status: {qr_transaction.status}")
            return Response({
                'success': False,
                'message': f'Transaction cannot be completed. Current status: {qr_transaction.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Complete the transaction
        with transaction.atomic():
            qr_transaction.mark_as_completed(
                customer_name=validated_data.get('customer_name'),
                customer_email=validated_data.get('customer_email'),
                customer_phone=validated_data.get('customer_phone')
            )
            
            # Update metadata
            payment_metadata = validated_data.get('metadata', {})
            payment_metadata.update({
                'payment_method': validated_data.get('payment_method', 'mobile_app'),
                'completed_by_user_id': str(request.user.id),
                'completion_timestamp': timezone.now().isoformat()
            })
            qr_transaction.metadata.update(payment_metadata)
            qr_transaction.save()
            
            logger.info(f"🎯 [QR Payment] Completed transaction: {transaction_id}")
        
        # Prepare response
        response_data = {
            'success': True,
            'transaction_id': qr_transaction.transaction_id,
            'status': qr_transaction.status,
            'amount': qr_transaction.amount,
            'currency': qr_transaction.currency,
            'business_name': qr_transaction.business_name,
            'completed_at': qr_transaction.completed_at,
            'message': 'Payment completed successfully'
        }
        
        logger.info(f"🎯 [QR Payment] Complete response: {response_data}")
        
        # Validate response data
        response_serializer = CompleteQRPaymentResponseSerializer(data=response_data)
        if response_serializer.is_valid():
            return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
        else:
            logger.error(f"🎯 [QR Payment] Response validation failed: {response_serializer.errors}")
            return Response(response_data, status=status.HTTP_200_OK)
            
    except QRPaymentTransaction.DoesNotExist:
        logger.error(f"🎯 [QR Payment] Transaction not found: {validated_data.get('transaction_id', 'unknown')}")
        return Response({
            'success': False,
            'message': 'QR payment transaction not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"🎯 [QR Payment] Error completing payment: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'Failed to complete payment',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_qr_payments(request):
    """
    List QR payment transactions for the current user/business
    """
    try:
        logger.info(f"🎯 [QR Payment] === LIST QR PAYMENTS === User: {request.user.id}")
        
        # Get transactions for the current user's business
        transactions = QRPaymentTransaction.objects.filter(
            tenant=request.user.userprofile.business
        ).order_by('-created_at')
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            transactions = transactions.filter(status=status_filter)
            logger.info(f"🎯 [QR Payment] Filtered by status: {status_filter}")
        
        # Limit results
        limit = int(request.query_params.get('limit', 20))
        transactions = transactions[:limit]
        
        logger.info(f"🎯 [QR Payment] Found {transactions.count()} transactions")
        
        # Serialize the data
        serializer = QRPaymentTransactionSerializer(transactions, many=True)
        
        return Response({
            'success': True,
            'transactions': serializer.data,
            'count': len(serializer.data),
            'message': 'QR payment transactions retrieved successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"🎯 [QR Payment] Error listing payments: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'Failed to retrieve QR payment transactions',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_qr_payment(request, transaction_id):
    """
    Cancel a pending QR payment transaction
    """
    try:
        logger.info(f"🎯 [QR Payment] === CANCEL PAYMENT === Transaction: {transaction_id}")
        
        # Get the transaction (ensure it belongs to the requesting user/tenant)
        qr_transaction = get_object_or_404(
            QRPaymentTransaction,
            transaction_id=transaction_id,
            tenant=request.user.userprofile.business
        )
        
        if qr_transaction.status != 'pending':
            logger.error(f"🎯 [QR Payment] Cannot cancel non-pending transaction: {transaction_id} - Status: {qr_transaction.status}")
            return Response({
                'success': False,
                'message': f'Cannot cancel transaction. Current status: {qr_transaction.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cancel the transaction
        qr_transaction.status = 'cancelled'
        qr_transaction.metadata['cancelled_by'] = str(request.user.id)
        qr_transaction.metadata['cancelled_at'] = timezone.now().isoformat()
        qr_transaction.save()
        
        logger.info(f"🎯 [QR Payment] Cancelled transaction: {transaction_id}")
        
        return Response({
            'success': True,
            'transaction_id': qr_transaction.transaction_id,
            'status': qr_transaction.status,
            'message': 'Transaction cancelled successfully'
        }, status=status.HTTP_200_OK)
        
    except QRPaymentTransaction.DoesNotExist:
        logger.error(f"🎯 [QR Payment] Transaction not found: {transaction_id}")
        return Response({
            'success': False,
            'message': 'QR payment transaction not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"🎯 [QR Payment] Error cancelling payment: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'message': 'Failed to cancel payment',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)