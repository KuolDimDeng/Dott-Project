import logging
import sys
import traceback
import uuid
import time
import psycopg2
from celery import shared_task
from django.db import connections, connection
from django.core.management import call_command
from django.conf import settings
from custom_auth.models import Tenant
from custom_auth.rls import set_current_tenant_id, tenant_context

logger = logging.getLogger(__name__)

@shared_task
def monitor_database_connections():
    """
    Celery task to monitor database connections and clean up if necessary.
    """
    try:
        # Get current connection count
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
            active_connections = cursor.fetchone()[0]
            
            cursor.execute("SHOW max_connections")
            max_connections = cursor.fetchone()[0]
            
            usage_percent = (active_connections / int(max_connections)) * 100
            
            logger.info(f"Database connection usage: {active_connections}/{max_connections} ({usage_percent:.1f}%)")
            
            # If usage is high, perform cleanup
            if usage_percent > 70:
                logger.warning(f"High connection usage detected: {usage_percent:.1f}%")
                
                # Close Django connections
                for conn in connections.all():
                    conn.close()
                
                # If usage is critical, terminate idle connections
                if usage_percent > 90:
                    logger.critical(f"Critical connection usage: {usage_percent:.1f}%")
                    call_command('monitor_db_connections', cleanup=True)
    
    except Exception as e:
        logger.error(f"Error monitoring database connections: {str(e)}")
        return False
    
    return True

