# hr/views.py

from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Employee, Role, EmployeeRole, AccessPermission, PreboardingForm, PerformanceReview, PerformanceMetric, PerformanceRating, PerformanceGoal, FeedbackRecord, PerformanceSetting, Timesheet, TimesheetEntry, TimeOffRequest, TimeOffBalance, Benefits
from .serializers import (
    EmployeeSerializer, 
    EmployeeBasicSerializer,
    RoleSerializer, 
    EmployeeRoleSerializer, 
    AccessPermissionSerializer,
    PreboardingFormSerializer,
    PerformanceReviewSerializer,
    PerformanceReviewDetailSerializer,
    PerformanceMetricSerializer,
    PerformanceRatingSerializer,
    PerformanceGoalSerializer,
    FeedbackRecordSerializer,
    PerformanceSettingSerializer,
    TimesheetSerializer,
    TimesheetEntrySerializer,
    TimeOffRequestSerializer,
    TimeOffBalanceSerializer,
    BenefitsSerializer
)
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
import uuid
from datetime import datetime
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework import viewsets

from pyfactor.logging_config import get_logger

logger = get_logger()

# Custom throttle classes with higher limits
class HealthCheckRateThrottle(AnonRateThrottle):
    rate = '120/minute'  # Higher rate for health checks

class EmployeeListRateThrottle(AnonRateThrottle):
    rate = '60/minute'  # Higher rate for employee list

