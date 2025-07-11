"""Test endpoint to verify API routing"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import logging

logger = logging.getLogger(__name__)

class TestEndpointView(APIView):
    """Simple test endpoint to verify routing"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        logger.info("🧪 [TEST] GET request received")
        return Response({
            "status": "ok",
            "message": "Test endpoint is working",
            "method": "GET"
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        logger.info("🧪 [TEST] POST request received")
        logger.info(f"🧪 [TEST] Request data: {request.data}")
        return Response({
            "status": "ok",
            "message": "Test endpoint is working",
            "method": "POST",
            "received_data": request.data
        }, status=status.HTTP_200_OK)