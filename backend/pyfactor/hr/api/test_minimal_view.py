"""
Minimal test view to isolate the import issue
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated


class MinimalTestView(APIView):
    """Minimal test view with no external imports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Simple test GET method"""
        return Response({
            "test": "MinimalTestView works",
            "user_id": str(request.user.id),
            "user_email": request.user.email
        })