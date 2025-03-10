import uuid
import logging
from django.db import connection, transaction
from django.conf import settings
from .models import Tenant

logger = logging.getLogger(__name__)

def create_tenant_schema_for_user(user, business_name=None):
    """
    Create a tenant schema for a user immediately after authentication.
    
    Args:
        user: The authenticated user
        business_name: Optional business name for the tenant
    
    Returns:
        Tenant: The created tenant object
    """
    logger.info(f"Creating tenant schema for user {user.email}")
    
    # Generate tenant ID and schema name
    tenant_id = uuid.uuid4()
    # Convert tenant_id to string and replace hyphens with underscores
    tenant_id_str = str(tenant_id).replace('-', '_')
    schema_name = f"tenant_{tenant_id_str}"
    
    # Use a descriptive name if business name not provided
    tenant_name = business_name or f"{user.full_name}'s Workspace"
    
    try:
        with transaction.atomic():
            # Create tenant record
            tenant = Tenant.objects.create(
                id=tenant_id,
                schema_name=schema_name,
                name=tenant_name,
                owner=user,
                database_status='pending',
                setup_status='in_progress'
            )
            
            # Create schema in database
            with connection.cursor() as cursor:
                # Create schema
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                
                # Set search path for migrations
                cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Apply migrations to the new schema
            from django.core.management import call_command
            
            # First apply shared apps migrations
            call_command('migrate', 'auth', verbosity=0)
            call_command('migrate', 'contenttypes', verbosity=0)
            call_command('migrate', 'sessions', verbosity=0)
            
            # Then apply tenant-specific apps migrations
            tenant_apps = getattr(settings, 'TENANT_APPS', [
                'inventory', 'sales', 'purchases', 'finance', 'hr', 'payroll'
            ])
            
            for app in tenant_apps:
                try:
                    logger.info(f"Applying migrations for app {app} in schema {schema_name}")
                    call_command('migrate', app, verbosity=0)
                except Exception as e:
                    logger.error(f"Error applying migrations for app {app}: {str(e)}")
                    # Continue with other apps even if one fails
            
            # Update tenant status
            tenant.database_status = 'active'
            tenant.save(update_fields=['database_status'])
            
            # Associate tenant with user
            user.tenant = tenant
            user.save(update_fields=['tenant'])
            
            logger.info(f"Successfully created tenant schema {schema_name} for user {user.email}")
            return tenant
            
    except Exception as e:
        logger.error(f"Failed to create tenant schema for user {user.email}: {str(e)}", exc_info=True)
        # If tenant was created but schema creation failed, mark it as error
        if 'tenant' in locals():
            tenant.database_status = 'error'
            tenant.setup_error_message = str(e)
            tenant.save(update_fields=['database_status', 'setup_error_message'])
        raise
import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for REST framework that handles Cognito-specific errors.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if isinstance(exc, ClientError):
        error_code = exc.response['Error']['Code']
        if error_code == 'NotAuthorizedException':
            logger.warning(f"Authentication failed: {str(exc)}")
            return AuthenticationFailed('Invalid token or token expired')
        elif error_code == 'InvalidParameterException':
            logger.warning(f"Invalid parameters: {str(exc)}")
            return AuthenticationFailed('Invalid authentication parameters')
        else:
            logger.error(f"Cognito error: {str(exc)}")
            return AuthenticationFailed('Authentication failed')

    # Return the original response
    return response