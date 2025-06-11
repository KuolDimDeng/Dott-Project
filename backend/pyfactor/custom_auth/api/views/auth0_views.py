"""
Auth0 API Views
Handles Auth0 authentication and user management endpoints
"""

import logging
import uuid
import traceback
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny

logger = logging.getLogger(__name__)
User = get_user_model()

def safe_bool_convert(value, default=False):
    """
    Safely convert various input types to boolean values.
    Handles string 'false'/'true', numbers, and actual booleans.
    
    Args:
        value: The value to convert (str, int, bool, etc.)
        default: Default value if conversion fails
        
    Returns:
        bool: The converted boolean value
    """
    if isinstance(value, bool):
        return value
    elif isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    elif isinstance(value, (int, float)):
        return bool(value)
    else:
        return default

def fix_boolean_fields(progress):
    """
    Fix any corrupted boolean fields in OnboardingProgress before saving.
    Converts string "false"/"true" to proper boolean values.
    
    Args:
        progress: OnboardingProgress instance
    """
    # Fix all boolean fields that might be corrupted
    progress.payment_completed = safe_bool_convert(progress.payment_completed)
    progress.rls_setup_completed = safe_bool_convert(progress.rls_setup_completed)
    progress.setup_completed = safe_bool_convert(progress.setup_completed)
    
    # Fix any other boolean fields that exist
    if hasattr(progress, 'business_info_completed'):
        progress.business_info_completed = safe_bool_convert(progress.business_info_completed)
    if hasattr(progress, 'subscription_completed'):
        progress.subscription_completed = safe_bool_convert(progress.subscription_completed)
    
    return progress

