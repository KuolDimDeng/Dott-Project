# users_tenant_cleanup.py
import os
import sys
import uuid

# Add the project root directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # One level up from scripts folder
if project_root not in sys.path:
    sys.path.append(project_root)

# Now setup Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction, connections
from custom_auth.models import User, Tenant

# Initialize logger
import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

def drop_tenant_schema(schema_name):
    """Drop the tenant schema from the database"""
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            logger.info(f"Successfully dropped schema: {schema_name}")
            return True
    except Exception as e:
        logger.error(f"Error dropping schema {schema_name}: {str(e)}")
        return False

def remove_tenant_for_user(user_id=None, email=None, remove_schema=True):
    """
    Remove tenant association for a specific user
    
    Args:
        user_id: UUID of the user
        email: Email of the user (alternative to user_id)
        remove_schema: Whether to drop the associated database schema
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not user_id and not email:
        logger.error("Either user_id or email must be provided")
        return False
    
    try:
        # Find the user
        if user_id:
            try:
                user_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                user = User.objects.get(id=user_id)
            except ValueError:
                logger.error(f"Invalid UUID format: {user_id}")
                return False
        else:
            user = User.objects.get(email=email)
        
        logger.info(f"Found user: {user.email} ({user.id})")
        
        # Get tenant information
        tenant = None
        schema_name = None
        
        # Check for owned tenant
        try:
            tenant = user.owned_tenant
            schema_name = tenant.schema_name
            logger.info(f"Found owned tenant: {schema_name}")
        except Exception as e:
            logger.info(f"No owned tenant found for user: {user.email} - {str(e)}")
        
        # Check for associated tenant
        if user.tenant:
            schema_name = user.tenant.schema_name
            logger.info(f"Found associated tenant: {schema_name}")
        
        if not tenant and not user.tenant:
            logger.info(f"No tenant found for user: {user.email}")
            return False
        
        # Begin transaction to update database
        with transaction.atomic():
            # If schema exists and should be removed, drop it
            if schema_name and remove_schema:
                if not drop_tenant_schema(schema_name):
                    logger.error(f"Failed to drop schema {schema_name}, aborting tenant removal")
                    return False
            
            # Disconnect user from tenant
            if user.tenant:
                logger.info(f"Removing tenant association for user: {user.email}")
                user.tenant = None
                user.save(update_fields=['tenant'])
            
            # Delete owned tenant if it exists
            if tenant:
                logger.info(f"Deleting tenant record: {tenant.schema_name}")
                tenant.delete()
            
            # Update onboarding status if needed
            user.is_onboarded = False
            user.save(update_fields=['is_onboarded'])
            
            # Update role to 'OWNER' since we're resetting
            user.role = 'OWNER'
            user.occupation = 'OWNER'
            user.save(update_fields=['role', 'occupation'])
            
            # Get onboarding progress and update
            try:
                from onboarding.models import OnboardingProgress
                progress = OnboardingProgress.objects.get(user=user)
                progress.onboarding_status = 'business-info'
                progress.current_step = 'business-info'
                progress.next_step = 'subscription'
                progress.database_provisioning_status = 'not_started'
                progress.technical_setup_status = 'not_started'
                progress.save()
                logger.info(f"Reset onboarding progress for user: {user.email}")
            except Exception as e:
                logger.warning(f"Could not update onboarding progress: {str(e)}")
            
            logger.info(f"Successfully removed tenant for user: {user.email}")
            return True
                
    except User.DoesNotExist:
        logger.error(f"User not found with {'id: ' + str(user_id) if user_id else 'email: ' + email}")
        return False
    except Exception as e:
        logger.error(f"Error removing tenant: {str(e)}")
        return False

def remove_all_tenants(remove_schema=True, confirm=True):
    """
    Remove all tenants from the system
    
    Args:
        remove_schema: Whether to drop the associated database schemas
        confirm: Whether to ask for confirmation before proceeding
        
    Returns:
        tuple: (success_count, failure_count)
    """
    if confirm:
        response = input("WARNING: This will remove ALL tenants from the system. Are you sure? (yes/no): ")
        if response.lower() != 'yes':
            print("Operation cancelled.")
            return 0, 0
    
    logger.info("Starting removal of all tenants")
    
    success_count = 0
    failure_count = 0
    
    # Get all tenants
    tenants = Tenant.objects.all()
    total_count = tenants.count()
    
    logger.info(f"Found {total_count} tenants to remove")
    
    # Process each tenant
    for tenant in tenants:
        try:
            logger.info(f"Processing tenant: {tenant.schema_name} (owner: {tenant.owner.email})")
            
            # Drop schema if requested
            if remove_schema:
                if not drop_tenant_schema(tenant.schema_name):
                    logger.error(f"Failed to drop schema {tenant.schema_name}, skipping tenant removal")
                    failure_count += 1
                    continue
            
            # Begin transaction to update database
            with transaction.atomic():
                # Update all users that use this tenant
                users = User.objects.filter(tenant=tenant)
                for user in users:
                    user.tenant = None
                    user.is_onboarded = False
                    user.role = 'OWNER'
                    user.occupation = 'OWNER'
                    user.save(update_fields=['tenant', 'is_onboarded', 'role', 'occupation'])
                    logger.info(f"Removed tenant association for user: {user.email}")
                    
                    # Reset onboarding progress
                    try:
                        from onboarding.models import OnboardingProgress
                        progress = OnboardingProgress.objects.get(user=user)
                        progress.onboarding_status = 'business-info'
                        progress.current_step = 'business-info'
                        progress.next_step = 'subscription'
                        progress.database_provisioning_status = 'not_started'
                        progress.technical_setup_status = 'not_started'
                        progress.save()
                        logger.info(f"Reset onboarding progress for user: {user.email}")
                    except Exception as e:
                        logger.warning(f"Could not update onboarding progress for {user.email}: {str(e)}")
                
                # Delete the tenant record
                tenant.delete()
                logger.info(f"Successfully removed tenant: {tenant.schema_name}")
                success_count += 1
                
        except Exception as e:
            logger.error(f"Error removing tenant {tenant.schema_name}: {str(e)}")
            failure_count += 1
    
    logger.info(f"Tenant removal complete. Success: {success_count}, Failures: {failure_count}")
    return success_count, failure_count

if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage: python users_tenant_cleanup.py [--email EMAIL | --user-id USER_ID | --all] [--keep-schema] [--force]")
        sys.exit(1)
    
    user_id = None
    email = None
    remove_all = False
    remove_schema = True
    force = False
    
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--email" and i+1 < len(sys.argv[1:]):
            email = sys.argv[i+2]
        elif arg == "--user-id" and i+1 < len(sys.argv[1:]):
            user_id = sys.argv[i+2]
        elif arg == "--all":
            remove_all = True
        elif arg == "--keep-schema":
            remove_schema = False
        elif arg == "--force":
            force = True
    
    if remove_all:
        success_count, failure_count = remove_all_tenants(remove_schema, not force)
        if success_count > 0:
            print(f"Successfully removed {success_count} tenants, with {failure_count} failures")
            sys.exit(0 if failure_count == 0 else 1)
        else:
            print("No tenants were removed")
            sys.exit(1)
    elif not user_id and not email:
        print("Error: Either --email, --user-id, or --all must be provided")
        sys.exit(1)
    else:
        success = remove_tenant_for_user(user_id, email, remove_schema)
        if success:
            print(f"Successfully removed tenant for user: {email or user_id}")
            sys.exit(0)
        else:
            print(f"Failed to remove tenant for user: {email or user_id}")
            sys.exit(1)