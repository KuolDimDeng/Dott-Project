import logging
from django.conf import settings
from custom_auth.cognito import update_user_attributes_sync
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
            
        # Check custom attributes from request
        cognito_attributes = getattr(request, 'cognito_attributes', {})
        if cognito_attributes:
            business_id = cognito_attributes.get('custom:business_id', cognito_attributes.get('business_id'))
            if business_id:
                logger.debug(f"Found business_id from cognito attributes: {business_id}")
                return business_id
                
        logger.warning("No business_id found in request.")
        return None
    except Exception as e:
        logger.error(f"Error extracting business_id from request: {str(e)}")
        return None

def link_user_to_employee(user_id, employee_id=None, employee_number=None):
    """
    Link a Cognito user to an employee record by setting the employee's ID as a custom attribute.
    
    Args:
        user_id (str): The Cognito user ID (sub)
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
                
        # Update the Cognito user with the employee ID
        update_user_attributes_sync(user_id, {
            'employeeid': employee_number or Employee.objects.get(id=employee_id).employee_number
        })
        
        # Optionally update the employee record with the user ID
        if employee_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                user = User.objects.get(cognito_sub=user_id)
                user = cast(Any, user)  # Cast to Any to avoid linter errors with dynamic attributes
                employee = Employee.objects.get(id=employee_id)
                
                if not employee.user:  # Only update if not already set
                    employee.user = user
                    employee.save(update_fields=['user'])
                    logger.info(f"Updated employee {employee.employee_number} with user {user.pk}")
            except User.DoesNotExist:
                logger.warning(f"No user found with cognito_sub={user_id}, couldn't update employee.user")
            except Exception as e:
                logger.error(f"Error updating employee.user: {str(e)}")
                
        logger.info(f"Successfully linked user {user_id} with employee {employee_number or employee_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to link user to employee: {str(e)}")
        return False 

def get_employee_by_cognito_user(user_id, user_attributes=None):
    """
    Get employee record by Cognito user ID using the custom:employeeid attribute.
    
    Args:
        user_id (str): The Cognito user ID (sub)
        user_attributes (dict, optional): Pre-fetched Cognito user attributes
        
    Returns:
        Employee: Employee instance if found, None otherwise
    """
    try:
        # First try to get employee by direct user relationship
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(cognito_sub=user_id)
            user = cast(Any, user)  # Cast to Any to avoid linter errors with dynamic attributes
            if hasattr(user, 'employee_profile') and user.employee_profile:
                logger.info(f"Found employee via direct user relationship: {user.employee_profile.employee_number}")
                return user.employee_profile
        except User.DoesNotExist:
            logger.debug(f"No user found with cognito_sub={user_id}")
        except Exception as e:
            logger.warning(f"Error fetching employee via user relationship: {str(e)}")
        
        # If user_attributes is provided, check for employeeid
        if user_attributes and ('custom:employeeid' in user_attributes or 'employeeid' in user_attributes):
            employee_number = user_attributes.get('custom:employeeid', user_attributes.get('employeeid'))
            if employee_number:
                try:
                    employee = Employee.objects.get(employee_number=employee_number)
                    logger.info(f"Found employee via Cognito attribute: {employee_number}")
                    return employee
                except Employee.DoesNotExist:
                    logger.warning(f"No employee found with number {employee_number} from Cognito attributes")
        
        # If user_attributes not provided or employeeid not found, fetch from Cognito
        if not user_attributes:
            import boto3
            from botocore.exceptions import ClientError
            
            try:
                client = boto3.client('cognito-idp',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                
                response = client.admin_get_user(
                    UserPoolId=settings.COGNITO_USER_POOL_ID,
                    Username=user_id
                )
                
                # Convert to dict
                cognito_attributes = {attr['Name']: attr['Value'] for attr in response.get('UserAttributes', [])}
                
                # Check for employeeid
                employee_number = cognito_attributes.get('custom:employeeid', cognito_attributes.get('employeeid'))
                if employee_number:
                    try:
                        employee = Employee.objects.get(employee_number=employee_number)
                        logger.info(f"Found employee via Cognito API lookup: {employee_number}")
                        return employee
                    except Employee.DoesNotExist:
                        logger.warning(f"No employee found with number {employee_number} from Cognito API lookup")
                
            except ClientError as e:
                logger.error(f"Error fetching Cognito user attributes: {str(e)}")
        
        logger.warning(f"No employee found for user {user_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error in get_employee_by_cognito_user: {str(e)}")
        return None 