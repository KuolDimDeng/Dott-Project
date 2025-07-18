"""
Emergency profile view - minimal dependencies
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def emergency_profile_endpoint(request):
    """Emergency endpoint to bypass import issues"""
    try:
        logger.info(f"[EmergencyProfile] Request from: {request.user.email}")
        
        # Import Employee model only when needed
        from hr.models import Employee
        
        # Find employee by email
        employee = Employee.objects.filter(email=request.user.email).first()
        
        if not employee:
            logger.info(f"[EmergencyProfile] No employee found for {request.user.email}")
            return Response({
                "error": "No employee record found",
                "user_email": request.user.email
            }, status=404)
        
        logger.info(f"[EmergencyProfile] Found employee: {employee.id}")
        
        # Return basic employee data without Stripe
        return Response({
            "employee_id": str(employee.id),
            "email": employee.email,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "employee_number": employee.employee_number,
            "phone_number": str(employee.phone_number) if employee.phone_number else None,
            "ssn_last_4": employee.ssn_last_four,
            "has_stripe_account": bool(employee.stripe_account_id),
            "bank_info": {},  # Empty for now
            "tax_info": {}    # Empty for now
        })
        
    except Exception as e:
        logger.error(f"[EmergencyProfile] Error: {str(e)}")
        import traceback
        logger.error(f"[EmergencyProfile] Traceback: {traceback.format_exc()}")
        return Response({
            "error": "Internal server error",
            "details": str(e)
        }, status=500)