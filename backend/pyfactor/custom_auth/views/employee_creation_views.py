"""
Views for handling employee creation from user management
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
import logging

from ..models import User
from ..employee_sync import create_employee_for_user_explicit

logger = logging.getLogger(__name__)


class InternalRequestAuthentication:
    """Simple authentication for internal API requests"""
    def authenticate(self, request):
        # Check for internal request header
        if request.headers.get('X-Internal-Request') == 'true':
            # In production, you'd want to verify an API key or token here
            return (None, None)
        return None


@api_view(['POST'])
@permission_classes([AllowAny])  # Protected by internal header check
def create_employee_for_user(request):
    """
    Create an employee record for an existing user
    This is called when a user accepts an invitation with create_employee flag
    """
    # Verify internal request
    if request.headers.get('X-Internal-Request') != 'true':
        return Response(
            {'error': 'Unauthorized'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        user_email = request.data.get('user_email')
        business_id = request.data.get('business_id')
        employee_data = request.data.get('employee_data', {})
        
        if not user_email or not business_id:
            return Response(
                {'error': 'user_email and business_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the user
        try:
            user = User.objects.get(email=user_email, business_id=business_id)
        except User.DoesNotExist:
            logger.error(f"User not found: {user_email} in business {business_id}")
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if employee already exists
        if hasattr(user, 'employee_profile') and user.employee_profile:
            logger.info(f"Employee already exists for user {user_email}")
            return Response({
                'message': 'Employee already exists',
                'employee_id': str(user.employee_profile.id),
                'employee_number': user.employee_profile.employee_number
            })
        
        # Create employee
        with transaction.atomic():
            employee = create_employee_for_user_explicit(
                user,
                first_name=employee_data.get('first_name', ''),
                last_name=employee_data.get('last_name', ''),
                department=employee_data.get('department', ''),
                job_title=employee_data.get('job_title', ''),
                employment_type=employee_data.get('employment_type', 'FT'),
                country=employee_data.get('country', 'US'),
                compensation_type=employee_data.get('compensation_type', 'salary')
            )
            
            logger.info(f"Created employee {employee.employee_number} for user {user_email}")
            
            return Response({
                'message': 'Employee created successfully',
                'employee_id': str(employee.id),
                'employee_number': employee.employee_number,
                'permissions_synced': bool(employee.department or employee.job_title)
            }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating employee for user: {str(e)}")
        return Response(
            {'error': 'Failed to create employee', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )