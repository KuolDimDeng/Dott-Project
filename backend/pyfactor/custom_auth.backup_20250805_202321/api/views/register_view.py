"""
Email/Password Registration View
Handles user registration with email and password
"""
import logging
import uuid
from django.db import transaction as db_transaction
from django.contrib.auth.hashers import make_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)
User = get_user_model()


class EmailPasswordRegisterView(APIView):
    """
    Handle email/password user registration
    Endpoint: POST /api/auth/register
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Register a new user with email and password
        """
        try:
            # Extract data
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            first_name = request.data.get('firstName', '') or request.data.get('first_name', '')
            last_name = request.data.get('lastName', '') or request.data.get('last_name', '')
            
            # Validation
            if not email:
                return Response({
                    'error': 'Email is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not password:
                return Response({
                    'error': 'Password is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(password) < 8:
                return Response({
                    'error': 'Password must be at least 8 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user exists
            if User.objects.filter(email=email).exists():
                return Response({
                    'error': 'User with this email already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with db_transaction.atomic():
                # Create user
                user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=make_password(password),
                    is_active=True,
                )
                
                # Set name field if it exists
                if hasattr(user, 'name'):
                    full_name = f"{first_name} {last_name}".strip()
                    if full_name:
                        user.name = full_name
                        user.save(update_fields=['name'])
                
                # Set onboarding_completed to False for new users
                if hasattr(user, 'onboarding_completed'):
                    user.onboarding_completed = False
                    user.save(update_fields=['onboarding_completed'])
                
                # Create tenant for the user
                tenant_name = f"{first_name} {last_name}".strip() if (first_name or last_name) else "My Business"
                tenant = Tenant.objects.create(
                    name=tenant_name,
                    owner_id=str(user.id)
                )
                
                # Link user to tenant
                if hasattr(user, 'tenant'):
                    user.tenant = tenant
                    user.save(update_fields=['tenant'])
                
                # Create onboarding progress
                OnboardingProgress.objects.create(
                    user=user,
                    tenant_id=tenant.id,
                    onboarding_status='business_info',
                    current_step='business_info',
                    next_step='business_info',
                    completed_steps=[],
                    setup_completed=False,
                    payment_completed=False
                )
                
                logger.info(f"[EmailPasswordRegister] Created new user {user.id} with email {email}")
                
                return Response({
                    'success': True,
                    'message': 'User registered successfully',
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'firstName': user.first_name,
                        'lastName': user.last_name,
                        'tenantId': str(tenant.id)
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"[EmailPasswordRegister] Registration error: {str(e)}")
            return Response({
                'error': 'Registration failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)