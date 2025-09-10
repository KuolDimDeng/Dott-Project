"""
Payment Transactions Views
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_transactions(request):
    """
    Get payment transactions for the authenticated user
    """
    try:
        # Get query parameters
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        status_filter = request.query_params.get('status', None)
        
        # Get user's tenant
        from custom_auth.models import Tenant
        tenant = getattr(request, 'tenant', None)
        
        # Return empty list if no tenant
        if not tenant:
            return Response({
                'success': True,
                'data': {
                    'transactions': [],
                    'total': 0,
                    'limit': limit,
                    'offset': offset
                }
            })
        
        # Try to get transactions from StripePayment model
        try:
            from payments.models import StripePayment
            
            # Base query
            transactions = StripePayment.objects.filter(
                tenant_id=tenant.id
            ).order_by('-created_at')
            
            # Apply status filter if provided
            if status_filter:
                transactions = transactions.filter(status=status_filter)
            
            # Get total count
            total = transactions.count()
            
            # Apply pagination
            transactions = transactions[offset:offset + limit]
            
            # Format transactions
            transaction_list = []
            for txn in transactions:
                transaction_list.append({
                    'id': str(txn.id),
                    'amount': str(txn.amount),
                    'currency': txn.currency or 'USD',
                    'status': txn.status,
                    'payment_method': txn.payment_method_type or 'card',
                    'description': txn.description or '',
                    'created_at': txn.created_at.isoformat() if txn.created_at else None,
                    'customer_email': txn.customer_email or '',
                    'reference': txn.stripe_payment_intent_id or str(txn.id)
                })
            
            return Response({
                'success': True,
                'data': {
                    'transactions': transaction_list,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            })
            
        except Exception as e:
            # If StripePayment model doesn't exist or has issues, return empty
            logger.warning(f"Could not fetch payment transactions: {str(e)}")
            return Response({
                'success': True,
                'data': {
                    'transactions': [],
                    'total': 0,
                    'limit': limit,
                    'offset': offset
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting payment transactions: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)