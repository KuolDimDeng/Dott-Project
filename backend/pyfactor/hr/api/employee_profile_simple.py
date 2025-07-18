"""
Simplified employee profile endpoint
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from pyfactor.logging_config import get_logger

logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_profile_simple(request):
    """Simple employee profile endpoint"""
    logger.info(f"[EmployeeProfileSimple] === REQUEST START ===")
    logger.info(f"[EmployeeProfileSimple] User: {request.user.email}")
    
    try:
        # Import inside function to avoid import-time issues
        from hr.models import Employee
        logger.info(f"[EmployeeProfileSimple] Successfully imported Employee model")
        
        # Find employee
        employee = Employee.objects.filter(
            email=request.user.email
        ).first()
        
        if employee:
            logger.info(f"[EmployeeProfileSimple] Found employee: {employee.id}")
            
            # Get basic info without Stripe
            return Response({
                "employee_id": str(employee.id),
                "email": employee.email,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "employee_number": employee.employee_number,
                "ssn_last_4": employee.ssn_last_four
            })
        else:
            logger.info(f"[EmployeeProfileSimple] No employee found for {request.user.email}")
            return Response(
                {"error": "No employee record found"},
                status=404
            )
            
    except Exception as e:
        logger.error(f"[EmployeeProfileSimple] Error: {str(e)}")
        import traceback
        logger.error(f"[EmployeeProfileSimple] Traceback: {traceback.format_exc()}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=500
        )