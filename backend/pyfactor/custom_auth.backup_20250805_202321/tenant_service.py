"""
Centralized Tenant Management Service

This module provides a comprehensive service for tenant management operations including:
1. Tenant creation with proper error handling and validation
2. Tenant validation and verification
3. Tenant reconciliation between Django and Cognito
4. Background tenant setup and health checks
"""

import uuid
import logging
import time
import json
from django.db import connection, transaction as db_transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from functools import wraps
from typing import Optional, Tuple, Dict, Any, Union

# Import models and utilities
from custom_auth.models import User, Tenant
from custom_auth.rls import set_tenant_in_db, tenant_context, verify_rls_setup
from custom_auth.utils import update_auth0_tenant_id

logger = logging.getLogger(__name__)

class TenantManagementService:
    """Centralized service for all tenant management operations"""
    
    @classmethod
    def create_tenant(cls, user_id: uuid.UUID, business_name: str = None, 
                      tenant_id: uuid.UUID = None) -> Tuple[Tenant, bool]:
        """
        Create a new tenant for a user with improved error handling and validation.
        
        Args:
            user_id: The ID of the user who will own the tenant
            business_name: Optional business name for the tenant
            tenant_id: Optional specific tenant ID to use (if None, one will be generated)
            
        Returns:
            Tuple of (tenant, created) where created is True if a new tenant was created
            
        Raises:
            ValidationError: If tenant creation failed with validation errors
            Exception: For other creation errors
        """
        process_id = str(uuid.uuid4())[:8]
        logger.info(f"[TENANT-CREATE-{process_id}] Starting tenant creation for user {user_id}")
        
        try:
            # Get the user
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            error_msg = f"User with ID {user_id} does not exist"
            logger.error(f"[TENANT-CREATE-{process_id}] {error_msg}")
            raise ValidationError(error_msg)
            
        # Use transaction to ensure atomicity and prevent race conditions
        with db_transaction.atomic():
            # First check if the user already has a tenant
            existing_tenant = Tenant.objects.select_for_update().filter(owner_id=str(user_id)).first()
            
            if existing_tenant:
                logger.info(f"[TENANT-CREATE-{process_id}] User {user_id} already has tenant {existing_tenant.id}")
                
                # Ensure user.tenant_id is consistent
                if hasattr(user, 'tenant_id') and user.tenant_id != existing_tenant.id:
                    user.tenant_id = existing_tenant.id
                    user.save(update_fields=['tenant_id'])
                    logger.info(f"[TENANT-CREATE-{process_id}] Updated user's tenant_id to {existing_tenant.id}")
                
                # Log tenant creation for Auth0 instead of updating Cognito
                cls._log_auth0_tenant_id(user.email, existing_tenant.id)
                
                return existing_tenant, False
                
            # If specific tenant_id was provided, check if it exists
            if tenant_id:
                existing_tenant_by_id = Tenant.objects.filter(id=tenant_id).first()
                if existing_tenant_by_id:
                    # If tenant exists but has no owner, associate it with this user
                    if not existing_tenant_by_id.owner_id:
                        existing_tenant_by_id.owner_id = str(user_id)
                        existing_tenant_by_id.save(update_fields=['owner_id'])
                        
                        # Update user's tenant_id
                        if hasattr(user, 'tenant_id'):
                            user.tenant_id = existing_tenant_by_id.id
                            user.save(update_fields=['tenant_id'])
                        
                        logger.info(f"[TENANT-CREATE-{process_id}] Associated existing tenant {existing_tenant_by_id.id} with user {user_id}")
                        
                        # Log for Auth0 instead of updating Cognito
                        cls._log_auth0_tenant_id(user.email, existing_tenant_by_id.id)
                        
                        return existing_tenant_by_id, False
                    else:
                        # Tenant exists and has an owner - check if it's this user
                        if existing_tenant_by_id.owner_id == str(user_id):
                            # This is the user's tenant
                            logger.info(f"[TENANT-CREATE-{process_id}] Found existing tenant {existing_tenant_by_id.id} owned by user {user_id}")
                            
                            # Ensure user.tenant_id is consistent
                            if hasattr(user, 'tenant_id') and user.tenant_id != existing_tenant_by_id.id:
                                user.tenant_id = existing_tenant_by_id.id
                                user.save(update_fields=['tenant_id'])
                                
                            return existing_tenant_by_id, False
                        else:
                            # Tenant exists but is owned by someone else - we'll create a new one
                            logger.warning(f"[TENANT-CREATE-{process_id}] Requested tenant {tenant_id} exists but is owned by another user, creating new tenant")
                            tenant_id = None  # Generate a new tenant_id
            
            # Create a new tenant
            # Generate a new tenant_id if none was specified or the specified one was invalid
            if not tenant_id:
                tenant_id = uuid.uuid4()
                
            # Business name is required
            if not business_name:
                raise ValueError("Business name is required to create a tenant")
                
            # Create the tenant record
            tenant = Tenant.objects.create(
                id=tenant_id,
                name=business_name,
                owner_id=str(user_id),
                created_at=timezone.now(),
                updated_at=timezone.now(),
                is_active=True,
                setup_status='pending',
                rls_enabled=True,
                rls_setup_date=timezone.now()
            )
            
            # Link tenant to user
            if hasattr(user, 'tenant_id'):
                user.tenant_id = tenant.id
                user.save(update_fields=['tenant_id'])
            
            logger.info(f"[TENANT-CREATE-{process_id}] Created new tenant {tenant.id} for user {user_id}")
            
            # Log tenant creation for Auth0 instead of updating Cognito
            cls._log_auth0_tenant_id(user.email, tenant.id)
            
            # Schedule background setup of RLS for this tenant
            cls._schedule_tenant_setup(tenant.id)
            
            return tenant, True
    
    @classmethod
    def verify_tenant_access(cls, user_id: uuid.UUID, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """
        Verify a user has access to a specific tenant and the tenant exists
        
        Args:
            user_id: The ID of the user to check
            tenant_id: The ID of the tenant to verify
            
        Returns:
            Dict with verification results including:
            - has_access: Whether the user has access to this tenant
            - tenant: The tenant object if it exists
            - is_owner: Whether the user is the owner of this tenant
            - correct_tenant_id: The ID of the user's actual tenant (if different)
        """
        result = {
            'has_access': False,
            'tenant': None,
            'is_owner': False,
            'correct_tenant_id': None,
            'error': None
        }
        
        try:
            # Find the tenant
            tenant = Tenant.objects.filter(id=tenant_id).first()
            
            # If tenant doesn't exist, return immediately
            if not tenant:
                result['error'] = f"Tenant {tenant_id} does not exist"
                return result
                
            # Store the tenant in the result
            result['tenant'] = tenant
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                result['error'] = f"User {user_id} does not exist"
                return result
                
            # Check if user is the owner of this tenant
            result['is_owner'] = tenant.owner_id == str(user_id)
            
            # If user is the owner, they have access
            if result['is_owner']:
                result['has_access'] = True
                
                # Ensure user.tenant_id is consistent
                if hasattr(user, 'tenant_id') and user.tenant_id != tenant.id:
                    user.tenant_id = tenant.id
                    user.save(update_fields=['tenant_id'])
                    logger.info(f"Updated user {user_id} tenant_id to {tenant.id}")
                
                # Log tenant creation for Auth0 instead of updating Cognito
                cls._log_auth0_tenant_id(user.email, tenant.id)
                    
                return result
                
            # User is not the owner - check if they belong to this tenant through other means
            # (This is where you would implement additional access checks for multi-user tenants)
            
            # For now, just check if the user's tenant_id matches
            if hasattr(user, 'tenant_id') and user.tenant_id == tenant.id:
                result['has_access'] = True
                return result
                
            # User doesn't have access to this tenant - find their correct tenant
            user_tenant = Tenant.objects.filter(owner_id=str(user_id)).first()
            if user_tenant:
                result['correct_tenant_id'] = user_tenant.id
                
                # Update user.tenant_id if needed
                if hasattr(user, 'tenant_id') and user.tenant_id != user_tenant.id:
                    user.tenant_id = user_tenant.id
                    user.save(update_fields=['tenant_id'])
                    
                # Log tenant creation for Auth0 instead of updating Cognito
                cls._log_auth0_tenant_id(user.email, user_tenant.id)
            
            return result
            
        except Exception as e:
            logger.error(f"Error verifying tenant access: {str(e)}")
            result['error'] = str(e)
            return result
    
    @classmethod
    def reconcile_tenant_with_cognito(cls, user_id: uuid.UUID, cognito_tenant_id: uuid.UUID = None) -> Dict[str, Any]:
        """
        Reconcile tenant information between Django and Cognito
        
        Args:
            user_id: The ID of the user to reconcile
            cognito_tenant_id: The tenant ID from Cognito (if available)
            
        Returns:
            Dict with reconciliation results
        """
        result = {
            'success': False,
            'tenant_id': None,
            'cognito_updated': False,
            'django_updated': False,
            'error': None
        }
        
        try:
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                result['error'] = f"User {user_id} does not exist"
                return result
            
            # Find the user's tenant in Django
            django_tenant = Tenant.objects.filter(owner_id=str(user_id)).first()
            django_tenant_id = django_tenant.id if django_tenant else None
            
            # Case 1: User has no tenant in either system
            if not django_tenant_id and not cognito_tenant_id:
                # Create a new tenant
                tenant, created = cls.create_tenant(user_id)
                result['tenant_id'] = tenant.id
                result['success'] = True
                result['cognito_updated'] = created and user.cognito_sub is not None
                result['django_updated'] = created
                return result
                
            # Case 2: User has tenant in Django but not in Auth0 (was Cognito)
            if django_tenant_id and not cognito_tenant_id:
                # Log for Auth0
                cls._log_auth0_tenant_id(user.email, django_tenant_id)
                result['cognito_updated'] = True
                    
                result['tenant_id'] = django_tenant_id
                result['success'] = True
                return result
                
            # Case 3: User has tenant in Auth0 (was Cognito) but not in Django
            if not django_tenant_id and cognito_tenant_id:
                # Check if the Auth0 tenant exists in Django
                cognito_tenant = Tenant.objects.filter(id=cognito_tenant_id).first()
                
                if cognito_tenant:
                    # Auth0 tenant exists - link it to the user
                    cognito_tenant.owner_id = str(user_id)
                    cognito_tenant.save(update_fields=['owner_id'])
                    
                    # Update user.tenant_id
                    if hasattr(user, 'tenant_id'):
                        user.tenant_id = cognito_tenant.id
                        user.save(update_fields=['tenant_id'])
                    
                    result['tenant_id'] = cognito_tenant.id
                    result['django_updated'] = True
                else:
                    # Auth0 tenant doesn't exist - create it
                    tenant, created = cls.create_tenant(user_id, tenant_id=cognito_tenant_id)
                    result['tenant_id'] = tenant.id
                    result['django_updated'] = True
                    
                result['success'] = True
                return result
                
            # Case 4: User has different tenants in Django and Auth0 (was Cognito)
            if django_tenant_id != cognito_tenant_id:
                # Always use Django as the source of truth
                cls._log_auth0_tenant_id(user.email, django_tenant_id)
                result['cognito_updated'] = True
                    
                result['tenant_id'] = django_tenant_id
                result['success'] = True
                return result
                
            # Case 5: Tenants match - nothing to reconcile
            result['tenant_id'] = django_tenant_id
            result['success'] = True
            return result
            
        except Exception as e:
            logger.error(f"Error reconciling tenant with Cognito: {str(e)}")
            result['error'] = str(e)
            return result
    
    @classmethod
    def _schedule_tenant_setup(cls, tenant_id: uuid.UUID) -> None:
        """
        Schedule background setup of tenant RLS
        
        Args:
            tenant_id: The ID of the tenant to set up
        """
        # This would typically use a task queue like Celery
        # For now, we'll implement a simple background thread-based approach
        from threading import Thread
        
        def setup_tenant_rls():
            try:
                # Wait a short while to allow transaction to complete
                time.sleep(1)
                
                # Set up RLS for the tenant
                with connection.cursor() as cursor:
                    # Set the tenant context
                    set_tenant_in_db(tenant_id)
                    
                    # Create or update RLS policies for key tables
                    tables = [
                        'users_business',
                        'users_userprofile',
                        'users_businessdetails',
                        'users_subscription',
                        'custom_auth_user',
                        'inventory_product',
                        'inventory_inventory',
                        'sales_order',
                        'sales_invoice',
                        'accounting_transaction',
                        'accounting_account'
                    ]
                    
                    for table in tables:
                        try:
                            # Check if table exists
                            cursor.execute(f"""
                                SELECT EXISTS (
                                    SELECT FROM information_schema.tables 
                                    WHERE table_schema = 'public' 
                                    AND table_name = %s
                                )
                            """, [table])
                            
                            if cursor.fetchone()[0]:
                                # Check if table has tenant_id column
                                cursor.execute(f"""
                                    SELECT EXISTS (
                                        SELECT FROM information_schema.columns 
                                        WHERE table_schema = 'public' 
                                        AND table_name = %s
                                        AND column_name = 'tenant_id'
                                    )
                                """, [table])
                                
                                if cursor.fetchone()[0]:
                                    # Table exists and has tenant_id - set up RLS
                                    # First enable RLS
                                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                                    
                                    # Drop existing policy if it exists
                                    cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
                                    
                                    # Create the policy
                                    cursor.execute(f"""
                                        CREATE POLICY tenant_isolation_policy ON {table}
                                        AS RESTRICTIVE
                                        USING (
                                            tenant_id::TEXT = current_setting('app.current_tenant', TRUE)
                                            OR current_setting('app.current_tenant', TRUE) = 'unset'
                                        );
                                    """)
                                    logger.info(f"Set up RLS for table {table}")
                        except Exception as table_error:
                            logger.error(f"Error setting up RLS for table {table}: {str(table_error)}")
                    
                    # Update tenant setup status
                    Tenant.objects.filter(id=tenant_id).update(
                        setup_status='complete',
                        updated_at=timezone.now()
                    )
                    
                    logger.info(f"Completed RLS setup for tenant {tenant_id}")
            except Exception as e:
                logger.error(f"Error in background tenant setup: {str(e)}")
                
                # Update tenant with error
                try:
                    Tenant.objects.filter(id=tenant_id).update(
                        setup_status='error',
                        updated_at=timezone.now()
                    )
                except Exception as update_error:
                    logger.error(f"Error updating tenant status: {str(update_error)}")
        
        # Start background thread
        thread = Thread(target=setup_tenant_rls)
        thread.daemon = True
        thread.start()
        
        logger.info(f"Scheduled background RLS setup for tenant {tenant_id}")

    @classmethod
    def _log_auth0_tenant_id(cls, email: str, tenant_id: uuid.UUID) -> bool:
        """
        Log tenant ID for Auth0 user (replaces Cognito update)
        
        Args:
            email: The email of the user
            tenant_id: The tenant ID to log
            
        Returns:
            bool: Always returns True in Auth0 mode
        """
        try:
            logger.info(f"Auth0 mode: Tenant ID {tenant_id} logged for user {email}")
            return update_auth0_tenant_id(email, tenant_id)
        except Exception as e:
            logger.error(f"Error logging Auth0 tenant ID: {str(e)}")
            return False 