# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/views.py

# Python standard library imports
import re
import json
import sys
import time
import asyncio
import traceback
import uuid
import google.auth.exceptions  # Add this import
from datetime import datetime, timedelta
from inspect import isawaitable
from typing import Dict, Any, Optional, Tuple

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

# REST framework imports
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.exceptions import AuthenticationFailed, MethodNotAllowed
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.authentication import SessionAuthentication

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
        """Handle dispatch with validation"""
        try:
            # Skip validation for public routes
            if request.path.startswith(('/api/auth/', '/api/onboarding/reset')):
                return super().dispatch(request, *args, **kwargs)

            # Validate user state
            validation_result = self.validate_user_state(request.user)
            if not validation_result['isValid']:
                return Response({
                    'error': validation_result['reason'],
                    'redirect': validation_result['redirectTo'],
                    'details': validation_result.get('details')
                }, status=status.HTTP_403_FORBIDDEN)

            # Ensure renderer is set for proper response formatting
            if not hasattr(request, 'accepted_renderer'):
                request.accepted_renderer = JSONRenderer()
                request.accepted_media_type = request.accepted_renderer.media_type

            response = super().dispatch(request, *args, **kwargs)
            
            # Ensure response has proper renderer configuration
            if not hasattr(response, 'accepted_renderer'):
                response.accepted_renderer = request.accepted_renderer
                response.accepted_media_type = request.accepted_media_type

            return response

        except Exception as e:
            logger.error(f"Error in dispatch: {str(e)}")
            error_response = Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            error_response.accepted_renderer = JSONRenderer()
            error_response.accepted_media_type = "application/json"
            return error_response


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
                        ).get(
                            Q(user=user) | Q(email=user.email)
                        )
                        if progress.user_id != user.id:
                            progress.user = user
                            progress.save()
                        return progress
                    except OnboardingProgress.DoesNotExist:
                        # Create new progress if none exists
                        return OnboardingProgress.objects.create(
                            user=user,
                            email=user.email,
                            onboarding_status='step1',
                            current_step=1
                        )
            except OperationalError:
                if attempt == 2:
                    raise
                # Exponential backoff for retries
                time.sleep(0.1 * (2 ** attempt))
                continue
            except IntegrityError as e:
                if 'onboarding_progress_email_key' in str(e):
                    return OnboardingProgress.objects.get(
                        Q(user=user) | Q(email=user.email)
                    )
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

    def validate_request_data(self, data: dict, request_id: str) -> tuple[str, str]:
        """
        Validate and extract required tokens from request data.
        
        Args:
            data: Dictionary containing request data
            request_id: Unique identifier for request tracking
            
        Returns:
            tuple: (id_token, access_token)
            
        Raises:
            ValidationError: If validation fails
        """
        logger.debug("Starting request validation", {
            'request_id': request_id,
            'has_data': bool(data),
            'content_type': data.get('content_type')
        })

        # Validate request body
        if not isinstance(data, dict):
            logger.error("Invalid request format", {
                'request_id': request_id,
                'received_type': type(data).__name__
            })
            raise ValidationError("Invalid request format")

        # Extract tokens
        id_token = data.get('id_token')
        access_token = data.get('access_token')

        # Build validation status
        validation_status = {
            'has_id_token': bool(id_token),
            'has_access_token': bool(access_token),
            'id_token_length': len(id_token) if id_token else 0,
            'access_token_length': len(access_token) if access_token else 0
        }

        # Validate tokens
        if not id_token or not access_token:
            logger.error("Missing required tokens", {
                'request_id': request_id,
                **validation_status
            })
            
            missing = []
            if not id_token:
                missing.append('id_token')
            if not access_token:
                missing.append('access_token')
                
            raise ValidationError(f"Missing required tokens: {', '.join(missing)}")

        # Validate token formats
        if not isinstance(id_token, str) or not isinstance(access_token, str):
            logger.error("Invalid token format", {
                'request_id': request_id,
                'id_token_type': type(id_token).__name__,
                'access_token_type': type(access_token).__name__
            })
            raise ValidationError("Tokens must be strings")

        # Log successful validation
        logger.debug("Request validation successful", {
            'request_id': request_id,
            **validation_status
        })

        return id_token, access_token

    def create_session_data(self, user, tokens, progress, profile, request_id: str) -> dict:
        """Create standardized session data"""
        try:
            session_data = {
                'tokens': {
                    'access': tokens['access'],
                    'refresh': tokens['refresh']
                },
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'onboarding': {
                    'status': progress.onboarding_status,
                    'current_step': progress.current_step,
                    'database_status': profile.database_status,
                    'database_name': profile.database_name,
                    'setup_status': profile.setup_status
                }
            }
            
            logger.debug("Session data created", {
                'request_id': request_id,
                'user_id': str(user.id),
                'onboarding_status': progress.onboarding_status
            })
            
            return session_data
            
        except Exception as e:
            logger.error("Failed to create session data", {
                'request_id': request_id,
                'error': str(e)
            })
            raise


    def verify_google_token(self, token: str, request_id: str):
        """Verify Google OAuth token with retry logic for time sync issues"""
        logger.info(f"Starting Google token verification", {
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
                else:
                    raise
            
            if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                logger.error("Invalid token issuer", {
                    'request_id': request_id,
                    'issuer': id_info['iss']
                })
                raise ValidationError("Invalid token issuer")

            return id_info
            
        except Exception as e:
            logger.error("Token verification failed", {
                'request_id': request_id,
                'error_type': type(e).__name__,
                'error': str(e),
                'stack_trace': traceback.format_exc()
            })
            raise

    def get_or_create_user(self, user_info, request_id: str):
        """Create or update user and related records with proper defaults"""
        logger.info("Starting user creation/update process", {
            'request_id': request_id,
            'email': user_info.get('email')
        })
        
        try:
            with transaction.atomic():
                # Create or get user
                user, created = User.objects.get_or_create(
                    email=user_info['email'],
                    defaults={
                        'first_name': user_info.get('given_name', ''),
                        'last_name': user_info.get('family_name', ''),
                        'is_active': True
                    }
                )

                logger.debug("User object processed", {
                    'request_id': request_id,
                    'user_id': str(user.id),
                    'created': created,
                    'is_active': user.is_active
                })

                # Create/update profile
                profile, profile_created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'email_verified': True,
                        'database_status': 'not_created',
                        'setup_status': 'not_started',
                        'database_name': None
                    }
                )

                logger.debug("Profile processed", {
                    'request_id': request_id,
                    'profile_created': profile_created,
                    'database_status': profile.database_status,
                    'setup_status': profile.setup_status
                })

                if not profile_created and not profile.database_status:
                    logger.info("Updating existing profile with missing initialization", {
                        'request_id': request_id,
                        'user_id': str(user.id)
                    })
                    profile.database_status = 'not_created'
                    profile.setup_status = 'not_started'
                    profile.save(update_fields=['database_status', 'setup_status'])

                # Create/update onboarding progress
                progress, progress_created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'email': user.email,
                        'onboarding_status': 'step1',
                        'current_step': 1
                    }
                )

                logger.info("Onboarding progress processed", {
                    'request_id': request_id,
                    'progress_created': progress_created,
                    'onboarding_status': progress.onboarding_status,
                    'current_step': progress.current_step
                })

                return user, created, progress

        except Exception as e:
            logger.error("Error in user creation/update", {
                'request_id': request_id,
                'error': str(e),
                'stack_trace': traceback.format_exc()
            })
            raise

    def generate_tokens(self, user, request_id: str):
        """Generate JWT tokens with error handling"""
        logger.debug("Starting token generation", {
            'request_id': request_id,
            'user_id': str(user.id)
        })
        
        try:
            refresh = RefreshToken.for_user(user)
            tokens = {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
            
            logger.info("Tokens generated successfully", {
                'request_id': request_id,
                'user_id': str(user.id),
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
            raise AuthenticationFailed("Failed to generate authentication tokens")

    def post(self, request, *args, **kwargs):
        """Handle token exchange with comprehensive error handling"""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info("Starting token exchange", {
            'request_id': request_id,
            'method': request.method,
            'content_type': request.content_type
        })
        
        try:
            # Parse and validate request
            try:
                data = json.loads(request.body) if request.body else {}
            except json.JSONDecodeError as e:
                logger.error("Invalid JSON body", {
                    'request_id': request_id,
                    'error': str(e)
                })
                return Response(
                    {'error': 'Invalid request format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                id_token, access_token = self.validate_request_data(data, request_id)
            except ValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify tokens
            try:
                user_info = self.verify_google_token(id_token, request_id)
            except ValidationError as e:
                return Response(
                    {'error': f'Token validation failed: {str(e)}'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Create or get user
            try:
                user, created, progress = self.get_or_create_user(user_info, request_id)
                profile = UserProfile.objects.get(user=user)
            except Exception as e:
                logger.error("User creation/retrieval failed", {
                    'request_id': request_id,
                    'error': str(e),
                    'stack_trace': traceback.format_exc()
                })
                return Response(
                    {'error': 'User processing failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Generate tokens
            try:
                tokens = self.generate_tokens(user, request_id)
            except AuthenticationFailed as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Create session
            try:
                session_data = self.create_session_data(
                    user, tokens, progress, profile, request_id
                )
            except Exception as e:
                logger.error("Session creation failed", {
                    'request_id': request_id,
                    'error': str(e)
                })
                return Response(
                    {'error': 'Session creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            duration = time.time() - start_time
            logger.info("Token exchange completed successfully", {
                'request_id': request_id,
                'user_id': str(user.id),
                'duration_ms': int(duration * 1000),
                'is_new_user': created
            })

            return Response(session_data)

        except Exception as e:
            logger.error("Unexpected error in token exchange", {
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'stack_trace': traceback.format_exc()
            })
            return Response(
                {
                    'error': 'Authentication failed',
                    'message': str(e),
                    'request_id': request_id
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class StartOnboardingView(BaseOnboardingView):
   @sync_to_async
   def get_user(self, request):
       return request.user

   @sync_to_async
   def create_onboarding(self, email):
       with transaction.atomic():
           onboarding, created = OnboardingProgress.objects.get_or_create(
               email=email,
               defaults={
                   'onboarding_status': 'step1',
                   'current_step': 1
               }
           )

           # Reset step if needed
           if not created and onboarding.onboarding_status == 'step1':
               onboarding.current_step = 1
               onboarding.save()

           return onboarding, created

   async def post(self, request):
        try:
            logger.info("Starting onboarding process")
            user = await self.get_user(request)

       
            onboarding, created = await self.create_onboarding(user.email)
           
            serializer = OnboardingProgressSerializer(onboarding)
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK

            logger.info(
                f"{'Created' if created else 'Retrieved'} onboarding for user: {user.id}"
            )

            return Response(
                serializer.data,
                status=status_code
            )

        except Exception as e:
            logger.error(f"Error starting onboarding: {str(e)}", exc_info=True)
            return await self.create_error_response(
                "Failed to start onboarding",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                'server_error'
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
            
            onboarding = get_object_or_404(OnboardingProgress, email=request.user.email)
            
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


class SaveEmailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.info("Received request to save email")
        logger.debug(f"Received request data: {request.data}")
        
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = request.user
            
            onboarding_progress, created = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'email': email,
                    'onboarding_status': 'step1'
                }
            )
            
            if created:
                logger.info(f"New OnboardingProgress created for user {user.id} with email {email}")
            else:
                logger.info(f"Updated existing OnboardingProgress for user {user.id} with email {email}")
            
            return Response({
                "message": "Email saved successfully, onboarding status is step1",
                "is_new_record": created
            }, status=status.HTTP_200_OK)
        
        except ObjectDoesNotExist:
            logger.error(f"User {request.user.id} not found")
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error saving email for user {request.user.id}: {str(e)}")
            return Response({"error": "Failed to save email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
        'businessName',
        'industry', 
        'country',
        'legalStructure',
        'dateFounded',
        'firstName',
        'lastName'
    ]

    def validate_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        try:
            missing_fields = [
                field for field in self.REQUIRED_FIELDS 
                if not data.get(field)
            ]
            
            if missing_fields:
                return False, f"Missing required fields: {', '.join(missing_fields)}"

            if data.get('dateFounded'):
                datetime.strptime(data['dateFounded'], '%Y-%m-%d')
            
            return True, None

        except ValueError:
            return False, "Invalid date format. Use YYYY-MM-DD"
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False, str(e)

    @transaction.atomic
    def save_business_data(self, user, data: Dict[str, Any]) -> Tuple[Business, bool]:
        date_founded = datetime.strptime(
            data['dateFounded'], 
            '%Y-%m-%d'
        ).date()

        business, created = Business.objects.get_or_create(
            owner=user,
            defaults={
                'business_name': data['businessName'],
                'business_type': data['industry'],
                'country': data['country'],
                'legal_structure': data['legalStructure'],
                'date_founded': date_founded
            }
        )

        if not created:
            business.business_name = data['businessName']
            business.business_type = data['industry']
            business.country = data['country']
            business.legal_structure = data['legalStructure']
            business.date_founded = date_founded
            business.save()

        UserProfile.objects.filter(user=user).update(
            business=business,
            is_business_owner=True
        )

        return business, created

    @transaction.atomic
    def save_onboarding_progress(self, user: User, data: Dict[str, Any]) -> OnboardingProgress:
        progress, _ = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'email': user.email,
                'onboarding_status': 'subscription',
                'current_step': 2
            }
        )

        date_founded = datetime.strptime(data['dateFounded'], '%Y-%m-%d').date()
        
        progress.first_name = data['firstName']
        progress.last_name = data['lastName']
        progress.business_name = data['businessName']
        progress.business_type = data['industry']
        progress.country = data['country']
        progress.legal_structure = data['legalStructure']
        progress.date_founded = date_founded
        progress.onboarding_status = 'subscription'
        progress.current_step = 2
        progress.last_updated = timezone.now()
        progress.save()

        return progress

    def post(self, request, *args, **kwargs):
        logger.info("Received Step1 save request")
        logger.debug(f"Request data: {request.data}")

        try:
            # Validate data
            is_valid, error = self.validate_data(request.data)
            if not is_valid:
                return Response({
                    'error': error,
                    'code': 'validation_error'
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                # Save business data
                business, created = self.save_business_data(request.user, request.data)
                
                # Save onboarding progress
                progress = self.save_onboarding_progress(request.user, request.data)

                return Response({
                    "success": True,
                    "message": "Business information saved successfully",
                    "data": {
                        "onboardingStatus": "subscription",
                        "currentStep": 2,
                        "allowedStepNumber": 2,
                        "completedSteps": ["business-info"],
                        "businessInfo": {
                            "businessName": business.business_name,
                            "industry": business.business_type,
                            "country": business.country,
                            "legalStructure": business.legal_structure,
                            "dateFounded": business.date_founded.isoformat()
                        }
                    }
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error saving business info: {str(e)}", exc_info=True)
            return Response({
                "error": "Failed to save business information",
                "message": str(e),
                "code": "server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
@method_decorator(csrf_exempt, name='dispatch')
class SaveStep2View(BaseOnboardingView):
    """Handle Step 2 of the onboarding process"""
    VALID_PLANS = ['Basic', 'Professional']
    VALID_BILLING_CYCLES = ['monthly', 'annual']

    def verify_services(self):
        """Verify Celery and Redis are available"""
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return False, "Message queue service unavailable"

            app = app_or_default()
            inspector = app.control.inspect()
            active_workers = inspector.active()
            
            if not active_workers:
                return False, "Task processing service unavailable"

            return True, None
        except Exception as e:
            logger.error(f"Service verification failed: {str(e)}")
            return False, str(e)

    def save_onboarding_data(self, user, data):
        """Save onboarding data with transaction handling"""
        try:
            validate_plan_selection(data)
            
            with transaction.atomic():
                # Get the progress using base class method
                progress = self.get_onboarding_progress(user)
                progress.subscription_type = data.get('selectedPlan')
                progress.billing_cycle = data.get('billingCycle')
                progress.onboarding_status = 'step2'
                progress.last_updated = timezone.now()
                progress.save()
                
            return progress
        except Exception as e:
            logger.error(f"Error saving onboarding data: {str(e)}")
            raise

    def start_setup(self, user):
        """Start database setup in background"""
        try:
            business = Business.objects.get(owner=user)
            
            services_ok, error = self.verify_services()
            if not services_ok:
                raise ServiceUnavailableError(error)
                
            task = setup_user_database_task.apply_async(
                args=[str(user.id), str(business.id)],
                countdown=1
            )
            
            with transaction.atomic():
                progress = self.get_onboarding_progress(user)
                progress.database_setup_task_id = task.id
                progress.last_setup_attempt = timezone.now()
                progress.save(update_fields=[
                    'database_setup_task_id',
                    'last_setup_attempt'
                ])
            
            # Use the base class method to send notification
            self.notify_websocket(
                user_id=str(user.id),
                event_type="setup_started",
                data={
                    "task_id": task.id,
                    "status": "STARTED",
                    "progress": 0
                }
            )
            
            return task.id
        except Exception as e:
            logger.error(f"Setup initialization error: {str(e)}")
            raise

    def post(self, request, *args, **kwargs):
        """Handle POST request"""
        try:
            data = request.data
            progress = self.save_onboarding_data(request.user, data)
            selected_plan = data.get('selectedPlan')
            
            if selected_plan == 'Basic':
                try:
                    task_id = self.start_setup(request.user)
                    return Response({
                        "message": "Setup initiated",
                        "nextStep": "dashboard",
                        "plan": "Basic",
                        "setup_status": "in_progress",
                        "task_id": task_id
                    })
                except ServiceUnavailableError as e:
                    return Response({
                        "error": str(e),
                        "type": "service_unavailable",
                        "retry_after": 30
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    
            return Response({
                "message": "Step 2 completed successfully",
                "nextStep": "step3",
                "plan": "Professional"
            })
        except ValidationError as e:
            return Response({
                "error": str(e),
                "type": "validation_error" 
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in SaveStep2View: {str(e)}")
            return Response({
                "error": "An unexpected error occurred",
                "type": "server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SaveStep3View(BaseOnboardingView):
    @sync_to_async 
    def save_payment_status(self, user, payment_completed, payment_data=None):
        """Save payment status with validation and transaction handling"""
        with transaction.atomic():
            try:
                progress = OnboardingProgress.objects.select_for_update().get(user=user)
                
                # Validate subscription type
                if progress.subscription_type != 'Professional':
                    raise ValidationError("Payment only required for Professional plan")

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
                raise
            except ValidationError as e:
                logger.error(f"Validation error: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Error saving payment status: {str(e)}", exc_info=True)
                raise

    @sync_to_async
    def validate_payment_data(self, data):
        """Validate payment data"""
        required_fields = ['payment_method', 'payment_reference']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing payment fields: {', '.join(missing_fields)}")
        return True

    async def verify_payment(self, payment_reference):
        """Verify payment with payment provider"""
        try:
            # Add your payment verification logic here
            # For example, verifying with Stripe
            if settings.STRIPE_SECRET_KEY:
                payment = stripe.PaymentIntent.retrieve(payment_reference)
                return payment.status == 'succeeded'
            return False
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            raise

    async def post(self, request):
        """Handle step 3 submission with improved error handling"""
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

            # Validate payment data
            payment_completed = data.get('paymentCompleted', False)
            if payment_completed:
                await self.validate_payment_data(data)
                if not await self.verify_payment(data.get('payment_reference')):
                    raise ValidationError("Payment verification failed")

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
            await self.handle_error(
                Exception("Onboarding progress not found"),
                user.id,
                'not_found_error'
            )
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
        """Get payment status and requirements"""
        user = await self.get_user(request)

        try:
            progress = await self.get_onboarding_progress(user)
            return Response({
                "payment_required": progress.subscription_type == 'Professional',
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

   
@method_decorator(csrf_exempt, name='dispatch')
class SaveStep4View(BaseOnboardingView):
    """
    View for handling the final step of onboarding, including database setup
    and configuration. Supports starting, monitoring, and managing setup process.
    """
    TASK_STATES = ['PENDING', 'STARTED', 'PROGRESS', 'SUCCESS', 'FAILURE']
    SETUP_TIMEOUT = 30

    def get_or_create_user_profile(self, user):
        """
        Retrieve or create user profile with proper error handling and retries.
        Ensures business information is properly linked.
        """
        try:
            profile = UserProfile.objects.select_related(
                'user', 
                'business'
            ).get(user=user)
            logger.debug(f"Retrieved existing profile for user {user.email}")
            return profile
            
        except UserProfile.DoesNotExist:
            logger.debug(f"Creating new profile for user {user.email}")
            try:
                with transaction.atomic():
                    business = Business.objects.get(owner=user)
                    if not business:
                        business = Business.objects.create(
                            owner=user,
                            business_name=f"{user.first_name}'s Business"
                        )
                    
                    profile = UserProfile.objects.create(
                        user=user,
                        business=business,
                        is_business_owner=True,
                        setup_status='in_progress'
                    )
                    logger.info(f"Created new profile for user {user.email}")
                    return profile
                    
            except Exception as e:
                logger.error(f"Failed to create profile: {str(e)}", exc_info=True)
                raise

    def get_progress_with_lock(self, user):
        """
        Get onboarding progress with database lock to prevent race conditions.
        Uses select_for_update to ensure data consistency.
        """
        try:
            with transaction.atomic():
                return OnboardingProgress.objects.select_for_update(
                    nowait=True
                ).get(user=user)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"No onboarding progress found for user {user.email}")
            raise
        except Exception as e:
            logger.error(f"Error getting progress: {str(e)}")
            raise

    def handle_start(self, user, data):
        """
        Handle setup start request. Initializes database setup process
        and creates necessary profile information.
        """
        try:
            logger.debug(f"Starting setup for user {user.email}")
            profile = self.get_or_create_user_profile(user)

            if not profile:
                raise ValueError("Failed to get or create user profile")
                
            progress = self.get_progress_with_lock(user)
            
            # Check for existing task
            if progress.database_setup_task_id:
                existing_task = AsyncResult(progress.database_setup_task_id)
                if existing_task.status in self.TASK_STATES[:3]:
                    return Response({
                        "status": "in_progress",
                        "task_id": progress.database_setup_task_id,
                        "message": "Setup already in progress"
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Start new setup task
            task = setup_user_database_task.delay(
                str(user.id),
                str(profile.business.id)
            )

            # Update progress with new task ID
            with transaction.atomic():
                progress.database_setup_task_id = task.id
                progress.last_setup_attempt = timezone.now()
                progress.save(update_fields=['database_setup_task_id', 'last_setup_attempt'])

            return Response({
                "status": "started",
                "task_id": task.id,
                "message": "Setup initiated successfully"
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Setup error: {str(e)}", exc_info=True)
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def handle_cancel(self, user):
        """
        Handle setup cancellation request. Properly cleans up running tasks
        and updates progress information.
        """
        try:
            with transaction.atomic():
                progress = OnboardingProgress.objects.select_for_update().get(user=user)
                
                if progress.database_setup_task_id:
                    task = AsyncResult(progress.database_setup_task_id)
                    
                    if task and task.status in self.TASK_STATES[:3]:
                        task.revoke(terminate=True)
                    
                    progress.database_setup_task_id = None
                    progress.save(update_fields=['database_setup_task_id'])
                    
                    return Response({
                        "status": "cancelled",
                        "previous_status": task.status if task else None
                    })
                
                return Response({
                    "status": "no_task",
                    "message": "No active setup task found"
                })
                
        except Exception as e:
            logger.error(f"Error cancelling setup: {str(e)}")
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        """
        Handle GET request to check setup status.
        Provides detailed information about setup progress.
        """
        try:
            progress = OnboardingProgress.objects.get(user=request.user)

            if progress.database_setup_task_id:
                task = AsyncResult(progress.database_setup_task_id)
                task_info = task.info if isinstance(task.info, dict) else {}
                
                return Response({
                    "status": task.status,
                    "progress": task_info.get('progress', 0),
                    "step": task_info.get('step', 'Processing'),
                    "task_id": progress.database_setup_task_id,
                    "task_info": task_info
                })

            return Response({
                "status": "READY",
                "progress": 0,
                "current_step": progress.current_step
            })

        except OnboardingProgress.DoesNotExist:
            return Response({
                "status": "NOT_STARTED",
                "progress": 0,
                "current_step": 1
            })
        except Exception as e:
            logger.error(f"Error getting setup status: {str(e)}", exc_info=True)
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, *args, **kwargs):
        """
        Handle POST requests based on the specified action.
        Supports starting, cancelling, and completing setup.
        """
        logger.debug(f"Received setup request for user: {request.user.email}")

        path = request.path.strip('/').split('/')
        action = next((part for part in path if part in ['start', 'cancel', 'complete']), 'setup')

        try:
            data = json.loads(request.body.decode('utf-8')) if request.body else {}
            logger.debug(f"Action: {action}, Data: {data}")

            if action == 'start':
                return self.handle_start(request.user, data)
            elif action == 'cancel':
                return self.handle_cancel(request.user)
            else:
                return Response({
                    "status": "invalid_action",
                    "message": f"Unknown action: {action}"
                }, status=status.HTTP_400_BAD_REQUEST)

        except json.JSONDecodeError as e:
            return Response({
                'error': 'Invalid JSON data',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Setup error: {str(e)}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OnboardingSuccessView(BaseOnboardingView):
   @sync_to_async
   def get_user(self, request):
       return request.user
       
   @sync_to_async
   def verify_stripe_session(self, session_id, user_id):
       session = stripe.checkout.Session.retrieve(session_id)
       return session.client_reference_id == str(user_id), session

   @sync_to_async 
   def update_subscription(self, user, session):
       with transaction.atomic():
           onboarding_progress = OnboardingProgress.objects.get(user=user)
           onboarding_progress.payment_completed = True
           onboarding_progress.onboarding_status = 'complete'
           onboarding_progress.current_step = 0
           onboarding_progress.save()

           subscription, _ = Subscription.objects.update_or_create(
               business=user.userprofile.business,
               defaults={
                   'subscription_type': 'professional',
                   'start_date': timezone.now().date(),
                   'is_active': True,
                   'billing_cycle': 'monthly' if session.mode == 'subscription' else 'annual'
               }
           )
           return subscription

   async def post(self, request):
       logger.info("Processing onboarding completion")
       user = await self.get_user(request)
       session_id = request.data.get('sessionId')

       if not session_id:
           return Response({"error": "No session ID provided"}, status=status.HTTP_400_BAD_REQUEST)

       try:
           # Verify session
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
           
           return Response({
               "error": "Failed to complete onboarding"
           }, status=status.HTTP_400_BAD_REQUEST)

       except stripe.error.StripeError as e:
           logger.error(f"Stripe error: {str(e)}")
           return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
       except OnboardingProgress.DoesNotExist:
           logger.error(f"Progress not found for user: {user.id}")
           return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
       except Exception as e:
           logger.error(f"Error in OnboardingSuccess: {str(e)}", exc_info=True)
           return Response({"error": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckOnboardingStatusView(APIView):
    """View to check onboarding status for user"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get_onboarding_data(self, user):
        """
        Get onboarding data using a single database query to minimize round trips.
        Using select_related to optimize database queries.
        """
        try:
            progress = OnboardingProgress.objects.get(user=user)
            user_profile = UserProfile.objects.filter(user=user).select_related('user').first()
            return progress, user_profile
        except OnboardingProgress.DoesNotExist:
            return None, None

    def get_task_status(self, task_id):
        """Get Celery task status synchronously"""
        try:
            task = AsyncResult(task_id)
            if task.state == 'FAILURE':
                return {
                    'status': 'error',
                    'progress': 0,
                    'step': None,
                    'error': str(task.result)
                }
            
            task_info = task.info if isinstance(task.info, dict) else {}
            return {
                'status': task.state,
                'progress': task_info.get('progress', 0),
                'step': task_info.get('step', 'Initializing'),
            }
            
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            return {
                'status': 'error',
                'progress': 0,
                'step': None,
                'error': str(e)
            }

    def get(self, request):
        """Handle GET request synchronously"""
        try:
            # Get data in a single operation
            progress, user_profile = self.get_onboarding_data(request.user)
            
            if not progress:
                return Response({
                    'status': 'new',
                    'currentStep': 1,
                    'database_status': 'pending',
                    'setup_complete': False
                })

            # Check task status if needed
            task_status = None
            if progress.database_setup_task_id:
                task_status = self.get_task_status(progress.database_setup_task_id)
            
            # Build response
            response_data = {
                'status': progress.onboarding_status,
                'currentStep': progress.current_step,
                'database_status': user_profile.database_status if user_profile else 'pending',
                'setup_complete': bool(user_profile and user_profile.database_name),
                'task_id': progress.database_setup_task_id,
                'task_status': task_status
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error checking onboarding status: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e),
                'message': 'Failed to check onboarding status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                    "database_status": profile.database_status if profile else 'pending',
                    "setup_status": profile.setup_status if profile else 'pending',
                    "database_name": None,
                    "message": "No database configured",
                    "onboarding_required": True,
                    "details": {
                        "connection_status": "disconnected",
                        "tables_status": "invalid"
                    },
                    "timestamp": timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)

            # Case 2: Database not in Django settings
            logger.debug(f"Checking database health for {database_name}")
            if database_name not in settings.DATABASES:
                logger.warning(f"Database {database_name} not found in settings")
                
                if profile:
                    with transaction.atomic():
                        profile.database_name = None
                        profile.database_status = 'inactive'
                        profile.setup_status = 'pending'
                        profile.save(update_fields=['database_name', 'database_status', 'setup_status'])
                
                return Response({
                    "status": "deleted",
                    "database_status": "inactive",
                    "setup_status": "pending",
                    "database_name": None,
                    "message": "Database has been deleted",
                    "onboarding_required": True,
                    "details": {
                        "connection_status": "disconnected",
                        "tables_status": "invalid"
                    },
                    "timestamp": timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)

            # Case 3: Check database health and tables
            is_healthy = check_database_health(database_name)
            tables_valid = self.check_table_requirements(database_name) if is_healthy else False

            # Update profile status based on health check
            if profile:
                with transaction.atomic():
                    profile.database_status = 'active' if (is_healthy and tables_valid) else 'error'
                    profile.setup_status = 'complete' if (is_healthy and tables_valid) else 'pending'
                    profile.save(update_fields=['database_status', 'setup_status'])

            response_data = {
                **validation_result['database'],
                "validation_state": validation_result['reason'],
                "status": "healthy" if (is_healthy and tables_valid) else "unhealthy",
                "database_status": profile.database_status if profile else 'error',
                "setup_status": profile.setup_status if profile else 'pending',
                "database_name": database_name,
                "details": {
                    "connection_status": "connected" if is_healthy else "disconnected",
                    "tables_status": "valid" if tables_valid else "invalid"
                },
                "onboarding_required": not (is_healthy and tables_valid),
                "timestamp": timezone.now().isoformat()
            }

            if not (is_healthy and tables_valid):
                logger.warning(
                    f"Database health check failed for {request.user.email}",
                    extra={
                        "database_name": database_name,
                        "is_healthy": is_healthy,
                        "tables_valid": tables_valid,
                        **response_data
                    }
                )
                return Response(response_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            return Response(response_data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            return Response({
                "status": "error",
                "database_status": "pending",
                "setup_status": "pending",
                "database_name": None,
                "message": "User profile not found",
                "details": {
                    "connection_status": "disconnected",
                    "tables_status": "invalid"
                },
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Health check error: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "database_status": "error",
                "setup_status": "error",
                "database_name": database_name if 'database_name' in locals() else None,
                "message": str(e),
                "error_type": type(e).__name__,
                "details": {
                    "connection_status": "error",
                    "tables_status": "error"
                },
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
    def get_task_info(self, task_id):
        """
        Retrieve detailed information about a running setup task.
        Includes progress, current step, and any error information.
        """
        try:
            task = AsyncResult(task_id)
            task_info = task.info if isinstance(task.info, dict) else {}
            
            return {
                "status": task.status,
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

            validation_result = self.validate_user_state(request.user)

            # Get the user's onboarding progress
            progress = OnboardingProgress.objects.get(user=request.user)

            
            # If there's an active setup task, get its status
            if progress.database_setup_task_id:
                task_info = self.get_task_info(progress.database_setup_task_id)
                return Response({
                    **task_info,
                    "validation_state": validation_result
                })
            
            # If no active task, return pending status
            return Response({
                "status": "pending",
                "validation_state": validation_result,
                "progress": 0,
                "step": None,
                "message": "No active setup task"
            })
            
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
        try:
            progress = OnboardingProgress.objects.get(user=request.user)
            
            can_access = (
                progress.onboarding_status == 'subscription' or 
                progress.onboarding_status == 'business-info'
            )
            
            return Response({
                'canAccess': can_access,
                'currentStatus': progress.onboarding_status,
                'currentStep': progress.current_step
            })
            
        except Exception as e:
            logger.error(f"Access validation error: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)