class Auth0UserCreateView(APIView):
    """
    Create or get Auth0 user with tenant ID.
    Endpoint: POST /api/auth0/create-user/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.info("🔥 [AUTH0_CREATE_USER] === STARTING USER CREATION FLOW ===")
        
        try:
            # Extract data from request
            data = request.data
            logger.info(f"🔥 [AUTH0_CREATE_USER] Raw request data: {data}")
            
            email = data.get('email')
            # Support both 'sub' and 'auth0_sub' for compatibility
            auth0_sub = data.get('sub') or data.get('auth0_sub')
            logger.info(f"🔥 [AUTH0_CREATE_USER] Extracted - email: {email}, sub: {auth0_sub}")
            
            if not email or not auth0_sub:
                logger.error(f"🔥 [AUTH0_CREATE_USER] Missing required fields - email: {email}, sub: {auth0_sub}")
                return Response({'error': 'Email and sub are required'}, status=400)

            # Check if user exists by Auth0 sub first (most reliable)
            logger.info(f"🔥 [AUTH0_CREATE_USER] Checking if user exists with auth0_sub: {auth0_sub}")
            try:
                user = User.objects.get(auth0_sub=auth0_sub)
                created = False
                logger.info(f"🔥 [AUTH0_CREATE_USER] Found existing user by auth0_sub: {user.id}")
            except User.DoesNotExist:
                # Fallback to email lookup
                logger.info(f"🔥 [AUTH0_CREATE_USER] No user found by auth0_sub, checking by email: {email}")
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'auth0_sub': auth0_sub,
                        'name': data.get('name', ''),
                        'picture': data.get('picture', ''),
                        'email_verified': data.get('email_verified', False)
                    }
                )
            
            # Check if account has been deleted/closed
            if hasattr(user, 'is_deleted') and user.is_deleted:
                logger.error(f"🔥 [AUTH0_CREATE_USER] User {user.email} has a deleted/closed account")
                return Response({
                    'error': 'This account has been closed. Please contact support if you need assistance.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            logger.info(f"🔥 [AUTH0_CREATE_USER] User lookup result - created: {created}, user_id: {user.id}")
            
            if not created:
                # Update existing user
                logger.info(f"🔥 [AUTH0_CREATE_USER] Updating existing user {user.id}")
                # Only update auth0_sub if it's not already set
                if not user.auth0_sub:
                    user.auth0_sub = auth0_sub
                user.name = data.get('name', user.name)
                user.picture = data.get('picture', user.picture)
                user.email_verified = data.get('email_verified', user.email_verified)
                user.save()
                logger.info(f"🔥 [AUTH0_CREATE_USER] User {user.id} updated successfully")
            
            # Check for existing tenant
            # Convert user.id to string for proper CharField comparison
            user_id_str = str(user.id)
            logger.info(f"🔥 [AUTH0_CREATE_USER] Checking for existing tenant with owner_id: {user_id_str}")
            
            # Debug: Check all possible tenant lookups
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - User ID type: {type(user.id).__name__}, value: {user.id}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - String ID: '{user_id_str}'")
            
            # Try multiple lookup methods
            existing_tenant = Tenant.objects.filter(owner_id=user_id_str).first()
            tenant_by_int = Tenant.objects.filter(owner_id=user.id).first()
            tenant_by_user = user.tenant if hasattr(user, 'tenant') else None
            
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - Tenant by string '{user_id_str}': {existing_tenant}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - Tenant by int {user.id}: {tenant_by_int}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - Tenant by user.tenant: {tenant_by_user}")
            
            # Count all tenants for this user
            all_user_tenants = Tenant.objects.filter(owner_id__in=[str(user.id), user.id])
            logger.info(f"🔥 [AUTH0_CREATE_USER] DEBUG - Total tenants for user: {all_user_tenants.count()}")
            
            # If no tenant found by string but found by int, we have a type mismatch in DB
            if not existing_tenant and tenant_by_int:
                logger.warning(f"🔥 [AUTH0_CREATE_USER] CRITICAL: Tenant exists with integer owner_id, updating to string")
                tenant_by_int.owner_id = user_id_str
                tenant_by_int.save()
                existing_tenant = tenant_by_int
            
            if existing_tenant:
                logger.info(f"🔥 [AUTH0_CREATE_USER] Found existing tenant: {existing_tenant.id} (name: {existing_tenant.name})")
                tenant = existing_tenant
            else:
                logger.info(f"🔥 [AUTH0_CREATE_USER] No existing tenant found, creating new one")
                # Create new tenant
                # Convert user.id to string for proper CharField storage
                user_id_str = str(user.id)
                tenant = Tenant.objects.create(
                    name=f"{user.name or user.email.split('@')[0]}'s Business",
                    owner_id=user_id_str
                )
                logger.info(f"🔥 [AUTH0_CREATE_USER] Created new tenant: {tenant.id} (name: {tenant.name})")
            
            # Ensure user.tenant relationship is set
            if not user.tenant or user.tenant.id != tenant.id:
                logger.info(f"🔥 [AUTH0_CREATE_USER] Updating user.tenant relationship to {tenant.id}")
                user.tenant = tenant
                user.save(update_fields=['tenant'])

            # Check for existing onboarding progress
            logger.info(f"🔥 [AUTH0_CREATE_USER] Checking for onboarding progress for user: {user.id}")
            progress, progress_created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant.id,
                    'onboarding_status': 'business_info',
                    'current_step': 'business_info',
                    'next_step': 'business_info',
                    'completed_steps': []
                }
            )
            
            logger.info(f"🔥 [AUTH0_CREATE_USER] Progress lookup result - created: {progress_created}, progress_id: {progress.id}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] Progress details - status: {progress.onboarding_status}, step: {progress.current_step}, tenant_id: {progress.tenant_id}")
                            
            if not progress_created:
                logger.info(f"🔥 [AUTH0_CREATE_USER] Found existing progress record {progress.id}")
                # Update tenant_id if it's None or different
                if progress.tenant_id != tenant.id:
                    logger.warning(f"🔥 [AUTH0_CREATE_USER] Progress tenant_id mismatch! Progress: {progress.tenant_id}, Tenant: {tenant.id}")
                    progress.tenant_id = tenant.id
                    progress.save()
                    logger.info(f"🔥 [AUTH0_CREATE_USER] Updated progress tenant_id to: {tenant.id}")
            
            # Determine onboarding status
            logger.info(f"🔥 [AUTH0_CREATE_USER] Determining onboarding status...")
            logger.info(f"🔥 [AUTH0_CREATE_USER] Progress status: {progress.onboarding_status}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] Setup completed: {progress.setup_completed}")
            logger.info(f"🔥 [AUTH0_CREATE_USER] Completed steps: {progress.completed_steps}")
            
            # Check if onboarding is complete
            onboarding_complete = (
                progress.onboarding_status == 'complete' or 
                progress.setup_completed or
                (progress.completed_steps and 'complete' in progress.completed_steps)
            )
            
            logger.info(f"🔥 [AUTH0_CREATE_USER] Onboarding complete check: {onboarding_complete}")
                            
            current_step = progress.current_step or 'business_info'
            if onboarding_complete:
                current_step = 'complete'
                logger.info(f"🔥 [AUTH0_CREATE_USER] Setting current_step to 'complete'")
                        
            response_data = {
                            'success': True,
                'tenantId': str(tenant.id),
                'currentStep': current_step,
                'isExistingUser': not created,
                'onboardingComplete': onboarding_complete,
                'debug': {
                    'user_id': user.id,
                    'tenant_id': str(tenant.id),
                    'progress_id': str(progress.id),
                    'progress_status': progress.onboarding_status,
                    'setup_completed': progress.setup_completed,
                    'completed_steps': progress.completed_steps
                }
            }
            
            logger.info(f"🔥 [AUTH0_CREATE_USER] Final response data: {response_data}")
            logger.info("🔥 [AUTH0_CREATE_USER] === USER CREATION FLOW COMPLETE ===")
                    
            return Response(response_data, status=200)
                
        except Exception as e:
            logger.error(f"🔥 [AUTH0_CREATE_USER] ERROR: {str(e)}")
            logger.error(f"🔥 [AUTH0_CREATE_USER] Exception type: {type(e).__name__}")
            logger.error(f"🔥 [AUTH0_CREATE_USER] Traceback: {traceback.format_exc()}")
            return Response({'error': 'Internal server error'}, status=500)


class Auth0UserProfileView(APIView):
    """
    Get current user profile with tenant information for Auth0 authenticated users.
    Endpoint: GET /api/users/me
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            logger.info(f"🔥 [USER_PROFILE] === STARTING USER PROFILE LOOKUP ===")
            logger.info(f"🔥 [USER_PROFILE] Authenticated User: {user.email} (ID: {user.pk})")
            
            # Get user's tenant
            tenant = None
            user_role = 'owner'  # Default role
            
            try:
                # First check if user has a direct tenant relationship
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    logger.info(f"🔥 [USER_PROFILE] Found tenant via user.tenant relationship: {tenant.id}")
                else:
                    # Fallback: Check if user is owner of a tenant
                    # Convert user.id to string for proper CharField comparison
                    user_id_str = str(user.id)
                    tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                    logger.info(f"🔥 [USER_PROFILE] Tenant lookup by owner_id ('{user_id_str}') result: {tenant.id if tenant else 'None'}")
                    
                    # DEBUG: Additional tenant lookups
                    if not tenant:
                        logger.warning(f"🔥 [USER_PROFILE] DEBUG - No tenant found by string, checking integer")
                        tenant_by_int = Tenant.objects.filter(owner_id=user.id).first()
                        if tenant_by_int:
                            logger.warning(f"🔥 [USER_PROFILE] FOUND TENANT WITH INTEGER OWNER_ID: {tenant_by_int.id}")
                            logger.warning(f"🔥 [USER_PROFILE] Updating owner_id from {user.id} to '{user_id_str}'")
                            tenant_by_int.owner_id = user_id_str
                            tenant_by_int.save()
                            tenant = tenant_by_int
                        else:
                            # Check all tenants to debug
                            all_tenants = Tenant.objects.all()[:5]
                            logger.error(f"🔥 [USER_PROFILE] NO TENANT FOUND AT ALL! First 5 tenants in DB:")
                            for t in all_tenants:
                                logger.error(f"   - Tenant {t.id}: owner_id='{t.owner_id}' (type: {type(t.owner_id).__name__})")
                    
                    # If we found a tenant by owner_id, update the user's tenant field
                    if tenant and not user.tenant:
                        logger.info(f"🔥 [USER_PROFILE] Updating user.tenant relationship for consistency")
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                
                if tenant:
                    user_role = 'owner'
                else:
                    # Check if user is a member of any tenant
                    # This would require UserTenantRole model if implemented
                    pass
            except Exception as e:
                logger.warning(f"🔥 [USER_PROFILE] Error getting tenant: {str(e)}")
            
            # Get onboarding progress
            onboarding_progress = None
            try:
                onboarding_progress = OnboardingProgress.objects.filter(user=user).first()
                logger.info(f"🔥 [USER_PROFILE] Onboarding progress lookup: {onboarding_progress.id if onboarding_progress else 'None'}")
                
                if onboarding_progress:
                    logger.info(f"🔥 [USER_PROFILE] Progress details:")
                    logger.info(f"  - status: {onboarding_progress.onboarding_status}")
                    logger.info(f"  - current_step: {onboarding_progress.current_step}")
                    logger.info(f"  - setup_completed: {onboarding_progress.setup_completed}")
                    logger.info(f"  - tenant_id: {onboarding_progress.tenant_id}")
                    logger.info(f"  - completed_steps: {onboarding_progress.completed_steps}")
                    
                    # If OnboardingProgress has a tenant_id but user.tenant is not set, fix it
                    if onboarding_progress.tenant_id and not tenant:
                        logger.info(f"🔥 [USER_PROFILE] Found tenant_id in OnboardingProgress, looking up tenant")
                        tenant = Tenant.objects.filter(id=onboarding_progress.tenant_id).first()
                        if tenant:
                            logger.info(f"🔥 [USER_PROFILE] Found tenant {tenant.id} from OnboardingProgress, updating user.tenant")
                            user.tenant = tenant
                            user.save(update_fields=['tenant'])
                        else:
                            logger.warning(f"🔥 [USER_PROFILE] OnboardingProgress has tenant_id {onboarding_progress.tenant_id} but tenant not found!")
            except Exception as e:
                logger.warning(f"🔥 [USER_PROFILE] Error getting onboarding progress: {str(e)}")

            # Determine onboarding status
            needs_onboarding = True
            onboarding_completed = False
            current_step = 'business_info'
            setup_done = False

            if onboarding_progress:
                logger.info(f"🔥 [USER_PROFILE] Computing onboarding status...")
                
                # Check multiple conditions for completion
                is_complete_status = onboarding_progress.onboarding_status == 'complete'
                is_setup_completed = bool(onboarding_progress.setup_completed)
                has_complete_in_steps = bool(onboarding_progress.completed_steps and 'complete' in onboarding_progress.completed_steps)
                
                logger.info(f"🔥 [USER_PROFILE] Completion checks:")
                logger.info(f"  - is_complete_status: {is_complete_status}")
                logger.info(f"  - is_setup_completed: {is_setup_completed}")
                logger.info(f"  - has_complete_in_steps: {has_complete_in_steps}")
                
                onboarding_completed = is_complete_status or is_setup_completed or has_complete_in_steps
                needs_onboarding = not onboarding_completed
                setup_done = onboarding_completed
                current_step = onboarding_progress.current_step or 'business_info'
                
                if onboarding_completed:
                    current_step = 'complete'
                
                logger.info(f"🔥 [USER_PROFILE] Final computed values:")
                logger.info(f"  - needs_onboarding: {needs_onboarding}")
                logger.info(f"  - onboarding_completed: {onboarding_completed}")
                logger.info(f"  - current_step: {current_step}")
                logger.info(f"  - setup_done: {setup_done}")

            # Prepare response
            response_data = {
                'user': {
                    'id': user.pk,
                    'email': user.email,
                    'name': getattr(user, 'name', '') or f"{user.first_name} {user.last_name}".strip(),
                    'picture': getattr(user, 'picture', ''),
                    'role': user_role,
                },
                'tenant': {
                    'id': str(tenant.id) if tenant else None,
                    'name': tenant.name if tenant else None,
                } if tenant else None,
                'tenantId': str(tenant.id) if tenant else None,  # Top-level tenant ID for easy access
                'tenant_id': str(tenant.id) if tenant else None,  # Include both formats
                'businessName': tenant.name if tenant else None,  # Add businessName for frontend compatibility
                'onboarding_status': onboarding_progress.onboarding_status if onboarding_progress else 'business_info',
                'setup_done': setup_done,
                # Add these fields at top level for frontend compatibility
                'onboarding_completed': onboarding_completed,
                'needs_onboarding': needs_onboarding,
                'current_step': current_step,
                'current_onboarding_step': current_step,  # Include both formats
                # Include subscription information
                'subscription_plan': onboarding_progress.subscription_plan if onboarding_progress else 'free',
                'selected_plan': onboarding_progress.selected_plan if onboarding_progress else 'free',
                'subscription_type': onboarding_progress.subscription_plan if onboarding_progress else 'free',
                'onboarding': {
                    'needsOnboarding': needs_onboarding,
                    'onboardingCompleted': onboarding_completed,
                    'currentStep': current_step,
                    'tenantId': str(tenant.id) if tenant else None,
                    'progress_id': str(onboarding_progress.id) if onboarding_progress else None,
                    'subscription_plan': onboarding_progress.subscription_plan if onboarding_progress else 'free',
                } if onboarding_progress else {
                    'needsOnboarding': True,
                    'onboardingCompleted': False,
                    'currentStep': 'business_info',
                    'tenantId': str(tenant.id) if tenant else None,
                    'progress_id': None,
                    'subscription_plan': 'free',
                }
            }
            
            logger.info(f"🔥 [USER_PROFILE] Final response data: {response_data}")
            logger.info("🔥 [USER_PROFILE] === USER PROFILE LOOKUP COMPLETE ===")
            
            return Response(response_data, status=200)
            
        except Exception as e:
            logger.error(f"🔥 [USER_PROFILE] ERROR: {str(e)}")
            logger.error(f"🔥 [USER_PROFILE] Exception type: {type(e).__name__}")
            logger.error(f"🔥 [USER_PROFILE] Traceback: {traceback.format_exc()}")
            return Response({'error': 'Internal server error'}, status=500)


class Auth0OnboardingBusinessInfoView(APIView):
    """
    Submit business information during onboarding.
    Endpoint: POST /api/onboarding/business-info
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            data = request.data
            
            logger.info(f"Processing business info for user: {user.email}")
            
            # Extract business data
            business_name = data.get('business_name') or data.get('businessName')
            business_type = data.get('business_type') or data.get('businessType')
            country = data.get('country', 'US')
            
            if not business_name:
                return Response({
                    'success': False,
                    'error': 'Business name is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Create or get tenant
                # Convert user.id to string for proper CharField storage
                user_id_str = str(user.id)
                tenant, created = Tenant.objects.get_or_create(
                    owner_id=user_id_str,
                    defaults={
                        'name': business_name,
                        'created_at': timezone.now(),
                        'updated_at': timezone.now(),
                        'is_active': True
                    }
                )
                
                if not created:
                    # Update existing tenant
                    tenant.name = business_name
                    tenant.updated_at = timezone.now()
                    tenant.save(update_fields=['name', 'updated_at'])
                
                # Ensure user.tenant is set
                if not user.tenant or user.tenant.id != tenant.id:
                    logger.info(f"Setting user.tenant to {tenant.id} for user {user.email}")
                    user.tenant = tenant
                    user.save(update_fields=['tenant'])
                
                # Create or update onboarding progress
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'tenant_id': tenant.id,
                        'onboarding_status': 'subscription',
                        'current_step': 'subscription',
                        'next_step': 'subscription',
                        'completed_steps': ['business_info']
                    }
                )
                
                if not created:
                    progress.tenant_id = tenant.id
                    
                    # IMPORTANT: Don't overwrite completed onboarding status
                    if progress.onboarding_status != 'complete':
                            progress.onboarding_status = 'subscription'
                            progress.current_step = 'subscription'
                            progress.next_step = 'subscription'
                    
                    if 'business_info' not in progress.completed_steps:
                        progress.completed_steps.append('business_info')
                    
                    # Fix any corrupted boolean fields before saving
                    progress = fix_boolean_fields(progress)
                    progress.save()
                else:
                    # Fix any corrupted boolean fields before saving for new records too
                    progress = fix_boolean_fields(progress)
                    progress.save()
                
                logger.info(f"Created/updated tenant {tenant.id} for user {user.email}")
                
                return Response({
                    'success': True,
                    'message': 'Business information saved successfully',
                    'data': {
                        'tenant_id': str(tenant.id),
                        'next_step': 'subscription'
                    }
                })
                
        except Exception as e:
            logger.error(f"Error saving business info: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to save business information',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Auth0OnboardingSubscriptionView(APIView):
    """
    Select subscription plan during onboarding.
    Endpoint: POST /api/onboarding/subscription
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            data = request.data
            
            plan = data.get('plan', 'free')
            billing_cycle = data.get('billing_cycle', 'monthly')
            
            logger.info(f"Processing subscription selection for user: {user.email}, plan: {plan}")
            
            # Validate plan
            valid_plans = ['free', 'professional', 'enterprise']
            if plan not in valid_plans:
                return Response({
                    'success': False,
                    'error': f'Invalid plan. Must be one of: {", ".join(valid_plans)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
            except OnboardingProgress.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Please complete business information first'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update progress
            progress.selected_plan = plan
            progress.subscription_plan = plan
            progress.billing_cycle = billing_cycle
            progress.onboarding_status = 'payment' if plan != 'free' else 'setup'
            progress.current_step = 'payment' if plan != 'free' else 'setup'
            progress.next_step = 'payment' if plan != 'free' else 'setup'
            
            if 'subscription' not in progress.completed_steps:
                progress.completed_steps.append('subscription')
            
            # If free plan, skip payment
            if plan == 'free':
                progress.payment_completed = True
                if 'payment' not in progress.completed_steps:
                    progress.completed_steps.append('payment')
            
            # Fix any corrupted boolean fields before saving
            progress = fix_boolean_fields(progress)
            progress.save()
            
            logger.info(f"Updated subscription for user {user.email}: {plan}")
            
            return Response({
                'success': True,
                'message': 'Subscription plan selected successfully',
                'data': {
                    'plan': plan,
                    'billing_cycle': billing_cycle,
                    'next_step': progress.next_step,
                    'requires_payment': plan != 'free'
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing subscription: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to process subscription',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Auth0OnboardingPaymentView(APIView):
    """
    Process payment during onboarding.
    Endpoint: POST /api/onboarding/payment
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            data = request.data
            
            # For now, just mark payment as completed
            # TODO: Implement actual Stripe payment processing
            
            logger.info(f"Processing payment for user: {user.email}")
            
            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
            except OnboardingProgress.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Please complete previous steps first'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mock payment processing
            payment_method = data.get('payment_method', 'card')
            
            # Update progress
            progress.payment_completed = True
            progress.payment_method = payment_method
            progress.payment_timestamp = timezone.now()
            progress.onboarding_status = 'setup'
            progress.current_step = 'setup'
            progress.next_step = 'setup'
            
            if 'payment' not in progress.completed_steps:
                progress.completed_steps.append('payment')
            
            # Fix any corrupted boolean fields before saving
            progress = fix_boolean_fields(progress)
            progress.save()
            
            logger.info(f"Payment processed for user {user.email}")
            
            return Response({
                'success': True,
                'message': 'Payment processed successfully',
                'data': {
                    'payment_completed': True,
                    'next_step': 'setup'
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing payment: {str(e)}")
            return Response({
                'success': False,
                'error': 'Payment processing failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Auth0OnboardingCompleteView(APIView):
    """
    Complete the onboarding process.
    Endpoint: POST /api/onboarding/complete
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            
            logger.info(f"🎯 [ONBOARDING_COMPLETE] === COMPLETION REQUEST STARTED ===")
            logger.info(f"🎯 [ONBOARDING_COMPLETE] User: {user.email} (ID: {user.id})")
            logger.info(f"🎯 [ONBOARDING_COMPLETE] Request data: {request.data}")
            
            # Get or create onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
                logger.info(f"🎯 [ONBOARDING_COMPLETE] Found existing progress:")
                logger.info(f"  - Current onboarding_status: '{progress.onboarding_status}'")
                logger.info(f"  - Current current_step: '{progress.current_step}'")
                logger.info(f"  - Current setup_completed: {progress.setup_completed}")
                logger.info(f"  - Current completed_steps: {progress.completed_steps}")
                logger.info(f"  - Current tenant_id: {progress.tenant_id}")
            except OnboardingProgress.DoesNotExist:
                logger.info(f"🎯 [ONBOARDING_COMPLETE] No existing progress found for user {user.email}, creating new one")
                
                # Create progress record from request data
                request_data = request.data
                
                # Get the user's tenant_id - CRITICAL: Must have a valid tenant
                tenant_id = None
                tenant = None
                
                # Check if user has tenant relationship
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    tenant_id = tenant.id
                    logger.info(f"🎯 [ONBOARDING_COMPLETE] Found tenant via user.tenant: {tenant_id}")
                else:
                    # Look for tenant where user is owner
                    # Convert user.id to string for proper CharField comparison
                    user_id_str = str(user.id)
                    tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                    if tenant:
                        tenant_id = tenant.id
                        # Update user.tenant relationship
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                        logger.info(f"🎯 [ONBOARDING_COMPLETE] Found tenant via owner_id: {tenant_id}")
                    else:
                        # Critical error - user completing onboarding without tenant
                        logger.error(f"🎯 [ONBOARDING_COMPLETE] CRITICAL: No tenant found for user {user.email}")
                        return Response({
                            'success': False,
                            'error': 'No tenant found for user. Please contact support.',
                            'detail': 'User has no associated tenant'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                progress = OnboardingProgress.objects.create(
                    user=user,
                    tenant_id=tenant_id,  # Must have valid tenant_id
                    selected_plan=request_data.get('selected_plan', 'free'),
                    billing_cycle=request_data.get('billing_cycle', 'monthly'),
                    current_step='setup',
                    onboarding_status='in_progress',
                    completed_steps=['business_info', 'subscription'],
                    setup_completed=False,
                    created_at=timezone.now()
                )
                logger.info(f"🎯 [ONBOARDING_COMPLETE] Created new progress record with tenant_id: {tenant_id}")
            
            # Ensure progress has correct tenant_id before marking complete
            if not progress.tenant_id:
                # Try to get tenant from user or create one
                if hasattr(user, 'tenant') and user.tenant:
                    progress.tenant_id = user.tenant.id
                    logger.info(f"🎯 [ONBOARDING_COMPLETE] Set progress tenant_id from user.tenant: {progress.tenant_id}")
                else:
                    # Look for tenant where user is owner
                    # Convert user.id to string for proper CharField comparison
                    user_id_str = str(user.id)
                    tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                    if tenant:
                        progress.tenant_id = tenant.id
                        # Also update user.tenant
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                        logger.info(f"🎯 [ONBOARDING_COMPLETE] Set progress tenant_id from owner lookup: {progress.tenant_id}")
                    else:
                        logger.error(f"🎯 [ONBOARDING_COMPLETE] Cannot complete onboarding without tenant!")
                        return Response({
                            'success': False,
                            'error': 'No tenant found. Cannot complete onboarding.',
                            'detail': 'Missing tenant association'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Mark as complete
            logger.info(f"🎯 [ONBOARDING_COMPLETE] Updating progress to completed with tenant_id: {progress.tenant_id}")
            
            progress.setup_completed = True
            progress.setup_timestamp = timezone.now()
            progress.onboarding_status = 'complete'
            progress.current_step = 'complete'
            progress.completed_at = timezone.now()
            
            if 'setup' not in progress.completed_steps:
                progress.completed_steps.append('setup')
            if 'complete' not in progress.completed_steps:
                progress.completed_steps.append('complete')
            
            # Fix any corrupted boolean fields before saving
            progress = fix_boolean_fields(progress)
            progress.save()
            
            logger.info(f"🎯 [ONBOARDING_COMPLETE] ✅ Progress updated successfully:")
            logger.info(f"  - New onboarding_status: '{progress.onboarding_status}'")
            logger.info(f"  - New current_step: '{progress.current_step}'")
            logger.info(f"  - New setup_completed: {progress.setup_completed}")
            logger.info(f"  - New completed_steps: {progress.completed_steps}")
            logger.info(f"  - Completed at: {progress.completed_at}")
            logger.info(f"🎯 [ONBOARDING_COMPLETE] === COMPLETION REQUEST FINISHED ===")
            
            # Get the user's tenant for the response
            tenant = None
            try:
                # Convert user.id to string for proper CharField comparison
                user_id_str = str(user.id)
                tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                if not tenant and progress.tenant_id:
                    # Try to get tenant from progress if not found by owner
                    tenant = Tenant.objects.filter(id=progress.tenant_id).first()
                logger.info(f"🎯 [ONBOARDING_COMPLETE] Found tenant: {tenant.id if tenant else 'None'}")
            except Exception as e:
                logger.warning(f"🎯 [ONBOARDING_COMPLETE] Error getting tenant: {str(e)}")
            
            # Prepare response with tenant information
            response_data = {
                'success': True,
                'message': 'Onboarding completed successfully',
                'data': {
                    'onboarding_completed': True,
                    'tenantId': str(tenant.id) if tenant else None,
                    'redirect_url': f'/tenant/{tenant.id}/dashboard' if tenant else '/dashboard'
                }
            }
            
            logger.info(f"🎯 [ONBOARDING_COMPLETE] Response data: {response_data}")
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"🚨 [ONBOARDING_COMPLETE] Error completing onboarding: {str(e)}")
            logger.error(f"🚨 [ONBOARDING_COMPLETE] Exception details: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': 'Failed to complete onboarding',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Auth0OnboardingStatusView(APIView):
    """
    Get current onboarding status.
    Endpoint: GET /api/onboarding/status
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            
            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
                
                return Response({
                    'success': True,
                    'data': {
                        'onboarding_status': progress.onboarding_status,
                        'current_step': progress.current_step,
                        'next_step': progress.next_step,
                        'completed_steps': progress.completed_steps,
                        'business_info_completed': 'business_info' in progress.completed_steps,
                        'subscription_selected': 'subscription' in progress.completed_steps,
                        'payment_completed': progress.payment_completed,
                        'setup_completed': progress.setup_completed,
                        'onboarding_completed': progress.onboarding_status == 'complete',
                        'selected_plan': progress.selected_plan,
                        'billing_cycle': progress.billing_cycle
                    }
                })
                
            except OnboardingProgress.DoesNotExist:
                return Response({
                    'success': True,
                    'data': {
                        'onboarding_status': 'not_started',
                        'current_step': 'business_info',
                        'next_step': 'business_info',
                        'completed_steps': [],
                        'business_info_completed': False,
                        'subscription_selected': False,
                        'payment_completed': False,
                        'setup_completed': False,
                        'onboarding_completed': False
                    }
                })
            
        except Exception as e:
            logger.error(f"Error getting onboarding status: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get onboarding status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 