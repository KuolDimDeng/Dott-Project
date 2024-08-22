# /Users/kuoldeng/projectx/backend/pyfactor/reports/views.py
from django.db import models
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import User, UserProfile
from finance.models import Account, FinanceTransaction
from .models import Report
from .serializers import ReportSerializer
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console


logger = get_logger()

REPORT_TYPE_MAPPING = {
    'balance_sheet': 'BS',
    'cash_flow': 'CF',
    'income_statement': 'IS'
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

        # Rest of your code...
        if report_type == 'balance_sheet':
            data = generate_balance_sheet(database_name)
        elif report_type == 'cash_flow':
            data = generate_cash_flow(database_name)
        elif report_type == 'income_statement':
            data = generate_income_statement(database_name)
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

def generate_balance_sheet(database_name):
    logger.debug(f"Generating balance sheet for database: {database_name}")
    try:
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        assets = Account.objects.using(database_name).filter(account_type__name='Asset').aggregate(total=models.Sum('balance'))['total'] or 0
        liabilities = Account.objects.using(database_name).filter(account_type__name='Liability').aggregate(total=models.Sum('balance'))['total'] or 0
        equity = Account.objects.using(database_name).filter(account_type__name='Equity').aggregate(total=models.Sum('balance'))['total'] or 0

        data = {
            'assets': assets,
            'liabilities': liabilities,
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
def generate_cash_flow(database_name):
    logger.debug(f"Generating cash flow statement for database: {database_name}")
    try:
        operating_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Operating').aggregate(total=models.Sum('amount'))['total'] or 0
        investing_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Investing').aggregate(total=models.Sum('amount'))['total'] or 0
        financing_activities = FinanceTransaction.objects.using(database_name).filter(account__account_type__name='Financing').aggregate(total=models.Sum('amount'))['total'] or 0

        data = {
            'operating_activities': operating_activities,
            'investing_activities': investing_activities,
            'financing_activities': financing_activities,
            'net_cash_flow': operating_activities + investing_activities + financing_activities
        }
        logger.debug(f"Cash flow statement generated: {data}")
        console.info(f"Cash flow statement generated.")
        return data
    except Exception as e:
        logger.exception(f"Error generating cash flow statement: {str(e)}")
        raise

def generate_income_statement(database_name):
    logger.debug(f"Generating income statement for database: {database_name}")
    try:
        revenue = Account.objects.using(database_name).filter(account_type__name='Revenue').aggregate(total=models.Sum('balance'))['total'] or 0
        expenses = Account.objects.using(database_name).filter(account_type__name='Expense').aggregate(total=models.Sum('balance'))['total'] or 0

        data = {
            'revenue': revenue,
            'expenses': expenses,
            'net_income': revenue - expenses
        }
        logger.debug(f"Income statement generated: {data}")
        console.info(f"Income statement generated.")
        return data
    except Exception as e:
        logger.exception(f"Error generating income statement: {str(e)}")
        raise