"""
Mobile Money Test Endpoint
Simple endpoint to verify API is working
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Allow any for testing
def test_mobile_money_endpoint(request):
    """
    Test endpoint to verify mobile money API is accessible
    """
    logger.info(f"Test endpoint called: {request.method}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'message': 'Mobile money test endpoint is working',
            'method': 'GET',
            'path': request.path
        })
    
    elif request.method == 'POST':
        try:
            data = request.data if hasattr(request, 'data') else {}
            return JsonResponse({
                'success': True,
                'message': 'Mobile money POST test successful',
                'method': 'POST',
                'received_data': data,
                'path': request.path
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e),
                'method': 'POST'
            }, status=500)