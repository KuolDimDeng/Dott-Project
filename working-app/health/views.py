from django.http import JsonResponse
from django.db import connections
from django.db.utils import OperationalError

def health_check(request):
    """
    Health check view for AWS Elastic Beanstalk.
    Checks database connection and returns health status.
    """
    is_database_working = True
    
    # Check database connections
    try:
        db_conn = connections['default']
        db_conn.cursor()
    except OperationalError:
        is_database_working = False
    
    status = 200 if is_database_working else 503
    
    # Response data
    data = {
        'status': 'ok' if is_database_working else 'error',
        'message': 'Health check passed' if is_database_working else 'Database connection error',
        'database': is_database_working,
    }
    
    return JsonResponse(data, status=status)
