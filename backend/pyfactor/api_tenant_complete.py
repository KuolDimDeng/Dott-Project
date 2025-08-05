"""
Consolidated Tenant Creation API for Django Backend

This endpoint handles the complete tenant creation process for the simplified Auth0-only approach.
It receives tenant data from the Next.js consolidated onboarding API and creates the tenant in the database.
"""

import uuid
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.db import transaction as db_transaction
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def complete_tenant_creation(request):
    """
    Complete tenant creation from consolidated onboarding data
    
    Expected payload:
    {
        "tenant_id": "uuid-string",
        "user_email": "user@example.com", 
        "auth0_sub": "auth0|123456",
        "business_name": "Company Name",
        "business_type": "Technology",
        "business_country": "United States",
        "business_state": "California", 
        "legal_structure": "LLC",
        "selected_plan": "free",
        "billing_cycle": "monthly",
        "owner_first_name": "John",
        "owner_last_name": "Doe",
        "phone_number": "(555) 123-4567",
        "address": "123 Main St",
        "onboarding_completed": true,
        "onboarding_completed_at": "2025-06-08T12:00:00Z"
    }
    """
    
    try:
        logger.info(f"[TenantComplete] Processing consolidated tenant creation request")
        
        # Parse request data
        try:
            data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"[TenantComplete] Invalid JSON data: {e}")
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        
        # Validate required fields
        required_fields = ['tenant_id', 'user_email', 'business_name', 'selected_plan']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            logger.error(f"[TenantComplete] Missing required fields: {missing_fields}")
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }, status=400)
        
        tenant_id = data['tenant_id']
        user_email = data['user_email']
        
        logger.info(f"[TenantComplete] Creating tenant for user: {user_email}, tenant_id: {tenant_id}")
        
        with db_transaction.atomic():
            # Import here to avoid circular imports
            from django.contrib.auth.models import User
            from custom_auth.models import TenantUser, BusinessProfile, SubscriptionPlan
            
            # Get or create user
            user, created = User.objects.get_or_create(
                email=user_email,
                defaults={
                    'username': user_email,
                    'first_name': data.get('owner_first_name', ''),
                    'last_name': data.get('owner_last_name', ''),
                    'is_active': True
                }
            )
            
            if created:
                logger.info(f"[TenantComplete] Created new user: {user_email}")
            else:
                logger.info(f"[TenantComplete] Using existing user: {user_email}")
            
            # Create or update TenantUser
            tenant_user, created = TenantUser.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant_id,
                    'auth0_sub': data.get('auth0_sub', ''),
                    'business_name': data['business_name'],
                    'subscription_plan': data['selected_plan'],
                    'billing_cycle': data.get('billing_cycle', 'monthly'),
                    'onboarding_completed': data.get('onboarding_completed', True),
                    'onboarding_completed_at': datetime.now(),
                    'needs_onboarding': False,
                    'current_onboarding_step': 'completed'
                }
            )
            
            if not created:
                # Update existing tenant user
                tenant_user.tenant_id = tenant_id
                tenant_user.business_name = data['business_name']
                tenant_user.subscription_plan = data['selected_plan']
                tenant_user.billing_cycle = data.get('billing_cycle', 'monthly')
                tenant_user.onboarding_completed = True
                tenant_user.onboarding_completed_at = datetime.now()
                tenant_user.needs_onboarding = False
                tenant_user.current_onboarding_step = 'completed'
                tenant_user.save()
                logger.info(f"[TenantComplete] Updated existing tenant user")
            else:
                logger.info(f"[TenantComplete] Created new tenant user")
            
            # Create or update BusinessProfile
            business_profile, created = BusinessProfile.objects.get_or_create(
                tenant_user=tenant_user,
                defaults={
                    'business_name': data['business_name'],
                    'business_type': data.get('business_type', ''),
                    'business_country': data.get('business_country', ''),
                    'business_state': data.get('business_state', ''),
                    'legal_structure': data.get('legal_structure', ''),
                    'phone_number': data.get('phone_number', ''),
                    'address': data.get('address', ''),
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
            )
            
            if not created:
                # Update existing business profile
                business_profile.business_name = data['business_name']
                business_profile.business_type = data.get('business_type', '')
                business_profile.business_country = data.get('business_country', '')
                business_profile.business_state = data.get('business_state', '')
                business_profile.legal_structure = data.get('legal_structure', '')
                business_profile.phone_number = data.get('phone_number', '')
                business_profile.address = data.get('address', '')
                business_profile.updated_at = datetime.now()
                business_profile.save()
                logger.info(f"[TenantComplete] Updated existing business profile")
            else:
                logger.info(f"[TenantComplete] Created new business profile")
            
            # Create subscription record if it's a paid plan
            if data['selected_plan'] != 'free':
                subscription, created = SubscriptionPlan.objects.get_or_create(
                    tenant_user=tenant_user,
                    defaults={
                        'plan_name': data['selected_plan'],
                        'billing_cycle': data.get('billing_cycle', 'monthly'),
                        'status': 'pending_payment',
                        'created_at': datetime.now()
                    }
                )
                
                if created:
                    logger.info(f"[TenantComplete] Created subscription plan: {data['selected_plan']}")
        
        # Success response
        response_data = {
            'success': True,
            'message': 'Tenant created successfully',
            'tenant_id': tenant_id,
            'user_id': user.id,
            'business_name': data['business_name'],
            'subscription_plan': data['selected_plan'],
            'onboarding_completed': True,
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"[TenantComplete] Successfully created tenant: {tenant_id}")
        return JsonResponse(response_data, status=201)
        
    except Exception as e:
        logger.error(f"[TenantComplete] Unexpected error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }, status=500)

# URL pattern for this endpoint:
# urlpatterns = [
#     path('api/onboarding/complete-tenant/', complete_tenant_creation, name='complete_tenant_creation'),
# ]