from rest_framework import viewsets
from django.db.models.functions import Cast
from purchases.models import Expense
from sales.models import Invoice, InvoiceItem
from finance.views import get_user_database
from finance.models import FinanceTransaction, ChartOfAccount, Budget, JournalEntry, JournalEntryLine
from .models import FinancialData
from sales.models import Invoice
from .serializers import FinancialDataSerializer, ChartConfigurationSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncYear
# finance/views.py
from django.db.models import F, Sum, FloatField, Avg
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from django.http import JsonResponse
from rest_framework.decorators import api_view
from datetime import datetime, timedelta
import random
from decimal import Decimal
from django.db import connection, connections, transaction as db_transaction
from django.db.models.functions import TruncDate
from django.db.models.functions import Coalesce
from dateutil.relativedelta import relativedelta
from pyfactor.logging_config import get_logger
from users.models import UserProfile
from users.utils import get_tenant_database

logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_and_loss_analysis(request, time_range):
    user = request.user
    database_name = get_user_database(user)
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    end_date = timezone.now().date()
    
    if time_range == 'all':
        start_date = None
    else:
        months = int(time_range)
        start_date = end_date - relativedelta(months=months)

    revenue_accounts = ChartOfAccount.objects.using(database_name).filter(category__name='Revenue')
    cogs_accounts = ChartOfAccount.objects.using(database_name).filter(category__name='Cost of Goods Sold')
    expense_accounts = ChartOfAccount.objects.using(database_name).filter(category__name='Expense')

    def get_total(queryset, start_date=None):
        if start_date:
            return -sum(account.transactions.filter(date__gte=start_date, date__lte=end_date).aggregate(Sum('amount'))['amount__sum'] or 0 for account in queryset)
        return -sum(account.balance for account in queryset)

    total_revenue = get_total(revenue_accounts, start_date)
    total_cogs = get_total(cogs_accounts, start_date)
    total_operating_expenses = get_total(expense_accounts, start_date)
    net_income = total_revenue - total_cogs - total_operating_expenses

    # Generate timeline data
    timeline = []
    net_income_timeline = []
    current_date = start_date or ChartOfAccount.objects.using(database_name).earliest('created_at').created_at.date()
    while current_date <= end_date:
        timeline.append(current_date.strftime('%Y-%m-%d'))
        period_revenue = get_total(revenue_accounts, current_date)
        period_cogs = get_total(cogs_accounts, current_date)
        period_expenses = get_total(expense_accounts, current_date)
        net_income_timeline.append(period_revenue - period_cogs - period_expenses)
        current_date += relativedelta(months=1)

    data = {
        'totalRevenue': total_revenue,
        'totalCOGS': total_cogs,
        'totalOperatingExpenses': total_operating_expenses,
        'netIncome': net_income,
        'timeline': timeline,
        'netIncomeTimeline': net_income_timeline,
    }

    return Response(data)

class FinancialDataViewSet(viewsets.ModelViewSet):
    queryset = FinancialData.objects.all()
    serializer_class = FinancialDataSerializer

@api_view(['GET'])
def get_chart_data(request):
    try:
        x_axis = request.GET.get('x_axis')
        y_axis = request.GET.get('y_axis')
        time_granularity = int(request.GET.get('time_granularity', 12))

        # Calculate the date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30*time_granularity)

        # Get the database name using the tenant-aware utility
        user = request.user
        database_name = get_tenant_database(user)
        if not database_name:
            return JsonResponse({'error': 'Could not determine database for user'}, status=400)

        # Use the correct database
        with connections[database_name].cursor() as cursor:
            # Fetch revenue data
            revenue_data = FinanceTransaction.objects.using(database_name).filter(
                date__gte=start_date,
                date__lte=end_date,
                account__account_type__name='Revenue'
            ).values('date').annotate(
                sales=Sum('amount')
            ).order_by('date')

        # Process the data
        data = [
            {
                'date': entry['date'].strftime('%Y-%m'),
                'sales': float(entry['sales']),
                'cogs': 0,  # Placeholder, replace with actual data when available
                'operating_expenses': 0  # Placeholder, replace with actual data when available
            }
            for entry in revenue_data
        ]

        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@api_view(['GET'])
def get_balance_sheet_data(request):
    time_granularity = int(request.GET.get('time_granularity', 12))
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30*time_granularity)

    user = request.user
    database_name = get_tenant_database(user)
    if not database_name:
        return JsonResponse({'error': 'Could not determine database for user'}, status=400)

    data = []
    current_date = start_date
    while current_date <= end_date:
        assets = FinanceTransaction.objects.using(database_name).filter(
            date__lte=current_date,
            account__account_type__name__in=['Current Asset', 'Fixed Asset']
        ).aggregate(total=Sum('amount'))['total'] or 0

        liabilities = FinanceTransaction.objects.using(database_name).filter(
            date__lte=current_date,
            account__account_type__name__in=['Current Liability', 'Long Term Liability']
        ).aggregate(total=Sum('amount'))['total'] or 0

        equity = FinanceTransaction.objects.using(database_name).filter(
            date__lte=current_date,
            account__account_type__name='Equity'
        ).aggregate(total=Sum('amount'))['total'] or 0

        data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'assets': {'total': float(assets)},
            'liabilities': {'total': float(liabilities)},
            'equity': {'total': float(equity)}
        })

        current_date += timedelta(days=30)

    return JsonResponse(data, safe=False)

@api_view(['GET'])
def get_cash_flow_data(request):
    """
    Get cash flow data from journal entries.
    This reads from the double-entry accounting system (JournalEntry/JournalEntryLine)
    instead of the legacy FinanceTransaction model.
    """
    time_granularity = int(request.GET.get('time_granularity', 12))
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30*time_granularity)

    user = request.user
    database_name = get_tenant_database(user)
    if not database_name:
        # For default database, just use the default connection
        database_name = 'default'

    # Get user's business_id for filtering
    business_id = None
    if hasattr(user, 'business_id'):
        business_id = user.business_id
    elif hasattr(user, 'tenant_id'):
        business_id = user.tenant_id
    
    logger.info(f"[CashFlow] Fetching cash flow data for user {user.email} (business: {business_id}) from {start_date} to {end_date}")

    # Get cash-related accounts
    cash_accounts = ChartOfAccount.objects.using(database_name).filter(
        name__icontains='cash'
    )
    revenue_accounts = ChartOfAccount.objects.using(database_name).filter(
        name__icontains='revenue'
    ) | ChartOfAccount.objects.using(database_name).filter(
        name__icontains='sales'
    )
    expense_accounts = ChartOfAccount.objects.using(database_name).filter(
        category__name__icontains='expense'
    ) | ChartOfAccount.objects.using(database_name).filter(
        name__icontains='expense'
    )

    # Build monthly cash flow data
    cash_flow_data = []
    current_date = start_date
    
    while current_date <= end_date:
        # Calculate month range
        month_start = current_date.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
        
        # Get cash inflows (debits to cash accounts)
        cash_inflows_query = JournalEntryLine.objects.using(database_name).filter(
            account__in=cash_accounts,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        )
        if business_id:
            cash_inflows_query = cash_inflows_query.filter(journal_entry__business_id=business_id)
        cash_inflows = cash_inflows_query.aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
        
        # Get cash outflows (credits to cash accounts)
        cash_outflows_query = JournalEntryLine.objects.using(database_name).filter(
            account__in=cash_accounts,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        )
        if business_id:
            cash_outflows_query = cash_outflows_query.filter(journal_entry__business_id=business_id)
        cash_outflows = cash_outflows_query.aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
        
        # Get total revenue for the month (credits to revenue accounts)
        revenue_query = JournalEntryLine.objects.using(database_name).filter(
            account__in=revenue_accounts,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        )
        if business_id:
            revenue_query = revenue_query.filter(journal_entry__business_id=business_id)
        total_revenue = revenue_query.aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
        
        # Get total expenses for the month (debits to expense accounts)
        expenses_query = JournalEntryLine.objects.using(database_name).filter(
            account__in=expense_accounts,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        )
        if business_id:
            expenses_query = expenses_query.filter(journal_entry__business_id=business_id)
        total_expenses = expenses_query.aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
        
        net_cash_flow = cash_inflows - cash_outflows
        
        cash_flow_data.append({
            'month': month_start.strftime('%B %Y'),
            'period': month_start.strftime('%Y-%m'),
            'date': month_start.strftime('%Y-%m-%d'),
            'total_income': float(cash_inflows),
            'total_expenses': float(cash_outflows),
            'net_cash_flow': float(net_cash_flow),
            'inflow': float(cash_inflows),
            'outflow': float(cash_outflows),
            'revenue': float(total_revenue),
            'expenses': float(total_expenses)
        })
        
        # Move to next month
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    logger.info(f"[CashFlow] Returning {len(cash_flow_data)} months of data")
    
    # Return in the format expected by the frontend
    return JsonResponse({
        'success': True,
        'cash_flow_data': cash_flow_data,
        'summary': {
            'total_inflow': sum(item['inflow'] for item in cash_flow_data),
            'total_outflow': sum(item['outflow'] for item in cash_flow_data),
            'net_position': sum(item['net_cash_flow'] for item in cash_flow_data)
        }
    })

@api_view(['GET'])
def get_budget_vs_actual_data(request):
    time_range = int(request.GET.get('time_range', 3))
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30*time_range)

    user = request.user
    database_name = get_tenant_database(user)
    if not database_name:
        return JsonResponse({'error': 'Could not determine database for user'}, status=400)

    budget = Budget.objects.using(database_name).filter(
        start_date__lte=end_date,
        end_date__gte=start_date
    ).first()

    if not budget:
        return JsonResponse([], safe=False)

    data = []
    for budget_item in budget.items.all():
        actual_amount = FinanceTransaction.objects.using(database_name).filter(
            date__gte=start_date,
            date__lte=end_date,
            account__account_code=budget_item.account_code
        ).aggregate(total=Sum('amount'))['total'] or 0

        data.append({
            'account_name': budget_item.account_name,
            'budgeted_amount': float(budget_item.budgeted_amount),
            'actual_amount': float(actual_amount)
        })

    return JsonResponse(data, safe=False)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sales_analysis_data(request):
    try:
        time_range = int(request.GET.get('time_range', 3))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30*time_range)

        user = request.user
        
        # Get the database name using the tenant-aware utility
        database_name = get_tenant_database(user)
        if not database_name:
            return JsonResponse({'error': 'Could not determine database for user'}, status=400)

        logger.info(f"Fetching sales data for user {user.id} from database {database_name}")

        invoices = Invoice.objects.using(database_name).filter(date__gte=start_date, date__lte=end_date)

        sales_over_time = list(invoices.values('date').annotate(amount=Sum('totalAmount')).order_by('date'))

        top_products = list(InvoiceItem.objects.using(database_name).filter(invoice__in=invoices)
            .values('product__name')
            .annotate(sales=Sum(
                Cast('unit_price', FloatField()) * Cast('quantity', FloatField())
            ))
            .order_by('-sales')[:5])

        sales_by_customer = list(invoices.values('customer__customerName')
            .annotate(sales=Sum('totalAmount'))
            .order_by('-sales')[:10])

        total_sales = invoices.aggregate(total=Sum('totalAmount'))['total'] or 0
        average_order_value = invoices.aggregate(avg=Avg('totalAmount'))['avg'] or 0
        number_of_orders = invoices.count()

        data = {
            'salesOverTime': sales_over_time,
            'topProducts': top_products,
            'salesByCustomer': sales_by_customer,
            'totalSales': float(total_sales),
            'averageOrderValue': float(average_order_value),
            'numberOfOrders': number_of_orders,
        }

        logger.info("Sales data fetched successfully")
        return JsonResponse(data)

    except Exception as e:
        logger.error(f"Error in get_sales_analysis_data: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_expense_analysis_data(request):
    try:
        time_range = int(request.GET.get('time_range', 3))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30*time_range)

        user = request.user
        
        # Get the database name using the tenant-aware utility
        database_name = get_tenant_database(user)
        if not database_name:
            return JsonResponse({'error': 'Could not determine database for user'}, status=400)

        logger.info(f"Fetching expense data for user {user.id} from database {database_name}")

        expenses = Expense.objects.using(database_name).filter(date__gte=start_date, date__lte=end_date)

        expenses_over_time = list(expenses
            .annotate(trunc_date=TruncDate('date'))
            .values('trunc_date')
            .annotate(amount=Sum('amount'))
            .order_by('trunc_date'))

        expenses_by_category = list(expenses
            .values('category')
            .annotate(amount=Sum('amount'))
            .order_by('-amount')[:5])

        expenses_by_vendor = list(expenses
            .values('vendor')
            .annotate(amount=Sum('amount'))
            .order_by('-amount')[:10])

        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        average_expense = expenses.aggregate(avg=Avg('amount'))['avg'] or 0
        number_of_expenses = expenses.count()

        data = {
            'expensesOverTime': [{'date': item['trunc_date'].strftime('%Y-%m-%d'), 'amount': float(item['amount'])} for item in expenses_over_time],
            'expensesByCategory': [{'category': item['category'], 'amount': float(item['amount'])} for item in expenses_by_category],
            'expensesByVendor': [{'vendor': item['vendor'], 'amount': float(item['amount'])} for item in expenses_by_vendor],
            'totalExpenses': float(total_expenses),
            'averageExpense': float(average_expense),
            'numberOfExpenses': number_of_expenses,
        }

        logger.info("Expense data fetched successfully")
        return JsonResponse(data)

    except Exception as e:
        logger.error(f"Error in get_expense_analysis_data: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)
    

def calculate_revenue_growth_rate(database_name):
    end_date = timezone.now().date()
    start_date = end_date - relativedelta(months=1)
    previous_start_date = start_date - relativedelta(months=1)

    current_revenue = Invoice.objects.using(database_name).filter(
        date__range=[start_date, end_date]
    ).aggregate(total=Coalesce(Sum('totalAmount'), Decimal('0')))['total']

    previous_revenue = Invoice.objects.using(database_name).filter(
        date__range=[previous_start_date, start_date]
    ).aggregate(total=Coalesce(Sum('totalAmount'), Decimal('0')))['total']

    if previous_revenue == 0:
        return 0
    return (current_revenue - previous_revenue) / previous_revenue

def calculate_gross_profit_margin(database_name):
    end_date = timezone.now().date()
    start_date = end_date - relativedelta(months=1)

    revenue = Invoice.objects.using(database_name).filter(
        date__range=[start_date, end_date]
    ).aggregate(total=Coalesce(Sum('totalAmount'), Decimal('0')))['total']

    cogs = Expense.objects.using(database_name).filter(
        date__range=[start_date, end_date],
        category='Cost of Goods Sold'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    if revenue == 0:
        return 0
    return (revenue - cogs) / revenue

def calculate_net_profit_margin(database_name):
    end_date = timezone.now().date()
    start_date = end_date - relativedelta(months=1)

    revenue = Invoice.objects.using(database_name).filter(
        date__range=[start_date, end_date]
    ).aggregate(total=Coalesce(Sum('totalAmount'), Decimal('0')))['total']

    expenses = Expense.objects.using(database_name).filter(
        date__range=[start_date, end_date]
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    net_income = revenue - expenses

    if revenue == 0:
        return 0
    return net_income / revenue

def calculate_current_ratio(database_name):
    current_assets = ChartOfAccount.objects.using(database_name).filter(
        category__name='Current Asset'
    ).aggregate(total=Coalesce(Sum('balance'), Decimal('0')))['total']

    current_liabilities = ChartOfAccount.objects.using(database_name).filter(
        category__name='Current Liability'
    ).aggregate(total=Coalesce(Sum('balance'), Decimal('0')))['total']

    if current_liabilities == 0:
        return None
    return current_assets / current_liabilities

def calculate_debt_to_equity_ratio(database_name):
    total_liabilities = ChartOfAccount.objects.using(database_name).filter(
        category__name__in=['Current Liability', 'Long Term Liability']
    ).aggregate(total=Coalesce(Sum('balance'), Decimal('0')))['total']

    total_equity = ChartOfAccount.objects.using(database_name).filter(
        category__name='Equity'
    ).aggregate(total=Coalesce(Sum('balance'), Decimal('0')))['total']

    if total_equity == 0:
        return None
    return total_liabilities / total_equity

def calculate_cash_flow(database_name):
    end_date = timezone.now().date()
    start_date = end_date - relativedelta(months=1)

    cash_inflow = FinanceTransaction.objects.using(database_name).filter(
        date__range=[start_date, end_date],
        type='credit'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    cash_outflow = FinanceTransaction.objects.using(database_name).filter(
        date__range=[start_date, end_date],
        type='debit'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    return cash_inflow - cash_outflow

def get_historical_data(database_name, kpi_name):
    end_date = timezone.now().date()
    start_date = end_date - relativedelta(months=12)
    data = []

    current_date = start_date
    while current_date <= end_date:
        next_date = current_date + relativedelta(months=1)
        
        if kpi_name == 'revenue_growth_rate':
            value = calculate_revenue_growth_rate(database_name)
        elif kpi_name == 'gross_profit_margin':
            value = calculate_gross_profit_margin(database_name)
        elif kpi_name == 'net_profit_margin':
            value = calculate_net_profit_margin(database_name)
        elif kpi_name == 'current_ratio':
            value = calculate_current_ratio(database_name)
        elif kpi_name == 'debt_to_equity_ratio':
            value = calculate_debt_to_equity_ratio(database_name)
        elif kpi_name == 'cash_flow':
            value = calculate_cash_flow(database_name)
        else:
            value = None

        data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'value': float(value) if value is not None else None
        })

        current_date = next_date

    return data
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_kpi_data(request):
    user = request.user
    
    try:
        # Check if user profile exists and has a database name
        try:
            user_profile = UserProfile.objects.get(user=user)
            if not user_profile.database_name or not user.is_onboarded:
                return JsonResponse({
                    "message": "Onboarding not complete or database not set up yet",
                    "onboardingComplete": False
                }, status=status.HTTP_400_BAD_REQUEST)

            database_name = user_profile.database_name
                
            # Additional check to ensure the database is actually set up
            if database_name not in connections.databases:
                logger.error(f"Database {database_name} not found in Django connections for user {user.email}")
                return JsonResponse({
                    "message": "Database not properly set up",
                    "onboardingComplete": False
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except UserProfile.DoesNotExist:
            return JsonResponse({
                "error": "User profile not found",
                "onboardingComplete": False
            }, status=status.HTTP_404_NOT_FOUND)

        # Proceed with KPI calculations
        try:
            revenue_growth_rate = calculate_revenue_growth_rate(database_name)
            gross_profit_margin = calculate_gross_profit_margin(database_name)
            net_profit_margin = calculate_net_profit_margin(database_name)
            current_ratio = calculate_current_ratio(database_name)
            debt_to_equity_ratio = calculate_debt_to_equity_ratio(database_name)
            cash_flow = calculate_cash_flow(database_name)

            historical_data = {
                'revenue_growth_rate': get_historical_data(database_name, 'revenue_growth_rate'),
                'gross_profit_margin': get_historical_data(database_name, 'gross_profit_margin'),
                'net_profit_margin': get_historical_data(database_name, 'net_profit_margin'),
                'current_ratio': get_historical_data(database_name, 'current_ratio'),
                'debt_to_equity_ratio': get_historical_data(database_name, 'debt_to_equity_ratio'),
                'cash_flow': get_historical_data(database_name, 'cash_flow'),
            }

            data = {
                'revenueGrowthRate': revenue_growth_rate,
                'grossProfitMargin': gross_profit_margin,
                'netProfitMargin': net_profit_margin,
                'currentRatio': current_ratio,
                'debtToEquityRatio': debt_to_equity_ratio,
                'cashFlow': cash_flow,
                'historicalData': historical_data,
                'onboardingComplete': True
            }

            return JsonResponse(data)

        except ProgrammingError as e:
            if "relation" in str(e) and "does not exist" in str(e):
                logger.warning(f"Table does not exist yet for user {user.email}: {str(e)}")
                return JsonResponse({
                    "message": "Your dashboard is still being set up. Please check back in a few minutes.",
                    "onboardingComplete": False,
                    "status": "pending"
                }, status=status.HTTP_202_ACCEPTED)
            else:
                logger.error(f"Unexpected database error for user {user.email}: {str(e)}")
                raise

    except Exception as e:
        logger.error(f"Error in get_kpi_data for user {user.email}: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': "An unexpected error occurred while fetching KPI data.",
            'onboardingComplete': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)