@shared_task
def check_and_migrate_tenant_schemas():
    """
    Celery task to check for tenant schemas with missing or incomplete tables and apply migrations to them.
    This ensures that migrations happen in the background even if they were deferred during user login.
    
    This task performs the following checks:
    1. Verifies that the schema exists for each tenant
    2. Checks if the django_migrations table exists in the schema
    3. Verifies that all expected tables for tenant apps exist
    4. Runs migrations for schemas with missing tables
    """
    task_id = uuid.uuid4()
    logger.info(f"[MIGRATION-{task_id}] Starting background check for tenant schemas that need migrations")
    
    try:
        # Get all active tenants
        tenants = Tenant.objects.filter(is_active=True)
        logger.info(f"[MIGRATION-{task_id}] Found {len(tenants)} active tenants to check")
        
        # Initialize counters for summary
        schemas_checked = 0
        schemas_created = 0
        schemas_migrated = 0
        schemas_with_errors = 0
        schemas_with_missing_tables = 0
        schemas_with_missing_migrations_table = 0
        
        for tenant in tenants:
            tenant_start_time = time.time()
            schema_name =  tenant.id
            logger.info(f"[MIGRATION-{task_id}] Checking tenant {tenant.id} ({tenant.name}) with schema {schema_name}")
            
            # Check if schema exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
            
            if not schema_exists:
                logger.warning(f"[MIGRATION-{task_id}] Schema {schema_name} does not exist for tenant {tenant.id}. Creating it.")
                try:
                    with connection.cursor() as cursor:
                        # Create schema
                        logger.debug(f"[MIGRATION-{task_id}] Executing CREATE SCHEMA IF NOT EXISTS for {schema_name}")
                        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                        
                        # Set up permissions
                        db_user = connection.settings_dict['USER']
                        logger.debug(f"[MIGRATION-{task_id}] Setting up permissions for user {db_user}")
                        cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                        cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                        cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                    
                    schemas_created += 1
                    logger.info(f"[MIGRATION-{task_id}] Successfully created schema {schema_name}")
                except Exception as schema_error:
                    logger.error(f"[MIGRATION-{task_id}] Failed to create schema {schema_name}: {str(schema_error)}")
                    schemas_with_errors += 1
                    continue
            
            # Check if django_migrations table exists in the schema
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = %s
                        AND table_name = 'django_migrations'
                    )
                """, [schema_name])
                migrations_table_exists = cursor.fetchone()[0]
            
            if not migrations_table_exists:
                logger.warning(f"[MIGRATION-{task_id}] django_migrations table does not exist in schema {schema_name}")
                schemas_with_missing_migrations_table += 1
            
            # Check if schema has tables and which tables are missing
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = %s
                """, [schema_name])
                table_count = cursor.fetchone()[0]
                
                # Get list of tables
                cursor.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = %s
                    ORDER BY table_name
                """, [schema_name])
                tables = [row[0] for row in cursor.fetchall()]
            
            logger.info(f"[MIGRATION-{task_id}] Schema {schema_name} has {table_count} tables")
            
            # Check for expected tables for each tenant app
            tenant_apps = settings.TENANT_APPS
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
            
            if missing_app_tables:
                logger.warning(f"[MIGRATION-{task_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
                schemas_with_missing_tables += 1
            
            # Run migrations if:
            # 1. Schema has no tables, or
            # 2. django_migrations table is missing, or
            # 3. There are missing app tables
            if table_count == 0 or not migrations_table_exists or missing_app_tables:
                logger.info(f"[MIGRATION-{task_id}] Schema {schema_name} needs migrations. Running migrations.")
                
                try:
                    # Set search path to tenant schema
                    with connection.cursor() as cursor:
                        logger.debug(f"[MIGRATION-{task_id}] Setting search path to {schema_name},public")
                        # RLS: Use tenant context instead of schema
                        # cursor.execute(f'SET search_path TO {schema_name}')
                        set_current_tenant_id(tenant.id)
                        
                        # Verify search path was set correctly
                        cursor.execute('SHOW search_path')
                        current_path = cursor.fetchone()[0]
                        logger.debug(f"[MIGRATION-{task_id}] Current search path: {current_path}")
                    
                    # Run migrations for all tenant apps
                    tenant_apps = settings.TENANT_APPS
                    logger.info(f"[MIGRATION-{task_id}] Running migrations for {len(tenant_apps)} tenant apps in schema {schema_name}")
                    
                    # First run the general migrate command
                    try:
                        logger.debug(f"[MIGRATION-{task_id}] Running general migrations for schema {schema_name}")
                        call_command('migrate', verbosity=1)
                        logger.info(f"[MIGRATION-{task_id}] General migrations completed successfully for schema {schema_name}")
                    except Exception as migrate_error:
                        logger.error(f"[MIGRATION-{task_id}] Error running general migrations for schema {schema_name}: {str(migrate_error)}")
                    
                    # First run migrations for the users app specifically
                    logger.info(f"[MIGRATION-{task_id}] Running migrations for users app first in schema {schema_name}")
                    try:
                        call_command('migrate', 'users', verbosity=1)
                        logger.info(f"[MIGRATION-{task_id}] Successfully migrated users app in schema {schema_name}")
                        app_success_count = 1
                    except Exception as users_error:
                        app_error_count = 1
                        exc_type, exc_value, exc_traceback = sys.exc_info()
                        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                        logger.error(f"[MIGRATION-{task_id}] Error running migrations for users app in schema {schema_name}: {str(users_error)}")
                        logger.error(f"[MIGRATION-{task_id}] Users app migration stack trace: {''.join(stack_trace)}")
                    
                    # Then run migrations for each TENANT_APP specifically
                    for app in tenant_apps:
                        if app != 'users':  # Skip users app as we already migrated it
                            try:
                                logger.info(f"[MIGRATION-{task_id}] Running migrations for app {app} in schema {schema_name}")
                                call_command('migrate', app, verbosity=1)
                                logger.info(f"[MIGRATION-{task_id}] Successfully migrated app {app} in schema {schema_name}")
                                app_success_count += 1
                            except Exception as app_error:
                                app_error_count += 1
                                exc_type, exc_value, exc_traceback = sys.exc_info()
                                stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                                logger.error(f"[MIGRATION-{task_id}] Error running migrations for app {app} in schema {schema_name}: {str(app_error)}")
                                logger.error(f"[MIGRATION-{task_id}] App migration stack trace: {''.join(stack_trace)}")
                                # Continue with other apps even if one fails
                    
                    # Check if schema has tables after migrations
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT COUNT(*)
                            FROM information_schema.tables
                            WHERE table_schema = %s
                        """, [schema_name])
                        table_count_after = cursor.fetchone()[0]
                        
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
                        logger.warning(f"[MIGRATION-{task_id}] users_userprofile table does not exist in schema {schema_name}, creating it manually")
                        try:
                            # Import the fix_tenant_userprofile script
                            from scripts.fix_tenant_userprofile import create_userprofile_table
                            
                            # Create the users_userprofile table
                            create_userprofile_table(schema_name)
                            
                            logger.info(f"[MIGRATION-{task_id}] Successfully created users_userprofile table in schema {schema_name}")
                            
                            # Update table count
                            with connection.cursor() as cursor:
                                cursor.execute("""
                                    SELECT COUNT(*)
                                    FROM information_schema.tables
                                    WHERE table_schema = %s
                                """, [schema_name])
                                table_count_after = cursor.fetchone()[0]
                        except Exception as e:
                            logger.error(f"[MIGRATION-{task_id}] Error creating users_userprofile table: {str(e)}")
                    
                    logger.info(f"[MIGRATION-{task_id}] Schema {schema_name} now has {table_count_after} tables after migrations")
                    
                    # Update tenant status
                    tenant.database_status = 'active'
                    tenant.save(update_fields=['database_status'])
                    logger.info(f"[MIGRATION-{task_id}] Successfully migrated schema {schema_name} for tenant {tenant.id}")
                    logger.info(f"[MIGRATION-{task_id}] App migration summary: {app_success_count} succeeded, {app_error_count} failed")
                    
                    schemas_migrated += 1
                    
                except Exception as e:
                    schemas_with_errors += 1
                    exc_type, exc_value, exc_traceback = sys.exc_info()
                    stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                    logger.error(f"[MIGRATION-{task_id}] Failed to migrate schema {schema_name}: {str(e)}")
                    logger.error(f"[MIGRATION-{task_id}] Migration stack trace: {''.join(stack_trace)}")
                    
                    # Update tenant status to error
                    tenant.database_status = 'error'
                    tenant.setup_error_message = str(e)
                    tenant.save(update_fields=['database_status', 'setup_error_message'])
                
                finally:
                    # Reset search path to public
                    try:
                        with connection.cursor() as cursor:
                            logger.debug(f"[MIGRATION-{task_id}] Resetting search path to public")
                            # RLS: No need to set search_path with tenant-aware context
                            # cursor.execute('SET search_path TO public')
                            set_current_tenant_id(None)
                    except Exception as reset_error:
                        logger.error(f"[MIGRATION-{task_id}] Error resetting search path: {str(reset_error)}")
            else:
                logger.info(f"[MIGRATION-{task_id}] Schema {schema_name} already has {table_count} tables. No migration needed.")
            
            schemas_checked += 1
            tenant_elapsed_time = time.time() - tenant_start_time
            logger.info(f"[MIGRATION-{task_id}] Finished checking tenant {tenant.id} in {tenant_elapsed_time:.2f} seconds")
        
        # Log summary
        logger.info(f"[MIGRATION-{task_id}] Migration task summary:")
        logger.info(f"[MIGRATION-{task_id}] - Schemas checked: {schemas_checked}")
        logger.info(f"[MIGRATION-{task_id}] - Schemas created: {schemas_created}")
        logger.info(f"[MIGRATION-{task_id}] - Schemas migrated: {schemas_migrated}")
        logger.info(f"[MIGRATION-{task_id}] - Schemas with missing tables: {schemas_with_missing_tables}")
        logger.info(f"[MIGRATION-{task_id}] - Schemas with missing migrations table: {schemas_with_missing_migrations_table}")
        logger.info(f"[MIGRATION-{task_id}] - Schemas with errors: {schemas_with_errors}")
        
        return True
    
    except Exception as e:
        logger.error(f"[MIGRATION-{task_id}] Error in check_and_migrate_tenant_schemas: {str(e)}", exc_info=True)
        return False

@shared_task
def migrate_tenant_schema(tenant_id):
    """
    Celery task to migrate a specific tenant schema.
    
    Args:
        tenant_id: ID of the tenant to migrate
    """
    task_id = uuid.uuid4()
    start_time = time.time()
    logger.info(f"[TENANT-MIGRATION-{task_id}] Starting migration for tenant {tenant_id}")
    logger.debug(f"[TENANT-MIGRATION-{task_id}] Task execution started at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Track success status
    app_success_count = 0
    app_error_count = 0
    
    try:
        # Get tenant
        tenant = Tenant.objects.get(id=tenant_id)
        schema_name =  tenant.id
        logger.info(f"[TENANT-MIGRATION-{task_id}] Found tenant: {tenant.name} (Schema: {schema_name})")
        
        # Check if schema exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            schema_exists = cursor.fetchone() is not None
            logger.debug(f"[TENANT-MIGRATION-{task_id}] Schema existence check: {schema_name} exists = {schema_exists}")
            
            # Verify schema name format
            if schema_exists:
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Schema name format check: starts with 'tenant_' = {schema_name.startswith('tenant_')}")
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Schema name format check: uses underscores = {'_' in schema_name and '-' not in schema_name}")
        
        if not schema_exists:
            logger.warning(f"[TENANT-MIGRATION-{task_id}] Schema {schema_name} does not exist for tenant {tenant_id}. Creating it.")
            
            # Use a separate connection for schema creation to isolate it from migrations
            from django.db import connections
            with connections['default'].cursor() as cursor:
                # Create schema
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Executing CREATE SCHEMA IF NOT EXISTS for {schema_name}")
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                
                # Verify schema was created
                cursor.execute("""
                    SELECT schema_name FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_created = cursor.fetchone() is not None
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Schema creation verification: {schema_created}")
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Setting up permissions for user {db_user}")
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                logger.info(f"[TENANT-MIGRATION-{task_id}] Successfully created schema {schema_name}")
        else:
            logger.info(f"[TENANT-MIGRATION-{task_id}] Schema {schema_name} already exists")
        
        # Check if schema has tables before migrations
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = %s
            """, [schema_name])
            table_count_before = cursor.fetchone()[0]
        
        logger.info(f"[TENANT-MIGRATION-{task_id}] Schema {schema_name} has {table_count_before} tables before migrations")
        
        # Set search path to tenant schema
        with connection.cursor() as cursor:
            logger.debug(f"[TENANT-MIGRATION-{task_id}] Setting search path to {schema_name},public")
            # RLS: Use tenant context instead of schema
            # cursor.execute(f'SET search_path TO {schema_name}')
            set_current_tenant_id(tenant.id)
            
            # Verify search path was set correctly
            cursor.execute('SHOW search_path')
            current_path = cursor.fetchone()[0]
            logger.debug(f"[TENANT-MIGRATION-{task_id}] Current search path: {current_path}")
            
            # Create django_migrations table if it doesn't exist
            # This prevents errors if migrations are run on a fresh schema
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_migrations (
                    id serial NOT NULL PRIMARY KEY,
                    app character varying(255) NOT NULL,
                    name character varying(255) NOT NULL,
                    applied timestamp with time zone NOT NULL
                )
            """)
            logger.debug(f"[TENANT-MIGRATION-{task_id}] Ensured django_migrations table exists")
        
        # Run migrations for all tenant apps
        tenant_apps = settings.TENANT_APPS
        logger.info(f"[TENANT-MIGRATION-{task_id}] Running migrations for {len(tenant_apps)} tenant apps in schema {schema_name}")
        
        # First run the general migrate command
        # We don't use atomic transactions here as migrate command handles its own transactions
        try:
            logger.debug(f"[TENANT-MIGRATION-{task_id}] Running general migrations for schema {schema_name}")
            call_command('migrate', verbosity=1)
            logger.info(f"[TENANT-MIGRATION-{task_id}] General migrations completed successfully for schema {schema_name}")
            app_success_count += 1
        except Exception as migrate_error:
            logger.error(f"[TENANT-MIGRATION-{task_id}] Error running general migrations for schema {schema_name}: {str(migrate_error)}")
            app_error_count += 1
            # Continue with specific app migrations even if general fails
        
        # First run migrations for the users app specifically
        logger.info(f"[TENANT-MIGRATION-{task_id}] Running migrations for users app first")
        users_start_time = time.time()
        try:
            call_command('migrate', 'users', verbosity=1)
            users_elapsed_time = time.time() - users_start_time
            logger.info(f"[TENANT-MIGRATION-{task_id}] Successfully migrated users app in schema {schema_name} in {users_elapsed_time:.2f} seconds")
            app_success_count += 1
        except Exception as users_error:
            app_error_count += 1
            users_elapsed_time = time.time() - users_start_time
            logger.error(f"[TENANT-MIGRATION-{task_id}] Error running migrations for users app in schema {schema_name} after {users_elapsed_time:.2f} seconds: {str(users_error)}")
        
        # Run migrations for each app specifically
        for app in tenant_apps:
            try:
                if app == 'users':
                    # Skip users app as it's already migrated
                    continue
                
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Running migrations for app {app} in schema {schema_name}")
                call_command('migrate', app, verbosity=1)
                logger.info(f"[TENANT-MIGRATION-{task_id}] Successfully migrated app {app} in schema {schema_name}")
                app_success_count += 1
            except Exception as app_error:
                app_error_count += 1
                logger.error(f"[TENANT-MIGRATION-{task_id}] Error running migrations for app {app} in schema {schema_name}: {str(app_error)}")
                # Continue with other apps even if one fails
        
        # Check if schema has tables after migrations
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = %s
            """, [schema_name])
            table_count_after = cursor.fetchone()[0]
            
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
            logger.warning(f"[TENANT-MIGRATION-{task_id}] users_userprofile table does not exist in schema {schema_name}, creating it manually")
            try:
                # Import the fix_tenant_userprofile script
                from scripts.fix_tenant_userprofile import create_userprofile_table
                
                # Create the users_userprofile table
                create_userprofile_table(schema_name)
                
                logger.info(f"[TENANT-MIGRATION-{task_id}] Successfully created users_userprofile table in schema {schema_name}")
                
                # Update table count
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*)
                        FROM information_schema.tables
                        WHERE table_schema = %s
                    """, [schema_name])
                    table_count_after = cursor.fetchone()[0]
            except Exception as e:
                logger.error(f"[TENANT-MIGRATION-{task_id}] Error creating users_userprofile table: {str(e)}")
        
        # Determine schema migration success based on table count increase
        # Even if some app migrations failed, we consider the schema usable if we have more tables
        if table_count_after > table_count_before:
            logger.info(f"[TENANT-MIGRATION-{task_id}] Schema {schema_name} now has {table_count_after} tables after migrations (was {table_count_before})")
            
            # Update tenant status - mark as active even if some migrations failed
            # This is key - we don't want to leave the schema in a limbo state
            tenant.database_status = 'active'
            tenant.save(update_fields=['database_status'])
            
            logger.info(f"[TENANT-MIGRATION-{task_id}] Successfully migrated schema {schema_name} for tenant {tenant_id}")
            logger.info(f"[TENANT-MIGRATION-{task_id}] App migration summary: {app_success_count} succeeded, {app_error_count} failed")
            
            total_elapsed_time = time.time() - start_time
            logger.info(f"[TENANT-MIGRATION-{task_id}] Total migration time: {total_elapsed_time:.2f} seconds")
            
            return True
        else:
            # Even in this case, we won't delete the schema - we'll just mark it as error
            logger.error(f"[TENANT-MIGRATION-{task_id}] Migration did not create any tables in schema {schema_name}")
            tenant.database_status = 'error'
            tenant.save(update_fields=['database_status'])
            
            total_elapsed_time = time.time() - start_time
            logger.error(f"[TENANT-MIGRATION-{task_id}] Migration failed after {total_elapsed_time:.2f} seconds")
            
            return False
    
    except Exception as e:
        total_elapsed_time = time.time() - start_time
        logger.error(f"[TENANT-MIGRATION-{task_id}] Error in migrate_tenant_schema for tenant {tenant_id} after {total_elapsed_time:.2f} seconds: {str(e)}", exc_info=True)
        
        # Instead of deleting the schema on error, try to mark the tenant status as error
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            tenant.database_status = 'error'
            tenant.setup_error_message = str(e)[:255]  # Truncate error message to fit in DB field
            tenant.save(update_fields=['database_status', 'setup_error_message'])
            logger.info(f"[TENANT-MIGRATION-{task_id}] Updated tenant status to error")
        except Exception as update_error:
            logger.error(f"[TENANT-MIGRATION-{task_id}] Failed to update tenant status: {str(update_error)}")
        
        return False
    
    finally:
        # Reset search path to public
        try:
            with connection.cursor() as cursor:
                logger.debug(f"[TENANT-MIGRATION-{task_id}] Resetting search path to public")
                # RLS: No need to set search_path with tenant-aware context
                # cursor.execute('SET search_path TO public')
                set_current_tenant_id(None)
        except Exception as reset_error:
            logger.error(f"[TENANT-MIGRATION-{task_id}] Error resetting search path: {str(reset_error)}")

@shared_task
def monitor_tenant_schemas_task(fix=True):
    """
    Celery task to monitor tenant schemas and fix any issues.
    
    This task:
    1. Checks all tenant schemas for issues
    2. Fixes any schemas with missing tables
    3. Runs as a scheduled task to ensure all tenant schemas are properly maintained
    
    Args:
        fix: Whether to automatically fix any issues found (default: True)
    """
    task_id = uuid.uuid4()
    start_time = time.time()
    
    logger.info(f"[MONITOR-{task_id}] Starting tenant schema monitoring task")
    
    try:
        # Get all tenants
        tenants = Tenant.objects.filter(is_active=True)
        logger.info(f"[MONITOR-{task_id}] Found {len(tenants)} active tenants")
        
        # Initialize counters for summary
        schemas_checked = 0
        schemas_with_issues = 0
        schemas_fixed = 0
        schemas_with_errors = 0
        schemas_with_missing_tables = 0
        schemas_with_missing_migrations_table = 0
        
        # Check each tenant's schema
        for tenant in tenants:
            tenant_start_time = time.time()
            schema_name =  tenant.id
            logger.info(f"[MONITOR-{task_id}] Checking tenant {tenant.id} ({tenant.name}) with schema {schema_name}")
            
            # Check if schema exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
            
            if not schema_exists:
                logger.warning(f"[MONITOR-{task_id}] Schema {schema_name} does not exist for tenant {tenant.id}")
                schemas_with_issues += 1
                
                if fix:
                    logger.info(f"[MONITOR-{task_id}] Creating schema {schema_name}")
                    try:
                        with connection.cursor() as cursor:
                            # Create schema
                            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                            
                            # Set up permissions
                            db_user = connection.settings_dict['USER']
                            cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                        
                        # Run migrations for the new schema
                        migrate_tenant_schema.delay(str(tenant.id))
                        logger.info(f"[MONITOR-{task_id}] Scheduled migration task for tenant {tenant.id}")
                        schemas_fixed += 1
                    except Exception as e:
                        logger.error(f"[MONITOR-{task_id}] Error creating schema {schema_name}: {str(e)}")
                        schemas_with_errors += 1
                
                continue
            
            schemas_checked += 1
            
            # Check if django_migrations table exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = %s 
                        AND table_name = 'django_migrations'
                    )
                """, [schema_name])
                migrations_table_exists = cursor.fetchone()[0]
            
            if not migrations_table_exists:
                logger.warning(f"[MONITOR-{task_id}] django_migrations table does not exist in schema {schema_name}")
                schemas_with_issues += 1
                schemas_with_missing_migrations_table += 1
            
            # Check if schema has tables
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = %s
                """, [schema_name])
                table_count = cursor.fetchone()[0]
                
                # Get list of tables
                cursor.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = %s
                    ORDER BY table_name
                """, [schema_name])
                tables = [row[0] for row in cursor.fetchall()]
            
            logger.info(f"[MONITOR-{task_id}] Schema {schema_name} has {table_count} tables")
            
            # Check for expected tables for each tenant app
            tenant_apps = settings.TENANT_APPS
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
            
            if missing_app_tables:
                logger.warning(f"[MONITOR-{task_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
                schemas_with_issues += 1
                schemas_with_missing_tables += 1
            
            # Fix issues if requested
            if fix and (not migrations_table_exists or missing_app_tables or table_count == 0):
                logger.info(f"[MONITOR-{task_id}] Fixing issues with schema {schema_name}")
                try:
                    # Schedule migration task
                    migrate_tenant_schema.delay(str(tenant.id))
                    logger.info(f"[MONITOR-{task_id}] Scheduled migration task for tenant {tenant.id}")
                    schemas_fixed += 1
                except Exception as e:
                    logger.error(f"[MONITOR-{task_id}] Error scheduling migration for schema {schema_name}: {str(e)}")
                    schemas_with_errors += 1
            
            tenant_elapsed_time = time.time() - tenant_start_time
            logger.info(f"[MONITOR-{task_id}] Finished checking tenant {tenant.id} in {tenant_elapsed_time:.2f} seconds")
        
        # Log summary
        logger.info(f"[MONITOR-{task_id}] Tenant schema monitoring summary:")
        logger.info(f"[MONITOR-{task_id}] - Schemas checked: {schemas_checked}")
        logger.info(f"[MONITOR-{task_id}] - Schemas with issues: {schemas_with_issues}")
        logger.info(f"[MONITOR-{task_id}] - Schemas with missing tables: {schemas_with_missing_tables}")
        logger.info(f"[MONITOR-{task_id}] - Schemas with missing migrations table: {schemas_with_missing_migrations_table}")
        
        if fix:
            logger.info(f"[MONITOR-{task_id}] - Schemas fixed: {schemas_fixed}")
            logger.info(f"[MONITOR-{task_id}] - Schemas with errors: {schemas_with_errors}")
        
        total_elapsed_time = time.time() - start_time
        logger.info(f"[MONITOR-{task_id}] Successfully completed tenant schema monitoring in {total_elapsed_time:.2f} seconds")
        
        return True
    
    except Exception as e:
        total_elapsed_time = time.time() - start_time
        logger.error(f"[MONITOR-{task_id}] Error in monitor_tenant_schemas_task: {str(e)}", exc_info=True)
        return False

@shared_task
def monitor_tenant_schemas():
    """
    Scheduled task to monitor tenant schemas and detect issues
    """
    # RLS: Importing tenant context functions
    from custom_auth.rls import set_current_tenant_id, tenant_context
    
    try:
        from scripts.monitor_tenant_schemas import run_monitoring
        
        logger.info("Starting scheduled tenant schema monitoring task")
        run_monitoring()
        logger.info("Completed scheduled tenant schema monitoring task")
        
        return True
    except Exception as e:
        logger.error(f"Error in tenant schema monitoring task: {str(e)}")
        return False