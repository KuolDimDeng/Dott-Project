"""
Auth0 Integration Views
Handles user creation, tenant management, and account operations with proper isolation
"""

import uuid
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist
import logging

from .models import Tenant, User as CustomUser
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)
User = get_user_model()

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_by_auth0_sub(request, auth0_sub):
    """
    Get user by Auth0 subject identifier
    Ensures proper tenant isolation
    """
    try:
        logger.info(f"[Auth0Views] Looking up user by sub: {auth0_sub}")
        
        # Get user from request (authenticated via JWT)
        auth_user = request.user
        
        # Find user by auth0_sub
        try:
            user = User.objects.get(auth0_sub=auth0_sub)
        except User.DoesNotExist:
            logger.info(f"[Auth0Views] User not found for sub: {auth0_sub}")
            return JsonResponse({
                'error': 'User not found'
            }, status=404)
        
        # Verify the authenticated user matches the requested user
        if auth_user.email != user.email:
            logger.warning(f"[Auth0Views] User mismatch: auth={auth_user.email}, requested={user.email}")
            return JsonResponse({
                'error': 'Unauthorized'
            }, status=403)
        
        # Get tenant information
        tenant_id = None
        tenant_name = None
        
        if user.tenant:
            tenant_id = str(user.tenant.id)
            tenant_name = user.tenant.name
        else:
            # Check if user has tenant via TenantUser model
            try:
                from custom_auth.models import TenantUser
                tenant_user = TenantUser.objects.get(user=user)
                tenant_id = str(tenant_user.tenant_id)
                tenant_name = tenant_user.business_name
            except:
                pass
        
        # Get onboarding status
        needs_onboarding = True
        onboarding_completed = False
        current_step = 'business_info'
        
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            needs_onboarding = not onboarding.is_complete
            onboarding_completed = onboarding.is_complete
            current_step = onboarding.current_step or 'business_info'
        except OnboardingProgress.DoesNotExist:
            pass
        
        response_data = {
            'id': user.id,
            'email': user.email,
            'auth0_sub': user.auth0_sub,
            'name': user.name or f"{user.first_name} {user.last_name}".strip(),
            'tenant_id': tenant_id,
            'tenant_name': tenant_name,
            'role': getattr(user, 'role', 'owner'),
            'needs_onboarding': needs_onboarding,
            'onboarding_completed': onboarding_completed,
            'current_step': current_step,
            'email_verified': user.email_verified,
            'created_at': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None
        }
        
        logger.info(f"[Auth0Views] User found: {user.email}, tenant: {tenant_id}")
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error getting user: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_auth0_user(request):
    """
    Create or update user from Auth0 data
    CRITICAL: Ensures each user gets a unique tenant ID
    """
    try:
        data = request.data
        logger.info(f"[Auth0Views] Creating/updating user: {data.get('email')}")
        
        # Check for idempotency key
        idempotency_key = request.headers.get('X-Idempotency-Key')
        if idempotency_key:
            logger.info(f"[Auth0Views] Request has idempotency key: {idempotency_key}")
        
        # Validate required fields
        required_fields = ['auth0_sub', 'email']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'error': f'Missing required field: {field}'
                }, status=400)
        
        auth0_sub = data['auth0_sub']
        email = data['email']
        
        with transaction.atomic():
            # CRITICAL: Check for deleted accounts first
            deleted_user = User.objects.filter(email=email, is_deleted=True).first()
            if deleted_user:
                days_since_deletion = 0
                if hasattr(deleted_user, 'deleted_at') and deleted_user.deleted_at:
                    from django.utils import timezone
                    days_since_deletion = (timezone.now() - deleted_user.deleted_at).days
                
                if days_since_deletion <= 30:
                    logger.error(f"[Auth0Views] Blocked attempt to recreate deleted account: {email}")
                    return JsonResponse({
                        'error': 'This account has been closed',
                        'message': f'This account was closed {days_since_deletion} days ago. Contact support to reactivate.',
                        'account_closed': True,
                        'in_grace_period': True,
                        'days_remaining': 30 - days_since_deletion
                    }, status=403)
                else:
                    logger.error(f"[Auth0Views] Blocked permanently deleted account: {email}")
                    return JsonResponse({
                        'error': 'This email was previously used',
                        'message': 'This email is associated with a permanently deleted account.',
                        'account_closed': True,
                        'permanently_deleted': True
                    }, status=403)
            
            # Check if user already exists
            user = None
            created = False
            
            try:
                # Try to find by auth0_sub first
                user = User.objects.get(auth0_sub=auth0_sub)
                logger.info(f"[Auth0Views] Found existing user by auth0_sub: {email}")
                
                # If user exists and we have an idempotency key, return success
                if idempotency_key:
                    logger.info(f"[Auth0Views] Idempotent request - returning existing user")
            except User.DoesNotExist:
                # Try to find by email
                try:
                    user = User.objects.get(email=email)
                    # Update auth0_sub if missing
                    if not user.auth0_sub:
                        user.auth0_sub = auth0_sub
                        user.save()
                    logger.info(f"[Auth0Views] Found existing user by email: {email}")
                except User.DoesNotExist:
                    # Create new user
                    user = User.objects.create(
                        email=email,
                        username=email,  # Use email as username
                        auth0_sub=auth0_sub,
                        name=data.get('name', ''),
                        first_name=data.get('given_name', ''),
                        last_name=data.get('family_name', ''),
                        picture=data.get('picture', ''),
                        email_verified=data.get('email_verified', False),
                        is_active=True
                    )
                    created = True
                    logger.info(f"[Auth0Views] Created new user: {email}")
            
            # Handle tenant assignment
            tenant_id = data.get('tenant_id')
            
            if created or not user.tenant:
                # New user or user without tenant
                if not tenant_id:
                    # Generate new tenant ID
                    tenant_id = str(uuid.uuid4())
                    logger.info(f"[Auth0Views] Generated new tenant ID: {tenant_id}")
                
                # Create or get tenant
                tenant, tenant_created = Tenant.objects.get_or_create(
                    id=tenant_id,
                    defaults={
                        'name': f"{email}'s Organization",
                        'owner_id': auth0_sub,
                        'created_at': datetime.now(),
                        'rls_enabled': True,
                        'is_active': True
                    }
                )
                
                if tenant_created:
                    logger.info(f"[Auth0Views] Created new tenant: {tenant_id}")
                else:
                    # Verify tenant ownership
                    if tenant.owner_id != auth0_sub:
                        logger.error(f"[Auth0Views] CRITICAL: Tenant ownership mismatch!")
                        # Create a new tenant for this user
                        tenant_id = str(uuid.uuid4())
                        tenant = Tenant.objects.create(
                            id=tenant_id,
                            name=f"{email}'s Organization",
                            owner_id=auth0_sub,
                            created_at=datetime.now(),
                            rls_enabled=True,
                            is_active=True
                        )
                        logger.info(f"[Auth0Views] Created new tenant due to ownership mismatch: {tenant_id}")
                
                # Assign tenant to user
                user.tenant = tenant
                user.save()
            else:
                # Existing user with tenant
                tenant = user.tenant
                tenant_id = str(tenant.id)
                
                # Verify tenant ownership
                if tenant.owner_id != auth0_sub:
                    logger.error(f"[Auth0Views] CRITICAL: User has tenant with wrong owner!")
                    # This should not happen - log for investigation
            
            # Create or update OnboardingProgress
            onboarding, _ = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant_id,
                    'current_step': 'business_info',
                    'is_complete': False
                }
            )
            
            # Update role if provided
            if data.get('role'):
                user.role = data['role']
                user.save()
            
            response_data = {
                'id': user.id,
                'email': user.email,
                'auth0_sub': user.auth0_sub,
                'name': user.name,
                'tenant_id': str(tenant_id),
                'role': user.role,
                'needs_onboarding': not onboarding.is_complete,
                'onboarding_completed': onboarding.is_complete,
                'current_step': onboarding.current_step,
                'is_new_user': created,
                'created_at': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None
            }
            
            logger.info(f"[Auth0Views] User sync complete: {email}, tenant: {tenant_id}")
            return JsonResponse(response_data, status=201 if created else 200)
            
    except Exception as e:
        logger.error(f"[Auth0Views] Error creating user: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_tenant_owner(request, tenant_id):
    """
    Verify that a tenant belongs to the specified user
    Critical for preventing tenant ID sharing
    """
    try:
        data = request.data
        auth0_sub = data.get('auth0_sub')
        email = data.get('email')
        
        if not auth0_sub or not email:
            return JsonResponse({
                'error': 'Missing required fields'
            }, status=400)
        
        logger.info(f"[Auth0Views] Verifying tenant ownership: {tenant_id} for {email}")
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            logger.error(f"[Auth0Views] Tenant not found: {tenant_id}")
            return JsonResponse({
                'error': 'Tenant not found'
            }, status=404)
        
        # Check ownership
        is_owner = tenant.owner_id == auth0_sub
        
        # Also check if user exists and has this tenant
        try:
            user = User.objects.get(auth0_sub=auth0_sub)
            has_tenant = user.tenant_id == tenant.id if hasattr(user, 'tenant') else False
        except User.DoesNotExist:
            has_tenant = False
        
        if not is_owner or not has_tenant:
            logger.error(f"[Auth0Views] Tenant ownership verification failed!")
            return JsonResponse({
                'verified': False,
                'error': 'Tenant does not belong to this user'
            }, status=403)
        
        return JsonResponse({
            'verified': True,
            'tenant_id': str(tenant_id),
            'owner_id': tenant.owner_id,
            'email': email
        })
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error verifying tenant: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_onboarding_status(request):
    """
    Get user's onboarding status
    """
    try:
        user = request.user
        logger.info(f"[Auth0Views] Getting onboarding status for: {user.email}")
        
        # Get onboarding progress
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            needs_onboarding = not onboarding.is_complete
            onboarding_completed = onboarding.is_complete
            current_step = onboarding.current_step or 'business_info'
        except OnboardingProgress.DoesNotExist:
            needs_onboarding = True
            onboarding_completed = False
            current_step = 'business_info'
        
        # Get tenant info
        tenant_id = None
        if hasattr(user, 'tenant') and user.tenant:
            tenant_id = str(user.tenant.id)
        
        return JsonResponse({
            'needs_onboarding': needs_onboarding,
            'onboarding_completed': onboarding_completed,
            'current_step': current_step,
            'tenant_id': tenant_id,
            'email': user.email
        })
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error getting onboarding status: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_onboarding(request):
    """
    Mark onboarding as complete
    """
    try:
        user = request.user
        data = request.data
        
        logger.info(f"[Auth0Views] Completing onboarding for: {user.email}")
        
        # Update onboarding progress
        onboarding, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'tenant_id': str(user.tenant.id) if user.tenant else None
            }
        )
        
        onboarding.is_complete = True
        onboarding.completed_at = datetime.now()
        onboarding.current_step = 'complete'
        onboarding.save()
        
        # Update user's tenant name if provided
        if user.tenant and data.get('business_name'):
            user.tenant.name = data['business_name']
            user.tenant.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Onboarding completed',
            'tenant_id': str(user.tenant.id) if user.tenant else None,
            'completed_at': onboarding.completed_at.isoformat()
        })
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error completing onboarding: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_user_account(request):
    """
    Close user account - soft delete with audit trail
    """
    try:
        user = request.user
        data = request.data
        
        logger.info(f"[Auth0Views] Account closure requested for: {user.email}")
        
        reason = data.get('reason', 'User requested')
        feedback = data.get('feedback', '')
        
        with transaction.atomic():
            # Create deletion log
            from custom_auth.models import AccountDeletionLog
            
            deletion_log = AccountDeletionLog.objects.create(
                user_email=user.email,
                user_id=user.id,
                tenant_id=user.tenant.id if user.tenant else None,
                auth0_sub=user.auth0_sub,
                deletion_reason=reason,
                deletion_feedback=feedback,
                deletion_initiated_by='user',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Soft delete user
            user.is_deleted = True
            user.is_active = False
            user.deleted_at = datetime.now()
            user.deletion_reason = reason
            user.deletion_feedback = feedback
            user.deletion_initiated_by = 'user'
            user.save()
            
            # Update Auth0 to block user
            try:
                from .auth0_service import update_auth0_user_metadata
                metadata_updated = update_auth0_user_metadata(
                    user.auth0_sub,
                    {
                        'account_deleted': True,
                        'deleted_at': deletion_log.deleted_at.isoformat(),
                        'deletion_reason': reason
                    }
                )
                if metadata_updated:
                    logger.info(f"[Auth0Views] Updated Auth0 metadata for deleted user: {user.email}")
                else:
                    logger.error(f"[Auth0Views] Failed to update Auth0 metadata for: {user.email}")
            except Exception as e:
                logger.error(f"[Auth0Views] Error updating Auth0: {str(e)}")
                # Continue with deletion even if Auth0 update fails
            
            # Deactivate tenant if user is owner
            if user.tenant and user.tenant.owner_id == user.auth0_sub:
                user.tenant.is_active = False
                user.tenant.deactivated_at = datetime.now()
                user.tenant.save()
                deletion_log.tenant_deleted = True
                deletion_log.save()
            
            logger.info(f"[Auth0Views] Account closed successfully: {user.email}")
            
            return JsonResponse({
                'success': True,
                'message': 'Account closed successfully',
                'deletion_id': str(deletion_log.id)
            })
            
    except Exception as e:
        logger.error(f"[Auth0Views] Error closing account: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def check_onboarding_status(request):
    """
    Lightweight endpoint to check if user has completed onboarding.
    Used by frontend middleware to enforce onboarding.
    """
    logger.info("[Auth0Views] Check onboarding status called")
    
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse({
                "error": "Missing or invalid authorization header"
            }, status=401)
        
        token = auth_header.split(" ")[1]
        
        # Verify token and get user info
        payload = verify_auth0_token(token)
        if not payload:
            return JsonResponse({
                "error": "Invalid or expired token"
            }, status=401)
        
        auth0_sub = payload.get("sub")
        if not auth0_sub:
            return JsonResponse({
                "error": "Invalid token: missing sub"
            }, status=401)
        
        # Get user
        try:
            user = User.objects.get(auth0_sub=auth0_sub, is_active=True, is_deleted=False)
        except User.DoesNotExist:
            # User doesn't exist yet, definitely needs onboarding
            return JsonResponse({
                "onboarding_completed": False,
                "tenant_id": None,
                "user_id": None,
                "auth0_sub": auth0_sub,
            })
        
        # Check OnboardingProgress
        onboarding_completed = False
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            onboarding_completed = onboarding.is_complete
        except OnboardingProgress.DoesNotExist:
            # No onboarding record = not completed
            onboarding_completed = False
        
        # Get tenant ID
        tenant_id = None
        if user.tenant:
            tenant_id = str(user.tenant.id)
        
        return JsonResponse({
            "onboarding_completed": onboarding_completed,
            "tenant_id": tenant_id,
            "user_id": str(user.id),
            "auth0_sub": auth0_sub,
        })
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error checking onboarding status: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Failed to check onboarding status",
            "message": str(e)
        }, status=500)
