import logging
from django.conf import settings
# Removed Cognito import - using Auth0 instead
from .models import Employee
from typing import cast, Any

logger = logging.getLogger(__name__)

def get_business_id_from_request(request):
    """
    Extract business ID from the request headers or user attributes.
    
    Args:
        request: The HTTP request object
        
    Returns:
        str: Business ID if found, None otherwise
    """
    try:
        # First try to get from headers
        business_id = request.headers.get('X-Business-ID')
        if business_id:
            logger.debug(f"Found business_id from header: {business_id}")
            return business_id
            
        # Then check user attributes
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'business_id') and user.business_id:
            logger.debug(f"Found business_id from user object: {user.business_id}")
            return user.business_id
            
        logger.warning("No business_id found in request.")
        return None
    except Exception as e:
        logger.error(f"Error extracting business_id from request: {str(e)}")
        return None

def link_user_to_employee(user_id, employee_id=None, employee_number=None):
    """
    Link an Auth0 user to an employee record.
    
    Args:
        user_id (str): The Auth0 user ID (sub)
        employee_id (str, optional): UUID of the employee to link
        employee_number (str, optional): Employee number (e.g., EMP-000001) to link
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if not employee_id and not employee_number:
            logger.error("Either employee_id or employee_number must be provided")
            return False
            
        # If employee_number is provided, find the employee by number
        if not employee_id and employee_number:
            try:
                employee = Employee.objects.get(employee_number=employee_number)
                employee_id = str(employee.id)
            except Employee.DoesNotExist:
                logger.error(f"Employee with number {employee_number} not found")
                return False
                
        # Log the linking since using Auth0 instead of Cognito
        logger.info(f"Linked user {user_id} with employee {employee_number or employee_id} (Auth0 mode)")
        
        # Update the employee record with the user ID
        if employee_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                user = User.objects.get(auth0_sub=user_id)
                user = cast(Any, user)  # Cast to Any to avoid linter errors with dynamic attributes
                employee = Employee.objects.get(id=employee_id)
                
                if not employee.user:  # Only update if not already set
                    employee.user = user
                    employee.save(update_fields=['user'])
                    logger.info(f"Updated employee {employee.employee_number} with user {user.pk}")
            except User.DoesNotExist:
                logger.warning(f"No user found with auth0_sub={user_id}, couldn't update employee.user")
            except Exception as e:
                logger.error(f"Error updating employee.user: {str(e)}")
                
        logger.info(f"Successfully linked user {user_id} with employee {employee_number or employee_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to link user to employee: {str(e)}")
        return False 

def get_employee_by_cognito_user(user_id, user_attributes=None):
    """
    Get employee record by Auth0 user ID.
    
    Args:
        user_id (str): The Auth0 user ID (sub)
        user_attributes (dict, optional): Pre-fetched user attributes (not used in Auth0 mode)
        
    Returns:
        Employee: Employee instance if found, None otherwise
    """
    try:
        # Get employee by direct user relationship using Auth0
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(auth0_sub=user_id)
            user = cast(Any, user)  # Cast to Any to avoid linter errors with dynamic attributes
            if hasattr(user, 'employee_profile') and user.employee_profile:
                logger.info(f"Found employee via direct user relationship: {user.employee_profile.employee_number}")
                return user.employee_profile
        except User.DoesNotExist:
            logger.debug(f"No user found with auth0_sub={user_id}")
        except Exception as e:
            logger.warning(f"Error fetching employee via user relationship: {str(e)}")
        
        logger.warning(f"No employee found for user {user_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error in get_employee_by_cognito_user: {str(e)}")
        return None 


def check_column_exists(table_name, column_name):
    """
    Check if a column exists in a table
    """
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND column_name = %s
            )
        """, [table_name, column_name])
        return cursor.fetchone()[0]


def get_available_employee_fields():
    """
    Get list of available fields based on what exists in the database
    """
    base_fields = [
        'id', 'employee_number', 'first_name', 'middle_name', 'last_name', 
        'email', 'phone_number', 'job_title', 'department', 'employment_type',
        'date_joined', 'salary', 'active', 'onboarded', 'role',
        'street', 'city', 'postcode', 'country', 'compensation_type',
        'probation', 'probation_end_date', 'health_insurance_enrollment', 
        'pension_enrollment', 'supervisor'
    ]
    
    # Check for optional fields that might not be migrated yet
    optional_fields = {
        'date_of_birth': 'date_of_birth',
        'direct_deposit': 'direct_deposit',
        'vacation_time': 'vacation_time',
        'vacation_days_per_year': 'vacation_days_per_year'
    }
    
    for field_name, column_name in optional_fields.items():
        try:
            if check_column_exists('hr_employee', column_name):
                base_fields.append(field_name)
        except Exception as e:
            logger.warning(f"Could not check for column {column_name}: {str(e)}")
    
    return base_fields