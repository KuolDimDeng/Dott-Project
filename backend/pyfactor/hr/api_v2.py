# Employee Management API v2 - Clean implementation
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Employee
from .serializers import EmployeeSerializer
from pyfactor.logging_config import get_logger
import uuid

logger = get_logger()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_list_v2(request):
    """
    GET: List all employees for the authenticated user's business
    POST: Create a new employee
    """
    # Get business_id from authenticated user
    business_id = getattr(request.user, 'business_id', None)
    if not business_id:
        # Try to get from tenant_id as fallback
        business_id = getattr(request.user, 'tenant_id', None)
    
    # Also check request headers/params for tenant_id
    request_tenant_id = (
        request.headers.get('X-Tenant-ID') or 
        request.headers.get('x-tenant-id') or 
        request.GET.get('tenantId') or
        request.data.get('tenantId') if request.method == 'POST' else None
    )
    
    # Use request tenant_id if user doesn't have business_id
    if not business_id and request_tenant_id:
        business_id = request_tenant_id
    
    if not business_id:
        logger.error(f"[Employee API v2] No business_id found for user: {request.user.email}")
        return Response(
            {"error": "No business association found for user"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logger.info(f"[Employee API v2] {request.method} request - User: {request.user.email}, Business: {business_id}")
    
    if request.method == 'GET':
        try:
            # Get all employees for this business
            employees = Employee.objects.filter(business_id=business_id).order_by('-created_at')
            serializer = EmployeeSerializer(employees, many=True)
            
            logger.info(f"[Employee API v2] Found {employees.count()} employees for business {business_id}")
            
            return Response({
                "success": True,
                "count": employees.count(),
                "data": serializer.data
            })
        except Exception as e:
            logger.error(f"[Employee API v2] GET error: {str(e)}")
            return Response(
                {"error": "Failed to fetch employees", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'POST':
        try:
            # Create new employee
            employee_data = request.data.copy()
            
            # Remove any existing IDs to ensure new creation
            employee_data.pop('id', None)
            employee_data.pop('employee_number', None)
            
            # Extract SSN for secure storage if provided
            ssn = employee_data.pop('securityNumber', None)
            
            # Handle supervisor assignment - if none, use the owner
            if not employee_data.get('supervisor'):
                # Find the owner employee for this business
                owner_employee = Employee.objects.filter(
                    business_id=business_id,
                    is_supervisor=True,
                    user__role='OWNER'
                ).first()
                
                if owner_employee:
                    employee_data['supervisor'] = str(owner_employee.id)
                    logger.info(f"[Employee API v2] No supervisor specified, using owner: {owner_employee.id}")
            
            logger.info(f"[Employee API v2] Creating employee: {employee_data.get('email', 'unknown')}")
            
            with transaction.atomic():
                # Validate data
                serializer = EmployeeSerializer(data=employee_data)
                if not serializer.is_valid():
                    logger.error(f"[Employee API v2] Validation failed: {serializer.errors}")
                    return Response({
                        "success": False,
                        "errors": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Save employee with business_id and tenant_id
                employee = serializer.save(
                    business_id=business_id,
                    tenant_id=business_id  # Set tenant_id same as business_id for RLS
                )
                
                # Store SSN securely if provided
                if ssn:
                    try:
                        success, message = employee.save_ssn_to_stripe(ssn)
                        if success:
                            logger.info(f"[Employee API v2] SSN stored securely for employee {employee.id}")
                        else:
                            logger.warning(f"[Employee API v2] SSN storage warning: {message}")
                    except Exception as ssn_error:
                        logger.error(f"[Employee API v2] SSN storage failed: {str(ssn_error)}")
                        # Don't fail the entire employee creation - just log the error
                        # The SSN can be updated later
                
                # Return the created employee
                response_serializer = EmployeeSerializer(employee)
                
                logger.info(f"[Employee API v2] Employee created successfully: {employee.id}")
                
                return Response({
                    "success": True,
                    "message": "Employee created successfully",
                    "data": response_serializer.data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"[Employee API v2] POST error: {str(e)}")
            return Response(
                {"error": "Failed to create employee", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail_v2(request, employee_id):
    """
    GET: Retrieve a specific employee
    PUT: Update a specific employee
    DELETE: Delete a specific employee
    """
    # Get business_id from user
    business_id = getattr(request.user, 'business_id', None)
    if not business_id:
        business_id = getattr(request.user, 'tenant_id', None)
    
    # Check request headers for tenant_id
    request_tenant_id = (
        request.headers.get('X-Tenant-ID') or 
        request.headers.get('x-tenant-id')
    )
    
    if not business_id and request_tenant_id:
        business_id = request_tenant_id
    
    if not business_id:
        return Response(
            {"error": "No business association found for user"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logger.info(f"[Employee API v2] {request.method} request for employee {employee_id}")
    
    try:
        # Get employee ensuring it belongs to user's business
        employee = Employee.objects.get(id=employee_id, business_id=business_id)
    except Employee.DoesNotExist:
        logger.warning(f"[Employee API v2] Employee {employee_id} not found for business {business_id}")
        return Response(
            {"error": "Employee not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        try:
            serializer = EmployeeSerializer(employee)
            return Response({
                "success": True,
                "data": serializer.data
            })
        except Exception as e:
            logger.error(f"[Employee API v2] GET detail error: {str(e)}")
            return Response(
                {"error": "Failed to fetch employee", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'PUT':
        try:
            employee_data = request.data.copy()
            
            # Remove fields that shouldn't be updated
            employee_data.pop('id', None)
            employee_data.pop('employee_number', None)
            employee_data.pop('business_id', None)
            employee_data.pop('tenant_id', None)
            
            # Handle SSN update separately
            ssn = employee_data.pop('securityNumber', None)
            
            with transaction.atomic():
                serializer = EmployeeSerializer(employee, data=employee_data, partial=True)
                if not serializer.is_valid():
                    return Response({
                        "success": False,
                        "errors": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                employee = serializer.save()
                
                # Update SSN if provided
                if ssn:
                    try:
                        success, message = employee.save_ssn_to_stripe(ssn)
                        if success:
                            logger.info(f"[Employee API v2] SSN updated securely for employee {employee.id}")
                        else:
                            logger.warning(f"[Employee API v2] SSN update warning: {message}")
                    except Exception as ssn_error:
                        logger.error(f"[Employee API v2] SSN update failed: {str(ssn_error)}")
                        # Don't fail the entire update - just log the error
                
                response_serializer = EmployeeSerializer(employee)
                
                logger.info(f"[Employee API v2] Employee {employee_id} updated successfully")
                
                return Response({
                    "success": True,
                    "message": "Employee updated successfully",
                    "data": response_serializer.data
                })
                
        except Exception as e:
            logger.error(f"[Employee API v2] PUT error: {str(e)}")
            return Response(
                {"error": "Failed to update employee", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'DELETE':
        try:
            with transaction.atomic():
                employee_email = employee.email
                employee.delete()
                
                logger.info(f"[Employee API v2] Employee {employee_id} deleted successfully")
                
                return Response({
                    "success": True,
                    "message": f"Employee {employee_email} deleted successfully"
                }, status=status.HTTP_204_NO_CONTENT)
                
        except Exception as e:
            logger.error(f"[Employee API v2] DELETE error: {str(e)}")
            return Response(
                {"error": "Failed to delete employee", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_stats_v2(request):
    """Get employee statistics for the business"""
    business_id = getattr(request.user, 'business_id', None)
    if not business_id:
        business_id = getattr(request.user, 'tenant_id', None)
    
    if not business_id:
        return Response({
            "success": True,
            "data": {
                "total": 0,
                "active": 0,
                "inactive": 0,
                "by_department": {},
                "by_employment_type": {}
            }
        })
    
    try:
        employees = Employee.objects.filter(business_id=business_id)
        
        # Calculate statistics
        stats = {
            "total": employees.count(),
            "active": employees.filter(active=True).count(),
            "inactive": employees.filter(active=False).count(),
            "by_department": {},
            "by_employment_type": {}
        }
        
        # Count by department
        departments = employees.values_list('department', flat=True).distinct()
        for dept in departments:
            if dept:
                stats["by_department"][dept] = employees.filter(department=dept).count()
        
        # Count by employment type
        emp_types = employees.values_list('employment_type', flat=True).distinct()
        for emp_type in emp_types:
            if emp_type:
                stats["by_employment_type"][emp_type] = employees.filter(employment_type=emp_type).count()
        
        logger.info(f"[Employee API v2] Stats generated for business {business_id}")
        
        return Response({
            "success": True,
            "data": stats
        })
        
    except Exception as e:
        logger.error(f"[Employee API v2] Stats error: {str(e)}")
        return Response(
            {"error": "Failed to generate statistics", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )