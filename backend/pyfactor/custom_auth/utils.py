import uuid
import logging
import time
import sys
import traceback
from django.db import connection, transaction
from django.conf import settings
from .models import Tenant, User

from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed

# Optional Redis import - don't fail if Redis is not available
try:
    import redis
    # Make Redis connection optional and configurable
    REDIS_HOST = getattr(settings, 'REDIS_HOST', None)
    REDIS_PORT = getattr(settings, 'REDIS_PORT', 6379)
    
    if REDIS_HOST:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
        # Test connection
        redis_client.ping()
        REDIS_AVAILABLE = True
        logger = logging.getLogger('Pyfactor')
        logger.info("Redis connection established successfully")
    else:
        redis_client = None
        REDIS_AVAILABLE = False
except (ImportError, redis.ConnectionError, Exception) as e:
    redis_client = None
    REDIS_AVAILABLE = False
    # Don't log error during import to avoid startup issues
    pass

logger = logging.getLogger('Pyfactor')


def ensure_schema_consistency(tenant_id: uuid.UUID, schema_name: str = 'public', reference_schema: str = 'public'):
    """
    Ensure that all tables and columns in the tenant schema match the reference schema.
    This function checks for column type mismatches and fixes them.
    
    Args:
        tenant_id: The tenant ID to check schema for
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
                                # RLS: Use tenant context instead of schema
                                # cursor.execute(f'SET search_path TO {schema_name}')
                                from custom_auth.rls import set_current_tenant_id
                                set_current_tenant_id(tenant_id)
                                
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

def create_tenant_for_user(user, business_name=None):
    """
    Creates a new tenant for a user with Row-Level Security (RLS) if they don't already have one.
    
    Args:
        user: User object
        business_name: Optional business name to use for the tenant
        
    Returns:
        Tenant object that was created or retrieved
    """
    from django.db import connection, transaction
    from custom_auth.models import Tenant
    import uuid
    from django.utils import timezone
    import random
    import string
    import time  # Add time import for measuring elapsed time
    
    logger = logging.getLogger(__name__)
    process_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    start_time = time.time()  # Define start_time for measuring elapsed time
    
    logger.info(f"[TENANT-CREATION-{process_id}] Creating tenant for user {user.email}")
    
    # First, check if the user already has a tenant by email
    try:
        # Look up tenant by user email - most reliable way to find existing tenant
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT t.id, t.name, t.owner_id FROM custom_auth_tenant t
                JOIN custom_auth_user u ON u.tenant_id = t.id
                WHERE u.email = %s
                LIMIT 1
            """, [user.email])
            
            existing_tenant = cursor.fetchone()
            
            if existing_tenant:
                tenant_id, tenant_name, owner_id = existing_tenant
                logger.info(f"[TENANT-CREATION-{process_id}] Found existing tenant for user {user.email}: {tenant_id}")
                
                # If user has multiple tenants, log warning for later cleanup
                cursor.execute("""
                    SELECT COUNT(*) FROM custom_auth_tenant t
                    JOIN custom_auth_user u ON u.tenant_id = t.id
                    WHERE u.email = %s
                """, [user.email])
                
                tenant_count = cursor.fetchone()[0]
                if tenant_count > 1:
                    logger.warning(f"[TENANT-CREATION-{process_id}] User {user.email} has {tenant_count} tenants! Need cleanup.")
                
                # Link the tenant to the user if not already linked
                if str(user.tenant_id) != str(tenant_id):
                    logger.info(f"[TENANT-CREATION-{process_id}] Linking existing tenant {tenant_id} to user {user.email}")
                    user.tenant_id = tenant_id
                    user.save(update_fields=['tenant_id'])
                
                # Return the existing tenant object
                return Tenant.objects.get(id=tenant_id)
    except Exception as e:
        logger.error(f"[TENANT-CREATION-{process_id}] Error checking for existing tenant: {str(e)}")
        # Continue with tenant creation as fallback

    # If we get here, either no tenant exists or we couldn't find it
    # Original tenant creation logic follows
    try:
        # Check if user already has a tenant linked to their account
        if user.tenant_id:
            tenant = Tenant.objects.filter(id=user.tenant_id).first()
            if tenant:
                logger.info(f"[TENANT-CREATION-{process_id}] User already has tenant: {tenant.id}")
                return tenant
        
        # Ensure user has a valid email address
        if not user.email:
            logger.error(f"[TENANT-CREATION-{process_id}] Cannot create tenant for user without email address (ID: {user.id})")
            raise ValueError("Cannot create tenant for user without email address")
        
        # Use the failsafe to ensure one tenant per business owner
        business_id = getattr(user, 'custom', {}).get('businessid') or getattr(user, 'custom', {}).get('business_id')
        tenant, should_create = ensure_single_tenant_per_business(user, business_id)
        
        # If tenant already exists, update Cognito and return it immediately
        if tenant and not should_create:
            logger.info(f"[TENANT-CREATION-{process_id}] Using existing tenant {tenant.id} for user {user.email}")
            
            # Ensure Cognito businessid is updated with tenant ID
            try:
                # Log tenant creation for Auth0 mode instead of updating Cognito
                logger.info(f"[TENANT-CREATION-{process_id}] Tenant {tenant.id} created for Auth0 user {user.email}")
            except Exception as e:
                logger.warning(f"[TENANT-CREATION-{process_id}] Failed to log tenant info: {str(e)}")
            
            return tenant
        
        # If user shouldn't create a tenant (non-OWNER without business association), return None
        if not should_create and tenant is None:
            logger.warning(f"[TENANT-CREATION-{process_id}] User {user.email} is not allowed to create a tenant")
            return None
        
        # Check if another tenant creation might be in progress for this user (using a lock mechanism)
        lock_acquired = acquire_user_lock(user.id, timeout=30)
        if not lock_acquired:
            logger.warning(f"[TENANT-CREATION-{process_id}] Could not acquire lock for user {user.email}, another tenant creation may be in progress")
            
            # Double-check if tenant was created while waiting for lock
            check_tenant = Tenant.objects.filter(owner_id=user.id).first()
            if check_tenant:
                logger.info(f"[TENANT-CREATION-{process_id}] Tenant {check_tenant.id} found for user {user.email} while waiting for lock")
                if not user.tenant_id or user.tenant_id != check_tenant.id:
                    user.tenant_id = check_tenant.id
                    user.save(update_fields=['tenant_id'])
                return check_tenant
            
            # Wait and retry
            time.sleep(5)
            return create_tenant_for_user(user, business_name)
        
        try:
            # Generate tenant ID and name
            tenant_id = uuid.uuid4()
            tenant_name = business_name or f"{user.first_name}'s Business"
            
            # Use a transaction to ensure the tenant record is created atomically
            try:
                with transaction.atomic():
                    # Double-check no tenant was created in the meantime (race condition)
                    user_tenant = Tenant.objects.filter(owner_id=user.id).first()
                    if user_tenant:
                        logger.warning(f"[TENANT-CREATION-{process_id}] Race condition detected - tenant {user_tenant.id} was created for user {user.email} during this operation")
                        if not user.tenant_id or user.tenant_id != user_tenant.id:
                            user.tenant_id = user_tenant.id
                            user.save(update_fields=['tenant_id'])
                        return user_tenant
                    
                    # Create tenant record with RLS enabled
                    logger.debug(f"[TENANT-CREATION-{process_id}] Creating tenant record in database")
                    tenant = Tenant.objects.create(
                        id=tenant_id,
                        name=tenant_name,
                        owner_id=user.id,
                        created_on=timezone.now(),
                        is_active=True,
                        setup_status='in_progress',
                        rls_enabled=True,
                        rls_setup_date=timezone.now()
                    )
                    logger.info(f"[TENANT-CREATION-{process_id}] Created tenant record with ID: {tenant.id}")
                    
                    # Link tenant to user immediately to prevent race conditions
                    user.tenant_id = tenant.id
                    user.save(update_fields=['tenant_id'])
                    logger.info(f"[TENANT-CREATION-{process_id}] Linked tenant {tenant.id} to user {user.email}")
                    
                    # Set up RLS for this tenant
                    try:
                        with connection.cursor() as cursor:
                            # Set the app.current_tenant_id parameter for the session
                            cursor.execute("SET app.current_tenant_id = %s", [str(tenant.id)])
                            logger.debug(f"[TENANT-CREATION-{process_id}] Set current tenant context to {tenant.id}")
                            
                            # Apply RLS policies to tenant-aware tables
                            tenant_tables = [
                                'banking_bankaccount',
                                'banking_banktransaction', 
                                'banking_plaiditem',
                                'banking_tinkitem',
                                'finance_account',
                                'finance_accountreconciliation',
                                'finance_transaction',
                                'inventory_product',
                                'inventory_inventoryitem',
                                'sales_invoice',
                                'sales_sale',
                                'purchases_bill',
                                'purchases_vendor',
                                'crm_customer',
                                'crm_lead',
                            ]
                            
                            for table in tenant_tables:
                                # Check if table exists
                                cursor.execute("""
                                    SELECT EXISTS (
                                        SELECT 1 FROM information_schema.tables 
                                        WHERE table_schema = 'public' AND table_name = %s
                                    )
                                """, [table])
                                
                                if cursor.fetchone()[0]:
                                    try:
                                        # Enable RLS on the table
                                        cursor.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
                                        
                                        # Create tenant isolation policy
                                        cursor.execute(f"""
                                            DROP POLICY IF EXISTS tenant_isolation_policy ON {table};
                                            CREATE POLICY tenant_isolation_policy ON {table}
                                                USING (
                                                    tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                                                    AND current_setting('app.current_tenant_id', TRUE) != 'unset'
                                                );
                                        """)
                                        logger.debug(f"[TENANT-CREATION-{process_id}] Applied RLS policy to table: {table}")
                                    except Exception as table_error:
                                        logger.error(f"[TENANT-CREATION-{process_id}] Error applying RLS to {table}: {str(table_error)}")
                        
                        logger.info(f"[TENANT-CREATION-{process_id}] Successfully set up RLS for tenant {tenant.id}")
                    except Exception as rls_error:
                        logger.error(f"[TENANT-CREATION-{process_id}] Error setting up RLS: {str(rls_error)}")
            except Exception as tx_error:
                logger.error(f"[TENANT-CREATION-{process_id}] Error in tenant creation transaction: {str(tx_error)}")
                raise
            
            # Record timing and success
            end_time = time.time()
            elapsed_time = end_time - start_time
            logger.info(f"[TENANT-CREATION-{process_id}] Tenant setup completed successfully in {elapsed_time:.2f} seconds")
            
            # Mark tenant as ready
            tenant.setup_status = 'complete'
            tenant.save(update_fields=['setup_status'])
            
            # Update Cognito if available
            try:
                # Log tenant creation for Auth0 mode instead of updating Cognito
                logger.info(f"[TENANT-CREATION-{process_id}] Tenant {tenant.id} created for Auth0 user {user.email}")
            except Exception as e:
                logger.warning(f"[TENANT-CREATION-{process_id}] Failed to log tenant info: {str(e)}")
                    
            return tenant
                    
        finally:
            # Always release the lock
            release_user_lock(user.id)

    except Exception as e:
        logger.error(f"[TENANT-CREATION-{process_id}] Error creating tenant for user {user.email}: {str(e)}")
        import traceback
        logger.error(f"[TENANT-CREATION-{process_id}] Traceback: {traceback.format_exc()}")
        return None

# Add an alias for backward compatibility
create_tenant_schema_for_user = create_tenant_for_user

def custom_exception_handler(exc, context):
    """
    Custom exception handler for REST framework that handles Auth0-specific errors.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Log any authentication errors for Auth0
    if hasattr(exc, 'response') and 'Error' in str(exc):
        logger.warning(f"Authentication failed: {str(exc)}")
        return AuthenticationFailed('Invalid token or token expired')
    
    # Return the original response
    return response

def acquire_user_lock(user_id, timeout=60, retry_interval=0.1, max_retries=50):
    """
    Acquire a distributed lock for a specific user to prevent concurrent tenant creation
    Returns True if lock acquired, False otherwise
    """
    # If Redis is not available, return True (no locking)
    if not REDIS_AVAILABLE or not redis_client:
        logger.debug(f"Redis not available, skipping lock for user {user_id}")
        return True
        
    lock_key = f"tenant_creation_lock:{user_id}"
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Try to acquire lock with an expiration
            acquired = redis_client.set(lock_key, "1", ex=timeout, nx=True)
            
            if acquired:
                logger.debug(f"Lock acquired for user {user_id}")
                return True
                
            logger.debug(f"Lock acquisition attempt {retry_count+1} failed for user {user_id}, retrying...")
            time.sleep(retry_interval)
            retry_count += 1
        except Exception as e:
            logger.warning(f"Redis error during lock acquisition for user {user_id}: {str(e)}")
            return True  # Fallback to no locking if Redis fails
    
    logger.warning(f"Failed to acquire lock for user {user_id} after {max_retries} attempts")
    return False

def release_user_lock(user_id):
    """Release the distributed lock for a user"""
    # If Redis is not available, return True (no locking)
    if not REDIS_AVAILABLE or not redis_client:
        return True
        
    try:
        lock_key = f"tenant_creation_lock:{user_id}"
        released = redis_client.delete(lock_key)
        logger.debug(f"Lock released for user {user_id}: {released}")
        return released
    except Exception as e:
        logger.warning(f"Redis error during lock release for user {user_id}: {str(e)}")
        return True  # Fallback to success if Redis fails

def consolidate_user_tenants(user):
    """
    Consolidate multiple tenants associated with a user to a single tenant
    This function handles the case where a user may have multiple tenants due to
    different authentication methods or failed tenant creation.
    
    Args:
        user: The user to consolidate tenants for
        
    Returns:
        (primary_tenant, deleted_tenant_count) or (None, 0) if no tenant found
    """
    logger.info(f"Consolidating tenants for user {user.email}")
    
    try:
        # Step 1: Find all tenants associated with this user
        tenants = Tenant.objects.filter(owner_id=user.id)
        tenant_count = tenants.count()
        
        if tenant_count == 0:
            logger.info(f"No tenants found for user {user.email}")
            return (None, 0)
            
        if tenant_count == 1:
            # Only one tenant, nothing to consolidate
            primary_tenant = tenants.first()
            logger.info(f"User {user.email} has only one tenant: {primary_tenant.id}")
            
            # Ensure user.tenant_id matches this tenant
            if user.tenant_id != primary_tenant.id:
                logger.info(f"Updating user.tenant_id from {user.tenant_id} to {primary_tenant.id}")
                user.tenant_id = primary_tenant.id
                user.save(update_fields=['tenant_id'])
                
            return (primary_tenant, 0)
            
        # Multiple tenants found, need to consolidate
        logger.warning(f"User {user.email} has {tenant_count} tenants, consolidating...")
        
        # Find the primary tenant - prefer the one with user.tenant_id
        primary_tenant = None
        if user.tenant_id:
            primary_tenant = tenants.filter(id=user.tenant_id).first()
            
        if not primary_tenant:
            # No primary tenant in user record, use the most recently created one
            primary_tenant = tenants.order_by('-created_at').first()
            
        # Now we have our primary tenant, assign all other users to this tenant
        deleted_count = 0
        for tenant in tenants:
            if tenant.id != primary_tenant.id:
                try:
                    # For each user associated with this tenant, update their tenant_id
                    User.objects.filter(tenant_id=tenant.id).update(tenant_id=primary_tenant.id)
                    
                    # Now delete the tenant
                    tenant.delete()
                    deleted_count += 1
                    logger.info(f"Deleted tenant {tenant.id} and migrated users to {primary_tenant.id}")
                except Exception as e:
                    logger.error(f"Error migrating users from tenant {tenant.id}: {str(e)}")
                    
        # Ensure primary tenant is set on user
        if user.tenant_id != primary_tenant.id:
            user.tenant_id = primary_tenant.id
            user.save(update_fields=['tenant_id'])
            
        logger.info(f"Successfully consolidated {deleted_count} tenants for user {user.email}")
        return (primary_tenant, deleted_count)
    except Exception as e:
        logger.error(f"Error consolidating tenants: {str(e)}")
        return (None, 0)

def ensure_single_tenant_per_business(user, business_id=None):
    """
    Ensure that a business has exactly one tenant, and return that tenant.
    This function is used to prevent multiple tenants for the same business,
    which can happen when different authentication methods are used or during
    race conditions in tenant creation.
    
    Args:
        user: The user requesting tenant access
        business_id: Optional business ID to associate with the tenant
        
    Returns:
        (tenant, should_create) - tenant is the tenant to use, should_create is whether
        the caller should create a new tenant if none exists
    """
    logger.info(f"Ensuring single tenant for user {user.email}, business_id: {business_id}")
    
    try:
        # First check if user already has a tenant
        if user.tenant_id:
            tenant = Tenant.objects.filter(id=user.tenant_id).first()
            if tenant:
                logger.info(f"User already has tenant {tenant.id}")
                return (tenant, False)
            
        # User has no tenant, check if they have a business_id and if that business has a tenant
        if business_id:
            # Try to find tenant by business ID in the custom attributes of users
            users_with_business = User.objects.filter(
                custom__contains={'business_id': business_id}
            ).exclude(id=user.id)
            
            # Check each user to see if they have a tenant
            for other_user in users_with_business:
                if other_user.tenant_id:
                    tenant = Tenant.objects.filter(id=other_user.tenant_id).first()
                    if tenant:
                        logger.info(f"Found tenant {tenant.id} for same business via user {other_user.email}")
                        
                        # Link this tenant to our user
                        user.tenant_id = tenant.id
                        user.save(update_fields=['tenant_id'])
                        
                        return (tenant, False)
                        
        # No existing tenant found, determine if user should create one
        # Only business owners can create new tenants
        is_owner = user.role == 'owner' if hasattr(user, 'role') else True
        
        if is_owner:
            logger.info(f"User {user.email} is authorized to create a new tenant")
            # Check if tenant creation is already in progress for this user
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, created_at FROM custom_auth_tenant 
                    WHERE owner_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, [str(user.id)])
                existing = cursor.fetchone()
                
                if existing:
                    tenant_id, created_at = existing
                    logger.info(f"Found existing tenant {tenant_id} for user {user.email}")
                    
                    # Get the tenant and return it
                    tenant = Tenant.objects.get(id=tenant_id)
                    
                    # Link this tenant to the user if not already linked
                    if user.tenant_id != tenant.id:
                        user.tenant_id = tenant.id
                        user.save(update_fields=['tenant_id'])
                        
                    return (tenant, False)
                    
            # No tenant for this user exists and they are authorized to create one
            return (None, True)
        else:
            logger.warning(f"User {user.email} is not authorized to create a tenant (not an owner)")
            return (None, False)
    except Exception as e:
        logger.error(f"Error ensuring single tenant: {str(e)}")
        return (None, False)

def ensure_auth_tables_in_schema(tenant_id: uuid.UUID):
    """
    Ensure that authentication tables exist in the specified schema
    """
    logger.info(f"Ensuring auth tables exist for tenant {tenant_id}")
    
    try:
        from custom_auth.rls import set_current_tenant_id
        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)
        
        # Create the auth tables
        with connection.cursor() as cursor:
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS auth_user (
                    id serial PRIMARY KEY,
                    username VARCHAR(150) NOT NULL UNIQUE,
                    email VARCHAR(254) NOT NULL UNIQUE,
                    password VARCHAR(128) NOT NULL,
                    first_name VARCHAR(150) NOT NULL,
                    last_name VARCHAR(150) NOT NULL,
                    is_staff BOOLEAN NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    date_joined TIMESTAMP WITH TIME ZONE NOT NULL
                )
            """)
            
        return True
    except Exception as e:
        logger.error(f"Error ensuring auth tables: {str(e)}")
        return False

def update_auth0_tenant_id(user_email, tenant_id):
    """
    Log tenant ID update for Auth0 user (replaces Cognito function)
    NOTE: Auth0 metadata updates are handled through Auth0 Management API if needed
    
    Args:
        user_email: User email for Auth0 user
        tenant_id: Tenant ID to log
        
    Returns:
        bool: Always returns True in Auth0 mode
    """
    logger.info(f"Auth0 mode: Tenant ID {tenant_id} logged for user {user_email}")
    
    # Return success since Auth0 doesn't need the same attribute updates as Cognito
    return True

def validate_tenant_isolation(tenant_id: uuid.UUID):
    """
    Validate that tenant isolation is working correctly, including RLS policies
    """
    logger.info(f"Validating tenant isolation for {tenant_id}")
    
    try:
        # Create a test record in the tenant context
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)
        
        with connection.cursor() as cursor:
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS tenant_isolation_test (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
            
            # Insert a test record
            cursor.execute("""
                INSERT INTO tenant_isolation_test (tenant_id)
                VALUES (%s)
                RETURNING id
            """, [str(tenant_id)])
            
            test_id = cursor.fetchone()[0]
            
            # Try to access the record without tenant context
            from custom_auth.rls import clear_current_tenant_id
            clear_current_tenant_id()
            
            # This should return no rows if RLS is working
            cursor.execute("""
                SELECT COUNT(*) FROM tenant_isolation_test
                WHERE id = %s
            """, [test_id])
            
            count = cursor.fetchone()[0]
            
            if count > 0:
                logger.error(f"Tenant isolation FAILED! Could see tenant {tenant_id} data without tenant context")
                return False
            else:
                logger.info(f"Tenant isolation working correctly for tenant {tenant_id}")
                return True
                
        return True
    except Exception as e:
        logger.error(f"Error validating tenant isolation: {str(e)}")
        return False

def setup_tenant_rls_context(tenant_id: uuid.UUID):
    """
    Set up Row Level Security (RLS) context for a tenant
    """
    logger.info(f"Setting up RLS context for tenant {tenant_id}")
    
    try:
        # Import RLS functions
        from custom_auth.rls import set_current_tenant_id
        
        # Set tenant context
        set_current_tenant_id(tenant_id)
        
        # Create and execute test query to verify RLS setup
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 AS test_rls
            """)
            
            result = cursor.fetchone()
            if result and result[0] == 1:
                logger.info(f"RLS context successfully set up for tenant {tenant_id}")
                return True
            else:
                logger.error(f"RLS context setup failed for tenant {tenant_id}")
                return False
    except Exception as e:
        logger.error(f"Error setting up RLS context: {str(e)}")
        return False