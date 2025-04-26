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
from ..authentication import CognitoAuthentication
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
    authentication_classes = [CognitoAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handle user signup after Cognito confirmation
        """
        logger.debug("Received signup request: %s", request.data)
        try:
            # Validate required fields
            email = request.data.get('email')
            cognito_id = request.data.get('cognitoId')
            user_role = request.data.get('userRole', 'owner')
            business_id = request.data.get('businessId') or request.data.get('custom:businessid')

            if not email or not cognito_id:
                logger.error("Missing required fields in signup request")
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # First check if a user with this email already exists and has a tenant
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                logger.info(f"[SIGNUP] User {email} already exists, checking for existing tenant")
                
                # Check for user's linked tenant via ForeignKey relationship
                tenant = existing_user.tenant
                
                if tenant:
                    # Update user Cognito ID if needed
                    if existing_user.cognito_sub != cognito_id:
                        existing_user.cognito_sub = cognito_id
                        existing_user.save(update_fields=['cognito_sub'])
                        logger.info(f"[SIGNUP] Updated Cognito ID for existing user {email}")
                    
                    response_data = {
                        "status": "success",
                        "message": "User already exists and has a tenant",
                        "userId": str(existing_user.id),
                        "email": existing_user.email,
                        "isOnboarded": getattr(existing_user, 'is_onboarded', False),
                        "tenantId": str(tenant.id)
                    }
                    logger.info(f"[SIGNUP] Returning existing user and tenant info for {email}")
                    return Response(response_data)

            with transaction.atomic():
                # Create or update user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'cognito_sub': cognito_id,
                        'is_active': True
                    }
                )

                if not created:
                    # Update existing user
                    user.cognito_sub = cognito_id
                    user.is_active = True
                    user.save(update_fields=['cognito_sub', 'is_active'])

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
                            logger.warning(f"[SIGNUP] Invalid business ID format: {business_id}, will generate new tenant ID")
                    
                    # Use tenant management service to create or get tenant
                    tenant, created = TenantManagementService.create_tenant(
                        user_id=user.id,
                        business_name=business_name,
                        tenant_id=tenant_id
                    )
                    
                    # Update user's tenant relationship
                    user.tenant = tenant
                    user.save(update_fields=['tenant'])
                    
                    logger.info(f"[SIGNUP] {'Created' if created else 'Using existing'} tenant {tenant.id} for user {email}")
                    
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
            logger.exception(f"Error in signup process: {str(e)}")
            return Response(
                {"error": f"Signup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )