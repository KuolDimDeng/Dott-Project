"""
Tax Reporting API Views
Provides endpoints for tax summaries, reports, and filings
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from taxes.models import TaxAccount, TaxTransaction, TaxPeriodSummary, TaxAccountingFiling
from taxes.serializers import (
    TaxAccountSerializer,
    TaxTransactionSerializer,
    TaxPeriodSummarySerializer
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tax_summary(request):
    """
    Get tax summary for a specific period
    Query params:
    - period_start: YYYY-MM-DD
    - period_end: YYYY-MM-DD
    - tax_type: SALES_TAX, VAT, etc.
    """
    try:
        # Parse dates
        period_start = request.GET.get('period_start')
        period_end = request.GET.get('period_end')
        tax_type = request.GET.get('tax_type', 'SALES_TAX')
        
        if not period_start or not period_end:
            # Default to current month
            today = timezone.now().date()
            period_start = today.replace(day=1)
            next_month = today.replace(day=28) + timedelta(days=4)
            period_end = (next_month - timedelta(days=next_month.day)).date()
        else:
            period_start = datetime.strptime(period_start, '%Y-%m-%d').date()
            period_end = datetime.strptime(period_end, '%Y-%m-%d').date()
        
        # Get summaries for user's tenant
        summaries = TaxPeriodSummary.objects.filter(
            tenant_id=request.user.tenant_id,
            period_start__gte=period_start,
            period_end__lte=period_end,
            tax_account__tax_type=tax_type
        ).select_related('tax_account')
        
        # Calculate totals across all jurisdictions
        total_data = summaries.aggregate(
            total_sales=Sum('total_sales'),
            taxable_sales=Sum('taxable_sales'),
            non_taxable_sales=Sum('non_taxable_sales'),
            exempt_sales=Sum('exempt_sales'),
            tax_collected=Sum('tax_collected'),
            tax_paid=Sum('tax_paid'),
            tax_due=Sum('tax_due')
        )
        
        # Get jurisdiction breakdown
        jurisdiction_breakdown = []
        for summary in summaries:
            jurisdiction_breakdown.append({
                'jurisdiction': summary.tax_account.jurisdiction_name,
                'jurisdiction_level': summary.tax_account.jurisdiction_level,
                'tax_rate': float(summary.tax_account.tax_rate * 100),
                'taxable_sales': float(summary.taxable_sales),
                'tax_collected': float(summary.tax_collected),
                'tax_due': float(summary.tax_due),
                'filing_status': summary.filing_status,
                'filing_due_date': period_end.replace(
                    day=min(summary.tax_account.filing_due_day, 28)
                ).isoformat() if summary.tax_account.filing_due_day else None
            })
        
        return Response({
            'success': True,
            'period': {
                'start': period_start.isoformat(),
                'end': period_end.isoformat()
            },
            'summary': {
                'total_sales': float(total_data['total_sales'] or 0),
                'taxable_sales': float(total_data['taxable_sales'] or 0),
                'non_taxable_sales': float(total_data['non_taxable_sales'] or 0),
                'exempt_sales': float(total_data['exempt_sales'] or 0),
                'tax_collected': float(total_data['tax_collected'] or 0),
                'tax_paid': float(total_data['tax_paid'] or 0),
                'tax_due': float(total_data['tax_due'] or 0)
            },
            'jurisdictions': jurisdiction_breakdown
        })
        
    except Exception as e:
        logger.error(f"Error getting tax summary: {str(e)}")
        return Response(
            {'error': 'Failed to get tax summary'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tax_transactions(request):
    """
    Get detailed tax transactions for a period
    Query params:
    - period_start: YYYY-MM-DD
    - period_end: YYYY-MM-DD
    - source_type: POS, INVOICE, etc.
    - status: COLLECTED, PAID, etc.
    """
    try:
        # Parse filters
        period_start = request.GET.get('period_start')
        period_end = request.GET.get('period_end')
        source_type = request.GET.get('source_type')
        status_filter = request.GET.get('status')
        
        # Build query
        filters = {'tenant_id': request.user.tenant_id}
        
        if period_start:
            filters['transaction_date__date__gte'] = datetime.strptime(period_start, '%Y-%m-%d').date()
        if period_end:
            filters['transaction_date__date__lte'] = datetime.strptime(period_end, '%Y-%m-%d').date()
        if source_type:
            filters['source_type'] = source_type
        if status_filter:
            filters['status'] = status_filter
        
        # Get transactions
        transactions = TaxTransaction.objects.filter(**filters).select_related(
            'tax_account', 'journal_entry'
        ).order_by('-transaction_date')[:100]  # Limit to 100 most recent
        
        # Serialize
        serializer = TaxTransactionSerializer(transactions, many=True)
        
        return Response({
            'success': True,
            'count': len(transactions),
            'transactions': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting tax transactions: {str(e)}")
        return Response(
            {'error': 'Failed to get tax transactions'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tax_filing(request):
    """
    Create a tax filing record
    """
    try:
        data = request.data
        
        # Get tax account
        tax_account = TaxAccount.objects.get(
            id=data['tax_account_id'],
            tenant_id=request.user.tenant_id
        )
        
        # Create filing
        filing = TaxAccountingFiling.objects.create(
            tenant_id=request.user.tenant_id,
            filing_date=timezone.now().date(),
            period_start=datetime.strptime(data['period_start'], '%Y-%m-%d').date(),
            period_end=datetime.strptime(data['period_end'], '%Y-%m-%d').date(),
            tax_account=tax_account,
            gross_sales=Decimal(str(data.get('gross_sales', 0))),
            taxable_sales=Decimal(str(data.get('taxable_sales', 0))),
            non_taxable_sales=Decimal(str(data.get('non_taxable_sales', 0))),
            tax_collected=Decimal(str(data.get('tax_collected', 0))),
            tax_due=Decimal(str(data.get('tax_due', 0))),
            filing_method=data.get('filing_method', 'ELECTRONIC'),
            confirmation_number=data.get('confirmation_number', ''),
            created_by=request.user
        )
        
        # Mark related transactions as filed
        TaxTransaction.objects.filter(
            tenant_id=request.user.tenant_id,
            tax_account=tax_account,
            transaction_date__date__gte=filing.period_start,
            transaction_date__date__lte=filing.period_end,
            status='COLLECTED'
        ).update(
            status='FILED',
            tax_filing=filing
        )
        
        # Update period summary
        try:
            summary = TaxPeriodSummary.objects.get(
                tenant_id=request.user.tenant_id,
                tax_account=tax_account,
                period_start=filing.period_start,
                period_end=filing.period_end
            )
            summary.filing_status = 'FILED'
            summary.save()
        except TaxPeriodSummary.DoesNotExist:
            pass
        
        return Response({
            'success': True,
            'message': f'Tax filing created for {tax_account.name}',
            'filing': {
                'id': str(filing.id),
                'filing_date': filing.filing_date.isoformat(),
                'period_start': filing.period_start.isoformat(),
                'period_end': filing.period_end.isoformat(),
                'tax_collected': float(filing.tax_collected),
                'tax_due': float(filing.tax_due)
            }
        })
        
    except TaxAccount.DoesNotExist:
        return Response(
            {'error': 'Tax account not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error creating tax filing: {str(e)}")
        return Response(
            {'error': 'Failed to create tax filing'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tax_liability(request):
    """
    Get current tax liability (what's owed but not yet paid)
    """
    try:
        # Get all unpaid tax
        liability = TaxTransaction.objects.filter(
            tenant_id=request.user.tenant_id,
            status__in=['COLLECTED', 'FILED']
        ).aggregate(
            total_liability=Sum('tax_collected')
        )
        
        # Get liability by jurisdiction
        by_jurisdiction = []
        tax_accounts = TaxAccount.objects.filter(
            tenant_id=request.user.tenant_id,
            is_active=True
        )
        
        for account in tax_accounts:
            account_liability = TaxTransaction.objects.filter(
                tenant_id=request.user.tenant_id,
                tax_account=account,
                status__in=['COLLECTED', 'FILED']
            ).aggregate(
                liability=Sum('tax_collected')
            )
            
            if account_liability['liability']:
                by_jurisdiction.append({
                    'jurisdiction': account.jurisdiction_name,
                    'jurisdiction_level': account.jurisdiction_level,
                    'tax_type': account.tax_type,
                    'liability': float(account_liability['liability']),
                    'filing_frequency': account.filing_frequency,
                    'next_filing_due': self._get_next_filing_date(account)
                })
        
        return Response({
            'success': True,
            'total_liability': float(liability['total_liability'] or 0),
            'by_jurisdiction': by_jurisdiction
        })
        
    except Exception as e:
        logger.error(f"Error getting tax liability: {str(e)}")
        return Response(
            {'error': 'Failed to get tax liability'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _get_next_filing_date(tax_account):
    """Helper to calculate next filing due date"""
    today = timezone.now().date()
    
    if tax_account.filing_frequency == 'MONTHLY':
        # Next month, on the filing_due_day
        next_month = today.replace(day=28) + timedelta(days=4)
        return next_month.replace(day=min(tax_account.filing_due_day, 28)).isoformat()
    elif tax_account.filing_frequency == 'QUARTERLY':
        # Next quarter end
        current_quarter = (today.month - 1) // 3
        next_quarter_month = ((current_quarter + 1) * 3) + 1
        if next_quarter_month > 12:
            next_quarter_month = 1
            year = today.year + 1
        else:
            year = today.year
        return datetime(year, next_quarter_month, min(tax_account.filing_due_day, 28)).date().isoformat()
    else:
        # Annual - next year
        return datetime(today.year + 1, 1, min(tax_account.filing_due_day, 28)).date().isoformat()