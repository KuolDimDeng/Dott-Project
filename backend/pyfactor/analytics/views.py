from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F, Avg
from django.db.models.functions import TruncMonth, TruncDate, Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from sales.models import Invoice, InvoiceItem, Customer
from purchases.models import Expense, Vendor
from banking.models import BankAccount, BankTransaction
from inventory.models import Product, Service
from users.utils import get_tenant_database
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_key_metrics(request):
    """Get key business metrics for the analytics dashboard"""
    try:
        user = request.user
        database_name = get_tenant_database(user)
        
        if not database_name:
            return Response({"error": "Database not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get date range from request
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        # Parse dates
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = timezone.now().date() - timedelta(days=30)
            
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
        
        # Calculate previous period for comparison
        period_days = (end_date - start_date).days
        previous_start_date = start_date - timedelta(days=period_days)
        previous_end_date = start_date - timedelta(days=1)
        
        # Get revenue data from Invoices
        current_revenue = Invoice.objects.using(database_name).filter(
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            status__in=['paid', 'partially_paid']
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        )['total']
        
        previous_revenue = Invoice.objects.using(database_name).filter(
            invoice_date__gte=previous_start_date,
            invoice_date__lte=previous_end_date,
            status__in=['paid', 'partially_paid']
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        )['total']
        
        # Get expense data
        current_expenses = Expense.objects.using(database_name).filter(
            expense_date__gte=start_date,
            expense_date__lte=end_date
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        )['total']
        
        previous_expenses = Expense.objects.using(database_name).filter(
            expense_date__gte=previous_start_date,
            expense_date__lte=previous_end_date
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        )['total']
        
        # Calculate profit
        current_profit = current_revenue - current_expenses
        previous_profit = previous_revenue - previous_expenses
        
        # Get customer data
        current_customers = Customer.objects.using(database_name).filter(
            created_at__date__lte=end_date
        ).count()
        
        new_customers = Customer.objects.using(database_name).filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).count()
        
        previous_customers = Customer.objects.using(database_name).filter(
            created_at__date__lte=previous_end_date
        ).count()
        
        # Get cash flow data from bank transactions
        cash_inflow = BankTransaction.objects.using(database_name).filter(
            date__gte=start_date,
            date__lte=end_date,
            amount__gt=0
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']
        
        cash_outflow = BankTransaction.objects.using(database_name).filter(
            date__gte=start_date,
            date__lte=end_date,
            amount__lt=0
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']
        
        # Calculate growth percentages
        def calculate_growth(current, previous):
            if previous and previous != 0:
                return float(((current - previous) / previous) * 100)
            return 0.0
        
        response_data = {
            'revenue': {
                'current': float(current_revenue),
                'previous': float(previous_revenue),
                'growth': calculate_growth(current_revenue, previous_revenue)
            },
            'expenses': {
                'current': float(current_expenses),
                'previous': float(previous_expenses),
                'growth': calculate_growth(current_expenses, previous_expenses)
            },
            'profit': {
                'current': float(current_profit),
                'previous': float(previous_profit),
                'growth': calculate_growth(current_profit, previous_profit)
            },
            'customers': {
                'current': current_customers,
                'new': new_customers,
                'growth': calculate_growth(current_customers, previous_customers)
            },
            'cashFlow': {
                'inflow': float(cash_inflow),
                'outflow': float(abs(cash_outflow)),
                'net': float(cash_inflow + cash_outflow)
            }
        }
        
        return Response({'data': response_data})
        
    except Exception as e:
        logger.error(f"Error getting key metrics: {str(e)}")
        return Response(
            {"error": "Failed to fetch metrics"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chart_data(request):
    """Get chart data for analytics visualizations"""
    try:
        user = request.user
        database_name = get_tenant_database(user)
        
        if not database_name:
            return Response({"error": "Database not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get date range from request
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        # Parse dates
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = timezone.now().date() - timedelta(days=30)
            
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
        
        # Get revenue trend by month
        revenue_trend = Invoice.objects.using(database_name).filter(
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            status__in=['paid', 'partially_paid']
        ).annotate(
            month=TruncMonth('invoice_date')
        ).values('month').annotate(
            revenue=Coalesce(Sum('total_amount'), Decimal('0'))
        ).order_by('month')
        
        # Get expense breakdown by category
        expense_breakdown = Expense.objects.using(database_name).filter(
            expense_date__gte=start_date,
            expense_date__lte=end_date
        ).values('category').annotate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        ).order_by('-total')[:5]
        
        # Get profit trend
        profit_trend = []
        for month_data in revenue_trend:
            month = month_data['month']
            revenue = month_data['revenue']
            
            expenses = Expense.objects.using(database_name).filter(
                expense_date__year=month.year,
                expense_date__month=month.month
            ).aggregate(
                total=Coalesce(Sum('total_amount'), Decimal('0'))
            )['total']
            
            profit_trend.append({
                'month': month.strftime('%b %Y'),
                'revenue': float(revenue),
                'expenses': float(expenses),
                'profit': float(revenue - expenses),
                'margin': float((revenue - expenses) / revenue * 100) if revenue > 0 else 0
            })
        
        # Get top products/services
        top_products = InvoiceItem.objects.using(database_name).filter(
            invoice__invoice_date__gte=start_date,
            invoice__invoice_date__lte=end_date,
            invoice__status__in=['paid', 'partially_paid']
        ).values('description').annotate(
            revenue=Coalesce(Sum('line_total'), Decimal('0'))
        ).order_by('-revenue')[:5]
        
        # Get top customers
        top_customers = Invoice.objects.using(database_name).filter(
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            status__in=['paid', 'partially_paid']
        ).values('customer__name').annotate(
            revenue=Coalesce(Sum('total_amount'), Decimal('0'))
        ).order_by('-revenue')[:5]
        
        # Get customer growth trend
        customer_growth = []
        current_date = start_date
        while current_date <= end_date:
            month_end = current_date + relativedelta(months=1, days=-1)
            if month_end > end_date:
                month_end = end_date
                
            total_customers = Customer.objects.using(database_name).filter(
                created_at__date__lte=month_end
            ).count()
            
            new_customers = Customer.objects.using(database_name).filter(
                created_at__date__year=current_date.year,
                created_at__date__month=current_date.month
            ).count()
            
            customer_growth.append({
                'month': current_date.strftime('%b %Y'),
                'total': total_customers,
                'new': new_customers
            })
            
            current_date = current_date + relativedelta(months=1)
        
        # Get cash flow data
        cash_flow = []
        current_date = start_date
        while current_date <= end_date:
            month_end = current_date + relativedelta(months=1, days=-1)
            if month_end > end_date:
                month_end = end_date
            
            inflow = BankTransaction.objects.using(database_name).filter(
                date__gte=current_date,
                date__lte=month_end,
                amount__gt=0
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0'))
            )['total']
            
            outflow = BankTransaction.objects.using(database_name).filter(
                date__gte=current_date,
                date__lte=month_end,
                amount__lt=0
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0'))
            )['total']
            
            cash_flow.append({
                'month': current_date.strftime('%b %Y'),
                'inflow': float(inflow),
                'outflow': float(abs(outflow)),
                'net': float(inflow + outflow)
            })
            
            current_date = current_date + relativedelta(months=1)
        
        # Format expense breakdown
        expense_categories = [
            {
                'name': item['category'] or 'Uncategorized',
                'value': float(item['total'])
            }
            for item in expense_breakdown
        ]
        
        # Format top products
        products_formatted = [
            {
                'name': item['description'][:30],
                'revenue': float(item['revenue']),
                'percentage': 0  # Will be calculated on frontend
            }
            for item in top_products
        ]
        
        # Format top customers
        customers_formatted = [
            {
                'name': item['customer__name'] or 'Unknown',
                'revenue': float(item['revenue']),
                'percentage': 0  # Will be calculated on frontend
            }
            for item in top_customers
        ]
        
        response_data = {
            'revenue': [
                {
                    'month': item['month'].strftime('%b %Y'),
                    'revenue': float(item['revenue']),
                    'lastYear': 0  # TODO: Add last year comparison
                }
                for item in revenue_trend
            ],
            'expenses': expense_categories,
            'profitTrend': profit_trend,
            'customerGrowth': customer_growth,
            'topProducts': products_formatted,
            'topCustomers': customers_formatted,
            'cashFlow': cash_flow
        }
        
        return Response({'data': response_data})
        
    except Exception as e:
        logger.error(f"Error getting chart data: {str(e)}")
        return Response(
            {"error": "Failed to fetch chart data"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_data(request):
    """Get complete dashboard data (metrics + charts)"""
    try:
        # Get both metrics and charts
        metrics_response = get_key_metrics(request)
        charts_response = get_chart_data(request)
        
        if metrics_response.status_code != 200 or charts_response.status_code != 200:
            return Response(
                {"error": "Failed to fetch dashboard data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        response_data = {
            'metrics': metrics_response.data.get('data', {}),
            'charts': charts_response.data.get('data', {})
        }
        
        return Response({'data': response_data})
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        return Response(
            {"error": "Failed to fetch dashboard data"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )"""
Menu stats API endpoint for dashboard overview grids.
Returns real-time statistics for Sales, Inventory, and Jobs menus.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, F, Avg
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from sales.models import Invoice, Order, Estimate, Transaction
from inventory.models import Product, Supplier, Warehouse, StockAdjustment
from crm.models import Customer
from jobs.models import Job, JobMaterial, Vehicle
from timesheets.models import TimeEntry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def menu_stats(request):
    """
    Get menu statistics for the specified section.
    """
    section = request.GET.get('section', '')
    user = request.user
    
    # Get the tenant from user profile
    tenant = getattr(user.userprofile, 'tenant', None)
    if not tenant:
        return Response({})
    
    stats = {}
    
    if section == 'sales':
        # Get today's date range
        today = timezone.now().date()
        today_start = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )
        today_end = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.max.time())
        )
        
        # Today's sales
        today_sales = Invoice.objects.filter(
            tenant=tenant,
            created_at__range=(today_start, today_end),
            status='paid'
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Open orders
        open_orders = Order.objects.filter(
            tenant=tenant,
            status__in=['pending', 'processing']
        ).count()
        
        # Pending transactions
        pending_transactions = Transaction.objects.filter(
            tenant=tenant,
            status='pending'
        ).count()
        
        # Active products
        active_products = Product.objects.filter(
            tenant=tenant,
            is_active=True
        ).count()
        
        # Total customers
        total_customers = Customer.objects.filter(
            tenant=tenant
        ).count()
        
        # Draft estimates
        draft_estimates = Estimate.objects.filter(
            tenant=tenant,
            status='draft'
        ).count()
        
        # Pending orders
        pending_orders = Order.objects.filter(
            tenant=tenant,
            status='pending'
        ).count()
        
        # Unpaid invoices
        unpaid_invoices = Invoice.objects.filter(
            tenant=tenant,
            status__in=['sent', 'overdue', 'partially_paid']
        ).count()
        
        stats = {
            'todaySales': f"${today_sales:,.2f}",
            'openOrders': open_orders,
            'pendingTransactions': pending_transactions,
            'activeProducts': active_products,
            'totalCustomers': total_customers,
            'draftEstimates': draft_estimates,
            'pendingOrders': pending_orders,
            'unpaidInvoices': unpaid_invoices,
            'reportsAvailable': 25  # Static for now
        }
        
    elif section == 'inventory':
        # Total items (active products)
        total_items = Product.objects.filter(
            tenant=tenant,
            is_active=True
        ).count()
        
        # Active products (same as total items for simplicity)
        active_products = total_items
        
        # Low stock items (quantity < reorder point)
        low_stock_items = Product.objects.filter(
            tenant=tenant,
            is_active=True,
            quantity__lt=10  # Assuming 10 as default reorder point
        ).count()
        
        # Active suppliers
        active_suppliers = Supplier.objects.filter(
            tenant=tenant,
            is_active=True
        ).count()
        
        # Recent adjustments (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_adjustments = StockAdjustment.objects.filter(
            tenant=tenant,
            created_at__gte=seven_days_ago
        ).count()
        
        # Warehouse count
        warehouse_count = Warehouse.objects.filter(
            tenant=tenant
        ).count()
        
        stats = {
            'totalItems': total_items,
            'activeProducts': active_products,
            'lowStockItems': low_stock_items,
            'activeSuppliers': active_suppliers,
            'recentAdjustments': recent_adjustments,
            'warehouseCount': warehouse_count,
            'inventoryReports': 15  # Static for now
        }
        
    elif section == 'jobs':
        # Active jobs
        active_jobs = Job.objects.filter(
            tenant=tenant,
            status__in=['in_progress', 'scheduled']
        ).count()
        
        # Total jobs
        total_jobs = Job.objects.filter(
            tenant=tenant
        ).count()
        
        # Jobs this month
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        jobs_this_month = Job.objects.filter(
            tenant=tenant,
            created_at__gte=month_start
        ).count()
        
        # Over budget jobs
        over_budget_jobs = Job.objects.filter(
            tenant=tenant,
            actual_cost__gt=F('budget')
        ).count()
        
        # Material requests
        material_requests = JobMaterial.objects.filter(
            job__tenant=tenant,
            status='pending'
        ).count()
        
        # Hours today
        today = timezone.now().date()
        hours_today = TimeEntry.objects.filter(
            tenant=tenant,
            date=today
        ).aggregate(
            total=Sum('hours')
        )['total'] or 0
        
        # Average margin (simplified calculation)
        avg_margin = Job.objects.filter(
            tenant=tenant,
            status='completed',
            revenue__gt=0
        ).aggregate(
            avg_margin=Avg(
                (F('revenue') - F('actual_cost')) * 100.0 / F('revenue')
            )
        )['avg_margin'] or 25
        
        # Active vehicles
        active_vehicles = Vehicle.objects.filter(
            tenant=tenant,
            is_active=True
        ).count()
        
        # Jobs today
        jobs_today = Job.objects.filter(
            tenant=tenant,
            scheduled_date=today
        ).count()
        
        stats = {
            'activeJobs': active_jobs,
            'totalJobs': total_jobs,
            'jobsThisMonth': jobs_this_month,
            'overBudgetJobs': over_budget_jobs,
            'materialRequests': material_requests,
            'hoursToday': hours_today,
            'avgMargin': f"{avg_margin:.1f}%",
            'activeVehicles': active_vehicles,
            'jobsToday': jobs_today,
            'jobReports': 20  # Static for now
        }
    
    return Response(stats)