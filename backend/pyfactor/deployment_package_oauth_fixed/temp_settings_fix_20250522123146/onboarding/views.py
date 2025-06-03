"""
Onboarding views.
"""
from django.http import JsonResponse
from django.views import View
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class DatabaseHealthCheckView(View):
    """Database health check view"""
    
    def get(self, request):
        """Check database connectivity"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            return JsonResponse({
                "status": "healthy",
                "database": "connected",
                "result": result[0] if result else None
            })
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return JsonResponse({
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }, status=500)
    
    def post(self, request):
        """POST method for database health check"""
        return self.get(request)
