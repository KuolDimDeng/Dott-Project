import uuid
import logging
import time
import sys
import redis
import traceback
from django.db import connection, transaction
from django.conf import settings
from .models import Tenant, User

from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed
from botocore.exceptions import ClientError



logger = logging.getLogger('Pyfactor')

redis_client = redis.Redis(host='localhost', port=6379, db=0)


def ensure_schema_consistency(schema_name, reference_schema='public'):
    """
    Ensure that all tables and columns in the tenant schema match the reference schema.
    This function checks for column type mismatches and fixes them.
    
    Args:
        schema_name: The name of the tenant schema to check
        reference_schema: The reference schema to compare against (default: public)
    
    Returns:
        bool: True if all issues were fixed or no issues found, False otherwise
    """
    logger.info(f"Ensuring schema consistency for {schema_name} against {reference_schema}")
    
    try:
        with connection.cursor() as cursor:
            # Get all tables in the tenant schema
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
                AND table_type = 'BASE TABLE'
            """, [schema_name])
            tenant_tables = [row[0] for row in cursor.fetchall()]
            
            # Get all tables in the reference schema
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
                AND table_type = 'BASE TABLE'
            """, [reference_schema])
            reference_tables = [row[0] for row in cursor.fetchall()]
            
            # Find common tables
            common_tables = set(tenant_tables).intersection(set(reference_tables))
            logger.info(f"Found {len(common_tables)} common tables between {schema_name} and {reference_schema}")
            
            issues_found = 0
            issues_fixed = 0
            
            # Check each common table for column type mismatches
            for table in common_tables:
                # Get column definitions from reference schema
                cursor.execute("""
                    SELECT column_name, data_type, character_maximum_length,
                           numeric_precision, numeric_scale, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = %s
                    AND table_name = %s
                    ORDER BY ordinal_position
                """, [reference_schema, table])
                reference_columns = cursor.fetchall()
                
                # Get column definitions from tenant schema
                cursor.execute("""
                    SELECT column_name, data_type, character_maximum_length,
                           numeric_precision, numeric_scale, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = %s
                    AND table_name = %s
                    ORDER BY ordinal_position
                """, [schema_name, table])
                tenant_columns = cursor.fetchall()
                
                # Create dictionaries for easier comparison
                reference_col_dict = {col[0]: col for col in reference_columns}
                tenant_col_dict = {col[0]: col for col in tenant_columns}
                
                # Check for type mismatches
                for col_name, reference_col in reference_col_dict.items():
                    if col_name in tenant_col_dict:
                        tenant_col = tenant_col_dict[col_name]
                        
                        # Compare data types
                        if tenant_col[1] != reference_col[1]:  # data_type is at index 1
                            issues_found += 1
                            logger.warning(f"Column type mismatch in {schema_name}.{table}.{col_name}: {tenant_col[1]} vs {reference_schema}.{table}.{col_name}: {reference_col[1]}")
                            
                            try:
                                # Set search path to tenant schema
                                cursor.execute(f"SET search_path TO {schema_name}")
                                
                                # Alter the column type
                                logger.info(f"Fixing column type in {schema_name}.{table}.{col_name} from {tenant_col[1]} to {reference_col[1]}")
                                cursor.execute(f"""
                                    ALTER TABLE {table}
                                    ALTER COLUMN {col_name} TYPE {reference_col[1]} USING
                                    CASE
                                        WHEN {col_name} IS NULL THEN NULL
                                        ELSE {col_name}::text::{reference_col[1]}
                                    END
                                """)
                                
                                logger.info(f"Successfully fixed column type in {schema_name}.{table}.{col_name}")
                                issues_fixed += 1
                            except Exception as e:
                                logger.error(f"Error fixing column type for {schema_name}.{table}.{col_name}: {str(e)}")
            
            if issues_found == 0:
                logger.info(f"No schema issues found in {schema_name}")
                return True
            else:
                logger.info(f"Found and fixed {issues_fixed} out of {issues_found} schema issues in {schema_name}")
                return issues_fixed == issues_found
                
    except Exception as e:
        logger.error(f"Error ensuring schema consistency: {str(e)}")
        return False

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
    
    # Ensure user has a valid email address
    if not user.email:
        logger.error(f"[TENANT-CREATION-{process_id}] Cannot create tenant for user without email address (ID: {user.id})")
        raise ValueError("Cannot create tenant for user without email address")
    
    # Use the failsafe to ensure one tenant per business owner
    business_id = getattr(user, 'custom', {}).get('businessid') or getattr(user, 'custom', {}).get('business_id')
    tenant, should_create = ensure_single_tenant_per_business(user, business_id)
    
    # If tenant already exists, return it immediately
    if tenant and not should_create:
        logger.info(f"[TENANT-CREATION-{process_id}] Using existing tenant {tenant.schema_name} for user {user.email}")
        return tenant
    
    # If user shouldn't create a tenant (non-OWNER without business association), return None
    if not should_create and tenant is None:
        logger.warning(f"[TENANT-CREATION-{process_id}] User {user.email} is not allowed to create a tenant")
        return None
    
    # Check if another tenant creation might be in progress for this user (using a lock mechanism)
    lock_acquired = acquire_user_lock(user.id, timeout=30)  # Use shorter timeout for tenant creation
    if not lock_acquired:
        logger.warning(f"[TENANT-CREATION-{process_id}] Another tenant creation process may be in progress for user {user.email}")
        # Instead of failing, attempt to find any existing tenant
        try:
            # Consolidate any duplicate tenants and return the primary one
            consolidated_tenant = consolidate_user_tenants(user)
            if consolidated_tenant:
                logger.info(f"[TENANT-CREATION-{process_id}] Returned consolidated tenant {consolidated_tenant.schema_name} for user {user.email}")
                return consolidated_tenant
        except Exception as e:
            logger.error(f"[TENANT-CREATION-{process_id}] Error consolidating tenants: {str(e)}")
    
    try:
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
        
        # Use a transaction to ensure the tenant record and schema are created atomically
        try:
            with transaction.atomic():
                # Double-check no tenant was created in the meantime (race condition)
                user_tenant = Tenant.objects.filter(owner=user).first()
                if user_tenant:
                    logger.warning(f"[TENANT-CREATION-{process_id}] Race condition detected - tenant {user_tenant.schema_name} was created for user {user.email} during this operation")
                    if not user.tenant or user.tenant.id != user_tenant.id:
                        user.tenant = user_tenant
                        user.save(update_fields=['tenant'])
                    return user_tenant
                
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
                
                # Link tenant to user immediately to prevent race conditions
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                logger.info(f"[TENANT-CREATION-{process_id}] Linked tenant {tenant.schema_name} to user {user.email}")
                
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
                    
                    # Ensure column types match between tenant and public schemas
                    if userprofile_table_exists:
                        # Check business_id column type in public schema
                        cursor.execute("""
                            SELECT data_type FROM information_schema.columns
                            WHERE table_schema = 'public'
                            AND table_name = 'users_userprofile'
                            AND column_name = 'business_id'
                        """)
                        public_type = cursor.fetchone()
                        
                        # Check business_id column type in tenant schema
                        cursor.execute("""
                            SELECT data_type FROM information_schema.columns
                            WHERE table_schema = %s
                            AND table_name = 'users_userprofile'
                            AND column_name = 'business_id'
                        """, [schema_name])
                        tenant_type = cursor.fetchone()
                        
                        # If types don't match, fix the tenant schema
                        if public_type and tenant_type and public_type[0] != tenant_type[0]:
                            logger.warning(f"[TENANT-CREATION-{process_id}] Column type mismatch in {schema_name}.users_userprofile.business_id: {tenant_type[0]} vs public.users_userprofile.business_id: {public_type[0]}")
                            
                            # Set search path to tenant schema
                            cursor.execute(f"SET search_path TO {schema_name}")
                            
                            # Alter the column type to match public schema
                            logger.info(f"[TENANT-CREATION-{process_id}] Fixing column type in {schema_name}.users_userprofile.business_id from {tenant_type[0]} to {public_type[0]}")
                            cursor.execute(f"""
                                ALTER TABLE users_userprofile
                                ALTER COLUMN business_id TYPE {public_type[0]} USING
                                    CASE
                                        WHEN business_id IS NULL THEN NULL
                                        ELSE business_id::text::{public_type[0]}
                                    END
                            """)
                            logger.info(f"[TENANT-CREATION-{process_id}] Successfully fixed column type in {schema_name}.users_userprofile.business_id")
                    
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
                
                # Run a comprehensive schema consistency check
                logger.info(f"[TENANT-CREATION-{process_id}] Running comprehensive schema consistency check for {schema_name}")
                schema_check_start = time.time()
                try:
                    ensure_schema_consistency(schema_name)
                    schema_check_time = time.time() - schema_check_start
                    logger.info(f"[TENANT-CREATION-{process_id}] Schema consistency check completed in {schema_check_time:.2f} seconds")
                except Exception as e:
                    schema_check_time = time.time() - schema_check_start
                    logger.error(f"[TENANT-CREATION-{process_id}] Error during schema consistency check after {schema_check_time:.2f} seconds: {str(e)}")
                    # Continue even if schema consistency check fails
                
                return tenant
                
        except Exception as e:
            logger.error(f"[TENANT-CREATION-{process_id}] Error creating tenant: {str(e)}")
            # If we get here, the transaction was rolled back
            # Check if tenant was created by a concurrent process
            check_tenant = Tenant.objects.filter(owner=user).first()
            if check_tenant:
                logger.warning(f"[TENANT-CREATION-{process_id}] Found tenant {check_tenant.schema_name} created by concurrent process for user {user.email}")
                if not user.tenant or user.tenant.id != check_tenant.id:
                    user.tenant = check_tenant
                    user.save(update_fields=['tenant'])
                return check_tenant
            raise
    finally:
        # Make sure we always release the lock
        if lock_acquired:
            release_user_lock(user.id)
        
        # Log the total time spent
        elapsed_time = time.time() - start_time
        logger.info(f"[TENANT-CREATION-{process_id}] Tenant creation process completed in {elapsed_time:.2f} seconds")


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

def acquire_user_lock(user_id, timeout=60, retry_interval=0.1, max_retries=50):
    """
    Acquire a distributed lock for a specific user to prevent concurrent tenant creation
    Returns True if lock acquired, False otherwise
    """
    lock_key = f"tenant_creation_lock:{user_id}"
    retry_count = 0
    
    while retry_count < max_retries:
        # Try to acquire lock with an expiration
        acquired = redis_client.set(lock_key, "1", ex=timeout, nx=True)
        
        if acquired:
            logger.debug(f"Lock acquired for user {user_id}")
            return True
            
        logger.debug(f"Lock acquisition attempt {retry_count+1} failed for user {user_id}, retrying...")
        time.sleep(retry_interval)
        retry_count += 1
    
    logger.warning(f"Failed to acquire lock for user {user_id} after {max_retries} attempts")
    return False

def release_user_lock(user_id):
    """Release the distributed lock for a user"""
    lock_key = f"tenant_creation_lock:{user_id}"
    released = redis_client.delete(lock_key)
    logger.debug(f"Lock released for user {user_id}: {released}")
    return released

def consolidate_user_tenants(user):
    """
    Consolidate multiple tenants that might exist for a user into a single tenant.
    This function finds all tenants related to a user and consolidates them.
    
    Args:
        user: The user to consolidate tenants for
        
    Returns:
        The primary tenant for the user
    """
    import logging
    from django.db.models import Q
    from django.db import transaction
    from .models import Tenant
    
    logger = logging.getLogger(__name__)
    logger.info(f"[TENANT-CONSOLIDATION] Checking for multiple tenants for user {user.email}")
    
    # First check if user already has a tenant assigned
    if user.tenant:
        primary_tenant = user.tenant
        logger.info(f"[TENANT-CONSOLIDATION] User already has assigned tenant: {primary_tenant.schema_name}")
    else:
        # Try to find a tenant where the user is listed as owner
        owned_tenants = Tenant.objects.filter(owner=user)
        if owned_tenants.exists():
            primary_tenant = owned_tenants.first()
            logger.info(f"[TENANT-CONSOLIDATION] Found owned tenant: {primary_tenant.schema_name}")
            # Assign this tenant to the user
            user.tenant = primary_tenant
            user.save(update_fields=['tenant'])
            logger.info(f"[TENANT-CONSOLIDATION] Assigned primary tenant {primary_tenant.schema_name} to user {user.email}")
        else:
            # No tenants found for this user
            logger.info(f"[TENANT-CONSOLIDATION] No tenants found for user {user.email}")
            return None
    
    # Now we have a primary tenant, find any other tenants for this user
    with transaction.atomic():
        from django.db import connection
        
        # Find all tenants for this user (either owned or linked)
        all_tenants = Tenant.objects.filter(
            Q(owner=user) | Q(users=user)
        ).exclude(id=primary_tenant.id)
        
        if not all_tenants.exists():
            logger.info(f"[TENANT-CONSOLIDATION] No additional tenants found for user {user.email}")
            return primary_tenant
            
        # We found additional tenants - now we need to consolidate
        logger.info(f"[TENANT-CONSOLIDATION] Found {all_tenants.count()} additional tenants to consolidate")
        
        # Store information about schemas being consolidated
        with connection.cursor() as cursor:
            # List all schemas we're about to consolidate
            tenant_schemas = [t.schema_name for t in all_tenants]
            logger.info(f"[TENANT-CONSOLIDATION] Schemas to consolidate: {', '.join(tenant_schemas)}")
            
            # Update the database record to show that we're consolidating these tenants
            for tenant in all_tenants:
                # Mark the tenant as inactive
                tenant.is_active = False
                tenant.name = f"{tenant.name} (Consolidated into {primary_tenant.schema_name})"
                tenant.save(update_fields=['is_active', 'name'])
                
                # Update any users linked to this tenant
                cursor.execute("""
                    UPDATE custom_auth_user
                    SET tenant_id = %s
                    WHERE tenant_id = %s
                """, [str(primary_tenant.id), str(tenant.id)])
                
                if cursor.rowcount > 0:
                    logger.info(f"[TENANT-CONSOLIDATION] Updated {cursor.rowcount} users from tenant {tenant.schema_name} to {primary_tenant.schema_name}")
            
            logger.info(f"[TENANT-CONSOLIDATION] Successfully consolidated tenants for user {user.email}")
            
        return primary_tenant

def ensure_single_tenant_per_business(user, business_id=None):
    """
    Failsafe mechanism to ensure each business has only one schema associated with an OWNER user.
    This function should be called before any tenant creation attempt.
    
    Args:
        user: The user to check (should be an OWNER)
        business_id: Optional business ID to check against
        
    Returns:
        Tuple: (tenant, created) where tenant is the Tenant object and created is a boolean 
               indicating if a new tenant was created
    """
    import logging
    import uuid
    from django.db import transaction
    from django.db.models import Q
    from .models import Tenant, User
    
    logger = logging.getLogger(__name__)
    request_id = str(uuid.uuid4())[:8]  # Short ID for logging
    
    logger.info(f"[TENANT-FAILSAFE-{request_id}] Ensuring single tenant for user {user.email} (role: {user.role})")
    
    # Only OWNER users should create new tenants
    is_owner = user.role == 'OWNER'
    
    with transaction.atomic():
        # 1. Check if user already has a tenant assigned
        if user.tenant:
            logger.info(f"[TENANT-FAILSAFE-{request_id}] User already has tenant {user.tenant.schema_name} assigned")
            return (user.tenant, False)
        
        # 2. Check if user owns any tenants
        owned_tenant = Tenant.objects.filter(owner=user).first()
        if owned_tenant:
            # Update user.tenant reference if needed
            if not user.tenant or user.tenant.id != owned_tenant.id:
                user.tenant = owned_tenant
                user.save(update_fields=['tenant'])
                logger.info(f"[TENANT-FAILSAFE-{request_id}] Updated user.tenant to owned tenant {owned_tenant.schema_name}")
            return (owned_tenant, False)
        
        # 3. For non-OWNER users, check if they're part of a business with an existing tenant
        if not is_owner and business_id:
            # Find the OWNER of this business
            business_owner = User.objects.filter(
                Q(role='OWNER') & 
                (Q(custom__businessid=business_id) | Q(custom__business_id=business_id))
            ).first()
            
            if business_owner:
                logger.info(f"[TENANT-FAILSAFE-{request_id}] Found business owner {business_owner.email} for business {business_id}")
                
                # Get the owner's tenant
                owner_tenant = None
                if business_owner.tenant:
                    owner_tenant = business_owner.tenant
                else:
                    owner_tenant = Tenant.objects.filter(owner=business_owner).first()
                
                if owner_tenant:
                    # Assign user to the owner's tenant
                    user.tenant = owner_tenant
                    user.save(update_fields=['tenant'])
                    logger.info(f"[TENANT-FAILSAFE-{request_id}] Assigned non-owner user {user.email} to business owner's tenant {owner_tenant.schema_name}")
                    return (owner_tenant, False)
                else:
                    logger.warning(f"[TENANT-FAILSAFE-{request_id}] Business owner {business_owner.email} has no tenant")
            else:
                logger.warning(f"[TENANT-FAILSAFE-{request_id}] Could not find OWNER for business {business_id}")
        
        # 4. For OWNER users, create a new tenant if none exists
        if is_owner:
            # Tenant will be created by the calling function
            logger.info(f"[TENANT-FAILSAFE-{request_id}] No tenant found for OWNER {user.email}, new tenant will be created")
            return (None, True)
        else:
            # Non-OWNER without business association should not create a tenant
            logger.warning(f"[TENANT-FAILSAFE-{request_id}] Non-OWNER user {user.email} without business association cannot create tenant")
            return (None, False)