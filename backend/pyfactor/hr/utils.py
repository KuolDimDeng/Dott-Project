import logging
from django.conf import settings
# Removed Cognito import - using Auth0 instead
from .models import Employee
from typing import cast, Any, Optional
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

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


# ===== NEW HELPER FUNCTIONS FOR USER-EMPLOYEE RELATIONSHIP =====

def get_employee_for_user(user: User) -> Optional[Employee]:
    """
    Get the Employee instance for a given User, if it exists.
    
    Args:
        user: The User instance
        
    Returns:
        Employee instance or None if the user has no employee profile
    """
    try:
        return user.employee_profile
    except Employee.DoesNotExist:
        return None


def create_employee_for_user(user: User, **kwargs) -> Employee:
    """
    Create an Employee instance for a User if one doesn't exist.
    
    Args:
        user: The User instance
        **kwargs: Additional fields for the Employee model
        
    Returns:
        The created or existing Employee instance
    """
    employee, created = Employee.objects.get_or_create(
        user=user,
        defaults={
            'business_id': user.business_id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            **kwargs
        }
    )
    
    if created:
        logger.info(f"Created employee profile for user {user.email}")
    
    return employee


def user_has_employee_profile(user: User) -> bool:
    """
    Check if a User has an associated Employee profile.
    
    Args:
        user: The User instance
        
    Returns:
        True if the user has an employee profile, False otherwise
    """
    return hasattr(user, 'employee_profile')


def get_user_display_name(user: User) -> str:
    """
    Get a display name for a user, whether they have an employee profile or not.
    
    Args:
        user: The User instance
        
    Returns:
        The user's full name or email
    """
    if user.get_full_name():
        return user.get_full_name()
    return user.email


def is_user_employee(user: User) -> bool:
    """
    Check if a user is an employee (has employee profile and is not an owner).
    
    Args:
        user: The User instance
        
    Returns:
        True if the user is an employee, False if they're an owner or have no profile
    """
    if user.role == 'OWNER':
        return False
    return user_has_employee_profile(user)


def get_user_role_display(user: User) -> str:
    """
    Get a human-readable role for the user.
    
    Args:
        user: The User instance
        
    Returns:
        A string describing the user's role
    """
    role_map = {
        'OWNER': 'Business Owner',
        'ADMIN': 'Administrator',
        'USER': 'Employee'
    }
    
    base_role = role_map.get(user.role, 'User')
    
    # Add employee status if applicable
    if user.role == 'USER' and user_has_employee_profile(user):
        employee = get_employee_for_user(user)
        if employee and employee.is_supervisor:
            return f"{base_role} (Supervisor)"
    
    return base_role


def get_or_none(model, **kwargs):
    """
    Generic helper to get a model instance or None if it doesn't exist.
    
    Args:
        model: The Django model class
        **kwargs: Lookup parameters
        
    Returns:
        Model instance or None
    """
    try:
        return model.objects.get(**kwargs)
    except model.DoesNotExist:
        return None