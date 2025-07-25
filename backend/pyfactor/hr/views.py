# hr/views.py

from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Employee, Role, EmployeeRole, AccessPermission, PreboardingForm, PerformanceReview, PerformanceMetric, PerformanceRating, PerformanceGoal, FeedbackRecord, PerformanceSetting, Timesheet, TimesheetEntry, TimeOffRequest, TimeOffBalance, Benefits, TimesheetSetting, LocationLog, EmployeeLocationConsent, LocationCheckIn, Geofence, EmployeeGeofence, GeofenceEvent
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
    TimesheetSettingSerializer,
    TimeOffRequestSerializer,
    TimeOffBalanceSerializer,
    BenefitsSerializer,
    LocationLogSerializer,
    EmployeeLocationConsentSerializer,
    LocationCheckInSerializer,
    TimesheetEntryWithLocationSerializer,
    GeofenceSerializer,
    EmployeeGeofenceSerializer,
    GeofenceEventSerializer
)
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.core.mail import send_mail
from django.conf import settings
import uuid
from datetime import datetime
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework import viewsets
from rest_framework.decorators import action

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
            # Get tenant information from user and request
            tenant_id = None
            if hasattr(request.user, 'tenant_id'):
                tenant_id = request.user.tenant_id
            elif hasattr(request.user, 'tenant'):
                tenant_id = request.user.tenant.id if request.user.tenant else None
            
            # Also check if tenant_id is passed in the request
            request_tenant_id = request.GET.get('tenantId') or request.headers.get('X-Tenant-ID')
            if request_tenant_id:
                logger.info(f'📱 [HR Employee List] Tenant ID from request: {request_tenant_id}')
            
            logger.info(f'🏢 [HR Employee List] User tenant_id: {tenant_id}')
            
            # Get the user's business_id
            business_id = None
            if hasattr(request.user, 'business_id'):
                business_id = request.user.business_id
            
            logger.info(f'🔍 [HR Employee List] User {request.user.email} business_id: {business_id}')
            
            # IMPORTANT: Use tenant_id from request if business_id doesn't match
            # This handles the mismatch between tenant_id and business_id
            if request_tenant_id and str(business_id) != str(request_tenant_id):
                logger.warning(f'⚠️ [HR Employee List] Business ID mismatch! Using tenant_id as business_id')
                logger.warning(f'   User business_id: {business_id}')
                logger.warning(f'   Request tenant_id: {request_tenant_id}')
                business_id = request_tenant_id
            
            if not business_id:
                logger.warning(f'⚠️ [HR Employee List] No business_id found for user: {request.user.email}')
                return Response([])
            
            # Filter employees by business_id, avoiding tenant_id column if it doesn't exist
            try:
                logger.info(f'🔍 [HR Employee List] Querying employees for business_id: {business_id}')
                employees = Employee.objects.filter(business_id=business_id)
                logger.info(f'📊 [HR Employee List] Query returned {employees.count()} employees')
                
                # Log raw SQL query for debugging
                logger.info(f'🔍 [HR Employee List] SQL Query: {employees.query}')
            except Exception as db_error:
                logger.warning(f'⚠️ [HR Employee List] Database error, trying alternative query: {str(db_error)}')
                # If there's a database error (possibly missing column), use raw SQL
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, employee_number, first_name, middle_name, last_name, 
                               email, phone_number, date_of_birth, job_title, department, 
                               employment_type, hire_date, salary, wage_per_hour, active, 
                               onboarded, street, city, state, zip_code, country, 
                               compensation_type, emergency_contact_name, emergency_contact_phone,
                               direct_deposit, vacation_time, vacation_days_per_year, 
                               supervisor_id, user_id, security_number_type, ssn_last_four, 
                               created_at, updated_at, business_id
                        FROM hr_employee
                        WHERE business_id = %s
                    """, [str(business_id)])
                    
                    columns = [col[0] for col in cursor.description]
                    employee_data = []
                    for row in cursor.fetchall():
                        employee_dict = dict(zip(columns, row))
                        # Add tenant_id as business_id for compatibility
                        employee_dict['tenant_id'] = employee_dict.get('business_id')
                        employee_data.append(employee_dict)
                    
                    logger.info(f'✅ [HR Employee List] Found {len(employee_data)} employees using raw SQL')
                    return Response(employee_data)
            
            logger.info(f'✅ [HR Employee List] Found {employees.count()} employees for business_id: {business_id}')
            
            # Log first few employees for debugging
            for emp in employees[:3]:
                logger.info(f'  - Employee: {emp.email}, business_id: {emp.business_id}, id: {emp.id}')
            
            # Check all employees in database for this business
            all_count = Employee.objects.filter(business_id=business_id).count()
            logger.info(f'📊 [HR Employee List] Total employees in DB for business {business_id}: {all_count}')
            
            # Also check without any filters to see total employees
            total_employees = Employee.objects.all().count()
            logger.info(f'🌍 [HR Employee List] Total employees in entire DB: {total_employees}')
            
            serializer = EmployeeSerializer(employees, many=True)
            response_data = serializer.data
            logger.info(f'📝 [HR Employee List] Serialized {len(response_data)} employees')
            response = Response(response_data)
            
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
        # CRITICAL: Add immediate log to verify request reaches Django
        print("🔥 EMPLOYEE POST REQUEST REACHED DJANGO BACKEND 🔥")
        logger.info('🔥 CRITICAL: EMPLOYEE POST REQUEST REACHED DJANGO!')
        logger.info('🚀 [HR-DJANGO-TRACE] === START EMPLOYEE CREATE ===')
        logger.info(f'🚀 [HR-DJANGO-TRACE] POST request from user: {request.user.email}')
        logger.info(f'🚀 [HR-DJANGO-TRACE] Request data received:', {
            'dataKeys': list(request.data.keys()),
            'dataSize': len(str(request.data)),
            'hasEmail': 'email' in request.data,
            'hasFirstName': 'firstName' in request.data,
            'hasLastName': 'lastName' in request.data,
            'requestMethod': request.method,
            'contentType': request.content_type
        })
        logger.info(f'🚀 [HR-DJANGO-TRACE] User details:', {
            'userEmail': request.user.email,
            'userAuthenticated': request.user.is_authenticated,
            'hasBusinessId': hasattr(request.user, 'business_id'),
            'hasTenantId': hasattr(request.user, 'tenant_id')
        })
        logger.info(f'🚀 [HR-DJANGO-TRACE] Request headers:', {
            'authorization': 'Session [REDACTED]' if request.headers.get('Authorization') else 'None',
            'xTenantId': request.headers.get('X-Tenant-ID'),
            'contentType': request.headers.get('Content-Type'),
            'userAgent': request.headers.get('User-Agent', '')[:50] + '...' if request.headers.get('User-Agent') else 'None'
        })
        
        try:
            # Handle the security number specially for Stripe storage
            employee_data = request.data.copy()
            security_number = employee_data.pop('securityNumber', None)
            
            # Log the employee data being processed
            logger.info(f'🚀 [HR-DJANGO-TRACE] Processing employee data:', {
                'email': employee_data.get('email', 'unknown'),
                'processedDataKeys': list(employee_data.keys()),
                'hasSecurityNumber': security_number is not None
            })
            
            logger.info(f'🚀 [HR-DJANGO-TRACE] Starting serialization...')
            serializer = EmployeeSerializer(data=employee_data)
            logger.info(f'🚀 [HR-DJANGO-TRACE] Serializer created, validating...')
            
            if serializer.is_valid():
                logger.info(f'🚀 [HR-DJANGO-TRACE] Serializer validation PASSED')
                # Get the user's business_id
                business_id = None
                if hasattr(request.user, 'business_id'):
                    business_id = request.user.business_id
                
                logger.info(f'🚀 [HR-DJANGO-TRACE] Business ID resolution:', {
                    'userBusinessId': business_id,
                    'hasUserBusinessId': business_id is not None
                })
                
                # Also check for tenant_id in request
                request_tenant_id = request.data.get('tenantId') or request.headers.get('X-Tenant-ID')
                logger.info(f'🚀 [HR-DJANGO-TRACE] Tenant ID resolution:', {
                    'requestTenantId': request_tenant_id,
                    'fromData': request.data.get('tenantId'),
                    'fromHeaders': request.headers.get('X-Tenant-ID')
                })
                
                # Use tenant_id if business_id doesn't match
                if request_tenant_id and str(business_id) != str(request_tenant_id):
                    logger.warning(f'🚀 [HR-DJANGO-TRACE] Business ID mismatch detected:', {
                        'userBusinessId': business_id,
                        'requestTenantId': request_tenant_id,
                        'action': 'using tenant_id as business_id'
                    })
                    business_id = request_tenant_id
                
                logger.info(f'🚀 [HR-DJANGO-TRACE] Final business_id resolved:', business_id)
                
                if not business_id:
                    logger.error(f'🚀 [HR-DJANGO-TRACE] CRITICAL: No business_id found for user: {request.user.email}')
                    return Response(
                        {'error': 'User must be associated with a business to create employees'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Save the employee with business_id AND tenant_id for RLS
                # The model will auto-generate employee_number in the save() method
                # For RLS, we need to save tenant_id as well (same as business_id for now)
                logger.info(f'🚀 [HR-DJANGO-TRACE] Attempting to save employee...')
                try:
                    logger.info(f'🚀 [HR-DJANGO-TRACE] Calling serializer.save() with:', {
                        'business_id': business_id,
                        'tenant_id': business_id
                    })
                    employee = serializer.save(business_id=business_id, tenant_id=business_id)
                    logger.info(f'🚀 [HR-DJANGO-TRACE] Employee save() successful:', {
                        'employeeId': employee.id,
                        'employeeEmail': employee.email,
                        'employeeBusinessId': employee.business_id,
                        'employeeTenantId': getattr(employee, 'tenant_id', 'N/A'),
                        'hasId': employee.id is not None
                    })
                except Exception as save_error:
                    logger.error(f'🚀 [HR-DJANGO-TRACE] Employee save() FAILED:', {
                        'error': str(save_error),
                        'errorType': type(save_error).__name__,
                        'hasTenantIdInError': 'tenant_id' in str(save_error)
                    })
                    # If tenant_id column doesn't exist, try without it
                    if 'tenant_id' in str(save_error):
                        logger.info(f'🚀 [HR-DJANGO-TRACE] Retrying save without tenant_id...')
                        employee = serializer.save(business_id=business_id)
                        logger.info(f'🚀 [HR-DJANGO-TRACE] Employee saved without tenant_id:', {
                            'employeeId': employee.id,
                            'employeeBusinessId': employee.business_id
                        })
                    else:
                        raise save_error
                        
                logger.info(f'🚀 [HR-DJANGO-TRACE] Employee creation completed:', {
                    'employeeId': employee.id,
                    'businessId': business_id,
                    'tenantId': business_id,
                    'saved': True
                })
                
                # Handle security number storage if provided
                if security_number:
                    try:
                        # Use the model's secure storage method
                        employee.save_ssn_to_stripe(security_number)
                        logger.info(f'🔒 [HR Employee Create] Security number securely stored for employee {employee.id}')
                    except Exception as e:
                        logger.error(f'❌ [HR Employee Create] Failed to store security number: {str(e)}')
                        # Don't fail the creation, just log the error
                
                # Return the created employee data
                logger.info(f'🚀 [HR-DJANGO-TRACE] Serializing response data...')
                response_serializer = EmployeeSerializer(employee)
                response_data = response_serializer.data
                logger.info(f'🚀 [HR-DJANGO-TRACE] Response serialization complete:', {
                    'dataKeys': list(response_data.keys()) if response_data else [],
                    'dataType': type(response_data).__name__,
                    'isArray': isinstance(response_data, list),
                    'isEmpty': not bool(response_data),
                    'hasId': 'id' in response_data if response_data else False,
                    'responseId': response_data.get('id') if response_data else None
                })
                
                # Double-check the employee was saved
                logger.info(f'🚀 [HR-DJANGO-TRACE] Verifying employee exists in database...')
                saved_employee = Employee.objects.filter(id=employee.id).first()
                if saved_employee:
                    logger.info(f'🚀 [HR-DJANGO-TRACE] Database verification PASSED:', {
                        'employeeExists': True,
                        'savedEmployeeId': saved_employee.id,
                        'savedEmployeeEmail': saved_employee.email
                    })
                else:
                    logger.error(f'🚀 [HR-DJANGO-TRACE] Database verification FAILED: Employee NOT found in DB after save!')
                
                logger.info(f'🚀 [HR-DJANGO-TRACE] Returning response:', {
                    'status': 201,
                    'responseData': response_data
                })
                logger.info('🚀 [HR-DJANGO-TRACE] === END EMPLOYEE CREATE ===')
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f'🚀 [HR-DJANGO-TRACE] Serializer validation FAILED:', {
                    'validationErrors': serializer.errors,
                    'errorCount': len(serializer.errors),
                    'errorFields': list(serializer.errors.keys()) if serializer.errors else []
                })
                logger.info('🚀 [HR-DJANGO-TRACE] === END EMPLOYEE CREATE (VALIDATION ERROR) ===')
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f'🚀 [HR-DJANGO-TRACE] UNEXPECTED ERROR during employee creation:', {
                'error': str(e),
                'errorType': type(e).__name__,
                'userEmail': request.user.email if hasattr(request, 'user') else 'unknown'
            })
            logger.info('🚀 [HR-DJANGO-TRACE] === END EMPLOYEE CREATE (EXCEPTION) ===')
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_stats(request):
    """Get employee statistics"""
    try:
        logger.info(f'🚀 [HR Employee Stats] GET request from user: {request.user.email}')
        
        # Get the user's business_id
        business_id = None
        if hasattr(request.user, 'business_id'):
            business_id = request.user.business_id
        
        if not business_id:
            logger.warning(f'⚠️ [HR Employee Stats] No business_id found for user: {request.user.email}')
            return Response({
                'total_employees': 0,
                'active_employees': 0,
                'departments': []
            })
        
        # Get all employees for the user's business
        employees = Employee.objects.filter(business_id=business_id)
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
        
        # Get the user's business_id
        business_id = None
        if hasattr(request.user, 'business_id'):
            business_id = request.user.business_id
        
        if not business_id:
            logger.warning(f'⚠️ [HR Employee Basic List] No business_id found for user: {request.user.email}')
            return Response([])
        
        # Get only active employees with basic information from user's business
        employees = Employee.objects.filter(
            business_id=business_id,
            active=True
        ).only(
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
    
    # Get the user's business_id
    business_id = None
    if hasattr(request.user, 'business_id'):
        business_id = request.user.business_id
    
    if not business_id:
        logger.error(f'❌ [HR Employee Detail] No business_id found for user: {request.user.email}')
        return Response(
            {'error': 'User must be associated with a business'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        employee = Employee.objects.get(pk=pk, business_id=business_id)
    except Employee.DoesNotExist:
        response = Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
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


class TimesheetSettingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing timesheet settings"""
    queryset = TimesheetSetting.objects.all()
    serializer_class = TimesheetSettingSerializer
    
    def get_queryset(self):
        queryset = TimesheetSetting.objects.all()
        
        # Filter by business_id if provided
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        return queryset


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


