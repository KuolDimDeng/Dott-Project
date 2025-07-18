"""
Minimal test view to debug the 500 error
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from pyfactor.logging_config import get_logger

logger = get_logger()


class DebugTestView(APIView):
    """Ultra minimal test view for debugging"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Simple test GET method"""
        logger.info(f"[DebugTest] === TEST VIEW REACHED ===")
        logger.info(f"[DebugTest] User: {request.user}")
        logger.info(f"[DebugTest] User ID: {request.user.id}")
        logger.info(f"[DebugTest] User Email: {request.user.email}")
        logger.info(f"[DebugTest] User authenticated: {request.user.is_authenticated}")
        
        return Response({
            "debug": "DebugTestView works",
            "user_id": str(request.user.id),
            "user_email": request.user.email,
            "path": request.path,
            "method": request.method
        })