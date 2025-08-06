"""
Unified Profile View - Single endpoint for all user profile data
Consolidates data from User, Tenant, Subscription, and Business models
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from custom_auth.models import User, Tenant
from custom_auth.rls import set_tenant_context, clear_tenant_context

logger = logging.getLogger(__name__)


class UnifiedProfileView(APIView):
    """
    GET /api/auth/profile - Get complete user profile
    PATCH /api/auth/profile - Update user profile
    
    This is the single source of truth for user profile data,
    consolidating all profile-related endpoints.
    """
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get unified user profile with all related data"""
        try:
            user = request.user
            logger.info(f"[UnifiedProfile] Getting profile for user: {user.email}")
            
            # Set tenant context if user has a tenant
            tenant_id = None
            if hasattr(user, 'tenant_id') and user.tenant_id:
                tenant_id = str(user.tenant_id)
                set_tenant_context(tenant_id)
            elif hasattr(user, 'tenant') and user.tenant:
                tenant_id = str(user.tenant.id)
                set_tenant_context(tenant_id)
            
            try:
                # Build comprehensive profile response
                profile_data = {
                    # User basic info
                    'id': str(user.id),
                    'email': user.email,
                    'name': user.get_full_name() or user.email,
                    'given_name': user.given_name or '',
                    'family_name': user.family_name or '',
                    'picture': user.picture or None,
                    
                    # Authentication status
                    'authenticated': True,
                    'email_verified': user.email_verified,
                    'is_active': user.is_active,
                    
                    # Onboarding status - AUTHORITATIVE
                    'needs_onboarding': not user.onboarding_completed,
                    'needsOnboarding': not user.onboarding_completed,
                    'onboarding_completed': user.onboarding_completed,
                    'onboardingCompleted': user.onboarding_completed,
                    'onboarding_completed_at': user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None,
                    
                    # Subscription info
                    'subscription_plan': user.subscription_plan or 'free',
                    'subscriptionPlan': user.subscription_plan or 'free',
                    'subscription_status': user.subscription_status or 'active',
                    
                    # Dates
                    'created_at': user.date_joined.isoformat() if user.date_joined else None,
                    'updated_at': user.updated_at.isoformat() if hasattr(user, 'updated_at') and user.updated_at else None,
                }
                
                # Add tenant information if available
                if tenant_id:
                    try:
                        tenant = Tenant.objects.get(id=tenant_id)
                        profile_data.update({
                            'tenant_id': str(tenant.id),
                            'tenantId': str(tenant.id),
                            'tenant': {
                                'id': str(tenant.id),
                                'name': tenant.name,
                                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                            },
                            'business_name': tenant.name,
                            'businessName': tenant.name,
                        })
                    except Tenant.DoesNotExist:
                        logger.warning(f"[UnifiedProfile] Tenant not found for user {user.email}")
                        profile_data.update({
                            'tenant_id': None,
                            'tenantId': None,
                            'tenant': None,
                            'business_name': None,
                            'businessName': None,
                        })
                else:
                    profile_data.update({
                        'tenant_id': None,
                        'tenantId': None,
                        'tenant': None,
                        'business_name': None,
                        'businessName': None,
                    })
                
                # Add onboarding progress information
                if hasattr(user, 'onboardingprogress_set'):
                    progress = user.onboardingprogress_set.first()
                    if progress:
                        profile_data['onboarding_progress'] = {
                            'current_step': progress.current_step,
                            'completed_steps': progress.completed_steps,
                            'progress_percentage': progress.progress_percentage,
                        }
                
                logger.info(f"[UnifiedProfile] Successfully retrieved profile for {user.email}")
                return Response(profile_data, status=status.HTTP_200_OK)
                
            finally:
                # Always clear tenant context
                if tenant_id:
                    clear_tenant_context()
                    
        except Exception as e:
            logger.error(f"[UnifiedProfile] Error getting profile: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve profile', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request):
        """Update user profile fields"""
        try:
            user = request.user
            logger.info(f"[UnifiedProfile] Updating profile for user: {user.email}")
            
            # Set tenant context if user has a tenant
            tenant_id = None
            if hasattr(user, 'tenant_id') and user.tenant_id:
                tenant_id = str(user.tenant_id)
                set_tenant_context(tenant_id)
            elif hasattr(user, 'tenant') and user.tenant:
                tenant_id = str(user.tenant.id)
                set_tenant_context(tenant_id)
            
            try:
                with db_transaction.atomic():
                    # Update allowed user fields
                    allowed_fields = [
                        'given_name', 'family_name', 'picture',
                        'subscription_plan', 'onboarding_completed'
                    ]
                    
                    updated_fields = []
                    for field in allowed_fields:
                        if field in request.data:
                            setattr(user, field, request.data[field])
                            updated_fields.append(field)
                    
                    if updated_fields:
                        user.save(update_fields=updated_fields)
                        logger.info(f"[UnifiedProfile] Updated fields for {user.email}: {updated_fields}")
                    
                    # Update tenant name if provided
                    if 'business_name' in request.data and tenant_id:
                        try:
                            tenant = Tenant.objects.get(id=tenant_id)
                            tenant.name = request.data['business_name']
                            tenant.save(update_fields=['name'])
                            logger.info(f"[UnifiedProfile] Updated tenant name for {tenant_id}")
                        except Tenant.DoesNotExist:
                            logger.warning(f"[UnifiedProfile] Tenant not found for update: {tenant_id}")
                    
                    # Return updated profile
                    return self.get(request)
                    
            finally:
                # Always clear tenant context
                if tenant_id:
                    clear_tenant_context()
                    
        except Exception as e:
            logger.error(f"[UnifiedProfile] Error updating profile: {str(e)}")
            return Response(
                {'error': 'Failed to update profile', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )