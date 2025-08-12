# /Users/kuoldeng/projectx/backend/pyfactor/reports/views.py
from django.db import models
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connections, transaction as db_transaction

from purchases.models import Bill
from .serializers import AgedPayablesSerializer, AgedReceivableSerializer
from rest_framework import status
from sales.models import Invoice
from finance.views import get_user_database
from users.models import User, UserProfile
from finance.models import Account, ChartOfAccount, FinanceTransaction
from .models import Report
from .serializers import ReportSerializer
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from decimal import Decimal
from django.db.models import F, ExpressionWrapper, IntegerField, Case, When, Value
from django.db.models.functions import Cast, Extract
from datetime import datetime, timedelta, date
from django.utils import timezone
from accounting.services import AccountingStandardsService

logger = get_logger()

REPORT_TYPE_MAPPING = {
    'balance_sheet': 'BS',
    'cash_flow': 'CF',
    'income_statement': 'IS'
}

def get_report_names(business_id):
    """Get report names based on accounting standard"""
    accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)
    financial_formats = AccountingStandardsService.get_financial_statement_format(business_id)
    
    return {
        'balance_sheet': financial_formats['balance_sheet_name'],
        'income_statement': financial_formats['income_statement_name'],
        'equity_statement': financial_formats['equity_statement_name'],
        'cash_flow': 'Statement of Cash Flows'  # Same for both standards
    }

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_report(request, report_type):
    user = request.user
    logger.debug(f"Generating {report_type} report for user: {user}")

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Check if User exists in the dynamic database, if not, create it
        if not User.objects.using(database_name).filter(id=user.id).exists():
            User.objects.using(database_name).create(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                password=user.password,
                # Add any other fields that are in your User model
            )

        # Check if UserProfile exists in the dynamic database, if not, create it
        if not UserProfile.objects.using(database_name).filter(id=user_profile.id).exists():
            UserProfile.objects.using(database_name).create(
                id=user_profile.id,
                user_id=user_profile.user_id,
                database_name=user_profile.database_name,
                business_name=user_profile.business_name,
                business_type=user_profile.business_type,
                occupation=user_profile.occupation,
                street=user_profile.street,
                city=user_profile.city,
                state=user_profile.state,
                postcode=user_profile.postcode,
                country=user_profile.country,
                phone_number=user_profile.phone_number,
                # Add any other fields that are in your UserProfile model
            )

        # Get business_id for accounting standard determination
        business_id = user_profile.business_id if hasattr(user_profile, 'business_id') else None
        report_names = get_report_names(business_id)
        
        # Rest of your code...
        if report_type == 'balance_sheet':
            data = generate_balance_sheet(database_name, business_id)
            data['report_title'] = report_names['balance_sheet']
        elif report_type == 'cash_flow':
            data = generate_cash_flow(database_name, business_id)
            data['report_title'] = report_names['cash_flow']
        elif report_type == 'income_statement':
            data = generate_income_statement(database_name, business_id)
            data['report_title'] = report_names['income_statement']
        else:
            return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)

        report = Report.objects.using(database_name).create(
            user_profile_id=user_profile.id,
            report_type=report_type,
            data=data
        )

        logger.debug(f"Report generated successfully: {report}")
        console.info(f"Report generated successfully: {report}")
        return Response(data, status=status.HTTP_200_OK)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error generating report: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_reports(request):
    user = request.user
    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        reports = Report.objects.using(database_name).filter(user_profile=user_profile)
        serializer = ReportSerializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error listing reports: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def generate_balance_sheet(database_name, business_id=None):
    logger.debug(f"Generating balance sheet for database: {database_name}")
    try:
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        # Get accounting standard for proper formatting
        accounting_standard = 'IFRS'  # Default
        if business_id:
            accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)

        assets = Account.objects.using(database_name).filter(account_type__name='Asset').aggregate(total=models.Sum('balance'))['total'] or 0
        liabilities = Account.objects.using(database_name).filter(account_type__name='Liability').aggregate(total=models.Sum('balance'))['total'] or 0
        equity = Account.objects.using(database_name).filter(account_type__name='Equity').aggregate(total=models.Sum('balance'))['total'] or 0
        
        # Get current and non-current breakdowns
        current_assets = Account.objects.using(database_name).filter(
            account_type__name='Asset', 
            name__icontains='current'
        ).aggregate(total=models.Sum('balance'))['total'] or 0
        
        non_current_assets = assets - current_assets
        
        current_liabilities = Account.objects.using(database_name).filter(
            account_type__name='Liability',
            name__icontains='current'
        ).aggregate(total=models.Sum('balance'))['total'] or 0
        
        non_current_liabilities = liabilities - current_liabilities

        data = {
            'accounting_standard': accounting_standard,
            'assets': {
                'total': assets,
                'current': current_assets,
                'non_current': non_current_assets
            },
            'liabilities': {
                'total': liabilities,
                'current': current_liabilities,
                'non_current': non_current_liabilities
            },
            'equity': equity,
            'total': assets - liabilities - equity
        }
        logger.debug(f"Balance sheet generated: {data}")
        console.info(f"Balance sheet generated.")
        return data
    except Exception as e:
        logger.exception(f"Error generating balance sheet: {str(e)}")
        raise

# Similarly update generate_cash_flow and generate_income_statement
def generate_cash_flow(database_name, business_id=None):
    logger.debug(f"Generating cash flow statement for database: {database_name}")
    try:
        # Get accounting standard
        accounting_standard = 'IFRS'  # Default
        if business_id:
            accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        
        operating_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Operating').aggregate(total=models.Sum('amount'))['total'] or 0
        investing_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Investing').aggregate(total=models.Sum('amount'))['total'] or 0
        financing_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Financing').aggregate(total=models.Sum('amount'))['total'] or 0

        data = {
            'accounting_standard': accounting_standard,
            'operating_activities': operating_activities,
            'investing_activities': investing_activities,
            'financing_activities': financing_activities,
            'net_cash_flow': operating_activities + investing_activities + financing_activities,
            # Both standards use similar categories but may have slight presentation differences
            'presentation_format': 'direct' if accounting_standard == 'GAAP' else 'indirect'
        }
        logger.debug(f"Cash flow statement generated: {data}")
        console.info(f"Cash flow statement generated.")
        return data
    except Exception as e:
        logger.exception(f"Error generating cash flow statement: {str(e)}")
        raise

def generate_income_statement(database_name, business_id=None):
    logger.debug(f"Generating income statement for database: {database_name}")
    try:
        # Get accounting standard
        accounting_standard = 'IFRS'  # Default
        if business_id:
            accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        
        revenue = Account.objects.using(database_name).filter(account_type__name='Revenue').aggregate(total=models.Sum('balance'))['total'] or 0
        expenses = Account.objects.using(database_name).filter(account_type__name='Expense').aggregate(total=models.Sum('balance'))['total'] or 0
        
        # Get more detailed breakdowns
        operating_revenue = Account.objects.using(database_name).filter(
            account_type__name='Revenue',
            name__icontains='sales'
        ).aggregate(total=models.Sum('balance'))['total'] or 0
        
        other_revenue = revenue - operating_revenue
        
        operating_expenses = Account.objects.using(database_name).filter(
            account_type__name='Expense',
            name__iregex='(wage|salary|rent|utilities|supplies)'
        ).aggregate(total=models.Sum('balance'))['total'] or 0
        
        other_expenses = expenses - operating_expenses

        data = {
            'accounting_standard': accounting_standard,
            'revenue': {
                'total': revenue,
                'operating': operating_revenue,
                'other': other_revenue
            },
            'expenses': {
                'total': expenses,
                'operating': operating_expenses,
                'other': other_expenses
            },
            'operating_income': operating_revenue - operating_expenses,
            'net_income': revenue - expenses,
            # IFRS allows extraordinary items in some cases, GAAP does not
            'extraordinary_items_allowed': accounting_standard == 'IFRS'
        }
        logger.debug(f"Income statement generated: {data}")
        console.info(f"Income statement generated.")
        return data
    except Exception as e:
        logger.exception(f"Error generating income statement: {str(e)}")
        raise
    
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def aged_receivables(request):
    user = request.user
    database_name = get_user_database(user)
    
    as_of_date = request.query_params.get('as_of_date', timezone.now().date())
    
    if isinstance(as_of_date, str):
        as_of_date = timezone.datetime.strptime(as_of_date, '%Y-%m-%d').date()

    logger.debug(f"Fetching invoices for database: {database_name}, as of date: {as_of_date}")
    invoices = Invoice.objects.using(database_name).filter(is_paid=False)
    logger.debug(f"Found {invoices.count()} unpaid invoices")

    aged_receivables_data = []
    for invoice in invoices:
        outstanding = invoice.totalAmount
        invoice_date = invoice.date if isinstance(invoice.date, date) else invoice.date.date()
        due_date = invoice.due_date if isinstance(invoice.due_date, date) else invoice.due_date.date()
        days_overdue = (as_of_date - due_date).days

        logger.debug(f"Processing invoice {invoice.invoice_num}: "
                     f"date={invoice_date}, due_date={due_date}, "
                     f"days_overdue={days_overdue}, outstanding={outstanding}")

        current = Decimal('0.00')
        days_0_30 = Decimal('0.00')
        days_31_60 = Decimal('0.00')
        days_61_90 = Decimal('0.00')
        days_over_90 = Decimal('0.00')

        if days_overdue <= 0:
            current = outstanding
        elif 0 < days_overdue <= 30:
            days_0_30 = outstanding
        elif 30 < days_overdue <= 60:
            days_31_60 = outstanding
        elif 60 < days_overdue <= 90:
            days_61_90 = outstanding
        else:
            days_over_90 = outstanding

        aged_receivables_data.append({
            'customer_name': invoice.customer.customerName,
            'invoice_number': invoice.invoice_num,
            'invoice_date': invoice_date,
            'due_date': due_date,
            'invoice_amount': outstanding,
            'current': current,
            'days_0_30': days_0_30,
            'days_31_60': days_31_60,
            'days_61_90': days_61_90,
            'days_over_90': days_over_90,
            'total_outstanding': outstanding
        })

    logger.debug(f"Processed {len(aged_receivables_data)} invoices for aged receivables")

    # Sort the data by customer name and invoice date
    aged_receivables_data.sort(key=lambda x: (x['customer_name'], x['invoice_date']))

    serializer = AgedReceivableSerializer(aged_receivables_data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def aged_payables(request):
    user = request.user
    database_name = get_user_database(user)
    
    as_of_date = request.query_params.get('as_of_date', timezone.now().date())
    
    if isinstance(as_of_date, str):
        as_of_date = timezone.datetime.strptime(as_of_date, '%Y-%m-%d').date()

    bills = Bill.objects.using(database_name).filter(is_paid=False)

    aged_payables_data = []
    for bill in bills:
        vendor = bill.vendor
        due_date = bill.due_date.date() if isinstance(bill.due_date, datetime) else bill.due_date
        days_overdue = (as_of_date - due_date).days

        current = Decimal('0.00')
        days_1_30 = Decimal('0.00')
        days_31_60 = Decimal('0.00')
        days_61_90 = Decimal('0.00')
        days_over_90 = Decimal('0.00')

        if days_overdue <= 0:
            current = bill.totalAmount
        elif 1 <= days_overdue <= 30:
            days_1_30 = bill.totalAmount
        elif 31 <= days_overdue <= 60:
            days_31_60 = bill.totalAmount
        elif 61 <= days_overdue <= 90:
            days_61_90 = bill.totalAmount
        else:
            days_over_90 = bill.totalAmount

        aged_payables_data.append({
            'vendor_name': vendor.vendor_name,
            'vendor_id': vendor.id,
            'invoice_number': bill.bill_number,
            'invoice_date': bill.bill_date,
            'due_date': due_date,
            'invoice_amount': bill.totalAmount,
            'current': current,
            'days_1_30': days_1_30,
            'days_31_60': days_31_60,
            'days_61_90': days_61_90,
            'days_over_90': days_over_90,
            'total_outstanding': bill.totalAmount
        })

    # Group by vendor
    vendor_totals = {}
    for item in aged_payables_data:
        vendor_id = item['vendor_id']
        if vendor_id not in vendor_totals:
            vendor_totals[vendor_id] = {
                'vendor_name': item['vendor_name'],
                'current': Decimal('0.00'),
                'days_1_30': Decimal('0.00'),
                'days_31_60': Decimal('0.00'),
                'days_61_90': Decimal('0.00'),
                'days_over_90': Decimal('0.00'),
                'total_outstanding': Decimal('0.00'),
            }
        vendor_totals[vendor_id]['current'] += item['current']
        vendor_totals[vendor_id]['days_1_30'] += item['days_1_30']
        vendor_totals[vendor_id]['days_31_60'] += item['days_31_60']
        vendor_totals[vendor_id]['days_61_90'] += item['days_61_90']
        vendor_totals[vendor_id]['days_over_90'] += item['days_over_90']
        vendor_totals[vendor_id]['total_outstanding'] += item['total_outstanding']

    serializer = AgedPayablesSerializer(vendor_totals.values(), many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_balances(request):
    user = request.user
    database_name = get_user_database(user)
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    accounts = ChartOfAccount.objects.using(database_name).all().order_by('account_number')
    
    account_data = []
    for account in accounts:
        account_data.append({
            'account_number': account.account_number,
            'name': account.name,
            'account_type': account.category.name,
            'balance': account.balance,
            'description': account.description
        })

    return Response(account_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trial_balance(request):
    logger.debug("Trial balance view called")
    user = request.user
    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

        accounts = ChartOfAccount.objects.using(database_name).all().order_by('account_number')
        
        trial_balance_data = []
        total_debits = 0
        total_credits = 0

        for account in accounts:
            debit_balance = max(account.balance, 0)
            credit_balance = max(-account.balance, 0)
            
            trial_balance_data.append({
                'account_number': account.account_number,
                'account_name': account.name,
                'account_type': account.category.name,
                'debit_balance': debit_balance,
                'credit_balance': credit_balance,
            })
            
            total_debits += debit_balance
            total_credits += credit_balance

        return Response({
            'accounts': trial_balance_data,
            'total_debits': total_debits,
            'total_credits': total_credits,
            'is_balanced': total_debits == total_credits
        })

    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_and_loss(request):
    print("Profit and Loss view called")  # Add this line
    user = request.user
    database_name = get_user_database(user)
    try:
        data = generate_income_statement(database_name)
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception(f"Error generating profit and loss report: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def balance_sheet(request):
    print("Balance Sheet view called")
    user = request.user
    database_name = get_user_database(user)
    try:
        data = generate_balance_sheet(database_name)
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception(f"Error generating balance sheet: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow(request):
    print("Cash Flow view called")
    user = request.user
    database_name = get_user_database(user)
    try:
        data = generate_cash_flow(database_name)
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception(f"Error generating cash flow statement: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)