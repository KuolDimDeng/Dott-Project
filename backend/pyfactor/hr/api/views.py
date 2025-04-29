from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from ..models import (
    Employee, Role, AccessPermission, PreboardingForm,
    TimesheetSetting, CompanyHoliday, Timesheet, TimesheetEntry,
    TimeOffRequest, TimeOffBalance, PerformanceReview, PerformanceMetric,
    PerformanceRating, PerformanceGoal, FeedbackRecord, PerformanceSetting,
    Benefits
)
from ..serializers import EmployeeSerializer, BenefitsSerializer
from ..utils import get_employee_by_cognito_user, get_business_id_from_request
import logging

logger = logging.getLogger(__name__)

class CurrentEmployeeView(APIView):
    """
    API endpoint to fetch the current authenticated user's employee information
    This uses the custom:employeeid attribute from Cognito to lookup the employee
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.cognito_sub
        
        if not user_id:
            return Response(
                {"detail": "User ID not found in the authentication token"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get attributes from request if they were passed from authentication
        user_attributes = getattr(request, 'cognito_attributes', None)
        
        # Use utility function to get employee by Cognito user ID
        employee = get_employee_by_cognito_user(user_id, user_attributes)
        
        if not employee:
            return Response(
                {"detail": "No employee record found for the authenticated user"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize and return employee data
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

# Benefits API Views
class BenefitsListCreateView(APIView):
    """
    API endpoint for listing or creating benefits for employees
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, format=None):
        """List all benefits for a company (manager/admin only)"""
        # Get business_id from user
        business_id = get_business_id_from_request(request)
        if not business_id:
            return Response(
                {"error": "Business ID not found in token."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has permission to view all benefits
        user_roles = request.user.groups.values_list('name', flat=True)
        is_admin = any(role in ['admin', 'owner', 'hr_admin', 'manager'] for role in user_roles)
        
        if not is_admin:
            return Response(
                {"error": "You do not have permission to view all benefits."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all benefits for the company
        benefits = Benefits.objects.filter(business_id=business_id)
        serializer = BenefitsSerializer(benefits, many=True)
        return Response(serializer.data)
    
    def post(self, request, format=None):
        """Create a new benefits record"""
        # Get business_id from user
        business_id = get_business_id_from_request(request)
        if not business_id:
            return Response(
                {"error": "Business ID not found in token."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add business_id to data
        data = request.data.copy()
        data['business_id'] = business_id
        
        # Check if user has permission to create benefits
        user_roles = request.user.groups.values_list('name', flat=True)
        is_admin = any(role in ['admin', 'owner', 'hr_admin'] for role in user_roles)
        
        if not is_admin:
            return Response(
                {"error": "You do not have permission to create benefits records."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BenefitsSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeBenefitsDetailView(APIView):
    """
    API endpoint for retrieving, updating, or deleting an employee's benefits
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, employee_id, request):
        """Get the benefits object for a specific employee"""
        business_id = get_business_id_from_request(request)
        if not business_id:
            return None
        
        try:
            employee = Employee.objects.get(id=employee_id)
            
            # Check permissions - either it's the employee's own record or user has admin/HR role
            user_roles = request.user.groups.values_list('name', flat=True)
            is_admin = any(role in ['admin', 'owner', 'hr_admin', 'manager'] for role in user_roles)
            is_self = str(request.user.id) == str(employee_id)
            
            if not (is_admin or is_self):
                return None
            
            # Get or create benefits record
            benefits, created = Benefits.objects.get_or_create(
                employee=employee,
                business_id=business_id,
                defaults={
                    'is_enrolled': False
                }
            )
            return benefits
        except Employee.DoesNotExist:
            return None
        except Benefits.DoesNotExist:
            return None
    
    def get(self, request, employee_id, format=None):
        """Get an employee's benefits"""
        benefits = self.get_object(employee_id, request)
        if benefits is None:
            return Response(
                {"error": "Employee benefits not found or you don't have permission to view them."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BenefitsSerializer(benefits)
        return Response(serializer.data)
    
    def put(self, request, employee_id, format=None):
        """Update an employee's benefits"""
        benefits = self.get_object(employee_id, request)
        if benefits is None:
            return Response(
                {"error": "Employee benefits not found or you don't have permission to update them."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has permission to update benefits
        user_roles = request.user.groups.values_list('name', flat=True)
        is_admin = any(role in ['admin', 'owner', 'hr_admin'] for role in user_roles)
        is_self = str(request.user.id) == str(employee_id)
        
        # Only admins can update benefits, or self for certain fields if allowed
        if not is_admin and not is_self:
            return Response(
                {"error": "You do not have permission to update benefits records."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # If it's the employee themself, they can only update specific fields
        # For example: retirement_contribution_percentage, but not plan types or costs
        data = request.data.copy()
        if is_self and not is_admin:
            # Filter out fields that employees can't modify
            allowed_fields = ['retirement_contribution_percentage']
            data = {k: v for k, v in data.items() if k in allowed_fields}
        
        serializer = BenefitsSerializer(benefits, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, employee_id, format=None):
        """Delete an employee's benefits (admin only)"""
        # Only admins can delete benefits records
        user_roles = request.user.groups.values_list('name', flat=True)
        is_admin = any(role in ['admin', 'owner', 'hr_admin'] for role in user_roles)
        
        if not is_admin:
            return Response(
                {"error": "You do not have permission to delete benefits records."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        benefits = self.get_object(employee_id, request)
        if benefits is None:
            return Response(
                {"error": "Employee benefits not found or you don't have permission to delete them."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        benefits.delete()
        return Response(status=status.HTTP_204_NO_CONTENT) 