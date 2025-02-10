# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/views.py

import re
import json
import sys
import time
import asyncio
import traceback
import uuid
import random
import string
from enum import Enum

from datetime import datetime, timedelta, date
from inspect import isawaitable
from typing import Dict, Any, Optional, Tuple
from asgiref.sync import sync_to_async  # Use sync_to_async instead of database_sync_to_async

# Django imports
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import (
    transaction, 
    connections, 
    DatabaseError, 
    IntegrityError,
    InterfaceError, 
    connection
)
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.decorators import method_decorator, sync_and_async_middleware
from django.views.decorators.csrf import csrf_exempt
from rest_framework.throttling import UserRateThrottle

from django.contrib.auth import update_session_auth_hash



# REST framework imports
from rest_framework import status
from rest_framework import serializers

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.exceptions import AuthenticationFailed, MethodNotAllowed
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.exceptions import TokenError



# Third-party imports
import stripe
from asgiref.sync import sync_to_async, async_to_sync
from celery import shared_task
from celery.app import app_or_default
from celery.exceptions import OperationalError as CeleryOperationalError, TimeoutError
from celery.result import AsyncResult
from channels.layers import get_channel_layer
from google.oauth2 import id_token
from google.auth.transport import requests
from kombu.exceptions import OperationalError as KombuOperationalError
from redis.exceptions import ConnectionError as RedisConnectionError
from celery.exceptions import OperationalError as CeleryOperationalError
from psycopg2 import OperationalError as DjangoOperationalError

# Local imports
from .locks import acquire_lock, release_lock, task_lock
from .models import OnboardingProgress
from .serializers import OnboardingProgressSerializer
from .state import OnboardingStateManager
from .tasks import setup_user_database_task
from .utils import (
    generate_unique_database_name,
    validate_database_creation,
)

from .serializers import BusinessInfoSerializer


# App imports
from business.models import Business, Subscription
from finance.models import Account
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from users.models import UserProfile, User
from users.utils import (
    create_user_database,
    setup_user_database,
    check_database_health,
    cleanup_database
)

# Configure stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Configure logger
logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_setup_status(request):
    try:
        # Get latest setup task ID
        progress = OnboardingProgress.objects.get(user=request.user)
        task_id = progress.database_setup_task_id

        if not task_id:
            return Response({
                'status': 'not_started',
                'progress': 0
            })

        # Check task status
        task = AsyncResult(task_id)
        
        return Response({
            'status': task.status,
            'progress': task.info.get('progress', 0) if task.info else 0,
            'current_step': task.info.get('step', 'Initializing') if task.info else 'Initializing',
            'is_complete': task.status == 'SUCCESS'
        })

    except Exception as e:
        logger.error(f"Error checking setup status: {str(e)}")
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=500)

class ValidationError(Exception):
    """Custom validation error"""
    pass

class ServiceUnavailableError(Exception):
    """Raised when required services are unavailable"""
    pass

# First, let's move get_task_status into a proper async utility function at the module level
async def get_task_status(task_id: str) -> dict:
    """
    Get the status of a Celery task with proper async handling and error management.
    
    Args:
        task_id: The ID of the Celery task to check
        
    Returns:
        dict: A dictionary containing task status information
    """
    try:
        task = AsyncResult(task_id)
        return {
            'status': task.status,
            'info': task.info,
            'result': task.result if task.successful() else None,
            'error': str(task.result) if task.failed() else None,
            'progress': getattr(task.info, 'progress', 0) if task.info else 0,
            'step': getattr(task.info, 'step', 'Processing') if task.info else 'Unknown'
        }
    except Exception as e:
        logger.error(f"Error getting task status for task {task_id}: {str(e)}")
        return {
            'status': 'ERROR',
            'error': str(e),
            'progress': 0,
            'step': 'Error'
        }

