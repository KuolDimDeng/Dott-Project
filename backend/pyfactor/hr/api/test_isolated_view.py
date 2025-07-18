"""
Completely isolated test view - no imports from parent directory
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)


class IsolatedTestView(APIView):
    """Completely isolated test view"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Test GET method with no dependencies"""
        logger.info(f"[IsolatedTest] Request received")
        logger.info(f"[IsolatedTest] User: {request.user.email}")
        
        # Try to access employee model without importing it
        try:
            from hr.models import Employee
            logger.info(f"[IsolatedTest] Successfully imported Employee model")
            
            # Try to find employee
            employee = Employee.objects.filter(email=request.user.email).first()
            logger.info(f"[IsolatedTest] Employee found: {bool(employee)}")
            
            if employee:
                return Response({
                    "test": "isolated_success",
                    "employee_found": True,
                    "employee_id": str(employee.id),
                    "employee_name": f"{employee.first_name} {employee.last_name}"
                })
            else:
                return Response({
                    "test": "isolated_success",
                    "employee_found": False,
                    "user_email": request.user.email
                })
                
        except Exception as e:
            logger.error(f"[IsolatedTest] Error: {str(e)}")
            return Response({
                "test": "isolated_error",
                "error": str(e),
                "type": str(type(e))
            }, status=500)