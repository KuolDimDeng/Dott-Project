"""
Diagnostic API Views for debugging user/tenant issues
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.utils import timezone
from django.db import transaction as db_transaction

logger = logging.getLogger(__name__)
User = get_user_model()

class DiagnosticView(APIView):
    """
    Simple diagnostic endpoint to check database state
    Endpoint: GET /api/diagnostic/
    """
    permission_classes = [AllowAny]  # Temporary for debugging
    
    def get(self, request):
        try:
            target_email = "jubacargovillage@gmail.com"
            target_tenant_id = "0e781e5d-139e-4036-9982-0469e8bcb9d2"
            
            # Basic counts
            total_users = User.objects.count()
            total_tenants = Tenant.objects.count()
            total_onboarding = OnboardingProgress.objects.count()
            
            # Look for users with target email
            users_with_email = User.objects.filter(email=target_email)
            user_data = []
            
            for user in users_with_email:
                tenant = Tenant.objects.filter(owner_id=user.pk).first()
                onboarding = OnboardingProgress.objects.filter(user=user).first()
                
                user_data.append({
                    'user_id': user.pk,
                    'email': user.email,
                    'auth0_sub': getattr(user, 'auth0_sub', None),
                    'tenant_id': str(tenant.id) if tenant else None,
                    'tenant_name': tenant.name if tenant else None,
                    'onboarding_status': onboarding.onboarding_status if onboarding else None,
                    'onboarding_completed': onboarding.onboarding_status == 'complete' if onboarding else False
                })
            
            # Look for specific tenant
            target_tenant_data = None
            try:
                target_tenant = Tenant.objects.get(id=target_tenant_id)
                try:
                    owner = User.objects.get(pk=target_tenant.owner_id)
                    target_tenant_data = {
                        'tenant_id': str(target_tenant.id),
                        'tenant_name': target_tenant.name,
                        'owner_id': target_tenant.owner_id,
                        'owner_email': owner.email,
                        'owner_auth0_sub': getattr(owner, 'auth0_sub', None)
                    }
                except User.DoesNotExist:
                    target_tenant_data = {
                        'tenant_id': str(target_tenant.id),
                        'tenant_name': target_tenant.name,
                        'owner_id': target_tenant.owner_id,
                        'owner_email': 'USER_NOT_FOUND',
                        'owner_auth0_sub': None
                    }
            except Tenant.DoesNotExist:
                target_tenant_data = None
            
            return Response({
                'success': True,
                'database_stats': {
                    'total_users': total_users,
                    'total_tenants': total_tenants,
                    'total_onboarding': total_onboarding
                },
                'target_email_search': {
                    'email': target_email,
                    'users_found': len(user_data),
                    'users': user_data
                },
                'target_tenant_search': {
                    'tenant_id': target_tenant_id,
                    'found': target_tenant_data is not None,
                    'data': target_tenant_data
                }
            })
            
        except Exception as e:
            logger.error(f"Diagnostic error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RestoreAccountView(APIView):
    """
    Restore the missing user account data
    Endpoint: POST /api/diagnostic/restore/
    """
    permission_classes = [AllowAny]  # Temporary for debugging
    
    def post(self, request):
        try:
            # Target data
            email = "jubacargovillage@gmail.com"
            original_tenant_id = "0e781e5d-139e-4036-9982-0469e8bcb9d2"
            auth0_sub = "google-oauth2|107454913649768153331"
            
            logger.info(f"🔧 Starting account restoration for {email}")
            
            with db_transaction.atomic():
                # Find or create the user
                user, user_created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': 'Kuol',
                        'last_name': 'Deng',
                        'is_active': True,
                    }
                )
                
                # Update Auth0 sub if missing
                if not getattr(user, 'auth0_sub', None):
                    setattr(user, 'auth0_sub', auth0_sub)
                    user.save()
                
                # Check if target tenant exists
                existing_tenant = Tenant.objects.filter(id=original_tenant_id).first()
                
                if existing_tenant:
                    # Update ownership to current user if different
                    if existing_tenant.owner_id != user.pk:
                        existing_tenant.owner_id = user.pk
                        existing_tenant.save(update_fields=['owner_id'])
                    tenant = existing_tenant
                else:
                    # Create the tenant with original ID
                    tenant = Tenant.objects.create(
                        id=original_tenant_id,
                        name="Kuol's Business",
                        owner_id=user.pk,
                        created_at=timezone.now(),
                        updated_at=timezone.now(),
                        is_active=True
                    )
                
                # Create or update onboarding progress as complete
                progress, progress_created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'tenant_id': tenant.id,
                        'onboarding_status': 'complete',
                        'current_step': 'complete',
                        'next_step': 'complete',
                        'setup_completed': True,
                        'payment_completed': True,
                        'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete'],
                        'completed_at': timezone.now(),
                        'selected_plan': 'free',
                        'subscription_plan': 'free',
                    }
                )
                
                if not progress_created and progress.onboarding_status != 'complete':
                    # Update to complete if not already
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.next_step = 'complete'
                    progress.setup_completed = True
                    progress.payment_completed = True
                    progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                    progress.completed_at = timezone.now()
                    progress.selected_plan = 'free'
                    progress.subscription_plan = 'free'
                    progress.save()
                
                logger.info(f"✅ Account restoration complete for {email}")
                
                return Response({
                    'success': True,
                    'message': 'Account restored successfully',
                    'data': {
                        'user_id': user.pk,
                        'email': user.email,
                        'auth0_sub': getattr(user, 'auth0_sub', None),
                        'tenant_id': str(tenant.id),
                        'onboarding_status': progress.onboarding_status,
                        'user_created': user_created,
                        'progress_created': progress_created
                    }
                })
                
        except Exception as e:
            logger.error(f"❌ Error restoring account: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 