class BaseOnboardingView(APIView):
    """Base view for all onboarding-related views with proper authentication handling"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def initialize_response(self, data, status_code):
        """Initialize response with proper status code"""
        response = Response(data, status=status_code)
        response.accepted_renderer = JSONRenderer()
        response.accepted_media_type = "application/json"
        response.renderer_context = {}
        return response


    def handle_exception(self, exc):
        logger.error('View exception:', {
            'error': str(exc),
            'type': type(exc).__name__,
            'view': self.__class__.__name__
        })

        if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(
            {'error': str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


    def get_authenticated_user(self, request):
        """Get authenticated user in synchronous context"""
        return request.user

    def validate_user_state(self, user):
        """Validate user state with proper error handling"""
        try:
            with transaction.atomic():
                profile = UserProfile.objects.select_related('user', 'business').get(user=user)
                progress = OnboardingProgress.objects.get(user=user)

                # For new users or users in initial setup
                if profile.database_status == 'not_created':
                    return {
                        'isValid': True,
                        'redirectTo': '/onboarding/step1',
                        'reason': 'new_user'
                    }
                
                if not profile.database_name or profile.database_status != 'active':
                    return {
                        'isValid': False,
                        'redirectTo': '/onboarding/step1',
                        'reason': 'no_database'
                    }
                    
                # Check health synchronously
                is_healthy, health_details = check_database_health(profile.database_name)
                if not is_healthy:
                    return {
                        'isValid': False,
                        'redirectTo': '/onboarding/step4/setup',
                        'reason': 'unhealthy_database',
                        'details': health_details
                    }
                    
                if not progress.is_complete or progress.onboarding_status != 'complete':
                    return {
                        'isValid': False,
                        'redirectTo': f'/onboarding/{progress.onboarding_status or "step1"}',
                        'reason': 'incomplete_onboarding'
                    }
                    
                return {
                    'isValid': True,
                    'redirectTo': '/dashboard',
                    'reason': 'all_valid',
                    'database': {
                        'name': profile.database_name,
                        'status': profile.database_status,
                        'health': health_details
                    }
                }
        except UserProfile.DoesNotExist:
            logger.error(f"Profile not found for user: {user.id}")
            return {
                'isValid': False, 
                'redirectTo': '/onboarding/step1',
                'reason': 'profile_not_found'
            }
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.id}")
            return {
                'isValid': False,
                'redirectTo': '/onboarding/step1', 
                'reason': 'progress_not_found'
            }
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return {
                'isValid': False,
                'redirectTo': '/error',
                'reason': 'validation_error',
                'error': str(e)
            }

    def dispatch(self, request, *args, **kwargs):
        try:
            # Add subscription endpoints to skip list
            if request.path.startswith(('/api/auth/', '/api/onboarding/reset', '/api/onboarding/subscription')):
                return super().dispatch(request, *args, **kwargs)

            # Check authentication first
            if not request.user.is_authenticated:
                return self.initialize_response({
                    'status': 'error',
                    'message': 'Authentication required'
                }, status.HTTP_401_UNAUTHORIZED)

          # Add token expiration check
            if request.auth and isinstance(request.auth, AccessToken):
                if request.auth.payload['exp'] < timezone.now().timestamp():
                    raise AuthenticationFailed('Token expired')

            # Validate user state
            validation_result = self.validate_user_state(request.user)
            if not validation_result['isValid']:
                return self.initialize_response({
                    'error': validation_result['reason'],
                    'redirect': validation_result['redirectTo'],
                    'details': validation_result.get('details')
                }, status.HTTP_403_FORBIDDEN)

            # Ensure renderer is set
            if not hasattr(request, 'accepted_renderer'):
                request.accepted_renderer = JSONRenderer()
                request.accepted_media_type = request.accepted_renderer.media_type

            response = super().dispatch(request, *args, **kwargs)
            
            # Ensure response has proper renderer
            if not hasattr(response, 'accepted_renderer'):
                response.accepted_renderer = request.accepted_renderer
                response.accepted_media_type = request.accepted_media_type

            return response

        except AuthenticationFailed as e:
            return self.initialize_response({
                'status': 'error',
                'message': str(e)
            }, status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error in dispatch: {str(e)}")
            return self.initialize_response({
                'status': 'error',
                'message': str(e)
            }, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def notify_websocket(self, user_id: str, event_type: str, data: dict):
        """
        Send WebSocket notification using Celery task
        
        This method handles WebSocket notifications by delegating to a Celery task,
        which allows for asynchronous processing without blocking the main request.
        
        Args:
            user_id: The ID of the user to notify
            event_type: Type of event (e.g., 'setup_started', 'step_completed')
            data: Dictionary containing notification data
        """
        try:
            from .tasks import send_websocket_notification  # Import here to avoid circular imports
            
            # Queue the notification task
            send_websocket_notification.delay(
                user_id=str(user_id),
                event_type=event_type,
                data=data
            )
            logger.debug(f"Queued WebSocket notification for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket notification failed: {str(e)}")
            # Don't raise the error since notifications are non-critical
    def get_onboarding_progress(self, user):
        """Get onboarding progress with retry logic"""
        for attempt in range(3):
            try:
                with transaction.atomic():
                    try:
                        # Use select_for_update to prevent race conditions
                        progress = OnboardingProgress.objects.select_for_update(
                            nowait=True
                        ).get(user=user)  # Just get by user
                        return progress
                    except OnboardingProgress.DoesNotExist:
                        # Create new progress if none exists
                        return OnboardingProgress.objects.create(
                            user=user,
                            onboarding_status='step1',
                            current_step=1
                        )
            except OperationalError:
                if attempt == 2:
                    raise
                time.sleep(0.1 * (2 ** attempt))
                continue
            except IntegrityError as e:
                if 'onboarding_progress_email_key' in str(e):
                    return OnboardingProgress.objects.get(user=user)  # Simplified since we're using user only
                raise

    def handle_exception(self, exc):
        """Handle exceptions with proper response formatting"""
        if isinstance(exc, AuthenticationFailed):
            return Response(
                {"error": str(exc)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)

@method_decorator(csrf_exempt, name='dispatch')
class GoogleTokenExchangeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def verify_google_token(self, token: str, request_id: str):
        """Verify Google OAuth token with retry logic for time sync issues"""
        logger.info("Starting Google token verification", {
            'request_id': request_id,
            'token_length': len(token) if token else 0,
        })
        
        if not token:
            logger.error("Token verification failed - empty token", {
                'request_id': request_id
            })
            raise ValidationError("Token is required")
        
        try:
            request = requests.Request()
            
            # First attempt with default settings
            try:
                logger.debug("Attempting token verification with default settings", {
                    'request_id': request_id,
                    'clock_skew': 2
                })
                
                id_info = id_token.verify_oauth2_token(
                    token, 
                    request, 
                    settings.GOOGLE_CLIENT_ID,
                    clock_skew_in_seconds=2
                )
                
                logger.info("Token verified successfully on first attempt", {
                    'request_id': request_id,
                    'issuer': id_info.get('iss'),
                    'email': id_info.get('email')
                })
                
                return id_info
                
            except google.auth.exceptions.InvalidValue as e:
                if "Token used too early" in str(e):
                    logger.warning("Token timing issue detected, retrying with increased skew", {
                        'request_id': request_id,
                        'error': str(e),
                        'retry_skew': 5
                    })
                    
                    time.sleep(2)
                    id_info = id_token.verify_oauth2_token(
                        token,
                        request,
                        settings.GOOGLE_CLIENT_ID,
                        clock_skew_in_seconds=5
                    )
                    
                    logger.info("Token verified successfully on retry", {
                        'request_id': request_id,
                        'issuer': id_info.get('iss')
                    })
                    
                    return id_info
                else:
                    raise
            
        except Exception as e:
            logger.error("Token verification failed", {
                'request_id': request_id,
                'error_type': type(e).__name__,
                'error': str(e),
                'stack_trace': traceback.format_exc()
            })
            raise

    def generate_tokens(self, user, request_id: str):
        """Generate JWT tokens with detailed error handling"""
        try:
            logger.debug("Starting token generation", {
                'request_id': request_id,
                'user_id': str(user.id)
            })
            
            # Generate refresh token
            refresh = RefreshToken.for_user(user)
            
            # Get access token from refresh token
            tokens = {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
            
            # Validate tokens
            if not tokens['access'] or not tokens['refresh']:
                raise ValidationError("Failed to generate valid tokens")

            logger.debug("Tokens generated successfully", {
                'request_id': request_id,
                'has_access': bool(tokens['access']),
                'has_refresh': bool(tokens['refresh'])  
            })

            return tokens

        except Exception as e:
            logger.error("Token generation failed", {
                'request_id': request_id,
                'error': str(e),
                'stack_trace': traceback.format_exc()
            })
            raise ValidationError(f"Failed to generate tokens: {str(e)}")

    def get_or_create_user(self, user_info, request_id: str):
        """Get or create user with detailed error handling and validation"""
        try:
            logger.debug("Starting user creation/update", {
                'request_id': request_id,
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'data': user_info
            })

            # Validate required fields with detailed logging
            if not user_info.get('email'):
                logger.error("Missing required email", {
                    'request_id': request_id,
                    'available_fields': list(user_info.keys())
                })
                raise ValidationError("Email is required")

            # Process name with better error handling
            name_parts = user_info.get('name', '').split(' ', 1)
            if not name_parts:
                logger.warning("No name provided", {
                    'request_id': request_id,
                    'using_defaults': True
                })
                first_name = ''
                last_name = ''
            else:
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ''

            with transaction.atomic():
                try:
                    # Get or create user with logging
                    user, user_created = User.objects.get_or_create(
                        email=user_info['email'],
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'is_active': True
                        }
                    )

                    logger.debug("User get/create completed", {
                        'request_id': request_id,
                        'user_id': str(user.id),
                        'created': user_created
                    })

                    # Get or create profile
                    profile, profile_created = UserProfile.objects.get_or_create(
                        user=user,
                        defaults={
                            'email_verified': True,
                            'database_status': 'not_created',
                            'setup_status': 'not_started',
                        }
                    )

                    logger.debug("Profile get/create completed", {
                        'request_id': request_id,
                        'profile_id': profile.id,
                        'created': profile_created
                    })

                    # Get or create onboarding progress
                    progress, progress_created = OnboardingProgress.objects.get_or_create(
                        user=user,
                        defaults={
                            'onboarding_status': 'business-info',
                            'current_step': 'business-info',
                            'next_step': 'subscription'
                        }
                    )

                    logger.info("User setup completed", {
                        'request_id': request_id,
                        'user_id': str(user.id),
                        'created': {
                            'user': user_created,
                            'profile': profile_created,
                            'progress': progress_created
                        }
                    })

                    return user, user_created, progress

                except IntegrityError as e:
                    logger.error("Database integrity error", {
                        'request_id': request_id,
                        'error': str(e),
                        'error_type': type(e).__name__
                    })
                    raise ValidationError(f"Database integrity error: {str(e)}")

        except Exception as e:
            logger.error("User creation/update failed", {
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'stack_trace': traceback.format_exc()
            })
            raise ValidationError(f"Failed to create/update user: {str(e)}")

    def post(self, request, *args, **kwargs):
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Log complete raw request data
            logger.debug("Token exchange raw request data:", {
                'request_id': request_id,
                'raw_data': request.data,
                'headers': dict(request.headers),
                'content_type': request.content_type
            })

            # Get OAuth data from NextAuth.js callback
            oauth_data = request.data.get('OAuthProfile', {})
            account_data = request.data.get('account', {})
            profile_data = request.data.get('profile', {})

            # Log extracted data
            logger.debug("Extracted data details:", {
                'request_id': request_id,
                'oauth_data_keys': list(oauth_data.keys()),
                'account_data_keys': list(account_data.keys()),
                'account_data_content': account_data,
                'profile_data_keys': list(profile_data.keys()),
                'profile_data_content': profile_data
            })

            # Log field validation in detail
            validation_fields = {
                'account.id_token': account_data.get('id_token'),
                'profile.email': profile_data.get('email'),
                'profile.name': profile_data.get('name')
            }

            logger.debug("Field validation details:", {
                'request_id': request_id,
                'validation_fields': validation_fields,
                'all_present': all(validation_fields.values())
            })

            # Validate required fields
            if not all([
                account_data.get('id_token'),
                profile_data.get('email'),
                profile_data.get('name')
            ]):
                missing_fields = []
                if not account_data.get('id_token'): 
                    missing_fields.append('account.id_token')
                if not profile_data.get('email'): 
                    missing_fields.append('profile.email')
                if not profile_data.get('name'): 
                    missing_fields.append('profile.name')
                
                logger.error("Missing required fields", {
                    'request_id': request_id,
                    'missing_fields': missing_fields
                })
                return Response({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields,
                    'received_data': {
                        'account': account_data,
                        'profile': profile_data
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verify Google token
            user_info = self.verify_google_token(account_data['id_token'], request_id)
            
            # Get or create user records
            user, created, progress = self.get_or_create_user({
                'email': user_info['email'],
                'name': user_info.get('name', profile_data.get('name', '')),
                'picture': user_info.get('picture', profile_data.get('image', ''))
            }, request_id)

            # Generate JWT tokens
            tokens = self.generate_tokens(user, request_id)

            # Get or update user profile
            user_profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'email_verified': True,
                    'database_status': 'not_created',
                    'setup_status': 'not_started'
                }
            )

            response_data = {
                'tokens': tokens,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'picture': profile_data.get('image', '')
                },
                'onboarding': {
                    'status': progress.onboarding_status or 'business-info',
                    'current_step': progress.current_step or 'business-info',
                    'database_status': user_profile.database_status,
                    'setup_status': user_profile.setup_status,
                    'completed_steps': []
                }
            }

            logger.info('Token exchange successful', {
                'request_id': request_id,
                'user_id': str(user.id),
                'onboarding_status': progress.onboarding_status
            })

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error('Token exchange failed', {
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'trace': traceback.format_exc()
            })
            return Response({
                'error': str(e),
                'request_id': request_id
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class StartOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_or_create_onboarding(self, user):
        """Get or create onboarding progress"""
        with transaction.atomic():
            onboarding, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    "onboarding_status": "setup",
                    "current_step": "setup",
                    "next_step": "complete"
                }
            )
            return onboarding, created

    def get_business_id(self, user):
        """Get business ID from user profile"""
        try:
            profile = UserProfile.objects.select_related('business').get(user=user)
            if profile.business:
                return str(profile.business.id)
        except UserProfile.DoesNotExist:
            logger.warning(f"No user profile found for user {user.id}")
        return None

    def post(self, request):
        """Handle POST requests"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        logger.info(f"Starting onboarding process - Request ID: {request_id}")

        try:
            # Get or create onboarding progress
            onboarding, created = self.get_or_create_onboarding(request.user)

            # Get business ID
            business_id = self.get_business_id(request.user)
            if not business_id:
                logger.warning(f"No business ID found for user {request.user.id}")
                business_id = str(uuid.uuid4())  # Fallback if no business ID exists

            # Queue setup task with only user_id and business_id
            task = setup_user_database_task.delay(
                user_id=str(request.user.id),
                business_id=business_id
            )

            return Response({
                "status": "success", 
                "setup_id": task.id,
                "message": "Setup initiated successfully",
                "onboarding_id": str(onboarding.id)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in setup: {str(e)}", exc_info=True)
            return Response(
                {"error": "Setup failed", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateOnboardingView(BaseOnboardingView):
    @sync_to_async
    def get_user(self, request):
        return request.user

    @sync_to_async
    def update_progress(self, user, step, data):
        with transaction.atomic():
            onboarding = get_object_or_404(OnboardingProgress, user=user)
            data['onboarding_status'] = f'step{step}'
            serializer = OnboardingProgressSerializer(onboarding, data=data, partial=True)
            if serializer.is_valid():
                return serializer.save()
            raise ValidationError(serializer.errors)

    async def put(self, request, step):

        try: 
            logger.info(f"Update onboarding request for step {step}")
            logger.debug(f"Received request data: {request.data}")
            
            onboarding = get_object_or_404(OnboardingProgress, user=request.user)  # Get by user instead
            
            # Capture all expected fields from the request data
            data = request.data
            data['onboarding_status'] = f'step{step}'
            
            # Ensure essential fields are included in the onboarding process
            required_fields = ['business_name', 'business_type', 'country', 'legal_structure', 'date_founded']
            
            # Log missing fields for debugging purposes
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                logger.warning(f"Missing fields in onboarding data for step {step}: {missing_fields}")

            # Serialize and save onboarding data
            serializer = OnboardingProgressSerializer(onboarding, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Onboarding data updated for step {step}")
                return Response(serializer.data)
            
            # Log validation errors for debugging
            logger.error(f"Validation errors in onboarding data: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ValidationError as e:
            return await self.create_error_response(
                str(e),
                status.HTTP_400_BAD_REQUEST,
                'validation_error'
            )
        except Exception as e:
            return await self.create_error_response(
                "Failed to update onboarding",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                'server_error'
            )



class CompleteOnboardingView(BaseOnboardingView):
    @sync_to_async
    def get_progress(self, user):
        return OnboardingProgress.objects.get(user=user)
    
    @sync_to_async
    def complete_onboarding(self, onboarding):
        with transaction.atomic():
            onboarding.onboarding_status = 'complete'
            onboarding.current_step = 0
            onboarding.save()
            return onboarding

    async def post(self, request):
        logger.info("Received request to complete onboarding process")
        user = request.user
        
        try:
            onboarding = await self.get_progress(user)
            # Validate current state
            validation_result = self.validate_user_state(request.user)
            if not validation_result['isValid'] and validation_result['reason'] != 'incomplete_onboarding':
                return Response({
                    "error": validation_result['reason'],
                    "redirect": validation_result['redirectTo']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Complete onboarding
            await self.complete_onboarding(onboarding)
            
            return Response({
                "message": "Onboarding completed successfully",
                "redirect": "/dashboard"
            }, status=status.HTTP_200_OK)
            
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.email}")
            return Response(
                {"error": "Onboarding progress not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error completing onboarding: {str(e)}")
            return Response(
                {"error": "Failed to complete onboarding"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CleanupOnboardingView(BaseOnboardingView):
    """View for cleaning up expired onboarding records and managing onboarding status"""

    @sync_to_async
    def cleanup_expired_records(self):
        """Cleanup expired records with transaction handling"""
        with transaction.atomic():
            expiration_time = timezone.now() - timedelta(hours=5)
            return OnboardingProgress.objects.filter(
                created_at__lt=expiration_time
            ).delete()

    @sync_to_async
    def get_or_create_progress(self, user):
        """Get or create onboarding progress with retries"""
        max_retries = 3
        retry_delay = 0.5
        last_error = None

        for attempt in range(max_retries):
            try:
                with transaction.atomic(durable=True):
                    progress = OnboardingProgress.objects.select_for_update(
                        nowait=True,
                        skip_locked=True
                    ).filter(user=user).first()
                    
                    if not progress:
                        progress = OnboardingProgress.objects.create(
                            user=user,
                            email=user.email,
                            onboarding_status='step1',
                            current_step=1
                        )
                    return progress
            except OperationalError as e:
                last_error = e
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                raise last_error
            except Exception as e:
                logger.error(f"Error in get_or_create_progress: {str(e)}")
                raise

    async def post(self, request):
        """Handle cleanup request"""
        try:
            deleted_count, _ = await self.cleanup_expired_records()
            logger.info(f"Cleaned up {deleted_count} expired records")
            
            return Response({
                "message": "Cleanup completed",
                "records_deleted": deleted_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}", exc_info=True)
            return Response({
                "error": "Failed to complete cleanup"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def get(self, request, *args, **kwargs):
        """Get onboarding status"""
        try:
            progress = await self.get_or_create_progress(request.user)
            
            return Response({
                "onboarding_status": progress.onboarding_status,
                "current_step": progress.current_step,
                "email": progress.email,
                "last_updated": progress.last_updated
            }, status=status.HTTP_200_OK)

        except OperationalError as e:
            logger.error(f"Database operation error: {str(e)}", exc_info=True)
            return Response({
                "error": "Database operation failed",
                "retry_after": 5
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            logger.error(f"Error getting status: {str(e)}", exc_info=True)
            return Response({
                "error": "An unexpected error occurred",
                "onboarding_status": "step1", 
                "current_step": 1
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    autoretry_for=(DjangoOperationalError, KombuOperationalError, CeleryOperationalError)
)
def cleanup_expired_onboarding(self):
    """Celery task for cleaning up expired onboarding records"""
    try:
        expired_time = timezone.now() - timedelta(hours=5)
        deleted_count, _ = OnboardingProgress.objects.filter(
            created_at__lt=expired_time
        ).delete()
        
        logger.info(f"Cleanup task deleted {deleted_count} expired records")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}", exc_info=True)
        raise self.retry(exc=e)


        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_session(request):
    """
    Update the user's session by saving the new access and refresh tokens
    passed from the frontend after a token refresh.
    """
    user = request.user
    new_access_token = request.data.get('accessToken')
    new_refresh_token = request.data.get('refreshToken')

    # Check that both tokens are provided
    if not new_access_token or not new_refresh_token:
        logger.error("Access token or refresh token is missing")
        return Response(
            {'error': 'Both accessToken and refreshToken are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Validate the new refresh token using SimpleJWT
        RefreshToken(new_refresh_token)  # This will throw if invalid

        # Save tokens in the user's session (or as user model fields)
        # Here assuming you may have fields `access_token` and `refresh_token`
        user.access_token = new_access_token
        user.refresh_token = new_refresh_token
        user.save()

        logger.info("Session tokens updated successfully for user %s", user.email)
        return Response({'message': 'Session updated successfully'}, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error("Error updating session tokens: %s", str(e))
        return Response(
            {'error': 'Failed to update session tokens'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@method_decorator(csrf_exempt, name='dispatch')
class SaveStep1View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    REQUIRED_FIELDS = [
        'business_name', 'business_type', 'country',
        'legal_structure', 'date_founded', 'first_name', 'last_name'
    ]

    def validate_data(self, data):
        missing_fields = [field for field in self.REQUIRED_FIELDS if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        return True

    @transaction.atomic
    def save_business_data(self, user, data: Dict[str, Any]) -> Tuple[Business, bool]:
        logger.info(f"Saving business data with: {data}")
        try:
            # Handle date_founded with better validation
            try:
                if isinstance(data['date_founded'], str):
                    date_founded = datetime.strptime(data['date_founded'], '%Y-%m-%d').date()
                elif isinstance(data['date_founded'], date):
                    date_founded = data['date_founded']
                else:
                    raise ValidationError("Invalid date format for date_founded")
            except (ValueError, KeyError) as e:
                raise ValidationError(f"Date validation failed: {str(e)}")

            # Create or update business record
            business, created = Business.objects.update_or_create(
                owner=user,
                defaults={
                    'business_name': data.get('business_name'),
                    'business_type': data.get('business_type'),
                    'country': data.get('country'),
                    'legal_structure': data.get('legal_structure'),
                    'date_founded': date_founded,
                }
            )

            # Update user profile
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={'is_business_owner': True}
            )
            profile.business = business
            profile.is_business_owner = True
            profile.save(update_fields=['business', 'is_business_owner'])

            return business, created

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to save business data: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to save business data: {str(e)}")

    @transaction.atomic
    def update_onboarding_progress(self, user, business):
        try:
            with transaction.atomic():
                # Get or create onboarding progress
                progress, _ = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'onboarding_status': 'business-info',
                        'current_step': 1,
                        'next_step': 2
                    }
                )

                # Link business to progress and update status
                progress.business = business
                progress.onboarding_status = 'business-info'
                progress.current_step = 'business-info'

                progress.next_step = 'subscription'
                progress.save(update_fields=[
                    'business',
                    'onboarding_status', 
                    'current_step',
                    'next_step',
                    'updated_at'
                ])

                return progress

        except Exception as e:
            logger.error("Error updating progress:", {
                'error': str(e),
                'user_id': user.id,
                'business_id': business.id if business else None
            })
            raise


    def generate_business_number(self):
        """Generate a unique 6-digit business number"""
        while True:
            number = ''.join(random.choices(string.digits, k=6))
            if not Business.objects.filter(business_num=number).exists():
                return number

    def post(self, request, *args, **kwargs):
        request_id = request.headers.get('X-Request-Id', 'unknown')
        
        logger.info("Received business info save request:", {
            'request_id': request_id,
            'user_id': request.user.id,
            'data': request.data
        })

        try:
            # Validate request data
            serializer = BusinessInfoSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': 'Validation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            # Generate business number
            business_num = ''.join(random.choices(string.digits, k=6))
            while Business.objects.filter(business_num=business_num).exists():
                business_num = ''.join(random.choices(string.digits, k=6))

            with transaction.atomic():
                # Create business
                business = Business.objects.create(
                    owner=request.user,
                    business_num=business_num,
                    business_name=serializer.validated_data['business_name'],
                    business_type=serializer.validated_data['business_type'],
                    country=serializer.validated_data['country'],
                    legal_structure=serializer.validated_data['legal_structure'],
                    date_founded=serializer.validated_data['date_founded']
                )

                # Create/update user profile
                UserProfile.objects.update_or_create(
                    user=request.user,
                    defaults={
                        'business': business,
                        'is_business_owner': True
                    }
                )

                # Update onboarding progress
                progress = OnboardingProgress.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'onboarding_status': 'business-info',
                        'current_step': 1,
                        'next_step': 2
                    }
                )[0]
                
                progress.business = business
                progress.current_step = 'business-info'

                progress.next_step = 'subscription'
                progress.save()

                # Prepare response - convert Country to code string
                response_data = {
                    "success": True,
                    "message": "Business information saved successfully",
                    "data": {
                        "onboarding_status": "subscription",
                        "currentStep": 2,
                        "nextStep": 3,
                        "businessInfo": {
                            "id": str(business.id),
                            "business_num": business.business_num,
                            "business_name": business.business_name,
                            "business_type": business.business_type,
                            "country": business.country.code if business.country else None,  # Convert Country to code
                            "legal_structure": business.legal_structure,
                            "date_founded": business.date_founded.isoformat() if business.date_founded else None,
                            "first_name": request.user.first_name,
                            "last_name": request.user.last_name
                        }
                    }
                }

                return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Error saving business info:", {
                'request_id': request_id,
                'error': str(e),
                'trace': traceback.format_exc()
            })
            return Response({
                'success': False,
                'message': 'Failed to save business information',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def options(self, request, *args, **kwargs):
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin')
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response





@method_decorator(csrf_exempt, name='dispatch')
class SaveStep2View(BaseOnboardingView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    VALID_PLANS = ['free', 'professional']
    VALID_BILLING_CYCLES = ['monthly', 'annual']

    def validate_subscription_data(self, data):
        """Validates subscription data"""
        logger.debug("Validating subscription data:", extra={'data': data})

        # Extract 'type' from 'selected_plan' dictionary if necessary
        if isinstance(data.get('selected_plan'), dict) and 'type' in data['selected_plan']:
            data['selected_plan'] = data['selected_plan']['type']

        # Map 'tier_type' to 'selected_plan' if needed
        if 'tier_type' in data and not data.get('selected_plan'):
            data['selected_plan'] = data['tier_type']

        # Check required plan selection
        if not data.get('selected_plan'):
            logger.error("Validation failed: Plan selection is required")
            return False, "Plan selection is required"

        # Validate plan type
        if data['selected_plan'] not in self.VALID_PLANS:
            logger.error(f"Invalid plan type: {data['selected_plan']}")
            return False, f"Invalid plan type: {data['selected_plan']}"

        # Validate billing cycle
        if data.get('billing_cycle') and data['billing_cycle'] not in self.VALID_BILLING_CYCLES:
            logger.error(f"Invalid billing cycle: {data['billing_cycle']}")
            return False, f"Invalid billing cycle: {data['billing_cycle']}"

        logger.debug("Subscription data validated successfully")
        return True, None

    @transaction.atomic
    def save_subscription(self, request, business, selected_plan, billing_cycle='monthly'):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4()))
        
        logger.info("Starting subscription save", extra={
            'user_id': str(request.user.id),
            'request_id': request_id,
            'selected_plan': selected_plan,
            'billing_cycle': billing_cycle,
            'business_id': str(business.id)
        })

        try:
            with transaction.atomic():
                # Save subscription
                subscription = Subscription.objects.update_or_create(
                    business=business,
                    defaults={
                        'selected_plan': selected_plan,
                        'billing_cycle': billing_cycle,
                        'is_active': selected_plan == 'free',
                        'start_date': timezone.now().date()
                    }
                )[0]

                # Get user profile efficiently
                user_profile = UserProfile.objects.select_related('user').get(
                    business=business
                )

                # Update onboarding progress with SELECT FOR UPDATE
                progress = OnboardingProgress.objects.select_for_update().get(
                    user=user_profile.user
                )


                # Set explicit next step and status
                new_status = 'subscription'

                # Determine next step based on plan
                next_step = 'setup' if selected_plan == 'free' else 'payment'

                # Update progress atomically
                progress.onboarding_status = 'subscription'
                progress.current_step = 'subscription'
                progress.next_step = next_step
                progress.selected_plan = selected_plan
                progress.save(update_fields=[
                    'onboarding_status',
                    'current_step',
                    'next_step',
                    'selected_plan'
                ])

                logger.info("Subscription saved successfully", extra={
                    'request_id': request_id,
                    'business_id': str(business.id),
                    'current_step': 'subscription',
                    'next_step': next_step,
                    'selected_plan': selected_plan,
                    'new_status': new_status

                })

                return {
                    'subscription': subscription,
                    'next_step': next_step,
                    'current_step': 'subscription',
                    'onboarding_status': 'subscription',
                    'selected_plan': selected_plan,
                    'new_status': new_status
                }

        except (UserProfile.DoesNotExist, OnboardingProgress.DoesNotExist) as e:
            logger.error("Required record not found", extra={
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__
            })
            raise ValidationError(str(e))
        except Exception as e:
            logger.error("Subscription save failed", extra={
                'request_id': request_id,
                'error': str(e),
                'traceback': traceback.format_exc(),
                'user_id': str(request.user.id)
            })
            raise ValidationError(f"Failed to save subscription: {str(e)}")



    @transaction.atomic
    def post(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f'[{request_id}] Starting subscription save request')

        try:
            # Validate incoming data
            data = request.data.copy()
            is_valid, error = self.validate_subscription_data(data)
            if not is_valid:
                return Response({
                    'success': False,
                    'error': error
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get user profile
            profile = UserProfile.objects.select_related('business').get(user=request.user)
            
            with transaction.atomic():
                # Save subscription and update progress
                result = self.save_subscription(
                    request,
                    profile.business,
                    data['selected_plan'],
                    data.get('billing_cycle', 'monthly')
                )

                # Update session
                request.session.update({
                    'onboarding_status': result['onboarding_status'],
                    'current_step': result['current_step']
                })
                request.session.save()

                return Response({
                    'success': True,
                    'selected_plan': result['selected_plan'],
                    'next_step': result['next_step'],
                    'current_step': result['current_step'],
                    'onboarding_status': result['onboarding_status'],
                    'session_updated': True
                }, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            logger.error(f"[{request_id}] User profile not found")
            return Response({
                'success': False,
                'error': 'User profile not found'
            }, status=status.HTTP_404_NOT_FOUND)

        except ValidationError as e:
            logger.error(f"[{request_id}] Validation error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"[{request_id}] Subscription save failed: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Failed to save subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SaveStep3View(BaseOnboardingView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    @sync_to_async
    def save_payment_status(self, user, payment_completed, payment_data=None):
        """Save payment status with validation and transaction handling."""
        with transaction.atomic():
            try:
                progress = OnboardingProgress.objects.select_for_update().get(user=user)

                # Validate plan type
                if progress.selected_plan != 'professional':
                    raise ValidationError("Payment is only required for the Professional plan.")

                # Update payment status
                progress.payment_completed = payment_completed
                if payment_data:
                    progress.payment_method = payment_data.get('payment_method')
                    progress.payment_reference = payment_data.get('payment_reference')
                progress.last_payment_attempt = timezone.now()
                progress.save()

                logger.info(
                    f"Payment status updated for user {user.email}",
                    extra={
                        'payment_completed': payment_completed,
                        'payment_method': payment_data.get('payment_method') if payment_data else None
                    }
                )
                return progress

            except OnboardingProgress.DoesNotExist:
                logger.error(f"Onboarding progress not found for user: {user.id}")
                raise ValidationError("Onboarding progress not found.")
            except ValidationError as e:
                logger.error(f"Validation error: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Error saving payment status: {str(e)}", exc_info=True)
                raise

    @sync_to_async
    def validate_payment_data(self, data):
        """Validate payment data."""
        required_fields = ['payment_method', 'payment_reference']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing payment fields: {', '.join(missing_fields)}")
        return True

    async def verify_payment(self, payment_reference):
        """Verify payment with payment provider."""
        try:
            # Example: Verify payment with Stripe
            if settings.STRIPE_SECRET_KEY:
                payment = stripe.PaymentIntent.retrieve(payment_reference)
                return payment.status == 'succeeded'
            return False
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            raise ValidationError("Failed to verify payment.")

    async def post(self, request):
        """Handle step 3 submission with enhanced error handling."""
        user = await self.get_user(request)
        data = request.data
        state_manager = OnboardingStateManager(user)


        try:
            # Validate current state
            if not await self.validate_state(user, 'step3'):
                return Response({
                    "error": "Invalid state for step 3",
                    "current_state": await state_manager.get_current_state()
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate and process payment
            payment_completed = data.get('payment_completed', False)
            if payment_completed:
                await self.validate_payment_data(data)
                if not await self.verify_payment(data.get('payment_reference')):
                    raise ValidationError("Payment verification failed.")

            # Save payment status
            progress = await self.save_payment_status(user, payment_completed, data)

            # Attempt state transition
            if await state_manager.transition_to('step4'):
                # Notify via WebSocket
                await self.notify_websocket(
                    user.id,
                    'step3_completed',
                    {
                        "payment_status": "completed" if payment_completed else "pending",
                        "next_step": "step4"
                    }
                )

                return Response({
                    "message": "Step 3 completed successfully",
                    "payment_status": "completed" if payment_completed else "pending",
                    "next_step": "step4"
                }, status=status.HTTP_200_OK)

            logger.warning(f"Failed to transition state for user {user.email}")
            return Response({
                "error": "Failed to transition to next step",
                "current_state": await state_manager.get_current_state()
            }, status=status.HTTP_400_BAD_REQUEST)

        except ValidationError as e:
            await self.handle_error(e, user.id, 'validation_error')
            return Response({
                "error": str(e),
                "type": "validation_error"
            }, status=status.HTTP_400_BAD_REQUEST)

        except OnboardingProgress.DoesNotExist:
            await self.handle_error(Exception("Onboarding progress not found"), user.id, 'not_found_error')
            return Response({
                "error": "Onboarding progress not found",
                "type": "not_found_error"
            }, status=status.HTTP_404_NOT_FOUND)

        except stripe.error.StripeError as e:
            await self.handle_error(e, user.id, 'payment_error')
            return Response({
                "error": "Payment processing error",
                "type": "payment_error",
                "details": str(e)
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        except Exception as e:
            await self.handle_error(e, user.id, 'server_error')
            return Response({
                "error": "An unexpected error occurred",
                "type": "server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def get(self, request):
        """Get payment status and requirements."""
        user = await self.get_user(request)

        try:
            progress = await self.get_onboarding_progress(user)
            return Response({
                "payment_required": progress.selected_plan == 'professional',
                "payment_status": {
                    "completed": progress.payment_completed,
                    "last_attempt": progress.last_payment_attempt,
                    "payment_method": progress.payment_method
                },
                "available_payment_methods": ["credit_card", "bank_transfer"]
            }, status=status.HTTP_200_OK)

        except Exception as e:
            await self.handle_error(e, user.id, 'server_error')
            return Response({
                "error": "Failed to fetch payment information",
                "type": "server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Define task states as an enum for better type safety and validation
class TaskState(Enum):
    PENDING = 'PENDING'
    STARTED = 'STARTED'
    PROGRESS = 'PROGRESS'
    SUCCESS = 'SUCCESS'
    FAILURE = 'FAILURE'

    @classmethod
    def active_states(cls):
        """Returns states where task is still running"""
        return [cls.PENDING.value, cls.STARTED.value, cls.PROGRESS.value]

# Request/Response Serializers for validation and consistent formatting
class SetupRequestSerializer(serializers.Serializer):
    request_id = serializers.UUIDField(required=False)
    setup_options = serializers.DictField(required=True)
    force_restart = serializers.BooleanField(default=False)

    def validate_setup_options(self, value):
        required = ['selected_plan', 'billing_cycle']
        if not all(k in value for k in required):
            raise serializers.ValidationError(
                f"setup_options must contain: {', '.join(required)}"
            )
        return value

class SetupResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    task_id = serializers.CharField(required=False)
    message = serializers.CharField()
    provisioning_status = serializers.CharField(required=False)
    technical_status = serializers.CharField(required=False)
    retry_count = serializers.IntegerField(required=False)
    started_at = serializers.DateTimeField(required=False)

# Custom throttle class for setup endpoints
class SetupThrottle(UserRateThrottle):
    rate = '3/minute'  # Limit to 3 setup attempts per minute

   
@method_decorator(csrf_exempt, name='dispatch')
class SaveStep4View(BaseOnboardingView):
    """
    Handles the final step of onboarding, managing database setup and configuration.
    
    This view is responsible for:
    - Initiating and monitoring setup tasks
    - Managing setup state and progress
    - Handling cancellation and cleanup
    - Ensuring proper authentication and authorization
    - Providing status updates and error handling
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]  # Remove SessionAuthentication
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    throttle_classes = [SetupThrottle]
    
    # Configuration constants
    SETUP_TIMEOUT = 30  # seconds
    MAX_RETRIES = 3
    RETRY_DELAY = 1  # seconds

    def dispatch(self, request, *args, **kwargs):
        """
        Enhanced dispatch method with comprehensive token validation and logging.
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        logger.debug("Setup endpoint request received:", {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'user_authenticated': request.user.is_authenticated,
            'auth_header': bool(request.headers.get('Authorization')),
            'session_auth': bool(request.session.get('_auth_user_id')),
            'timestamp': timezone.now().isoformat()
        })
        
        try:
            # Validate authentication token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header:
                return self._error_response(
                    'No authorization token provided',
                    'missing_token',
                    status.HTTP_401_UNAUTHORIZED,
                    request_id
                )

            if not auth_header.startswith('Bearer '):
                return self._error_response(
                    'Invalid authorization header format',
                    'invalid_header',
                    status.HTTP_401_UNAUTHORIZED,
                    request_id
                )

            try:
                token = auth_header.split(' ')[1]
                access_token = AccessToken(token)
                access_token.verify()
                
                # Verify token expiration
                now = timezone.now().timestamp()
                if access_token['exp'] < now:
                    raise TokenError('Token has expired')
                
                # Verify user ID matches
                if str(access_token['user_id']) != str(request.user.id):
                    raise TokenError('Token user mismatch')
                
                logger.debug("Token validation successful:", {
                    'request_id': request_id,
                    'user_id': access_token['user_id'],
                    'exp': access_token['exp']
                })

                return super().dispatch(request, *args, **kwargs)

            except TokenError as e:
                return self._error_response(
                    str(e),
                    'invalid_token',
                    status.HTTP_401_UNAUTHORIZED,
                    request_id
                )

        except Exception as e:
            return self._handle_exception(e, request_id)

    def _error_response(self, message, code, status_code, request_id):
        response = Response({
            'error': message,
            'code': code,
            'request_id': request_id
        }, status=status_code)

        # Set renderer explicitly (if required)
        response.accepted_renderer = JSONRenderer()
        response.accepted_media_type = 'application/json'
        response.renderer_context = {
            'view': self,
            'request': self.request,  # Ensure self.request exists
        }
        return response

    def _handle_exception(self, exc, request_id):
        """Centralized exception handling with logging"""
        logger.error("Setup error occurred:", {
            'request_id': request_id,
            'error': str(exc),
            'type': type(exc).__name__,
            'trace': traceback.format_exc()
        })
        return self._error_response(
            str(exc),
            'internal_error',
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            request_id
        )

        def post(self, request, *args, **kwargs):
            """Handles setup process with proper authentication and error handling."""
            request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
            
            # Logging request metadata
            logger.debug("Received setup request", {
                "request_id": request_id,
                "method": request.method,
                "path": request.path,
                "user_authenticated": request.user.is_authenticated,
                "auth_header_present": bool(request.headers.get("Authorization")),
                "timestamp": timezone.now().isoformat(),
            })

            try:
                # Validate Authorization header
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    return self._error_response("Missing or invalid authorization header", "invalid_auth", status.HTTP_401_UNAUTHORIZED, request_id)

                token = auth_header.split(" ")[1]  # Extract token
                try:
                    access_token = AccessToken(token)
                    access_token.verify()

                    # Ensure token is not expired
                    if access_token["exp"] < timezone.now().timestamp():
                        return self._error_response("Token expired", "expired_token", status.HTTP_401_UNAUTHORIZED, request_id)

                    # Ensure user ID matches
                    if str(access_token["user_id"]) != str(request.user.id):
                        return self._error_response("User mismatch", "user_mismatch", status.HTTP_401_UNAUTHORIZED, request_id)

                    logger.debug("Token validation successful", {
                        "request_id": request_id,
                        "user_id": access_token["user_id"],
                    })

                except TokenError as e:
                    return self._error_response(str(e), "invalid_token", status.HTTP_401_UNAUTHORIZED, request_id)

                # Extract request data
                try:
                    request_data = json.loads(request.body)
                except json.JSONDecodeError:
                    return self._error_response("Invalid JSON", "invalid_json", status.HTTP_400_BAD_REQUEST, request_id)

                # Processing setup request
                response_data = {
                    "status": "started",
                    "message": "Setup initiated successfully",
                    "request_id": request_id,
                    "setup_details": request_data
                }

                return Response(response_data, status=status.HTTP_202_ACCEPTED)

            except Exception as e:
                return self._handle_exception(e, request_id)

        def _error_response(self, message, code, status_code, request_id):
            """Standardized error response"""
            logger.error(f"Setup error: {message}", {"request_id": request_id})
            return Response({
                "error": message,
                "code": code,
                "request_id": request_id
            }, status=status_code)

        def _handle_exception(self, exc, request_id):
            """Handles unexpected exceptions"""
            logger.error(f"Unexpected setup error: {str(exc)}", {
                "request_id": request_id,
                "trace": traceback.format_exc()
            })
            return self._error_response(str(exc), "internal_error", status.HTTP_500_INTERNAL_SERVER_ERROR, request_id)


    def get_or_create_user_profile(self, user, request_id=None):
            """
            Retrieves or creates a user profile with enhanced error handling and retries.
            
            This method implements a retry mechanism for race conditions and includes
            detailed logging for debugging profile creation issues. It ensures that
            business information is properly linked to the profile.
            
            Args:
                user: The User instance to get/create profile for
                request_id: Optional request ID for log correlation
                
            Returns:
                UserProfile: The retrieved or created user profile
                
            Raises:
                Exception: If profile creation fails after retries
            """
            for attempt in range(self.MAX_RETRIES):
                try:
                    # Try to get existing profile first
                    profile = UserProfile.objects.select_related(
                        'user', 
                        'business'
                    ).get(user=user)
                    
                    logger.debug("Retrieved existing user profile:", {
                        'request_id': request_id,
                        'user_email': user.email,
                        'profile_id': profile.id,
                        'has_business': bool(profile.business)
                    })
                    return profile
                    
                except UserProfile.DoesNotExist:
                    try:
                        # Create new profile with atomic transaction
                        with transaction.atomic():
                            # Get or create business first
                            business, created = Business.objects.get_or_create(
                                owner=user,
                                defaults={
                                    'business_name': f"{user.first_name}'s Business",
                                    'business_type': 'default',  # Add appropriate default
                                    'created_at': timezone.now()
                                }
                            )

                            # Create profile with business link
                            profile = UserProfile.objects.create(
                                user=user,
                                business=business,
                                is_business_owner=True,
                                setup_status='in_progress',
                                email_verified=user.email,
                                created_at=timezone.now()
                            )

                            logger.info("Created new user profile:", {
                                'request_id': request_id,
                                'user_email': user.email,
                                'profile_id': profile.id,
                                'business_id': business.id,
                                'business_created': created
                            })
                            return profile

                    except IntegrityError as e:
                        # Handle race condition - another process might have created the profile
                        if attempt < self.MAX_RETRIES - 1:
                            logger.warning("Profile creation race condition:", {
                                'request_id': request_id,
                                'attempt': attempt + 1,
                                'error': str(e)
                            })
                            time.sleep(self.RETRY_DELAY * (2 ** attempt))
                            continue
                        raise

            raise Exception("Failed to create user profile after retries")

    def get_progress_with_lock(self, user, request_id=None):
        """
        Retrieves onboarding progress with pessimistic locking to prevent race conditions.
        
        This method implements a robust locking mechanism to ensure data consistency
        when multiple processes might be updating the progress simultaneously.
        
        Args:
            user: The User instance to get progress for
            request_id: Optional request ID for log correlation
            
        Returns:
            OnboardingProgress: The locked progress record
            
        Raises:
            Exception: If progress record cannot be retrieved or locked
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                with transaction.atomic():
                    progress = (OnboardingProgress.objects
                        .select_for_update(nowait=True)
                        .select_related('user', 'business')
                        .get(user=user))

                    logger.debug("Retrieved locked onboarding progress:", {
                        'request_id': request_id,
                        'progress_id': progress.id,
                        'current_step': progress.current_step,
                        'status': progress.onboarding_status,
                        'attempt': attempt + 1
                    })
                    return progress

            except OperationalError as e:
                # Handle lock acquisition failure
                if attempt < self.MAX_RETRIES - 1:
                    logger.warning("Progress lock acquisition failed:", {
                        'request_id': request_id,
                        'attempt': attempt + 1,
                        'error': str(e)
                    })
                    time.sleep(self.RETRY_DELAY * (2 ** attempt))
                    continue
                raise Exception("Failed to acquire progress lock after retries")

            except OnboardingProgress.DoesNotExist:
                logger.error("Onboarding progress not found:", {
                    'request_id': request_id,
                    'user_email': user.email
                })
                raise

    @transaction.atomic
    def handle_start(self, user, data):
        """
        Initiates the setup process with comprehensive validation and error handling.
        """
        request_id = data.get('request_id', str(uuid.uuid4()))
        
        try:
            # Validate request data
            serializer = SetupRequestSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            # Get or create user profile and progress
            profile = self.get_or_create_user_profile(user, request_id)
            progress = self.get_progress_with_lock(user, request_id)

            # Check existing task state
            if progress.database_setup_task_id and not validated_data.get('force_restart'):
                existing_task = AsyncResult(progress.database_setup_task_id)
                
                if existing_task.state in TaskState.active_states():
                    return Response({
                        'status': 'in_progress',
                        'task_id': progress.database_setup_task_id,
                        'message': 'Setup already in progress',
                        'current_state': existing_task.state,
                        'progress': getattr(existing_task.info, 'progress', 0)
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Initialize setup task
            task = setup_user_database_task.delay(
                str(user.id),
                str(profile.business.id),
                request_id=request_id,
                options=validated_data.get('setup_options', {})
            )

            # Update progress state
            self._update_progress_state(progress, task.id)

            response_data = {
                'status': 'started',
                'task_id': task.id,
                'message': 'Setup initiated successfully',
                'provisioning_status': progress.database_provisioning_status,
                'technical_status': progress.technical_setup_status,
                'retry_count': progress.setup_retries,
                'started_at': progress.setup_started_at.isoformat()
            }

            # Validate response format
            response_serializer = SetupResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(
                response_serializer.validated_data,
                status=status.HTTP_202_ACCEPTED
            )

        except serializers.ValidationError as e:
            return self._error_response(
                str(e),
                'validation_error',
                status.HTTP_400_BAD_REQUEST,
                request_id
            )
        except Exception as e:
            # Ensure we record the error in progress
            if 'progress' in locals():
                progress.last_error = str(e)
                progress.save(update_fields=['last_error'])
            return self._handle_exception(e, request_id)

    def _update_progress_state(self, progress, task_id):
        """Updates progress record with new task information"""
        progress.database_setup_task_id = task_id
        progress.database_provisioning_status = 'provisioning'
        progress.technical_setup_status = 'in_progress'
        progress.setup_started_at = timezone.now()
        progress.setup_retries += 1
        progress.last_error = None
        
        progress.save(update_fields=[
            'database_setup_task_id',
            'database_provisioning_status',
            'technical_setup_status',
            'setup_started_at',
            'setup_retries',
            'last_error'
        ])

    def handle_cancel(self, user):
        """
        Handles setup cancellation requests with proper cleanup and state management.
        
        This method ensures that when a setup process is cancelled:
        1. All running tasks are properly terminated
        2. Database state is consistently updated
        3. Resources are cleaned up
        4. The user can safely restart setup later
        """
        request_id = str(uuid.uuid4())
        
        try:
            # Acquire lock on progress record to prevent race conditions
            with transaction.atomic():
                progress = OnboardingProgress.objects.select_for_update().get(user=user)

                # If there's an active task, handle its cancellation
                if progress.database_setup_task_id:
                    task = AsyncResult(progress.database_setup_task_id)
                    previous_status = task.status if task else None

                    logger.debug("Cancelling setup task:", {
                        'request_id': request_id,
                        'task_id': progress.database_setup_task_id,
                        'previous_status': previous_status,
                        'user_email': user.email
                    })

                    # Revoke task if it's still active
                    if task and task.status in self.TASK_STATES[:3]:
                        task.revoke(terminate=True, signal='SIGTERM')
                        
                        # Clean up any partial setup
                        try:
                            cleanup_database(user.id)
                        except Exception as e:
                            logger.warning("Cleanup after cancellation failed:", {
                                'request_id': request_id,
                                'error': str(e)
                            })

                    # Update progress record to reflect cancellation
                    progress.database_setup_task_id = None
                    progress.database_provisioning_status = 'cancelled'
                    progress.technical_setup_status = 'cancelled'
                    progress.cancellation_reason = 'user_requested'
                    progress.cancelled_at = timezone.now()
                    
                    progress.save(update_fields=[
                        'database_setup_task_id',
                        'database_provisioning_status',
                        'technical_setup_status',
                        'cancellation_reason',
                        'cancelled_at'
                    ])

                    logger.info("Setup task cancelled successfully:", {
                        'request_id': request_id,
                        'user_email': user.email,
                        'previous_status': previous_status
                    })

                    return Response({
                        'status': 'cancelled',
                        'previous_status': previous_status,
                        'message': 'Setup task successfully cancelled',
                        'cancelled_at': progress.cancelled_at.isoformat()
                    })

                # No active task to cancel
                logger.debug("No active task to cancel:", {
                    'request_id': request_id,
                    'user_email': user.email
                })

                return Response({
                    'status': 'no_task',
                    'message': 'No active setup task found'
                })

        except OnboardingProgress.DoesNotExist:
            logger.error("Cannot cancel - progress not found:", {
                'request_id': request_id,
                'user_email': user.email
            })
            return Response({
                'error': 'Onboarding progress not found',
                'code': 'progress_not_found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error("Cancellation failed:", {
                'request_id': request_id,
                'error': str(e),
                'trace': traceback.format_exc()
            })
            return Response({
                'error': 'Failed to cancel setup',
                'detail': str(e),
                'code': 'cancellation_failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        """
        Handles GET requests to check setup status with comprehensive progress tracking.
        
        This method provides detailed information about:
        1. Current setup state and progress
        2. Task status and error details if any
        3. Timing information for performance monitoring
        4. Resource usage and setup metrics
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        try:
            # Get progress with related data for efficiency
            progress = OnboardingProgress.objects.select_related(
                'user', 
                'business'
            ).get(user=user.user)

            # Build base response data
            response_data = {
                'request_id': request_id,
                'timestamp': timezone.now().isoformat(),
                'user_email': request.user.email,
                'provisioning_status': progress.database_provisioning_status,
                'technical_status': progress.technical_setup_status
            }

            # If there's an active task, get its details
            if progress.database_setup_task_id:
                task = AsyncResult(progress.database_setup_task_id)
                task_info = task.info if isinstance(task.info, dict) else {}

                # Add detailed task information
                response_data.update({
                    'status': task.status,
                    'progress': task_info.get('progress', 0),
                    'step': task_info.get('step', 'Processing'),
                    'task_id': progress.database_setup_task_id,
                    'started_at': progress.setup_started_at.isoformat() if progress.setup_started_at else None,
                    'estimated_completion': task_info.get('eta'),
                    'task_details': {
                        'current_operation': task_info.get('operation'),
                        'resources_allocated': task_info.get('resources'),
                        'error_count': task_info.get('error_count', 0)
                    }
                })

                logger.debug("Retrieved active task status:", {
                    'request_id': request_id,
                    'task_id': progress.database_setup_task_id,
                    'status': task.status,
                    'progress': task_info.get('progress', 0)
                })

            else:
                # No active task - return current state
                response_data.update({
                    'status': 'READY',
                    'progress': 0,
                    'current_step': progress.current_step,
                    'setup_retries': progress.setup_retries,
                    'last_attempt': progress.setup_started_at.isoformat() if progress.setup_started_at else None
                })

            return Response(response_data)

        except OnboardingProgress.DoesNotExist:
            logger.warning("Progress not found for status check:", {
                'request_id': request_id,
                'user_email': request.user.email
            })
            return Response({
                'status': 'NOT_STARTED',
                'progress': 0,
                'current_step': 1,
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error("Status check failed:", {
                'request_id': request_id,
                'error': str(e),
                'trace': traceback.format_exc()
            })
            return Response({
                'error': 'Failed to retrieve setup status',
                'detail': str(e),
                'code': 'status_check_failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OnboardingSuccessView(BaseOnboardingView):
    """
    Handles the finalization of the onboarding process after a successful Stripe payment session.
    """

    @sync_to_async
    def get_user(self, request):
        """
        Retrieve the currently authenticated user from the request.
        """
        return request.user

    @sync_to_async
    def verify_stripe_session(self, session_id, user_id):
        """
        Verify the Stripe session by checking the client reference ID.
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return session.client_reference_id == str(user_id), session
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error during session verification: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error retrieving Stripe session: {str(e)}")
            raise

    @sync_to_async
    def update_subscription(self, user, session):
        """
        Update the user's subscription details and onboarding progress.
        """
        try:
            with transaction.atomic():
                # Update onboarding progress
                progress = OnboardingProgress.objects.select_for_update().get(user=user)
                progress.payment_completed = True
                progress.onboarding_status = 'complete'
                progress.current_step = null  # Reset current step after completion
                progress.save(update_fields=[
                    'payment_completed', 'onboarding_status', 'current_step'
                ])

                # Update or create subscription
                subscription, _ = Subscription.objects.update_or_create(
                    business=user.userprofile.business,
                    defaults={
                        'selected_plan': 'professional',
                        'start_date': datetime.now().date(),
                        'is_active': True,
                        'billing_cycle': 'monthly' if session.subscription else 'annual'
                    }
                )
                logger.info(f"Subscription updated for user: {user.email}")
                return subscription
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.id}")
            raise
        except Exception as e:
            logger.error(f"Error updating subscription: {str(e)}", exc_info=True)
            raise

    async def post(self, request):
        """
        Handle POST request to finalize onboarding after payment.
        """
        logger.info("Processing onboarding completion")
        user = await self.get_user(request)
        session_id = request.data.get('session_id')  # Use snake_case for consistency

        if not session_id:
            return Response({"error": "No session ID provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify Stripe session
            is_valid, session = await self.verify_stripe_session(session_id, user.id)
            if not is_valid:
                logger.error(f"Invalid session for user {user.id}")
                return Response({"error": "Invalid session"}, status=status.HTTP_400_BAD_REQUEST)

            # Update subscription
            await self.update_subscription(user, session)

            # Complete onboarding
            state_manager = OnboardingStateManager(user)
            if await state_manager.transition_to('complete'):
                logger.info(f"Onboarding completed for user: {user.id}")
                return Response({
                    "message": "Onboarding completed successfully"
                }, status=status.HTTP_200_OK)

            logger.error(f"Failed to transition onboarding state for user: {user.id}")
            return Response({
                "error": "Failed to complete onboarding"
            }, status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return Response({
                "error": "Stripe error occurred",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.id}")
            return Response({
                "error": "Onboarding progress not found"
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Unexpected error in OnboardingSuccess: {str(e)}", exc_info=True)
            return Response({
                "error": "An unexpected error occurred",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckOnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get_onboarding_data(self, user, request_id):
        """Retrieve onboarding progress and user profile with optimized queries."""
        try:
            progress = OnboardingProgress.objects.select_related(
                'user', 'business'
            ).get(user=user)
            
            user_profile = UserProfile.objects.select_related(
                'business'
            ).filter(user=user).first()

            # Ensure both objects are present
            if not progress or not user_profile:
                logger.warning("Missing data:", {
                    'request_id': request_id,
                    'has_progress': bool(progress),
                    'has_profile': bool(user_profile)
                })
                return None, None

            return progress, user_profile

        except OnboardingProgress.DoesNotExist:
            logger.warning("Onboarding progress not found:", {
                'request_id': request_id,
                'user_email': user.email
            })
            return None, None
        except Exception as e:
            logger.error("Error retrieving onboarding data:", {
                'request_id': request_id,
                'error': str(e)
            })
            return None, None

    def get_task_status(self, task_id, request_id):
        """Retrieve the status of a Celery task."""
        if not task_id:
            return None

        try:
            task = AsyncResult(task_id)
            task_info = task.info if isinstance(task.info, dict) else {}
            
            return {
                'status': task.state,
                'progress': int(task_info.get('progress', 0)),  # Ensure integer
                'step': str(task_info.get('step', 'Initializing')),  # Ensure string
                'error': str(task.result) if task.failed() else None
            }
        except Exception as e:
            logger.error("Task status retrieval failed:", {
                'request_id': request_id,
                'error': str(e)
            })
            return None

    def get(self, request):
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))

        try:
            progress = OnboardingProgress.objects.select_related('user', 'business').filter(user=request.user).first()

            if not progress:
                return Response({
                    'status': 'new',
                    'currentStep': 0,  # Indicate onboarding hasn't started
                    'setup_complete': False,
                }, status=status.HTTP_200_OK)

            has_business_info = progress.business and all([
                progress.business.business_name,
                progress.business.business_type,
                progress.business.country,
                progress.business.legal_structure,
            ])

            response_data = {
                'status': str(progress.onboarding_status or 'unknown'),
                'currentStep': str(progress.current_step or 'unknown'),
                'setup_complete': bool(progress.database_provisioning_status == 'complete'),
                'hasBusinessInfo': bool(has_business_info),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error checking onboarding status: {str(e)}")
            return Response({'status': 'error', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DatabaseHealthCheckView(BaseOnboardingView):
    """View for checking database health status and connectivity"""

    def get_user_database(self, user):
        """Get user's database information with related data"""
        try:
            profile = UserProfile.objects.select_related('user', 'business').get(user=user)
            if not profile.database_name:
                logger.warning(f"No database configured for user {user.email}")
                return None, profile
            return profile.database_name, profile
        except UserProfile.DoesNotExist:
            logger.error(f"Profile not found for user {user.email}")
            return None, None

    def check_table_requirements(self, database_name):
        """Verify required database tables exist"""
        try:
            return check_database_setup(database_name)
        except Exception as e:
            logger.error(f"Table check error: {str(e)}")
            return False

    def get(self, request, *args, **kwargs):
        """Handle GET request for database health check"""
        try:
            database_name, profile = self.get_user_database(request.user)
            validation_result = self.validate_user_state(request.user)
            
            # Case 1: No database configured
            if not database_name:
                return Response({
                    "status": "not_found",
                    "database_provisioning_status": 'not_started',
                    "technical_setup_status": 'pending',
                    "database_name": None,
                    "message": "No database configured",
                    "onboarding_required": True,
                    "details": {
                        "connection_status": "disconnected",
                        "tables_status": "invalid"
                    },
                    "timestamp": timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)

            # Get progress object
            progress = OnboardingProgress.objects.select_for_update().get(user=request.user)

            # Check health and update statuses
            is_healthy = check_database_health(database_name)
            tables_valid = self.check_table_requirements(database_name) if is_healthy else False

            with transaction.atomic():
                if is_healthy and tables_valid:
                    progress.database_provisioning_status = 'active'
                    progress.technical_setup_status = 'completed'
                else:
                    progress.database_provisioning_status = 'error'
                    progress.technical_setup_status = 'failed'
                    
                progress.save(update_fields=[
                    'database_provisioning_status',
                    'technical_setup_status'
                ])

            response_data = {
                "status": "healthy" if (is_healthy and tables_valid) else "unhealthy",
                "database_provisioning_status": progress.database_provisioning_status,
                "technical_setup_status": progress.technical_setup_status,
                "database_name": database_name,
                "details": {
                    "connection_status": "connected" if is_healthy else "disconnected",
                    "tables_status": "valid" if tables_valid else "invalid"
                },
                "timestamp": timezone.now().isoformat()
            }

            return Response(
                response_data, 
                status=status.HTTP_200_OK if (is_healthy and tables_valid) else status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            logger.error(f"Health check error: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "database_provisioning_status": 'error',
                "technical_setup_status": 'failed',
                "message": str(e),
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
class ResetOnboardingView(BaseOnboardingView):

    def get_user_profile(self, user):
        """
        Get user profile with proper error handling.
        
        Args:
            user: The User instance to get profile for
            
        Returns:
            UserProfile instance or None if not found
            
        Raises:
            Exception: If database error occurs during retrieval
        """
        try:
            return UserProfile.objects.select_related('user', 'business').get(user=user)
        except UserProfile.DoesNotExist:
            logger.error(f"Profile not found for user {user.email}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            raise

    def cleanup_database(self, database_name):
        """Clean up existing database if it exists"""
        try:
            with connections['default'].cursor() as cursor:
                # Kill existing connections
                cursor.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity 
                    WHERE datname = %s AND pid != pg_backend_pid()
                """, [database_name])
                
                # Drop database
                cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
            return True
        except Exception as e:
            logger.error(f"Database cleanup error: {str(e)}")
            return False

    def reset_business_data(self, user):
        try:
            logger.info(f"Resetting business data for user {user.email}")
            business = Business.objects.get(user_profile__user=user)
            business.business_name = ''
            business.business_type = ''
            business.save()
            
            logger.info(f"Business data reset for user {user.email}")
            return True
        except Exception as e:
            logger.error(f"Business data reset error: {str(e)}")
            return False

    def reset_profile(self, profile):
        """
        Reset a user profile to its initial state.
        
        This method handles the proper cleanup of profile-related data,
        ensuring all database and setup statuses are reset correctly.
        
        Args:
            profile: UserProfile instance to reset
            
        Returns:
            None
            
        Raises:
            Exception: If reset operations fail
        """
        try:
            with transaction.atomic():
                # Reset database-related fields
                profile.database_name = None
                profile.database_status = 'not_created'
                profile.setup_status = 'not_started'
                profile.last_setup_attempt = None
                profile.setup_error_message = None
                profile.database_setup_task_id = None
                
                # Save all changes atomically
                profile.save(update_fields=[
                    'database_name',
                    'database_status',
                    'setup_status',
                    'last_setup_attempt',
                    'setup_error_message',
                    'database_setup_task_id'
                ])
                
                # Reset related onboarding progress
                OnboardingProgress.objects.filter(user=profile.user).update(
                    onboarding_status='step1',
                    current_step=1,
                    completed_at=None
                )
                
                logger.info(f"Successfully reset profile for user {profile.user.email}")
                
        except Exception as e:
            logger.error(f"Failed to reset profile: {str(e)}", exc_info=True)
            raise

    def post(self, request):
        """
        Handle POST requests to reset onboarding state.
        
        This endpoint completely resets a user's onboarding progress,
        including database configuration and profile settings.
        """
        try:
            # Get user profile
            profile = self.get_user_profile(request.user)
            if not profile:
                logger.error(f"No profile found for user {request.user.email}")
                return Response({
                    "error": "Profile not found",
                    "code": "profile_not_found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Perform the reset operation
            self.reset_profile(profile)

            # Clean up database if it exists
            if profile.database_name:
                try:
                    with connections['default'].cursor() as cursor:
                        # Kill existing connections
                        cursor.execute("""
                            SELECT pg_terminate_backend(pid) 
                            FROM pg_stat_activity 
                            WHERE datname = %s AND pid != pg_backend_pid()
                        """, [profile.database_name])
                        # Drop the database
                        cursor.execute(f'DROP DATABASE IF EXISTS "{profile.database_name}"')
                except Exception as e:
                    logger.error(f"Database cleanup error: {str(e)}")
                    # Continue even if database cleanup fails
                    
            return Response({
                "status": "reset_successful",
                "message": "Onboarding reset complete",
                "next_step": "step1"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Reset operation failed: {str(e)}", exc_info=True)
            return Response({
                "error": str(e),
                "code": "reset_failed"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
async def get_database_status(request):
    user_profile = request.user.profile
    try:
        if not user_profile.database_name:
            return Response({
                'status': 'pending',
                'message': 'Database setup in progress'
            })

        is_healthy = await check_database_health(user_profile.database_name)
        return Response({
            'status': 'ready' if is_healthy else 'initializing',
            'database_name': user_profile.database_name,
            'setup_complete': is_healthy
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        })

def check_database_setup(database_name):
    required_tables = [
        # Authentication and Users
        'users_user',
        'users_userprofile',
        'auth_permission',
        
        # Sales
        'sales_customer',
        'sales_invoice',
        'sales_invoiceitem',
        'sales_product',
        'sales_service',
        'sales_salesorder',
        'sales_estimate',
        
        # Finance
        'finance_account',
        'finance_accountcategory',
        'finance_financetransaction',
        'finance_journalentry',
        'finance_chartofaccount',
        
        # Banking
        'banking_bankaccount',
        'banking_banktransaction',
        
        # Purchases
        'purchases_vendor',
        'purchases_bill',
        'purchases_purchaseorder',
        'purchases_expense',
        
        # Inventory
        'inventory_inventoryitem',
        'inventory_category',
        'inventory_location',
        
        # HR and Payroll
        'hr_employee',
        'payroll_payrollrun',
        'payroll_timesheet',
        
        # Accounting
        'finance_generalledgerentry',
        'finance_reconciliationitem',
        'finance_budget'
    ]
    
    try:
        with connections[database_name].cursor() as cursor:
            cursor.execute("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            """)
            existing_tables = {row[0] for row in cursor.fetchall()}
            
            # Check if all required tables exist
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            if missing_tables:
                logger.warning(f"Missing tables in {database_name}: {missing_tables}")
                return False
                
            return True
            
    except Exception as e:
        logger.error(f"Error checking database setup: {str(e)}")
        return False

@api_view(['POST'])
@permission_classes([IsAuthenticated])
async def cancel_task(request, task_id: str):
    """
    Cancel a running Celery task
    
    Args:
        request: The HTTP request
        task_id: The ID of the task to cancel
        
    Returns:
        Response: The cancellation result
    """
    logger.info(f"Cancelling task: {task_id}")
    try:
        # Get current task status
        status = await get_task_status(task_id)
        
        # Only cancel if task is still running
        if status['status'] in ['PENDING', 'STARTED', 'PROGRESS']:
            task_result = AsyncResult(task_id)
            task_result.revoke(terminate=True)
            
            return Response({
                'status': 'cancelled',
                'previous_status': status['status']
            }, status=status.HTTP_200_OK)
        
        return Response({
            'status': 'not_cancelled',
            'reason': f"Task is already in {status['status']} state"
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        return Response({
            'error': str(e),
            'status': 'error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SetupStatusView(BaseOnboardingView):
    
    """
    View for checking database setup status. This view provides detailed information
    about the current state of a user's database setup process.
    """

    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get_task_info(self, task_id):
        """
        Retrieve detailed information about a running setup task.
        Includes progress, current step, and any error information.
        """
        try:
            task = AsyncResult(task_id)
            task_info = task.info if isinstance(task.info, dict) else {}
            return {
                "status": task.state,
                "progress": task_info.get('progress', 0),
                "step": task_info.get('step', 'Processing'),
                "details": task_info.get('details', {}),
                "error": str(task.result) if task.failed() else None,
                "estimated_time": task_info.get('eta'),
                "started_at": task_info.get('started_at'),
                "last_update": task_info.get('last_update')
            }
        except Exception as e:
            logger.error(f"Error retrieving task info: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    def get(self, request):
        """
        Handle GET requests to check setup status.
        Returns comprehensive information about setup progress.
        """
        try:
            progress = OnboardingProgress.objects.get(user=request.user)
            response_data = {
                "status": progress.database_provisioning_status,
                "selected_plan": progress.selected_plan,
                "setup_status": progress.technical_setup_status,
                "progress": progress.setup_progress
            }

            if progress.database_setup_task_id:
                task_info = self.get_task_info(progress.database_setup_task_id)
                response_data.update(task_info)

            return Response(response_data, status=status.HTTP_200_OK)
        except OnboardingProgress.DoesNotExist:
            return Response({
                "status": "not_found",
                "message": "No onboarding progress found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error checking setup status: {str(e)}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ValidateSubscriptionAccessView(BaseOnboardingView):
    def get(self, request):
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        logger.debug("Starting subscription validation:", {
            'request_id': request_id,
            'user_id': request.user.id,
            'email': request.user.email
        })

        try:
            # Get onboarding progress with business info
            progress = OnboardingProgress.objects.select_related(
                'user', 
                'business'
            ).get(user=request.user)
            
            # Get current plan with fallback
            current_plan = getattr(progress, 'selected_plan', 'free')
            current_status = getattr(progress, 'subscription_status', 'not_started')
            
            # Log initial progress state
            logger.debug("Found onboarding progress:", {
                'request_id': request_id,
                'onboarding_status': progress.onboarding_status,
                'current_step': progress.current_step,
                'subscription_status': current_status,
                'selected_plan': current_plan
            })
            
            # Check business info
            business = progress.business
            has_business_info = False
            
            if business:
                required_fields = [
                    getattr(business, 'business_name', None),
                    getattr(business, 'business_type', None),
                    getattr(business, 'country', None),
                    getattr(business, 'legal_structure', None)
                ]
                has_business_info = all(required_fields)
                
                if not has_business_info:
                    missing = [field for field, value in zip(
                        ['business_name', 'business_type', 'country', 'legal_structure'],
                        required_fields
                    ) if not value]
                    logger.debug("Missing business info:", {
                        'request_id': request_id,
                        'missing_fields': missing
                    })

            # Get subscription if it exists
            subscription = Subscription.objects.filter(business=business).first() if business else None

            # Determine access
            can_access = (
                progress.onboarding_status in ['subscription', 'business-info', 'setup'] and
                (current_plan == 'free' or (subscription and subscription.is_active))
            )

            response_data = {
                'can_access': can_access,
                'current_status': progress.onboarding_status,
                'current_step': progress.current_step,
                'has_business_info': has_business_info,
                'subscription_status': current_status,
                'selected_plan': current_plan
            }

            # Add business info if available
            if business:
                response_data['business_info'] = {
                    'is_complete': has_business_info,
                    'business_id': str(business.id),
                    'business_name': getattr(business, 'business_name', None),
                    'business_type': getattr(business, 'business_type', None),
                    'country': business.country.code if getattr(business, 'country', None) else None,
                    'legal_structure': getattr(business, 'legal_structure', None)
                }

            # Add subscription info if available
            if subscription:
                response_data['subscription_info'] = {
                    'is_active': subscription.is_active,
                    'selected_plan': subscription.selected_plan,
                    'billing_cycle': subscription.billing_cycle
                }

            logger.debug("Validation response:", {
                'request_id': request_id,
                'can_access': can_access,
                'current_plan': current_plan
            })

            return Response(response_data, status=status.HTTP_200_OK)

        except OnboardingProgress.DoesNotExist:
            logger.error("No onboarding progress found:", {
                'request_id': request_id,
                'user_id': request.user.id
            })
            return Response({
                'can_access': False,
                'reason': 'progress_not_found',
                'current_status': 'not_started'
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error("Validation error:", {
                'request_id': request_id,
                'error': str(e),
                'type': type(e).__name__,
                'trace': traceback.format_exc()
            })
            return Response({
                'can_access': False,
                'reason': 'validation_error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def handle_exception(self, exc):
        """Override to handle exceptions with better error messages"""
        if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            return Response({
                'error': 'Authentication required',
                'can_access': False,
                'reason': 'not_authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        return super().handle_exception(exc)


class TokenVerifyView(APIView):
    """
    View to verify the validity of an access token.
    """
    permission_classes = [AllowAny]  # Allow unauthenticated requests to verify tokens

    def post(self, request):
        """
        Verify token from the Authorization header.
        """
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return Response({
                    'is_valid': False,
                    'error': 'No token provided'
                }, status=status.HTTP_401_UNAUTHORIZED)

            token = auth_header.split(' ')[1]
            access_token = AccessToken(token)
            access_token.verify()

            return Response({
                'is_valid': True,
                'user_id': str(access_token['user_id']),
                'exp': access_token['exp'],
                'token_type': access_token['token_type']
            }, status=status.HTTP_200_OK)
        except TokenError:
            return Response({
                'is_valid': False,
                'error': 'Invalid or expired token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return Response({
                'is_valid': False,
                'error': 'Token verification failed'
            }, status=status.HTTP_401_UNAUTHORIZED)


class GetBusinessInfoView(APIView):
    """
    View to retrieve business information for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        try:
            progress = OnboardingProgress.objects.get(user=request.user)
            serializer = BusinessInfoSerializer(progress)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Business info not found for user {request.user.id}")
            return Response({
                'error': 'Business information not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting business info: {str(e)}")
            return Response({
                'error': 'Failed to retrieve business information',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class UpdateOnboardingStatusView(APIView):
    """
    View to update the onboarding status and progress of a user.
    """
    VALID_STEPS = ['business-info', 'subscription', 'payment', 'setup', 'complete']
    
    def validate_steps(self, current_step, next_step):
        """Validate step transitions"""
        if current_step not in self.VALID_STEPS:
            raise ValidationError(f"Invalid current_step: {current_step}")
        if next_step and next_step not in self.VALID_STEPS:
            raise ValidationError(f"Invalid next_step: {next_step}")

    def post(self, request):
        request_id = str(uuid.uuid4())
        logger.info("Status update request:", {
            'request_id': request_id,
            'data': request.data,
            'user_id': request.user.id
        })
        
        try:
            current_step = request.data.get('current_step')
            next_step = request.data.get('next_step')
            selected_plan = request.data.get('selected_plan')

            # Validate steps
            if not current_step or current_step not in self.VALID_STEPS:
                return Response({
                    'error': f'Invalid current_step: {current_step}',
                    'valid_steps': self.VALID_STEPS
                }, status=status.HTTP_400_BAD_REQUEST)

            if next_step and next_step not in self.VALID_STEPS:
                return Response({
                    'error': f'Invalid next_step: {next_step}',
                    'valid_steps': self.VALID_STEPS
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                # Get progress with locking
                progress = OnboardingProgress.objects.select_for_update().get(user=request.user)
                
                # Update progress fields
                progress.onboarding_status = next_step or current_step
                progress.current_step = current_step
                progress.next_step = next_step
                
                if selected_plan:
                    progress.selected_plan = selected_plan

                # Save all changes
                progress.save(update_fields=[
                    'onboarding_status',
                    'current_step',
                    'next_step',
                    'selected_plan'
                ])

                return Response({
                    "success": True,
                    "current_step": current_step,
                    "next_step": next_step,
                    "onboarding_status": progress.onboarding_status
                })

        except OnboardingProgress.DoesNotExist:
            logger.error("Progress not found:", {
                'request_id': request_id,
                'user_id': request.user.id
            })
            return Response({
                "error": "Progress not found"
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error("Status update failed:", {
                'request_id': request_id,
                'error': str(e)
            })
            return Response({
                "error": "Failed to update status"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
def stripe_webhook(request):
    """
    Handle Stripe webhook events for subscription and payment updates.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {str(e)}")
        return HttpResponse(status=400)

    try:
        if event.type == 'checkout.session.completed':
            session = event.data.object
            
            # Get user from client reference
            try:
                user = User.objects.get(id=session.client_reference_id)
            except User.DoesNotExist:
                logger.error(f"User not found for session {session.id}")
                return HttpResponse(status=404)
                
            # Update subscription status
            with transaction.atomic():
                profile = UserProfile.objects.select_for_update().get(user=user)
                progress = OnboardingProgress.objects.select_for_update().get(user=user)
                
                # Update subscription
                subscription = Subscription.objects.update_or_create(
                    business=profile.business,
                    defaults={
                        'selected_plan': 'professional',
                        'start_date': timezone.now().date(),
                        'is_active': True,
                        'billing_cycle': 'monthly' if session.subscription else 'annual'
                    }
                )[0]
                
                # Update progress
                progress.payment_completed = True
                progress.onboarding_status = 'setup'
                progress.current_step = 'setup'
                progress.save()
                
                logger.info(f"Subscription activated for user {user.id}")
                
        elif event.type == 'customer.subscription.deleted':
            subscription = event.data.object
            customer = stripe.Customer.retrieve(subscription.customer)
            
            try:
                user = User.objects.get(email=customer.email)
                business_subscription = Subscription.objects.get(business__owner=user)
                business_subscription.is_active = False
                business_subscription.save()
                
                logger.info(f"Subscription deactivated for user {user.id}")
                
            except (User.DoesNotExist, Subscription.DoesNotExist):
                logger.error(f"User/Subscription not found for customer {customer.id}")
                return HttpResponse(status=404)

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return HttpResponse(status=500)

    return HttpResponse(status=200)


class SubscriptionStatusView(BaseOnboardingView):
    def get(self, request):
        try:
            progress = OnboardingProgress.objects.select_related('business').get(user=request.user)
            
            # Get subscription if it exists
            subscription = None
            if progress.business:
                subscription = Subscription.objects.filter(business=progress.business).first()

            response_data = {
                'status': progress.onboarding_status,
                'current_step': progress.current_step,
                'selected_plan': subscription.selected_plan if subscription else None,
                'billing_cycle': subscription.billing_cycle if subscription else None,
                'is_active': subscription.is_active if subscription else False
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except OnboardingProgress.DoesNotExist:
            return Response({
                'error': 'Subscription status not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting subscription status: {str(e)}")
            return Response({
                'error': f'Failed to get subscription status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
