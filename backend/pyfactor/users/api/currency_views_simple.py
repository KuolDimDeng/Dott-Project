"""
Simplified currency views to debug 500 error
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

logger = logging.getLogger(__name__)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences_simple(request):
    """Simplified currency preferences endpoint for debugging"""
    try:
        logger.info(f"[Currency Simple] Request method: {request.method}")
        logger.info(f"[Currency Simple] User: {request.user}")
        
        if request.method == 'GET':
            # Return hardcoded response to test if basic auth works
            return Response({
                'success': True,
                'preferences': {
                    'currency_code': 'USD',
                    'currency_name': 'US Dollar',
                    'currency_symbol': '$',
                    'show_usd_on_invoices': True,
                    'show_usd_on_quotes': True,
                    'show_usd_on_reports': False,
                },
                'debug': 'Simple endpoint working'
            })
        
        elif request.method == 'PUT':
            # Just echo back what was sent
            return Response({
                'success': True,
                'received': request.data,
                'debug': 'Simple PUT working'
            })
            
    except Exception as e:
        logger.error(f"[Currency Simple] Error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)