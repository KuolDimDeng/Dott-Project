"""
Daily Summary Views for POS
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_summary(request):
    """
    Get daily summary of POS transactions
    """
    try:
        # Get date parameter or use today
        date_str = request.query_params.get('date')
        if date_str:
            summary_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            summary_date = timezone.now().date()
        
        # Get POS transactions for the day
        from sales.models import POSTransaction
        from custom_auth.models import Tenant
        
        # Get user's tenant
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({
                'success': True,
                'data': {
                    'date': summary_date.isoformat(),
                    'total_sales': '0.00',
                    'transaction_count': 0,
                    'average_sale': '0.00',
                    'cash_sales': '0.00',
                    'card_sales': '0.00',
                    'mobile_money_sales': '0.00',
                    'top_products': []
                }
            })
        
        # Get transactions for the day
        transactions = POSTransaction.objects.filter(
            tenant_id=tenant.id,
            created_at__date=summary_date
        )
        
        # Calculate summary
        total_sales = transactions.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        transaction_count = transactions.count()
        average_sale = total_sales / transaction_count if transaction_count > 0 else Decimal('0.00')
        
        # Sales by payment method
        cash_sales = transactions.filter(payment_method='cash').aggregate(
            total=Sum('total_amount'))['total'] or Decimal('0.00')
        card_sales = transactions.filter(payment_method='card').aggregate(
            total=Sum('total_amount'))['total'] or Decimal('0.00')
        mobile_money_sales = transactions.filter(payment_method='mobile_money').aggregate(
            total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        return Response({
            'success': True,
            'data': {
                'date': summary_date.isoformat(),
                'total_sales': str(total_sales),
                'transaction_count': transaction_count,
                'average_sale': str(average_sale),
                'cash_sales': str(cash_sales),
                'card_sales': str(card_sales),
                'mobile_money_sales': str(mobile_money_sales),
                'top_products': []  # TODO: Implement top products
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting daily summary: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)