# Location Tracking ViewSets

class LocationLogViewSet(viewsets.ModelViewSet):
    """ViewSet for managing location logs"""
    queryset = LocationLog.objects.all()
    serializer_class = LocationLogSerializer
    
    def get_queryset(self):
        queryset = LocationLog.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by location type
        location_type = self.request.query_params.get('location_type', None)
        if location_type:
            queryset = queryset.filter(location_type=location_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date and end_date:
            queryset = queryset.filter(logged_at__date__range=[start_date, end_date])
        elif start_date:
            queryset = queryset.filter(logged_at__date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(logged_at__date__lte=end_date)
        
        return queryset.order_by('-logged_at')
    
    def perform_create(self, serializer):
        # Log location creation
        logger.info(f"Creating location log for employee: {serializer.validated_data.get('employee')}")
        instance = serializer.save()
        
        # If this is a clock in/out, update the active check-in
        if instance.location_type in ['CLOCK_IN', 'CLOCK_OUT']:
            self._update_active_checkin(instance)
    
    def _update_active_checkin(self, location_log):
        """Update or create active check-in based on location log"""
        if location_log.location_type == 'CLOCK_IN':
            # Create or update active check-in
            LocationCheckIn.objects.update_or_create(
                employee=location_log.employee,
                defaults={
                    'latitude': location_log.latitude,
                    'longitude': location_log.longitude,
                    'accuracy': location_log.accuracy,
                    'check_in_time': location_log.logged_at,
                    'business_id': location_log.business_id,
                    'check_in_location_log': location_log,
                    'is_active': True
                }
            )
        elif location_log.location_type == 'CLOCK_OUT':
            # Deactivate check-in
            LocationCheckIn.objects.filter(
                employee=location_log.employee,
                is_active=True
            ).update(is_active=False)


class EmployeeLocationConsentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee location consent"""
    queryset = EmployeeLocationConsent.objects.all()
    serializer_class = EmployeeLocationConsentSerializer
    
    def get_queryset(self):
        queryset = EmployeeLocationConsent.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by consent status
        has_consented = self.request.query_params.get('has_consented', None)
        if has_consented is not None:
            has_consented_bool = has_consented.lower() == 'true'
            queryset = queryset.filter(has_consented=has_consented_bool)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='check/(?P<employee_id>[^/.]+)')
    def check_consent(self, request, employee_id=None):
        """Check if an employee has given location consent"""
        try:
            consent = EmployeeLocationConsent.objects.get(employee_id=employee_id)
            serializer = EmployeeLocationConsentSerializer(consent)
            return Response(serializer.data)
        except EmployeeLocationConsent.DoesNotExist:
            return Response({
                'employee_id': employee_id,
                'has_consented': False,
                'message': 'No consent record found'
            }, status=status.HTTP_404_NOT_FOUND)


class LocationCheckInViewSet(viewsets.ModelViewSet):
    """ViewSet for managing active location check-ins"""
    queryset = LocationCheckIn.objects.all()
    serializer_class = LocationCheckInSerializer
    
    def get_queryset(self):
        queryset = LocationCheckIn.objects.all()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id', None)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by business_id
        business_id = self.request.query_params.get('business_id', None)
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        return queryset.order_by('-check_in_time')
    
    @action(detail=False, methods=['get'])
    def active_checkins(self, request):
        """Get all active check-ins for a business"""
        business_id = request.query_params.get('business_id', None)
        if not business_id:
            return Response({
                'error': 'business_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        active_checkins = LocationCheckIn.objects.filter(
            business_id=business_id,
            is_active=True
        ).select_related('employee')
        
        serializer = LocationCheckInSerializer(active_checkins, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in_with_location(request):
    """
    Clock in with location data
    Expects: employee_id, latitude, longitude, accuracy (optional), address data (optional)
    """
    employee_id = request.data.get('employee_id')
    if not employee_id:
        return Response({
            'error': 'employee_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check consent
    try:
        consent = EmployeeLocationConsent.objects.get(employee=employee)
        if not consent.has_consented or not consent.allow_clock_in_out_tracking:
            return Response({
                'error': 'Employee has not consented to location tracking for clock in/out'
            }, status=status.HTTP_403_FORBIDDEN)
    except EmployeeLocationConsent.DoesNotExist:
        return Response({
            'error': 'No consent record found for employee'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Create location log
    location_data = {
        'employee': employee.id,
        'location_type': 'CLOCK_IN',
        'latitude': request.data.get('latitude'),
        'longitude': request.data.get('longitude'),
        'accuracy': request.data.get('accuracy'),
        'street_address': request.data.get('street_address'),
        'city': request.data.get('city'),
        'state': request.data.get('state'),
        'postal_code': request.data.get('postal_code'),
        'country': request.data.get('country'),
        'formatted_address': request.data.get('formatted_address'),
        'device_type': request.data.get('device_type'),
        'device_id': request.data.get('device_id'),
        'ip_address': request.META.get('REMOTE_ADDR'),
        'user_agent': request.META.get('HTTP_USER_AGENT'),
    }
    
    serializer = LocationLogSerializer(data=location_data)
    if serializer.is_valid():
        location_log = serializer.save()
        
        # Create or update active check-in
        LocationCheckIn.objects.update_or_create(
            employee=employee,
            defaults={
                'latitude': location_log.latitude,
                'longitude': location_log.longitude,
                'accuracy': location_log.accuracy,
                'check_in_time': location_log.logged_at,
                'business_id': location_log.business_id,
                'check_in_location_log': location_log,
                'is_active': True
            }
        )
        
        return Response({
            'message': 'Successfully clocked in with location',
            'location_log': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out_with_location(request):
    """
    Clock out with location data
    Expects: employee_id, latitude, longitude, accuracy (optional), address data (optional)
    """
    employee_id = request.data.get('employee_id')
    if not employee_id:
        return Response({
            'error': 'employee_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check consent
    try:
        consent = EmployeeLocationConsent.objects.get(employee=employee)
        if not consent.has_consented or not consent.allow_clock_in_out_tracking:
            return Response({
                'error': 'Employee has not consented to location tracking for clock in/out'
            }, status=status.HTTP_403_FORBIDDEN)
    except EmployeeLocationConsent.DoesNotExist:
        return Response({
            'error': 'No consent record found for employee'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Create location log
    location_data = {
        'employee': employee.id,
        'location_type': 'CLOCK_OUT',
        'latitude': request.data.get('latitude'),
        'longitude': request.data.get('longitude'),
        'accuracy': request.data.get('accuracy'),
        'street_address': request.data.get('street_address'),
        'city': request.data.get('city'),
        'state': request.data.get('state'),
        'postal_code': request.data.get('postal_code'),
        'country': request.data.get('country'),
        'formatted_address': request.data.get('formatted_address'),
        'device_type': request.data.get('device_type'),
        'device_id': request.data.get('device_id'),
        'ip_address': request.META.get('REMOTE_ADDR'),
        'user_agent': request.META.get('HTTP_USER_AGENT'),
    }
    
    serializer = LocationLogSerializer(data=location_data)
    if serializer.is_valid():
        location_log = serializer.save()
        
        # Deactivate check-in
        LocationCheckIn.objects.filter(
            employee=employee,
            is_active=True
        ).update(is_active=False)
        
        return Response({
            'message': 'Successfully clocked out with location',
            'location_log': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Geofencing ViewSets

class GeofenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing geofences
    """
    queryset = Geofence.objects.all()
    serializer_class = GeofenceSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        logger.info(f"[GeofenceViewSet] === LIST REQUEST START ===")
        logger.info(f"[GeofenceViewSet] User: {request.user.email}")
        logger.info(f"[GeofenceViewSet] Business ID: {request.user.business_id}")
        logger.info(f"[GeofenceViewSet] Request path: {request.path}")
        
        try:
            # Debug: Check all geofences in database
            all_geofences = Geofence.objects.all()
            logger.info(f"[GeofenceViewSet] Total geofences in DB: {all_geofences.count()}")
            
            # Log ALL geofences to see what's in DB
            for i, g in enumerate(all_geofences):
                logger.info(f"[GeofenceViewSet] Geofence [{i}]: ID={g.id}, Name={g.name}, Business={g.business_id}, Active={g.is_active}, Created={g.created_at}")
            
            # Debug: Check filtered geofences
            filtered_geofences = self.get_queryset()
            logger.info(f"[GeofenceViewSet] Filtered geofences for business {request.user.business_id}: {filtered_geofences.count()}")
            
            # Log filtered results
            for i, g in enumerate(filtered_geofences):
                logger.info(f"[GeofenceViewSet] Filtered [{i}]: ID={g.id}, Name={g.name}")
            
            response = super().list(request, *args, **kwargs)
            
            logger.info(f"[GeofenceViewSet] Response status: {response.status_code}")
            logger.info(f"[GeofenceViewSet] Response data: {response.data}")
            
            # If it's paginated, check the results
            if isinstance(response.data, dict) and 'results' in response.data:
                logger.info(f"[GeofenceViewSet] Paginated results count: {len(response.data['results'])}")
            
            return response
            
        except Exception as e:
            logger.error(f"[GeofenceViewSet] Error in list: {str(e)}")
            logger.error(f"[GeofenceViewSet] Error type: {type(e)}")
            import traceback
            logger.error(f"[GeofenceViewSet] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e), 'type': str(type(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            logger.info(f"[GeofenceViewSet] === LIST REQUEST END ===")
    
    def create(self, request, *args, **kwargs):
        logger.info(f"[GeofenceViewSet] === CREATE REQUEST START ===")
        logger.info(f"[GeofenceViewSet] User: {request.user.email}")
        logger.info(f"[GeofenceViewSet] Business ID: {request.user.business_id}")
        logger.info(f"[GeofenceViewSet] Request data: {request.data}")
        logger.info(f"[GeofenceViewSet] Request method: {request.method}")
        logger.info(f"[GeofenceViewSet] Request path: {request.path}")
        
        try:
            # Create a mutable copy of request data
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            logger.info(f"[GeofenceViewSet] Data copy created: {data}")
            
            # Log each field
            logger.info(f"[GeofenceViewSet] Field values:")
            for field, value in data.items():
                logger.info(f"  - {field}: {value} (type: {type(value)})")
            
            # Get the serializer
            serializer = self.get_serializer(data=data)
            logger.info(f"[GeofenceViewSet] Serializer created with class: {serializer.__class__.__name__}")
            
            # Validate
            is_valid = serializer.is_valid()
            logger.info(f"[GeofenceViewSet] Serializer is_valid: {is_valid}")
            
            if not is_valid:
                logger.error(f"[GeofenceViewSet] Validation errors: {serializer.errors}")
                # Log each error in detail
                for field, errors in serializer.errors.items():
                    logger.error(f"[GeofenceViewSet] Field '{field}' errors: {errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            logger.info(f"[GeofenceViewSet] Validated data: {serializer.validated_data}")
            
            # Perform create
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            logger.info(f"[GeofenceViewSet] Create successful, returning data: {serializer.data}")
            
            # Verify it was saved
            created_id = serializer.data.get('id')
            if created_id:
                try:
                    verify = Geofence.objects.get(id=created_id)
                    logger.info(f"[GeofenceViewSet] Verified geofence exists: ID={verify.id}, Name={verify.name}, Business={verify.business_id}")
                except Geofence.DoesNotExist:
                    logger.error(f"[GeofenceViewSet] ERROR: Geofence with ID {created_id} not found after creation!")
                    
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"[GeofenceViewSet] Error in create: {str(e)}")
            logger.error(f"[GeofenceViewSet] Error type: {type(e)}")
            import traceback
            logger.error(f"[GeofenceViewSet] Traceback: {traceback.format_exc()}")
            
            return Response(
                {'error': str(e), 'type': str(type(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            logger.info(f"[GeofenceViewSet] === CREATE REQUEST END ===")
    
    def get_queryset(self):
        # Filter by business_id for multi-tenant isolation
        try:
            logger.info(f"[GeofenceViewSet] Getting queryset for business: {self.request.user.business_id}")
            logger.info(f"[GeofenceViewSet] User email: {self.request.user.email}")
            logger.info(f"[GeofenceViewSet] Request method: {self.request.method}")
            
            # Check if user has business_id
            if not self.request.user.business_id:
                logger.error(f"[GeofenceViewSet] User {self.request.user.email} has no business_id!")
                return Geofence.objects.none()
            
            queryset = self.queryset.filter(
                business_id=self.request.user.business_id,
                is_active=True
            ).annotate(
                assigned_employees_count=Count('assigned_employees')
            ).select_related('created_by')
            
            logger.info(f"[GeofenceViewSet] Queryset count: {queryset.count()}")
            
            return queryset
        except Exception as e:
            logger.error(f"[GeofenceViewSet] Error in get_queryset: {str(e)}")
            logger.error(f"[GeofenceViewSet] Error type: {type(e)}")
            import traceback
            logger.error(f"[GeofenceViewSet] Traceback: {traceback.format_exc()}")
            raise
    
    def perform_create(self, serializer):
        logger.info(f"[GeofenceViewSet] Performing create with data: {serializer.validated_data}")
        logger.info(f"[GeofenceViewSet] Request user business_id: {self.request.user.business_id}")
        logger.info(f"[GeofenceViewSet] Request user email: {self.request.user.email}")
        
        # Save with the current user as created_by
        instance = serializer.save(
            business_id=self.request.user.business_id,
            created_by=self.request.user
        )
        
        logger.info(f"[GeofenceViewSet] Created geofence ID: {instance.id}")
        logger.info(f"[GeofenceViewSet] Created geofence business_id: {instance.business_id}")
        logger.info(f"[GeofenceViewSet] Created geofence name: {instance.name}")
        logger.info(f"[GeofenceViewSet] Created geofence is_active: {instance.is_active}")
        logger.info(f"[GeofenceViewSet] Created by: {instance.created_by if instance.created_by else 'None'}")
        
    @action(detail=False, methods=['get'])
    def debug_list(self, request):
        """Debug endpoint to check all geofences"""
        try:
            logger.info(f"[GeofenceViewSet] debug_list called by {request.user.email}")
            logger.info(f"[GeofenceViewSet] debug_list user business_id: {request.user.business_id}")
            
            # Get all geofences with more details
            all_geofences = Geofence.objects.all().values(
                'id', 'name', 'business_id', 'is_active', 'created_at',
                'center_latitude', 'center_longitude', 'radius_meters'
            )
            
            # Get user's geofences
            user_geofences = Geofence.objects.filter(
                business_id=request.user.business_id
            ).values(
                'id', 'name', 'business_id', 'is_active', 'created_at',
                'center_latitude', 'center_longitude', 'radius_meters'
            )
            
            # Also check with is_active filter
            active_user_geofences = Geofence.objects.filter(
                business_id=request.user.business_id,
                is_active=True
            ).values('id', 'name')
            
            result = {
                'user_business_id': str(request.user.business_id),
                'total_geofences_in_db': Geofence.objects.count(),
                'user_geofences_count': user_geofences.count(),
                'active_user_geofences_count': active_user_geofences.count(),
                'all_geofences': list(all_geofences),
                'user_geofences': list(user_geofences),
                'active_user_geofences': list(active_user_geofences)
            }
            
            logger.info(f"[GeofenceViewSet] debug_list result: {result}")
            
            return Response(result)
        except Exception as e:
            logger.error(f"[GeofenceViewSet] Error in debug_list: {str(e)}")
            import traceback
            logger.error(f"[GeofenceViewSet] Traceback: {traceback.format_exc()}")
            return Response({
                'error': str(e),
                'type': str(type(e))
            }, status=500)
    
    @action(detail=True, methods=['post'])
    def assign_employees(self, request, pk=None):
        """Assign multiple employees to a geofence"""
        geofence = self.get_object()
        employee_ids = request.data.get('employee_ids', [])
        
        if not employee_ids:
            return Response(
                {'error': 'No employee IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created = []
        errors = []
        
        for employee_id in employee_ids:
            try:
                employee = Employee.objects.get(
                    id=employee_id,
                    business_id=request.user.business_id
                )
                
                employee_geofence, was_created = EmployeeGeofence.objects.get_or_create(
                    employee=employee,
                    geofence=geofence,
                    defaults={
                        'business_id': request.user.business_id,
                        'assigned_by': request.user
                    }
                )
                
                if was_created:
                    created.append(EmployeeGeofenceSerializer(employee_geofence).data)
                
            except Employee.DoesNotExist:
                errors.append(f"Employee {employee_id} not found")
            except Exception as e:
                errors.append(f"Error assigning employee {employee_id}: {str(e)}")
        
        return Response({
            'created': created,
            'errors': errors,
            'total_assigned': len(created)
        })
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get all events for a geofence"""
        geofence = self.get_object()
        events = GeofenceEvent.objects.filter(
            geofence=geofence,
            business_id=request.user.business_id
        ).select_related('employee').order_by('-event_time')[:100]
        
        serializer = GeofenceEventSerializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def check_location(self, request):
        """Check if current location is within any active geofences"""
        latitude = request.query_params.get('latitude')
        longitude = request.query_params.get('longitude')
        employee_id = request.query_params.get('employee_id')
        
        if not all([latitude, longitude, employee_id]):
            return Response(
                {'error': 'latitude, longitude, and employee_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from math import radians, cos, sin, asin, sqrt
            
            def calculate_distance(lat1, lon1, lat2, lon2):
                # Convert to radians
                lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
                
                # Haversine formula
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * asin(sqrt(a))
                r = 6371000  # Radius of earth in meters
                return c * r
            
            employee = Employee.objects.get(
                id=employee_id,
                business_id=request.user.business_id
            )
            
            # Get employee's assigned geofences
            employee_geofences = EmployeeGeofence.objects.filter(
                employee=employee,
                is_active=True
            ).select_related('geofence')
            
            results = []
            
            for eg in employee_geofences:
                geofence = eg.geofence
                if not geofence.is_active:
                    continue
                
                distance = calculate_distance(
                    float(latitude),
                    float(longitude),
                    float(geofence.center_latitude),
                    float(geofence.center_longitude)
                )
                
                is_inside = distance <= geofence.radius_meters
                
                results.append({
                    'geofence': GeofenceSerializer(geofence).data,
                    'is_inside': is_inside,
                    'distance': round(distance, 2),
                    'distance_from_edge': round(geofence.radius_meters - distance, 2),
                    'can_clock_in': is_inside or eg.can_clock_in_outside,
                })
            
            return Response({
                'employee_id': employee_id,
                'location': {
                    'latitude': float(latitude),
                    'longitude': float(longitude)
                },
                'geofences': results,
                'can_clock_in': any(g['can_clock_in'] for g in results) if results else True,
            })
            
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmployeeGeofenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing employee-geofence assignments
    """
    queryset = EmployeeGeofence.objects.all()
    serializer_class = EmployeeGeofenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by business_id for multi-tenant isolation
        queryset = self.queryset.filter(
            business_id=self.request.user.business_id
        ).select_related('employee', 'geofence', 'assigned_by')
        
        # Optional filters
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        geofence_id = self.request.query_params.get('geofence_id')
        if geofence_id:
            queryset = queryset.filter(geofence_id=geofence_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(
            business_id=self.request.user.business_id,
            assigned_by=self.request.user
        )


class GeofenceEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing geofence events (read-only)
    """
    queryset = GeofenceEvent.objects.all()
    serializer_class = GeofenceEventSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by business_id for multi-tenant isolation
        queryset = self.queryset.filter(
            business_id=self.request.user.business_id
        ).select_related('employee', 'geofence', 'location_log')
        
        # Optional filters
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        geofence_id = self.request.query_params.get('geofence_id')
        if geofence_id:
            queryset = queryset.filter(geofence_id=geofence_id)
        
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(event_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(event_time__lte=end_date)
        
        return queryset.order_by('-event_time')
    
    @action(detail=False, methods=['post'])
    def log_event(self, request):
        """Log a geofence event"""
        required_fields = ['employee_id', 'geofence_id', 'event_type', 'latitude', 'longitude']
        
        for field in required_fields:
            if field not in request.data:
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            employee = Employee.objects.get(
                id=request.data['employee_id'],
                business_id=request.user.business_id
            )
            
            geofence = Geofence.objects.get(
                id=request.data['geofence_id'],
                business_id=request.user.business_id
            )
            
            # Calculate distance from center
            from math import radians, cos, sin, asin, sqrt
            
            def calculate_distance(lat1, lon1, lat2, lon2):
                lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * asin(sqrt(a))
                r = 6371000  # Radius of earth in meters
                return c * r
            
            distance = calculate_distance(
                float(request.data['latitude']),
                float(request.data['longitude']),
                float(geofence.center_latitude),
                float(geofence.center_longitude)
            )
            
            event_data = {
                'business_id': request.user.business_id,
                'employee': employee,
                'geofence': geofence,
                'event_type': request.data['event_type'],
                'latitude': request.data['latitude'],
                'longitude': request.data['longitude'],
                'distance_from_center': distance,
                'notes': request.data.get('notes', ''),
            }
            
            # Link to location log if provided
            if 'location_log_id' in request.data:
                try:
                    location_log = LocationLog.objects.get(
                        id=request.data['location_log_id'],
                        business_id=request.user.business_id
                    )
                    event_data['location_log'] = location_log
                except LocationLog.DoesNotExist:
                    pass
            
            event = GeofenceEvent.objects.create(**event_data)
            
            serializer = GeofenceEventSerializer(event)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Geofence.DoesNotExist:
            return Response(
                {'error': 'Geofence not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )