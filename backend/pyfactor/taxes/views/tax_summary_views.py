"""
Tax Summary Views
Provides tax data summaries for dashboard widgets
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from taxes.models import (
    TaxTransaction,
    TaxAccount,
    GlobalSalesTaxRate,
    TenantTaxSettings,
    TaxAccountingFiling,
    TaxPeriodSummary
)
from sales.models import Sale, Invoice, POSTransaction

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tax_summary(request):
    """
    Get tax summary for a specific period
    """
    try:
        user = request.user
        tenant_id = getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            return Response({
                'success': False,
                'error': 'No tenant association',
                'total_collected': 0,
                'by_jurisdiction': [],
                'average_rate': 0,
                'taxable_transactions': 0
            })
        
        # Get query parameters
        days = int(request.GET.get('days', 30))
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        # Calculate date range
        if start_date and end_date:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
        else:
            end = timezone.now()
            start = end - timedelta(days=days)
        
        # Get tax transactions for the period
        tax_transactions = TaxTransaction.objects.filter(
            tenant_id=tenant_id,
            transaction_date__gte=start,
            transaction_date__lte=end
        ).exclude(status='REVERSED')
        
        # Calculate total tax collected
        total_collected = tax_transactions.aggregate(
            total=Sum('tax_collected')
        )['total'] or Decimal('0')
        
        # Get tax by jurisdiction (using customer_location field to determine jurisdiction)
        by_jurisdiction = tax_transactions.values('tax_account__jurisdiction').annotate(
            amount=Sum('tax_collected'),
            count=Count('id'),
            rate=Avg('tax_rate_applied')
        ).order_by('-amount')[:10]
        
        # Format jurisdiction data
        jurisdiction_data = []
        for item in by_jurisdiction:
            jurisdiction_data.append({
                'jurisdiction': item['tax_account__jurisdiction'] or 'Unknown',
                'amount': float(item['amount'] or 0),
                'count': item['count'],
                'rate': float(item['rate'] or 0) if item['rate'] else 0
            })
        
        # Calculate average tax rate
        avg_rate = tax_transactions.aggregate(
            avg=Avg('tax_rate_applied')
        )['avg'] or Decimal('0')
        
        # Count taxable transactions
        taxable_count = tax_transactions.values('source_id').distinct().count()
        
        # Get POS transactions for additional data
        pos_transactions = POSTransaction.objects.filter(
            tenant_id=tenant_id,
            created_at__gte=start,
            created_at__lte=end,
            status='completed'
        )
        
        # Calculate tax from POS if no tax postings
        if total_collected == 0 and pos_transactions.exists():
            pos_tax = pos_transactions.aggregate(
                total=Sum('tax_amount')
            )['total'] or Decimal('0')
            
            if pos_tax > 0:
                total_collected = pos_tax
                taxable_count = pos_transactions.count()
                
                # Get average rate from POS
                avg_rate = pos_transactions.exclude(
                    tax_amount=0
                ).aggregate(
                    avg=Avg('tax_rate')
                )['avg'] or Decimal('0')
        
        # Get tax liability and credits
        tax_liability = Decimal('0')
        tax_credits = Decimal('0')
        
        try:
            # Get tax accounts
            tax_accounts = TaxAccount.objects.filter(
                tenant_id=tenant_id
            )
            
            for account in tax_accounts:
                if account.account_type == 'liability':
                    tax_liability += account.current_balance
                elif account.account_type == 'asset':
                    tax_credits += account.current_balance
        except Exception as e:
            logger.warning(f"Could not fetch tax account balances: {e}")
        
        response_data = {
            'success': True,
            'total_collected': float(total_collected),
            'by_jurisdiction': jurisdiction_data,
            'average_rate': float(avg_rate),
            'taxable_transactions': taxable_count,
            'tax_liability': float(tax_liability),
            'tax_credits': float(tax_credits),
            'period': {
                'start': start.isoformat(),
                'end': end.isoformat(),
                'days': days
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in tax_summary: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'total_collected': 0,
            'by_jurisdiction': [],
            'average_rate': 0,
            'taxable_transactions': 0
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tax_report_detail(request):
    """
    Get detailed tax report for filing
    """
    try:
        user = request.user
        tenant_id = getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            return Response({
                'success': False,
                'error': 'No tenant association'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get query parameters
        report_type = request.GET.get('type', 'sales_tax')
        period = request.GET.get('period', 'monthly')
        year = int(request.GET.get('year', timezone.now().year))
        month = int(request.GET.get('month', timezone.now().month))
        quarter = int(request.GET.get('quarter', 1))
        
        # Calculate date range based on period
        if period == 'monthly':
            start = datetime(year, month, 1)
            if month == 12:
                end = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                end = datetime(year, month + 1, 1) - timedelta(days=1)
        elif period == 'quarterly':
            quarter_months = {
                1: (1, 3),
                2: (4, 6),
                3: (7, 9),
                4: (10, 12)
            }
            start_month, end_month = quarter_months[quarter]
            start = datetime(year, start_month, 1)
            if end_month == 12:
                end = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                end = datetime(year, end_month + 1, 1) - timedelta(days=1)
        else:  # yearly
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31)
        
        # Get tax transactions
        transactions = TaxTransaction.objects.filter(
            tenant_id=tenant_id,
            transaction_date__gte=start,
            transaction_date__lte=end
        ).exclude(status='REVERSED')
        
        # Group by jurisdiction and tax type
        report_data = {}
        
        for transaction in transactions:
            jurisdiction = transaction.tax_account.jurisdiction if transaction.tax_account else 'Unknown'
            if jurisdiction not in report_data:
                report_data[jurisdiction] = {
                    'gross_sales': Decimal('0'),
                    'taxable_sales': Decimal('0'),
                    'exempt_sales': Decimal('0'),
                    'tax_collected': Decimal('0'),
                    'tax_rate': transaction.tax_rate_applied or Decimal('0'),
                    'transactions': 0
                }
            
            report_data[jurisdiction]['taxable_sales'] += transaction.taxable_amount
            report_data[jurisdiction]['tax_collected'] += transaction.tax_collected
            report_data[jurisdiction]['transactions'] += 1
        
        # Convert to list format
        report_lines = []
        for jurisdiction, data in report_data.items():
            report_lines.append({
                'jurisdiction': jurisdiction,
                'gross_sales': float(data['taxable_sales']),  # For now, assuming all sales are taxable
                'taxable_sales': float(data['taxable_sales']),
                'exempt_sales': float(data['exempt_sales']),
                'tax_collected': float(data['tax_collected']),
                'tax_rate': float(data['tax_rate']),
                'transactions': data['transactions']
            })
        
        # Sort by tax collected (highest first)
        report_lines.sort(key=lambda x: x['tax_collected'], reverse=True)
        
        response_data = {
            'success': True,
            'report_type': report_type,
            'period': {
                'type': period,
                'start': start.isoformat(),
                'end': end.isoformat(),
                'year': year,
                'month': month if period == 'monthly' else None,
                'quarter': quarter if period == 'quarterly' else None
            },
            'summary': {
                'total_gross_sales': sum(line['gross_sales'] for line in report_lines),
                'total_taxable_sales': sum(line['taxable_sales'] for line in report_lines),
                'total_exempt_sales': sum(line['exempt_sales'] for line in report_lines),
                'total_tax_collected': sum(line['tax_collected'] for line in report_lines),
                'total_transactions': sum(line['transactions'] for line in report_lines)
            },
            'details': report_lines
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in tax_report_detail: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)