@api_view(['GET', 'OPTIONS', 'HEAD'])
@permission_classes([AllowAny])  # Explicitly allow unauthenticated access
@throttle_classes([HealthCheckRateThrottle])  # Apply custom throttle class
def health_check(request):
    """Health check endpoint for the HR module that doesn't require tenant ID or authentication"""
    from rest_framework.permissions import AllowAny
    from rest_framework.decorators import permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    from datetime import datetime
    
    # Respond to preflight requests
    if request.method == 'OPTIONS':
        response = Response()
        # Always allow any origin for the health check endpoint
        origin = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Max-Age"] = "86400"
        return response
    
    # Handle HEAD requests
    if request.method == 'HEAD':
        response = Response(status=status.HTTP_200_OK)
        origin = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    # Get tenant ID from request if available
    tenant_id = getattr(request, 'tenant_id', None)
    if not tenant_id:
        tenant_id = request.headers.get('X-Tenant-ID') or request.headers.get('x-tenant-id')

    # Create explicit response with CORS headers
    response = Response({
        "status": "healthy",
        "module": "hr",
        "timestamp": datetime.now().isoformat(),
        "auth_required": False,
        "tenant_id": tenant_id
    }, status=status.HTTP_200_OK)
    
    # Add CORS headers
    origin = request.headers.get('Origin', '*')
    response["Access-Control-Allow-Origin"] = origin
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
    response["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, "
        "x-business-id, X-Business-ID, X-BUSINESS-ID, "
        "access-control-allow-headers, Access-Control-Allow-Headers, "
        "access-control-allow-origin, Access-Control-Allow-Origin, "
        "access-control-allow-methods, Access-Control-Allow-Methods, "
        "x-request-id, cache-control, x-user-id, x-id-token, "
        "X-Requires-Auth, x-schema-name, X-Schema-Name"
    )
    response["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Employee views
@api_view(['GET', 'POST', 'OPTIONS'])
@permission_classes([IsAuthenticated])  # Require authentication
@throttle_classes([EmployeeListRateThrottle])  # Apply custom throttle class
def employee_list(request):
    """List all employees or create a new employee"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, HEAD"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Expose-Headers"] = (
            "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Max-Age"] = "86400"
        return response
        
    if request.method == 'GET':
        logger.info(f'🚀 [HR Employee List] GET request from user: {request.user.email if request.user.is_authenticated else "anonymous"}')
        
        try:
            # Get tenant information from user
            tenant_id = None
            if hasattr(request.user, 'tenant_id'):
                tenant_id = request.user.tenant_id
            elif hasattr(request.user, 'tenant'):
                tenant_id = request.user.tenant.id if request.user.tenant else None
            
            logger.info(f'🏢 [HR Employee List] User tenant_id: {tenant_id}')
            
            # For now, get all employees (Employee model doesn't have tenant isolation built-in)
            # In the future, you might want to add a tenant_id field to Employee model
            employees = Employee.objects.all()
            
            logger.info(f'✅ [HR Employee List] Found {employees.count()} employees')
            
            serializer = EmployeeSerializer(employees, many=True)
            response = Response(serializer.data)
            
        except Exception as e:
            logger.error(f'❌ [HR Employee List] Error fetching employees: {str(e)}')
            return Response(
                {'error': 'Failed to fetch employees', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Add explicit CORS headers
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, HEAD"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Expose-Headers"] = (
            "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Max-Age"] = "86400"
        
        return response
    
    elif request.method == 'POST':
        logger.info(f'🚀 [HR Employee Create] POST request from user: {request.user.email}')
        logger.info(f'📄 [HR Employee Create] Request data keys: {list(request.data.keys())}')
        
        try:
            # Handle the security number specially for Stripe storage
            employee_data = request.data.copy()
            security_number = employee_data.pop('securityNumber', None)
            
            serializer = EmployeeSerializer(data=employee_data)
            if serializer.is_valid():
                # Save the employee first
                employee = serializer.save()
                logger.info(f'✅ [HR Employee Create] Employee created with ID: {employee.id}')
                
                # Handle security number storage if provided
                if security_number:
                    try:
                        # Use the model's secure storage method
                        employee.save_ssn_to_stripe(security_number)
                        logger.info(f'🔒 [HR Employee Create] Security number securely stored for employee {employee.id}')
                    except Exception as e:
                        logger.error(f'❌ [HR Employee Create] Failed to store security number: {str(e)}')
                        # Don't fail the creation, just log the error
                
                response = Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f'❌ [HR Employee Create] Validation errors: {serializer.errors}')
                response = Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f'❌ [HR Employee Create] Unexpected error: {str(e)}')
            response = Response(
                {'error': 'Failed to create employee', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            # Add explicit CORS headers for POST responses too
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
                "x-business-id, X-Business-ID, X-BUSINESS-ID, "
                "access-control-allow-headers, Access-Control-Allow-Headers, "
                "access-control-allow-origin, Access-Control-Allow-Origin, "
                "access-control-allow-methods, Access-Control-Allow-Methods, "
                "x-request-id, cache-control, x-user-id, x-id-token, "
                "X-Requires-Auth, x-schema-name, X-Schema-Name"
            )
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Expose-Headers"] = (
                "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
                "x-business-id, X-Business-ID, X-BUSINESS-ID, "
                "x-schema-name, X-Schema-Name"
            )
            
            return response
        
        response = Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # Add CORS headers to error responses as well
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_stats(request):
    """Get employee statistics"""
    try:
        logger.info(f'🚀 [HR Employee Stats] GET request from user: {request.user.email}')
        
        # Get all employees
        employees = Employee.objects.all()
        total = employees.count()
        
        # Count by status - Employee model uses 'active' boolean field, not status
        active = employees.filter(active=True).count()
        inactive = employees.filter(active=False).count()
        
        # For now, we don't have "on leave" status in the Employee model
        # This could be added later as a separate field or derived from other data
        on_leave = 0
        
        stats = {
            'total': total,
            'active': active,
            'onLeave': on_leave,  # Frontend expects camelCase
            'inactive': inactive,
            'newThisMonth': 0,  # Could be calculated based on date_joined
            'departments': Employee.objects.values('department').distinct().count() if total > 0 else 0
        }
        
        logger.info(f'✅ [HR Employee Stats] Returning stats: {stats}')
        return Response(stats)
        
    except Exception as e:
        logger.error(f'❌ [HR Employee Stats] Error: {str(e)}')
        return Response(
            {'error': 'Failed to fetch employee statistics', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_basic_list(request):
    """Get basic employee list for dropdowns (supervisor selection, etc.)"""
    try:
        logger.info(f'🚀 [HR Employee Basic List] GET request from user: {request.user.email}')
        
        # Get only active employees with basic information
        employees = Employee.objects.filter(active=True).only(
            'id', 'employee_number', 'first_name', 'last_name', 'department'
        )
        
        logger.info(f'✅ [HR Employee Basic List] Found {employees.count()} active employees')
        
        serializer = EmployeeBasicSerializer(employees, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f'❌ [HR Employee Basic List] Error: {str(e)}')
        return Response(
            {'error': 'Failed to fetch employee list', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET', 'PUT', 'DELETE', 'OPTIONS'])
@permission_classes([IsAuthenticated])
def employee_detail(request, pk):
    """Retrieve, update or delete an employee"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Expose-Headers"] = (
            "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Max-Age"] = "86400"
        return response
    
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        response = Response(status=status.HTTP_404_NOT_FOUND)
        # Even for errors, add CORS headers
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        return response
    
    if request.method == 'GET':
        serializer = EmployeeSerializer(employee)
        response = Response(serializer.data)
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Expose-Headers"] = (
            "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "x-schema-name, X-Schema-Name"
        )
        return response
    
    elif request.method == 'PUT':
        serializer = EmployeeSerializer(employee, data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = Response(serializer.data)
            # Add CORS headers
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
                "x-business-id, X-Business-ID, X-BUSINESS-ID, "
                "access-control-allow-headers, Access-Control-Allow-Headers, "
                "access-control-allow-origin, Access-Control-Allow-Origin, "
                "access-control-allow-methods, Access-Control-Allow-Methods, "
                "x-request-id, cache-control, x-user-id, x-id-token, "
                "X-Requires-Auth, x-schema-name, X-Schema-Name"
            )
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Expose-Headers"] = (
                "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
                "x-business-id, X-Business-ID, X-BUSINESS-ID, "
                "x-schema-name, X-Schema-Name"
            )
            return response
        response = Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # Add CORS headers to error responses
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        return response
    
    elif request.method == 'DELETE':
        employee.delete()
        response = Response(status=status.HTTP_204_NO_CONTENT)
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_employee_permissions(request, pk):
    """Set permissions for an employee"""
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    # Logic to set permissions
    permissions = request.data.get('permissions', [])
    
    # Implement your permission setting logic here
    
    return Response({"message": "Permissions updated successfully"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_permissions(request):
    """Get all available permissions"""
    permissions = AccessPermission.objects.all()
    serializer = AccessPermissionSerializer(permissions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def setup_employee_password(request):
    """Set up password for an employee during onboarding"""
    # Implementation for password setup
    return Response({"message": "Password set successfully"})

# Role views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def role_list(request):
    """List all roles or create a new role"""
    if request.method == 'GET':
        roles = Role.objects.all()
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = RoleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail(request, pk):
    """Retrieve, update or delete a role"""
    try:
        role = Role.objects.get(pk=pk)
    except Role.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = RoleSerializer(role)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = RoleSerializer(role, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# Employee Role views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_role_list(request):
    """List all employee roles or create a new employee role"""
    if request.method == 'GET':
        employee_roles = EmployeeRole.objects.all()
        serializer = EmployeeRoleSerializer(employee_roles, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = EmployeeRoleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_role_detail(request, pk):
    """Retrieve, update or delete an employee role"""
    try:
        employee_role = EmployeeRole.objects.get(pk=pk)
    except EmployeeRole.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = EmployeeRoleSerializer(employee_role)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = EmployeeRoleSerializer(employee_role, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        employee_role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# Access Permission views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def access_permission_list(request):
    """List all access permissions or create a new access permission"""
    if request.method == 'GET':
        access_permissions = AccessPermission.objects.all()
        serializer = AccessPermissionSerializer(access_permissions, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = AccessPermissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def access_permission_detail(request, pk):
    """Retrieve, update or delete an access permission"""
    try:
        access_permission = AccessPermission.objects.get(pk=pk)
    except AccessPermission.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = AccessPermissionSerializer(access_permission)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = AccessPermissionSerializer(access_permission, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        access_permission.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# Preboarding Form views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def preboarding_form_list(request):
    """List all preboarding forms or create a new preboarding form"""
    if request.method == 'GET':
        preboarding_forms = PreboardingForm.objects.all()
        serializer = PreboardingFormSerializer(preboarding_forms, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = PreboardingFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def preboarding_form_detail(request, pk):
    """Retrieve, update or delete a preboarding form"""
    try:
        preboarding_form = PreboardingForm.objects.get(pk=pk)
    except PreboardingForm.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = PreboardingFormSerializer(preboarding_form)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = PreboardingFormSerializer(preboarding_form, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        preboarding_form.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# Performance Management Views
class PerformanceReviewViewSet(viewsets.ModelViewSet):
    queryset = PerformanceReview.objects.all()
    serializer_class = PerformanceReviewSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PerformanceReviewDetailSerializer
        return PerformanceReviewSerializer
    
    def get_queryset(self):
        queryset = PerformanceReview.objects.all()
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by reviewer
        reviewer_id = self.request.query_params.get('reviewer_id', None)
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by review type
        review_type = self.request.query_params.get('review_type', None)
        if review_type:
            queryset = queryset.filter(review_type=review_type)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from and date_to:
            queryset = queryset.filter(review_date__range=[date_from, date_to])
        
        return queryset


class PerformanceMetricViewSet(viewsets.ModelViewSet):
    queryset = PerformanceMetric.objects.all()
    serializer_class = PerformanceMetricSerializer
    
    def get_queryset(self):
        queryset = PerformanceMetric.objects.all()
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by active status
        active = self.request.query_params.get('active', None)
        if active is not None:
            active_bool = active.lower() == 'true'
            queryset = queryset.filter(active=active_bool)
        
        return queryset


class PerformanceRatingViewSet(viewsets.ModelViewSet):
    queryset = PerformanceRating.objects.all()
    serializer_class = PerformanceRatingSerializer
    
    def get_queryset(self):
        queryset = PerformanceRating.objects.all()
        
        # Filter by review
        review_id = self.request.query_params.get('review_id', None)
        if review_id:
            queryset = queryset.filter(review_id=review_id)
        
        # Filter by metric
        metric_id = self.request.query_params.get('metric_id', None)
        if metric_id:
            queryset = queryset.filter(metric_id=metric_id)
        
        return queryset


class PerformanceGoalViewSet(viewsets.ModelViewSet):
    queryset = PerformanceGoal.objects.all()
    serializer_class = PerformanceGoalSerializer
    
    def get_queryset(self):
        queryset = PerformanceGoal.objects.all()
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by goal type
        goal_type = self.request.query_params.get('goal_type', None)
        if goal_type:
            queryset = queryset.filter(goal_type=goal_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by date range
        start_from = self.request.query_params.get('start_from', None)
        start_to = self.request.query_params.get('start_to', None)
        if start_from and start_to:
            queryset = queryset.filter(start_date__range=[start_from, start_to])
        
        return queryset


class FeedbackRecordViewSet(viewsets.ModelViewSet):
    queryset = FeedbackRecord.objects.all()
    serializer_class = FeedbackRecordSerializer
    
    def get_queryset(self):
        queryset = FeedbackRecord.objects.all()
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by employee (recipient)
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by provider
        provider_id = self.request.query_params.get('provider_id', None)
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        
        # Filter by feedback type
        feedback_type = self.request.query_params.get('feedback_type', None)
        if feedback_type:
            queryset = queryset.filter(feedback_type=feedback_type)
        
        # Filter by visibility
        is_shared = self.request.query_params.get('is_shared', None)
        if is_shared is not None:
            is_shared_bool = is_shared.lower() == 'true'
            queryset = queryset.filter(is_shared=is_shared_bool)
        
        return queryset


class PerformanceSettingViewSet(viewsets.ModelViewSet):
    queryset = PerformanceSetting.objects.all()
    serializer_class = PerformanceSettingSerializer
    
    def get_queryset(self):
        queryset = PerformanceSetting.objects.all()
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        return queryset


class TimesheetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing timesheets"""
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    
    def get_queryset(self):
        queryset = Timesheet.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date and end_date:
            queryset = queryset.filter(period_start__gte=start_date, period_end__lte=end_date)
        
        return queryset.order_by('-period_start')


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing timesheet entries"""
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    
    def get_queryset(self):
        queryset = TimesheetEntry.objects.all()
        
        # Filter by timesheet
        timesheet_id = self.request.query_params.get('timesheet_id', None)
        if timesheet_id:
            queryset = queryset.filter(timesheet_id=timesheet_id)
        
        return queryset.order_by('date')


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing time off requests"""
    queryset = TimeOffRequest.objects.all()
    serializer_class = TimeOffRequestSerializer
    
    def get_queryset(self):
        queryset = TimeOffRequest.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by request type
        request_type = self.request.query_params.get('request_type', None)
        if request_type:
            queryset = queryset.filter(request_type=request_type)
        
        return queryset.order_by('-created_at')


class TimeOffBalanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing time off balances"""
    queryset = TimeOffBalance.objects.all()
    serializer_class = TimeOffBalanceSerializer
    
    def get_queryset(self):
        queryset = TimeOffBalance.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by year
        year = self.request.query_params.get('year', None)
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset


class BenefitsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee benefits"""
    queryset = Benefits.objects.all()
    serializer_class = BenefitsSerializer
    
    def get_queryset(self):
        queryset = Benefits.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by enrollment status
        is_enrolled = self.request.query_params.get('is_enrolled', None)
        if is_enrolled is not None:
            is_enrolled_bool = is_enrolled.lower() == 'true'
            queryset = queryset.filter(is_enrolled=is_enrolled_bool)
        
        return queryset