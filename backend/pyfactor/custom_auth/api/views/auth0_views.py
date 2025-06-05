"""
Auth0 API Views
Handles Auth0 authentication and user management endpoints
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from custom_auth.models import Tenant
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from onboarding.models import OnboardingProgress
from django.utils import timezone
from django.db import transaction
import uuid
import json
import traceback

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
        try:
            user = request.user
            data = request.data
            
            logger.info(f"🔍 [AUTH0_USER_CREATE] === USER LOOKUP STARTED ===")
            logger.info(f"🔍 [AUTH0_USER_CREATE] Authenticated User: {user.email} (ID: {user.pk})")
            logger.info(f"🔍 [AUTH0_USER_CREATE] Request data: {data}")
            
            # Extract data from request
            auth0_sub = data.get('auth0_sub') or getattr(user, 'auth0_sub', None)
            email = data.get('email') or user.email
            first_name = data.get('first_name', '') or user.first_name
            last_name = data.get('last_name', '') or user.last_name
            name = data.get('name', '') or f"{first_name} {last_name}".strip()
            picture = data.get('picture', '')
            tenant_id = data.get('tenant_id', None)
            
            logger.info(f"🔍 [AUTH0_USER_CREATE] Processing user data: email={email}, auth0_sub={auth0_sub}, user_id={user.pk}")
            
            with transaction.atomic():
                # Check if user already has a tenant
                existing_tenant = None
                
                try:
                    # First try to find by owner_id
                    logger.info(f"🔍 [AUTH0_USER_CREATE] Looking for tenant with owner_id={user.pk}")
                    existing_tenant = Tenant.objects.filter(owner_id=user.pk).first()
                    
                    if existing_tenant:
                        logger.info(f"✅ [AUTH0_USER_CREATE] Found tenant by owner_id: {existing_tenant.id}")
                    else:
                        logger.info(f"❌ [AUTH0_USER_CREATE] No tenant found by owner_id")
                        
                        # FALLBACK: Look for tenant owned by ANY user with the same email
                        logger.info(f"🔍 [AUTH0_USER_CREATE] Fallback: Looking for tenant by email {email}")
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        
                        # Find all users with this email
                        users_with_email = User.objects.filter(email=email)
                        logger.info(f"🔍 [AUTH0_USER_CREATE] Found {users_with_email.count()} users with email {email}")
                        
                        for user_candidate in users_with_email:
                            logger.info(f"  - User ID: {user_candidate.pk}, Auth0 Sub: {getattr(user_candidate, 'auth0_sub', 'None')}")
                            
                            candidate_tenant = Tenant.objects.filter(owner_id=user_candidate.pk).first()
                            if candidate_tenant:
                                logger.info(f"✅ [AUTH0_USER_CREATE] Found tenant via email fallback: {candidate_tenant.id}")
                                existing_tenant = candidate_tenant
                                
                                # CRITICAL: Update the tenant ownership to current user
                                logger.info(f"🔧 [AUTH0_USER_CREATE] Updating tenant owner from {candidate_tenant.owner_id} to {user.pk}")
                                candidate_tenant.owner_id = user.pk
                                candidate_tenant.save(update_fields=['owner_id'])
                                
                                # Also update the user record to link Auth0 if needed
                                if not getattr(user, 'auth0_sub', None) and auth0_sub:
                                    logger.info(f"🔧 [AUTH0_USER_CREATE] Linking Auth0 sub to user: {auth0_sub}")
                                    user.auth0_sub = auth0_sub
                                    user.save(update_fields=['auth0_sub'])
                                
                                break
                                
                        # NEW: Also check for any completed onboarding progress by email
                        if not existing_tenant:
                            logger.info(f"🔍 [AUTH0_USER_CREATE] Checking for completed onboarding progress by email")
                            completed_progress = OnboardingProgress.objects.filter(
                                user__email=email,
                                onboarding_status='complete'
                            ).first()
                            
                            if completed_progress:
                                logger.info(f"✅ [AUTH0_USER_CREATE] Found completed onboarding! Using tenant: {completed_progress.tenant_id}")
                                existing_tenant = Tenant.objects.filter(id=completed_progress.tenant_id).first()
                                if existing_tenant:
                                    # Link this user to the existing completed setup
                                    completed_progress.user = user
                                    completed_progress.save(update_fields=['user'])
                                    existing_tenant.owner_id = user.pk
                                    existing_tenant.save(update_fields=['owner_id'])
                                    
                                    if not getattr(user, 'auth0_sub', None) and auth0_sub:
                                        user.auth0_sub = auth0_sub
                                        user.save(update_fields=['auth0_sub'])
                                
                        if not existing_tenant:
                            logger.info(f"❌ [AUTH0_USER_CREATE] No tenant found via email fallback either")
                    
                    if existing_tenant:
                        logger.info(f"✅ [AUTH0_USER_CREATE] Found existing tenant for user {user.email}: {existing_tenant.id}")
                        
                        # Get onboarding progress with detailed debugging
                        progress = OnboardingProgress.objects.filter(user=user).first()
                        
                        # If no progress linked to this user, check by tenant_id
                        if not progress:
                            progress = OnboardingProgress.objects.filter(tenant_id=existing_tenant.id).first()
                            if progress:
                                logger.info(f"🔧 [AUTH0_USER_CREATE] Linking existing progress to user")
                                progress.user = user
                                progress.save(update_fields=['user'])
                        
                        current_step = 'business_info'
                        needs_onboarding = True
                        onboarding_completed = False
                        
                        logger.info(f"🔍 [AUTH0_USER_CREATE] Raw onboarding progress for {user.email}: {progress}")
                        
                        if progress:
                            logger.info(f"🔍 [AUTH0_USER_CREATE] Onboarding progress details:")
                            logger.info(f"  - onboarding_status: '{progress.onboarding_status}'")
                            logger.info(f"  - current_step: '{progress.current_step}'")
                            logger.info(f"  - setup_completed: {progress.setup_completed}")
                            logger.info(f"  - completed_steps: {progress.completed_steps}")
                            logger.info(f"  - completed_at: {progress.completed_at}")
                            
                            current_step = progress.current_step or 'business_info'
                            needs_onboarding = progress.onboarding_status != 'complete'
                            onboarding_completed = progress.onboarding_status == 'complete'
                            
                            logger.info(f"🔍 [AUTH0_USER_CREATE] Computed values:")
                            logger.info(f"  - current_step: '{current_step}'")
                            logger.info(f"  - needs_onboarding: {needs_onboarding}")
                            logger.info(f"  - onboarding_completed: {onboarding_completed}")
                        else:
                            logger.warning(f"🚨 [AUTH0_USER_CREATE] No onboarding progress found for user {user.email} - will create one with 'complete' status")
                            # Create completed onboarding progress for existing user
                            OnboardingProgress.objects.create(
                                user=user,
                                tenant_id=existing_tenant.id,
                                onboarding_status='complete',
                                current_step='complete',
                                next_step='complete',
                                setup_completed=True,
                                completed_steps=['business_info', 'subscription', 'payment', 'setup'],
                                completed_at=timezone.now()
                            )
                            current_step = 'complete'
                            needs_onboarding = False
                            onboarding_completed = True
                            logger.info(f"✅ [AUTH0_USER_CREATE] Created completed onboarding progress")
                        
                        return Response({
                            'success': True,
                            'message': 'Existing user found',
                            'isExistingUser': True,
                            'user_id': user.pk,
                            'tenant_id': str(existing_tenant.id),
                            'email': user.email,
                            'needs_onboarding': needs_onboarding,
                            'onboardingCompleted': onboarding_completed,
                            'current_step': current_step
                        })
                except Exception as e:
                    logger.error(f"❌ [AUTH0_USER_CREATE] Error checking existing tenant: {str(e)}")
                
                # Create new tenant if none exists (FOR TRULY NEW USERS ONLY)
                if not existing_tenant:
                    # Use provided tenant_id or generate new one
                    new_tenant_id = tenant_id or str(uuid.uuid4())
                    
                    logger.info(f"🆕 [AUTH0_USER_CREATE] Creating new tenant for TRULY NEW user {user.email}: {new_tenant_id}")
                    
                    tenant = Tenant.objects.create(
                        id=new_tenant_id,
                        name=f"{name}'s Business" if name else f"{email}'s Business",
                        owner_id=user.pk,
                        created_at=timezone.now(),
                        updated_at=timezone.now(),
                        is_active=True
                    )
                    
                    # Create onboarding progress
                    OnboardingProgress.objects.create(
                        user=user,
                        tenant_id=tenant.id,
                        onboarding_status='business_info',
                        current_step='business_info',
                        next_step='business_info',
                        completed_steps=[]
                    )
                    
                    logger.info(f"✅ [AUTH0_USER_CREATE] Successfully created tenant {tenant.id} for user {user.email}")
                    
                    return Response({
                        'success': True,
                        'message': 'New user created successfully',
                        'isExistingUser': False,
                        'user_id': user.pk,
                        'tenant_id': str(tenant.id),
                        'email': user.email,
                        'needs_onboarding': True,
                        'onboardingCompleted': False,
                        'current_step': 'business_info'
                    })
                
        except Exception as e:
            logger.error(f"❌ [AUTH0_USER_CREATE] Error in Auth0 user creation: {str(e)}")
            logger.error(f"❌ [AUTH0_USER_CREATE] Traceback: {traceback.format_exc()}")
            
            # Fallback response to prevent blocking user flow
            fallback_tenant_id = tenant_id or str(uuid.uuid4())
            
            return Response({
                'success': False,
                'message': 'Backend error, using fallback',
                'isExistingUser': False,
                'user_id': getattr(user, 'pk', None),
                'tenant_id': fallback_tenant_id,
                'email': getattr(user, 'email', email),
                'needs_onboarding': True,
                'onboardingCompleted': False,
                'current_step': 'business_info',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            logger.info(f"Getting Auth0 user profile for: {user.email}")
            
            # Get user's tenant
            tenant = None
            user_role = 'owner'  # Default role
            
            try:
                # Check if user is owner of a tenant
                tenant = Tenant.objects.filter(owner_id=user.id).first()
                if tenant:
                    user_role = 'owner'
                else:
                    # Check if user is a member of any tenant
                    # This would require UserTenantRole model if implemented
                    pass
            except Exception as e:
                logger.warning(f"Error getting tenant for user {user.id}: {str(e)}")
            
            # Get onboarding progress
            onboarding_status = 'not_started'
            onboarding_data = {}
            
            try:
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress:
                    onboarding_status = progress.onboarding_status
                    onboarding_data = {
                        'business_info_completed': progress.onboarding_status not in ['not_started', 'business_info'],
                        'subscription_selected': progress.onboarding_status not in ['not_started', 'business_info', 'subscription'],
                        'payment_completed': progress.payment_completed,
                        'setup_completed': progress.setup_completed,
                        'current_step': progress.current_step,
                        'next_step': progress.next_step,
                    }
            except Exception as e:
                logger.warning(f"Error getting onboarding progress for user {user.id}: {str(e)}")
            
            # Build response
            profile_data = {
                'user': {
                    'id': user.id,
                    'auth0_id': getattr(user, 'auth0_sub', None),
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'picture': None,  # Auth0 profile picture could be added here
                },
                'tenant': None,
                'role': user_role,
                'onboarding': onboarding_data,
                'onboarding_status': onboarding_status,
                'setup_done': onboarding_status == 'complete'
            }
            
            # Add tenant data if exists
            if tenant:
                profile_data['tenant'] = {
                    'id': str(tenant.id),
                    'name': tenant.name,
                    'business_type': None,  # Add if BusinessDetails model exists
                    'subscription_plan': 'free',  # Default, update when subscription model exists
                    'subscription_status': 'active',
                    'onboarding_completed': onboarding_status == 'complete'
                }
            
            return Response({
                'success': True,
                'data': profile_data
            })
            
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
                tenant, created = Tenant.objects.get_or_create(
                    owner_id=user.id,
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
            
            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
                logger.info(f"🎯 [ONBOARDING_COMPLETE] Found existing progress:")
                logger.info(f"  - Current onboarding_status: '{progress.onboarding_status}'")
                logger.info(f"  - Current current_step: '{progress.current_step}'")
                logger.info(f"  - Current setup_completed: {progress.setup_completed}")
                logger.info(f"  - Current completed_steps: {progress.completed_steps}")
            except OnboardingProgress.DoesNotExist:
                logger.error(f"🚨 [ONBOARDING_COMPLETE] No onboarding progress found for user {user.email}")
                return Response({
                    'success': False,
                    'error': 'No onboarding progress found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark as complete
            logger.info(f"🎯 [ONBOARDING_COMPLETE] Updating progress to completed...")
            
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
            
            return Response({
                'success': True,
                'message': 'Onboarding completed successfully',
                'data': {
                    'onboarding_completed': True,
                    'redirect_url': '/dashboard'
                }
            })
            
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