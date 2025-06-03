# /Users/kuoldeng/projectx/backend/pyfactor/chart/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from finance.models import FinanceTransaction
from users.models import UserProfile
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncYear
from datetime import datetime, timedelta
from pyfactor.logging_config import get_logger

logger = get_logger()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_data(request):
    user = request.user
    account = request.GET.get('account')
    date_range = request.GET.get('date_range', 'day')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        transactions = FinanceTransaction.objects.using(database_name).all()

        if account:
            transactions = transactions.filter(account__name=account)

        if start_date and end_date:
            transactions = transactions.filter(date__range=[start_date, end_date])
        else:
            # Default to last 30 days if no date range is provided
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            transactions = transactions.filter(date__range=[start_date, end_date])

        if date_range == 'day':
            trunc_func = TruncDate('date')
        elif date_range == 'month':
            trunc_func = TruncMonth('date')
        elif date_range == 'year':
            trunc_func = TruncYear('date')
        else:
            trunc_func = TruncDate('date')

        data = (
            transactions
            .annotate(truncated_date=trunc_func)
            .values('truncated_date')
            .annotate(total_amount=Sum('amount'))
            .order_by('truncated_date')
        )

        result = [
            {
                'date': item['truncated_date'].strftime('%Y-%m-%d'),
                'amount': float(item['total_amount'])
            }
            for item in data
        ]

        return Response(result, status=status.HTTP_200_OK)

    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching transaction data: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)