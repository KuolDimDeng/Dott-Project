import uuid
import logging
import time
import sys
import traceback
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
    process_id = uuid.uuid4()
    start_time = time.time()
    logger.info(f"[TENANT-CREATION-{process_id}] Creating tenant schema for user {user.email} (ID: {user.id})")
    
    # Generate tenant ID and schema name
    tenant_id = uuid.uuid4()
    # Convert tenant_id to string and replace hyphens with underscores
    tenant_id_str = str(tenant_id).replace('-', '_')
    schema_name = f"tenant_{tenant_id_str}"
    
    logger.debug(f"[TENANT-CREATION-{process_id}] Generated schema name: {schema_name} for user: {user.email}")
    logger.debug(f"[TENANT-CREATION-{process_id}] Schema name uses underscores: {'_' in schema_name and '-' not in schema_name}")
    
    # Use a descriptive name if business name not provided
    tenant_name = business_name or f"{user.full_name}'s Workspace"
    logger.debug(f"[TENANT-CREATION-{process_id}] Using tenant name: {tenant_name}")
    
    try:
        with transaction.atomic():
            # Create tenant record
            logger.debug(f"[TENANT-CREATION-{process_id}] Creating tenant record in database")
            tenant = Tenant.objects.create(
                id=tenant_id,
                schema_name=schema_name,
                name=tenant_name,
                owner=user,
                database_status='pending',
                setup_status='in_progress'
            )
            logger.info(f"[TENANT-CREATION-{process_id}] Created tenant record with ID: {tenant.id}")
            
            # Create schema in database
            logger.debug(f"[TENANT-CREATION-{process_id}] Creating schema in database")
            with connection.cursor() as cursor:
                # Create schema
                logger.debug(f"[TENANT-CREATION-{process_id}] Executing CREATE SCHEMA IF NOT EXISTS for {schema_name}")
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                
                # Verify schema was created
                cursor.execute("""
                    SELECT schema_name FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
                logger.debug(f"[TENANT-CREATION-{process_id}] Schema creation verified: {schema_exists}")
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                logger.debug(f"[TENANT-CREATION-{process_id}] Setting up permissions for user {db_user}")
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                
                # Set search path for migrations
                logger.debug(f"[TENANT-CREATION-{process_id}] Setting search path to {schema_name},public")
                cursor.execute(f'SET search_path TO "{schema_name}",public')
                
                # Verify search path was set correctly
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                logger.debug(f"[TENANT-CREATION-{process_id}] Current search path: {current_path}")
                logger.debug(f"[TENANT-CREATION-{process_id}] Search path contains schema: {schema_name in current_path}")
            
            # Apply migrations to the new schema
            from django.core.management import call_command
            
            # First apply shared apps migrations
            logger.info(f"[TENANT-CREATION-{process_id}] Applying shared apps migrations")
            shared_apps_start = time.time()
            try:
                call_command('migrate', 'auth', verbosity=0)
                call_command('migrate', 'contenttypes', verbosity=0)
                call_command('migrate', 'sessions', verbosity=0)
                shared_apps_time = time.time() - shared_apps_start
                logger.info(f"[TENANT-CREATION-{process_id}] Shared apps migrations completed in {shared_apps_time:.2f} seconds")
            except Exception as e:
                logger.error(f"[TENANT-CREATION-{process_id}] Error applying shared apps migrations: {str(e)}")
            
            # First apply users app migrations
            logger.info(f"[TENANT-CREATION-{process_id}] Applying migrations for users app first")
            users_start_time = time.time()
            try:
                logger.info(f"[TENANT-CREATION-{process_id}] Applying migrations for users app in schema {schema_name}")
                call_command('migrate', 'users', verbosity=0)
                users_elapsed_time = time.time() - users_start_time
                logger.info(f"[TENANT-CREATION-{process_id}] Successfully migrated users app in {users_elapsed_time:.2f} seconds")
                app_success_count = 1
                app_error_count = 0
            except Exception as e:
                app_success_count = 0
                app_error_count = 1
                users_elapsed_time = time.time() - users_start_time
                exc_type, exc_value, exc_traceback = sys.exc_info()
                stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                logger.error(f"[TENANT-CREATION-{process_id}] Error applying migrations for users app after {users_elapsed_time:.2f} seconds: {str(e)}")
                logger.error(f"[TENANT-CREATION-{process_id}] Users app migration stack trace: {''.join(stack_trace)}")
            
            # Then apply tenant-specific apps migrations
            tenant_apps = getattr(settings, 'TENANT_APPS', [
                'inventory', 'sales', 'purchases', 'finance', 'hr', 'payroll'
            ])
            
            logger.info(f"[TENANT-CREATION-{process_id}] Applying migrations for {len(tenant_apps)} tenant apps")
            
            for app in tenant_apps:
                if app != 'users':  # Skip users app as we already migrated it
                    app_start_time = time.time()
                    try:
                        logger.info(f"[TENANT-CREATION-{process_id}] Applying migrations for app {app} in schema {schema_name}")
                        call_command('migrate', app, verbosity=0)
                        app_elapsed_time = time.time() - app_start_time
                        logger.info(f"[TENANT-CREATION-{process_id}] Successfully migrated app {app} in {app_elapsed_time:.2f} seconds")
                        app_success_count += 1
                    except Exception as e:
                        app_error_count += 1
                        app_elapsed_time = time.time() - app_start_time
                        exc_type, exc_value, exc_traceback = sys.exc_info()
                        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                        logger.error(f"[TENANT-CREATION-{process_id}] Error applying migrations for app {app} after {app_elapsed_time:.2f} seconds: {str(e)}")
                        logger.error(f"[TENANT-CREATION-{process_id}] App migration stack trace: {''.join(stack_trace)}")
                        # Continue with other apps even if one fails
            
            # Check if schema has tables after migrations and verify django_migrations table exists
            with connection.cursor() as cursor:
                # Check total table count
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = %s
                """, [schema_name])
                table_count = cursor.fetchone()[0]
                
                # Check if django_migrations table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = %s
                        AND table_name = 'django_migrations'
                    )
                """, [schema_name])
                migrations_table_exists = cursor.fetchone()[0]
                
                # Check if users_userprofile table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = %s
                        AND table_name = 'users_userprofile'
                    )
                """, [schema_name])
                userprofile_table_exists = cursor.fetchone()[0]
                
                # If users_userprofile table doesn't exist, create it manually
                if not userprofile_table_exists:
                    logger.warning(f"[TENANT-CREATION-{process_id}] users_userprofile table does not exist in schema {schema_name}, creating it manually")
                    try:
                        # Import the fix_tenant_userprofile script
                        from scripts.fix_tenant_userprofile import create_userprofile_table
                        
                        # Create the users_userprofile table
                        create_userprofile_table(schema_name)
                        
                        logger.info(f"[TENANT-CREATION-{process_id}] Successfully created users_userprofile table in schema {schema_name}")
                    except Exception as e:
                        logger.error(f"[TENANT-CREATION-{process_id}] Error creating users_userprofile table: {str(e)}")
                
                # List all tables created
                cursor.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = %s
                    ORDER BY table_name
                """, [schema_name])
                tables = [row[0] for row in cursor.fetchall()]
                
                # Check for expected tables for each tenant app
                missing_app_tables = []
                for app in tenant_apps:
                    app_name = app.split('.')[-1] if '.' in app else app
                    app_prefix = f"{app_name}_"
                    
                    # Check if at least one table exists for this app
                    found = False
                    for table in tables:
                        if table.startswith(app_prefix):
                            found = True
                            break
                    
                    if not found:
                        missing_app_tables.append(app_name)
            
            logger.info(f"[TENANT-CREATION-{process_id}] Schema {schema_name} now has {table_count} tables after migrations")
            logger.debug(f"[TENANT-CREATION-{process_id}] Tables created in schema: {', '.join(tables)}")
            logger.info(f"[TENANT-CREATION-{process_id}] Django migrations table exists: {migrations_table_exists}")
            
            # Verify that tables were created for all tenant apps
            if missing_app_tables:
                logger.warning(f"[TENANT-CREATION-{process_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
                
                # If more than half of the apps are missing tables, consider it an error
                if len(missing_app_tables) > len(tenant_apps) / 2:
                    error_msg = f"Failed to create tables for most tenant apps: {', '.join(missing_app_tables)}"
                    logger.error(f"[TENANT-CREATION-{process_id}] {error_msg}")
                    
                    # Update tenant status to error
                    tenant.database_status = 'error'
                    tenant.setup_error_message = error_msg
                    tenant.save(update_fields=['database_status', 'setup_error_message'])
                    logger.info(f"[TENANT-CREATION-{process_id}] Updated tenant status to 'error'")
                    
                    # Schedule a background task to fix the schema
                    from .tasks import migrate_tenant_schema
                    migrate_tenant_schema.delay(str(tenant.id))
                    logger.info(f"[TENANT-CREATION-{process_id}] Scheduled background task to fix schema")
                    
                    # Raise an exception to rollback the transaction
                    raise Exception(error_msg)
                else:
                    # If only a few apps are missing tables, log a warning but continue
                    logger.warning(f"[TENANT-CREATION-{process_id}] Some apps are missing tables, but continuing: {', '.join(missing_app_tables)}")
                    
                    # Schedule a background task to fix the schema
                    from .tasks import migrate_tenant_schema
                    migrate_tenant_schema.delay(str(tenant.id))
                    logger.info(f"[TENANT-CREATION-{process_id}] Scheduled background task to fix schema")
                    
                    # Update tenant status to pending
                    tenant.database_status = 'pending'
                    tenant.save(update_fields=['database_status'])
                    logger.info(f"[TENANT-CREATION-{process_id}] Updated tenant status to 'pending'")
            else:
                # All tables were created successfully
                tenant.database_status = 'active'
                tenant.save(update_fields=['database_status'])
                logger.info(f"[TENANT-CREATION-{process_id}] Updated tenant status to 'active'")
            
            # Associate tenant with user
            user.tenant = tenant
            user.save(update_fields=['tenant'])
            logger.info(f"[TENANT-CREATION-{process_id}] Associated tenant with user {user.email}")
            
            total_elapsed_time = time.time() - start_time
            logger.info(f"[TENANT-CREATION-{process_id}] Successfully created tenant schema {schema_name} for user {user.email} in {total_elapsed_time:.2f} seconds")
            logger.info(f"[TENANT-CREATION-{process_id}] App migration summary: {app_success_count} succeeded, {app_error_count} failed")
            
            return tenant
            
    except Exception as e:
        total_elapsed_time = time.time() - start_time
        exc_type, exc_value, exc_traceback = sys.exc_info()
        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
        logger.error(f"[TENANT-CREATION-{process_id}] Failed to create tenant schema for user {user.email} after {total_elapsed_time:.2f} seconds: {str(e)}")
        logger.error(f"[TENANT-CREATION-{process_id}] Stack trace: {''.join(stack_trace)}")
        
        # If tenant was created but schema creation failed, mark it as error
        if 'tenant' in locals():
            tenant.database_status = 'error'
            tenant.setup_error_message = str(e)
            tenant.save(update_fields=['database_status', 'setup_error_message'])
            logger.info(f"[TENANT-CREATION-{process_id}] Updated tenant status to 'error'")
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