import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import get_object_or_404
from custom_auth.models import Tenant
from django.utils import timezone
from django.db import IntegrityError, transaction as db_transaction
import uuid
import json
import traceback

logger = logging.getLogger('Pyfactor')
User = get_user_model()

class VerifyCredentialsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = get_object_or_404(User, email=email)
            if check_password(password, user.password):
                return Response({'success': True})
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

class SignUpView(APIView):
    """
    Handle OAuth user creation when they sign up via Google/external providers.
    This endpoint is called by the Lambda post-confirmation trigger.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            request_id = str(uuid.uuid4())
            logger.info(f"[SignUp:{request_id}] New user signup request")
            
            # Extract user data from request
            email = request.data.get('email')
            cognito_id = request.data.get('cognitoId')
            first_name = request.data.get('firstName', '')
            last_name = request.data.get('lastName', '')
            user_role = request.data.get('userRole', 'owner')
            is_verified = request.data.get('is_already_verified', True)
            
            logger.info(f"[SignUp:{request_id}] Processing signup for email: {email}, cognitoId: {cognito_id}")
            
            if not email or not cognito_id:
                logger.error(f"[SignUp:{request_id}] Missing required fields")
                return Response({
                    'success': False,
                    'error': 'Email and Cognito ID are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with db_transaction.atomic():
                # Check if user already exists
                existing_user = User.objects.filter(email=email).first()
                if existing_user:
                    logger.info(f"[SignUp:{request_id}] User already exists, updating cognito_id")
                    # Update cognito_id if needed
                    if hasattr(existing_user, 'cognito_id') and existing_user.cognito_id != cognito_id:
                        existing_user.cognito_id = cognito_id
                        existing_user.save(update_fields=['cognito_id'])
                    
                    return Response({
                        'success': True,
                        'message': 'User already exists',
                        'user_id': str(existing_user.id),
                        'onboarding_status': getattr(existing_user, 'onboarding_status', 'not_started')
                    })
                
                # Create new user
                user_data = {
                    'email': email,
                    'username': email,  # Use email as username
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_active': True,
                    'date_joined': timezone.now()
                }
                
                # Add fields that might exist on the User model
                if hasattr(User, 'cognito_id'):
                    user_data['cognito_id'] = cognito_id
                if hasattr(User, 'is_verified'):
                    user_data['is_verified'] = is_verified
                if hasattr(User, 'user_role'):
                    user_data['user_role'] = user_role
                if hasattr(User, 'onboarding_status'):
                    user_data['onboarding_status'] = 'not_started'
                
                # Generate a random password for OAuth users (they won't use it)
                user_data['password'] = make_password(str(uuid.uuid4()))
                
                user = User.objects.create(**user_data)
                logger.info(f"[SignUp:{request_id}] Created user {user.id} for email {email}")
                
                return Response({
                    'success': True,
                    'message': 'User created successfully',
                    'user_id': str(user.id),
                    'onboarding_status': getattr(user, 'onboarding_status', 'not_started')
                })
                
        except IntegrityError as e:
            logger.error(f"[SignUp:{request_id}] IntegrityError: {str(e)}")
            # Try to get the existing user
            try:
                existing_user = User.objects.get(email=email)
                return Response({
                    'success': True,
                    'message': 'User already exists',
                    'user_id': str(existing_user.id),
                    'onboarding_status': getattr(existing_user, 'onboarding_status', 'not_started')
                })
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Database integrity error',
                    'detail': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"[SignUp:{request_id}] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    """
    Get user profile information for authenticated users.
    This endpoint is called by the frontend after OAuth login.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Getting profile for user {user.id}")
            
            # Get user's tenant if exists
            tenant = None
            tenant_id = None
            try:
                tenant = Tenant.objects.filter(owner_id=user.id).first()
                if tenant:
                    tenant_id = str(tenant.id)
                    logger.info(f"[UserProfile:{request_id}] Found tenant {tenant_id} for user {user.id}")
            except Exception as e:
                logger.warning(f"[UserProfile:{request_id}] Error getting tenant: {str(e)}")
            
            # Build profile response
            profile_data = {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'tenant_id': tenant_id,
                'tenantId': tenant_id,  # Alternative naming for frontend compatibility
            }
            
            # Add optional fields if they exist on the user model
            optional_fields = [
                'cognito_id', 'user_role', 'onboarding_status', 'is_verified',
                'current_step', 'next_step', 'selected_plan'
            ]
            
            for field in optional_fields:
                if hasattr(user, field):
                    value = getattr(user, field)
                    profile_data[field] = value
            
            # Add setup_done based on onboarding_status
            onboarding_status = getattr(user, 'onboarding_status', 'not_started')
            profile_data['setup_done'] = onboarding_status == 'complete'
            profile_data['onboarding_status'] = onboarding_status
                
            logger.info(f"[UserProfile:{request_id}] Profile retrieved successfully")
            return Response(profile_data)
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request):
        """Update user profile information"""
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Updating profile for user {user.id}")
            
            # Fields that can be updated
            updatable_fields = [
                'first_name', 'last_name', 'onboarding_status', 
                'current_step', 'next_step', 'selected_plan'
            ]
            
            updated_fields = []
            for field in updatable_fields:
                if field in request.data and hasattr(user, field):
                    setattr(user, field, request.data[field])
                    updated_fields.append(field)
            
            if updated_fields:
                user.save(update_fields=updated_fields)
                logger.info(f"[UserProfile:{request_id}] Updated fields: {updated_fields}")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'updated_fields': updated_fields
            })
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Update error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifySessionView(APIView):
    """
    Verify the user's session and return session data
    Required by the frontend to validate authentication
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Session verification request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Session verification failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Return basic user session data
            logger.debug(f"Session verification successful for user {request.user.id} {request_id}")
            response_data = {
                'isLoggedIn': True,
                'authenticated': True,
                'user': {
                    'id': str(request.user.id),
                    'email': request.user.email,
                    'lastLogin': request.user.last_login.isoformat() if request.user.last_login else None,
                },
                'requestId': request_id
            }
            
            # Add onboarding status if available
            if hasattr(request.user, 'onboarding_status'):
                response_data['user']['onboardingStatus'] = request.user.onboarding_status
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error verifying session: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CheckUserAttributesView(APIView):
    """
    Check and return the user's cognito attributes
    Required by the frontend to determine user state
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Attribute check request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Attribute check failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Gather all user attributes
            attributes = {}
            
            # Map Django User model fields to attribute names
            if hasattr(request.user, 'email'):
                attributes['email'] = request.user.email
                
            # Custom fields we may have on the User model
            custom_fields = [
                'onboarding_status', 'current_step', 'next_step',
                'selected_plan', 'database_status', 'setup_status'
            ]
            
            for field in custom_fields:
                if hasattr(request.user, field):
                    value = getattr(request.user, field)
                    # Convert to camelCase for frontend
                    camel_case_field = ''.join([field.split('_')[0]] + 
                                     [w.capitalize() for w in field.split('_')[1:]])
                    attributes[camel_case_field] = value
            
            # Add basic preferences if not present
            if 'preferences' not in attributes:
                attributes['preferences'] = json.dumps({
                    "notifications": True,
                    "theme": "light",
                    "language": "en"
                })
                
            logger.debug(f"Attribute check successful for user {request.user.id} {request_id}")
            return Response({
                'isLoggedIn': True,
                'authenticated': True,
                'attributes': attributes,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking user attributes: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyTenantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Verify that the provided tenant ID is correct for this user"""
        try:
            tenant_id = request.data.get('tenantId')
            
            # Log the verification attempt
            logger.info(f"Tenant verification request for user {request.user.id} with tenantId: {tenant_id}")
            
            # CRITICAL: Always check if the user has ANY existing tenant first
            existing_tenant = Tenant.objects.filter(owner=request.user).first()
            
            if existing_tenant:
                # User has a tenant - check if the ID matches
                if str(existing_tenant.id) != tenant_id:
                    logger.warning(f"Tenant ID mismatch for user {request.user.id}: provided {tenant_id} but actual is {existing_tenant.id}")
                    return Response({
                        'status': 'corrected',
                        'message': 'The provided tenant ID is incorrect for this user',
                        'correctTenantId': str(existing_tenant.id),
                        'correctSchemaName': existing_tenant.id
                    })
                else:
                    # Tenant ID is correct
                    return Response({
                        'status': 'verified',
                        'message': 'Tenant ID verified successfully'
                    })
            else:
                # User has no tenant yet - they need to go through onboarding
                return Response({
                    'status': 'no_tenant',
                    'message': 'User has no tenant, needs onboarding'
                })
                
        except Exception as e:
            logger.error(f"Error verifying tenant: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Error verifying tenant',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
