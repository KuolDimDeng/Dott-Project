import logging
import uuid
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from custom_auth.models import User, Tenant
from custom_auth.tenant_service import TenantManagementService
from django.contrib.auth import get_user_model
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from users.serializers import UserProfileSerializer as UserSerializer
from django.utils import timezone
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from django.core.exceptions import ValidationError
from pyfactor.logging_config import get_logger

logger = logging.getLogger(__name__)
User = get_user_model()

def ensure_single_tenant_per_business(user, business_id):
    """
    Ensures each business has one and only one tenant.
    Returns (tenant, should_create_new) tuple.
    """
    # SAFETY: If no business ID provided, treat as new business needing tenant
    if not business_id:
        logger.info(f"[SIGNUP] No business ID provided for user {user.email}, will create new tenant")
        return None, True
        
    # Check if the business already has a tenant
    existing_tenant = Tenant.objects.filter(id=business_id).first()
    
    if existing_tenant:
        logger.info(f"[SIGNUP] Found existing tenant {existing_tenant.id} for business {business_id}")
        return existing_tenant, False
        
    # No existing tenant for this business ID - create a new one
    logger.info(f"[SIGNUP] No tenant found for business {business_id}, will create new tenant")
    return None, True

class SignupView(APIView):
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handle user signup with Auth0 authentication
        """
        logger.debug("Received Auth0 signup request: %s", request.data)
        try:
            # Validate required fields
            email = request.data.get('email')
            auth0_sub = request.data.get('auth0_sub') or request.data.get('sub')
            user_role = request.data.get('userRole', 'owner')
            business_id = request.data.get('businessId') or request.data.get('custom:businessid')

            if not email:
                logger.error("Missing required email field in signup request")
                return Response(
                    {"error": "Email is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # First check if a user with this email already exists and has a tenant
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                logger.info(f"[AUTH0-SIGNUP] User {email} already exists, checking for existing tenant")
                
                # Check for user's linked tenant via the tenant service
                if hasattr(existing_user, 'tenant') and existing_user.tenant:
                    tenant = existing_user.tenant
                    
                    # Update user Auth0 sub if needed
                    if hasattr(existing_user, 'auth0_sub') and existing_user.auth0_sub != auth0_sub:
                        existing_user.auth0_sub = auth0_sub
                        existing_user.save(update_fields=['auth0_sub'])
                        logger.info(f"[AUTH0-SIGNUP] Updated Auth0 sub for existing user {email}")
                    
                    response_data = {
                        "status": "success",
                        "message": "User already exists and has a tenant",
                        "userId": str(existing_user.id),
                        "email": existing_user.email,
                        "isOnboarded": getattr(existing_user, 'is_onboarded', False),
                        "tenantId": str(tenant.id)
                    }
                    logger.info(f"[AUTH0-SIGNUP] Returning existing user and tenant info for {email}")
                    return Response(response_data)

            with transaction.atomic():
                # Create or update user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'is_active': True
                    }
                )

                if not created:
                    # Update existing user
                    user.is_active = True
                    update_fields = ['is_active']
                    
                    # Update Auth0 sub if the field exists
                    if hasattr(user, 'auth0_sub') and auth0_sub:
                        user.auth0_sub = auth0_sub
                        update_fields.append('auth0_sub')
                        
                    user.save(update_fields=update_fields)

                # Extract business information
                business_name = request.data.get('business_name') or request.data.get('businessName')
                
                # Create or get tenant using our tenant management service
                if user_role == 'owner':
                    # Convert business_id to UUID if provided
                    tenant_id = None
                    if business_id:
                        try:
                            tenant_id = uuid.UUID(business_id)
                        except (ValueError, TypeError):
                            logger.warning(f"[AUTH0-SIGNUP] Invalid business ID format: {business_id}, will generate new tenant ID")
                    
                    # Use tenant management service to create or get tenant
                    tenant, tenant_created = TenantManagementService.create_tenant(
                        user_id=user.id,
                        business_name=business_name,
                        tenant_id=tenant_id
                    )
                    
                    # Update user's tenant relationship if the field exists
                    if hasattr(user, 'tenant'):
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                    
                    logger.info(f"[AUTH0-SIGNUP] {'Created' if tenant_created else 'Using existing'} tenant {tenant.id} for user {email}")
                    
                    response_data = {
                        "status": "success",
                        "message": f"User {'created' if created else 'updated'} successfully",
                        "userId": str(user.id),
                        "email": user.email,
                        "tenantId": str(tenant.id),
                        "isNew": created
                    }
                else:
                    # Non-owner users don't create tenants and must be invited to existing ones
                    response_data = {
                        "status": "success",
                        "message": f"Non-owner user {'created' if created else 'updated'} successfully",
                        "userId": str(user.id),
                        "email": user.email,
                        "tenantId": None,
                        "isNew": created
                    }
                
                return Response(response_data)
        except Exception as e:
            logger.exception(f"Error in Auth0 signup process: {str(e)}")
            return Response(
                {"error": f"Signup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )