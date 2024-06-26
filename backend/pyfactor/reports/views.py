#/Users/kuoldeng/projectx/backend/pyfactor/reports/views.py
# Create your views here.
from django.shortcuts import get_object_or_404, render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import UserProfile
from finance.models import Account, Transaction
from .models import Report
from pyfactor.logging_config import get_logger

logger = get_logger()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_report(request, report_type):
    user = request.user
    logger.debug(f"Generating {report_type} report for user: {user}")

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if report_type == 'balance_sheet':
            data = generate_balance_sheet(database_name)
        elif report_type == 'cash_flow':
            data = generate_cash_flow(database_name)
        elif report_type == 'income_statement':
            data = generate_income_statement(database_name)
        else:
            return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)

        report = Report.objects.using(database_name).create(
            user_profile=user_profile,
            report_type=report_type[:2].upper(),
            data=data
        )

        return Response(data, status=status.HTTP_200_OK)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error generating report: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def generate_balance_sheet(database_name):
    assets = Account.objects.using(database_name).filter(account_type__name='Asset').aggregate(total=models.Sum('balance'))['total'] or 0
    liabilities = Account.objects.using(database_name).filter(account_type__name='Liability').aggregate(total=models.Sum('balance'))['total'] or 0
    equity = Account.objects.using(database_name).filter(account_type__name='Equity').aggregate(total=models.Sum('balance'))['total'] or 0

    return {
        'assets': assets,
        'liabilities': liabilities,
        'equity': equity,
        'total': assets - liabilities - equity
    }

def generate_cash_flow(database_name):
    operating_activities = Transaction.objects.using(database_name).filter(account__account_type__name='Operating').aggregate(total=models.Sum('amount'))['total'] or 0
    investing_activities = Transaction.objects.using(database_name).filter(account__account_type__name='Investing').aggregate(total=models.Sum('amount'))['total'] or 0
    financing_activities = Transaction.objects.using(database_name).filter(account__account_type__name='Financing').aggregate(total=models.Sum('amount'))['total'] or 0

    return {
        'operating_activities': operating_activities,
        'investing_activities': investing_activities,
        'financing_activities': financing_activities,
        'net_cash_flow': operating_activities + investing_activities + financing_activities
    }

def generate_income_statement(database_name):
    revenue = Account.objects.using(database_name).filter(account_type__name='Revenue').aggregate(total=models.Sum('balance'))['total'] or 0
    expenses = Account.objects.using(database_name).filter(account_type__name='Expense').aggregate(total=models.Sum('balance'))['total'] or 0

    return {
        'revenue': revenue,
        'expenses': expenses,
        'net_income': revenue - expenses
    }