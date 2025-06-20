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
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication



# Third-party imports
import stripe
from asgiref.sync import sync_to_async, async_to_sync
from celery import shared_task
from celery.app import app_or_default
from celery.exceptions import OperationalError as CeleryOperationalError, TimeoutError
from celery.result import AsyncResult
from channels.layers import get_channel_layer
from kombu.exceptions import OperationalError as KombuOperationalError
from redis.exceptions import ConnectionError as RedisConnectionError
from celery.exceptions import OperationalError as CeleryOperationalError
from psycopg2 import OperationalError as DjangoOperationalError, extensions

# Local imports
from ..locks import acquire_lock, release_lock, task_lock
from ..models import OnboardingProgress
from ..serializers import OnboardingProgressSerializer
from ..state import OnboardingStateManager
from ..tasks import setup_user_tenant_task
from ..utils import (
    generate_unique_tenant_id,
    tenant_context_manager
)

from ..serializers import BusinessInfoSerializer


# App imports
from users.models import Business, Subscription
from finance.models import Account
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from users.models import UserProfile, User
from users.utils import (
    check_schema_health,
    get_business_for_user
)

# Configure stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Configure logger
logger = get_logger()


from custom_auth.permissions import SetupEndpointPermission

@api_view(['GET', 'OPTIONS'])
@permission_classes([SetupEndpointPermission])
def check_setup_status(request):
    if request.method == 'OPTIONS':
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    # Define old_autocommit at the beginning to avoid reference before assignment
    old_autocommit = None
    
    try:
        # Manual transaction handling
        from django.db import connection
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important to avoid transaction issues
        
        # For authenticated requests, get progress
        if request.user and request.user.is_authenticated:
            try:
                progress = OnboardingProgress.objects.get(user=request.user)
                task_id = progress.database_setup_task_id

                if not task_id:
                    response = Response({
                        'status': 'not_started',
                        'progress': 0
                    })
                    response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
                    
            except OnboardingProgress.DoesNotExist:
                response = Response({
                    'status': 'not_found',
                    'progress': 0
                })
                response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                response["Access-Control-Allow-Credentials"] = "true"
                return response
        else:
            # For unauthenticated requests
            response = Response({
                'status': 'unauthorized',
                'message': 'Authentication required for setup status'
            }, status=status.HTTP_401_UNAUTHORIZED)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        # Check if Celery worker is running
        try:
            from celery.task.control import inspect
            i = inspect()
            active_workers = i.active()
            
            if not active_workers:
                logger.error("No Celery workers are running")
                response = Response({
                    'status': 'error',
                    'message': 'Setup service unavailable',
                    'code': 'no_workers'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                response["Access-Control-Allow-Credentials"] = "true"
                return response

            # Check task status
            task = AsyncResult(task_id)
            task_info = task.info if isinstance(task.info, dict) else {}
            
            # Handle different task states
            if task.state == 'PENDING':
                response = Response({
                    'status': 'queued',
                    'progress': 0,
                    'message': 'Setup queued, waiting for worker'
                })
            elif task.state == 'STARTED':
                response = Response({
                    'status': 'in_progress',
                    'progress': task_info.get('progress', 10),
                    'current_step': task_info.get('step', 'Initializing'),
                    'message': 'Setup in progress'
                })
            elif task.state == 'SUCCESS':
                # Update progress status if needed
                if progress.onboarding_status != 'complete':
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.save(update_fields=[
                        'onboarding_status',
                        'current_step'
                    ])
                
                response = Response({
                    'status': 'complete',
                    'progress': 100,
                    'is_complete': True,
                    'message': 'Setup completed successfully'
                })
            elif task.state == 'FAILURE':
                error_msg = str(task.result) if task.result else 'Unknown error'
                logger.error(f"Setup task failed: {error_msg}")
                
                # Update progress status
                progress.onboarding_status = 'error'
                progress.setup_error = error_msg
                progress.save(update_fields=[
                    'onboarding_status',
                    'setup_error'
                ])
                
                response = Response({
                    'status': 'error',
                    'message': error_msg,
                    'code': 'setup_failed'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                response = Response({
                    'status': task.state.lower(),
                    'progress': task_info.get('progress', 0),
                    'current_step': task_info.get('step', 'Processing'),
                    'message': task_info.get('message', 'Setup in progress')
                })

            # Add CORS headers to all responses
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
                
        except (ConnectionError, TimeoutError) as e:
            logger.error(f"Celery connection error: {str(e)}")
            response = Response({
                'status': 'error',
                'message': 'Setup service unavailable',
                'code': 'connection_error'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response

    except Exception as e:
        logger.error(f"Error checking setup status: {str(e)}")
        response = Response({
            'status': 'error',
            'error': str(e)
        }, status=500)
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    finally:
        # Restore previous autocommit setting if it was set
        if old_autocommit is not None:
            try:
                if connection.get_autocommit() != old_autocommit:
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
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
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
            
            try:
                profile = UserProfile.objects.select_related('user', 'business').get(user=user)
                progress = OnboardingProgress.objects.get(user=user)

                # For new users or users in initial setup
                if not user.tenant:
                    return {
                        'isValid': True,
                        'redirectTo': '/onboarding/step1',
                        'reason': 'new_user'
                    }
                
                if not user.tenant.is_active:
                    logger.error(f"Tenant {user.tenant.id} is not active for user {user.id}")
                    return JsonResponse({
                        'success': False,
                        'message': 'Tenant not active',
                        'requires_onboarding': True,
                    })

                # Get schema name from function instead of database field
                schema_name = get_schema_name_from_tenant_id(user.tenant.id)
                is_healthy, health_details = check_schema_health(schema_name)

                if not is_healthy:
                    return {
                        'isValid': False,
                        'redirectTo': '/onboarding/step4/setup',
                        'reason': 'unhealthy_schema',
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
                    'tenant': {
                        'schema_name': schema_name,
                        'status': 'active' if user.tenant.is_active else 'inactive',
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
        except Exception as e:
            logger.error(f"Error in validate_user_state: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
                
            for attempt in range(3):
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
        except Exception as e:
            logger.error(f"Error in get_onboarding_progress: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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

            # Manual transaction handling instead of atomic
            from django.db import connection
            
            # Store autocommit setting
            old_autocommit = connection.get_autocommit()
            connection.set_autocommit(True)  # Important: Set autocommit to True
            
            try:
                # Create a new connection if needed
                if connection.in_atomic_block:
                    connection.close()
                    connection.connect()
                
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
                            'is_active': False
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
            finally:
                # Restore previous autocommit setting
                try:
                    if old_autocommit != connection.get_autocommit():
                        connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")
        except Exception as e:
            logger.error("User creation/update outer error", {
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'stack_trace': traceback.format_exc()
            })
            raise

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
                    'is_active': user_profile.tenant.is_active if user_profile.tenant else False,
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


@method_decorator(csrf_exempt, name='dispatch')
class StartOnboardingView(BaseOnboardingView):
    permission_classes = [SetupEndpointPermission]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]  # Add proper authentication

    def dispatch(self, request, *args, **kwargs):
        """Handle preflight requests and add CORS headers"""
        if request.method == 'OPTIONS':
            response = Response()
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id, x-id-token, x-user-id"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        # For non-OPTIONS requests
        try:
            # Add CORS headers to all responses
            response = super().dispatch(request, *args, **kwargs)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
        except Exception as e:
            # Handle errors with proper CORS headers
            error_response = self.initialize_response(
                {"error": str(e)},
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def get_or_create_onboarding(self, user):
        """Get or create onboarding progress with deadlock handling"""
        # Maximum number of retry attempts
        max_retries = 3
        retry_delay = 0.5  # Initial delay in seconds
        
        for attempt in range(max_retries):
            try:
                # First try to get without locking to reduce contention
                try:
                    onboarding = OnboardingProgress.objects.get(user=user)
                    
                    # If found, update with a separate query to avoid deadlocks
                    if onboarding.onboarding_status == "notstarted":
                        # Use direct SQL update instead of ORM to reduce deadlock risk
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                UPDATE onboarding_onboardingprogress
                                SET onboarding_status = 'setup',
                                    current_step = 'setup',
                                    next_step = 'complete',
                                    updated_at = NOW()
                                WHERE user_id = %s
                            """, [str(user.id)])
                            
                        # Refresh from database
                        onboarding.refresh_from_db()
                    
                    return onboarding, False
                    
                except OnboardingProgress.DoesNotExist:
                    # Try to create with a shorter transaction
                    # Manual transaction handling instead of atomic
                    from django.db import connection
                    
                    # Store autocommit setting
                    old_autocommit = connection.get_autocommit()
                    connection.set_autocommit(True)  # Important: Set autocommit to True
                    
                    try:
                        # Create a new connection if needed
                        if connection.in_atomic_block:
                            connection.close()
                            connection.connect()
                        
                        onboarding = OnboardingProgress.objects.create(
                            user=user,
                            onboarding_status="setup",
                            current_step="setup",
                            next_step="complete"
                        )
                        return onboarding, True
                    except IntegrityError:
                        # Another process created it first, try to get it again
                        onboarding = OnboardingProgress.objects.get(user=user)
                        return onboarding, False
                    finally:
                        # Restore previous autocommit setting
                        try:
                            if old_autocommit != connection.get_autocommit():
                                connection.set_autocommit(old_autocommit)
                        except Exception as ac_error:
                            logger.error(f"Error restoring autocommit: {ac_error}")
                        
            except OperationalError as e:
                # Handle deadlocks with retries
                if "deadlock detected" in str(e).lower() and attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Deadlock detected in get_or_create_onboarding (attempt {attempt+1}), retrying in {wait_time}s")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Failed to get or create onboarding progress after {attempt+1} attempts: {str(e)}")
                    raise
                    
            except Exception as e:
                logger.error(f"Error in get_or_create_onboarding: {str(e)}")
                raise
                
        # If we get here, we've exhausted all retries
        raise Exception(f"Failed to get or create onboarding progress after {max_retries} attempts")

    def get_business_id(self, user):
        """Get business ID from user profile with deadlock handling"""
        # Maximum number of retry attempts
        max_retries = 3
        retry_delay = 0.5  # Initial delay in seconds
        
        for attempt in range(max_retries):
            try:
                # First check if profile exists and has a business without locking
                profile = UserProfile.objects.select_related('business').get(user=user)
                
                # If business already exists, return its ID
                if profile.business:
                    return str(profile.business.id)
                    
                # If no business exists, create it with a separate transaction
                # to avoid deadlocks with other processes
                from users.models import Business
                
                # Use a transaction
                # Manual transaction handling instead of atomic
                from django.db import connection
                
                # Store autocommit setting
                old_autocommit = connection.get_autocommit()
                connection.set_autocommit(True)  # Important: Set autocommit to True
                
                try:
                    # Create a new connection if needed
                    if connection.in_atomic_block:
                        connection.close()
                        connection.connect()
                    
                    # Create a default business first
                    business = Business.objects.create(
                        owner=user,
                        name=f"{user.first_name}'s Business",
                        business_type='default'
                    )
                    
                    # Now update the profile in a separate operation
                    # This reduces the chance of deadlocks
                    UserProfile.objects.filter(user=user).update(
                        business=business,
                        is_business_owner=True
                    )
                    
                    return str(business.id)
                except Exception as e:
                    logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                    raise
                finally:
                    # Restore previous autocommit setting
                    try:
                        if old_autocommit != connection.get_autocommit():
                            connection.set_autocommit(old_autocommit)
                    except Exception as ac_error:
                        logger.error(f"Error restoring autocommit: {ac_error}")
                    
            except UserProfile.DoesNotExist:
                logger.warning(f"No user profile found for user {user.id}")
                # Create profile and business
                from users.models import Business
                
                try:
                    # Manual transaction handling instead of atomic
                    from django.db import connection
                    
                    # Store autocommit setting
                    old_autocommit = connection.get_autocommit()
                    connection.set_autocommit(True)  # Important: Set autocommit to True
                    
                    try:
                        # Create a new connection if needed
                        if connection.in_atomic_block:
                            connection.close()
                            connection.connect()
                        
                        business = Business.objects.create(
                            owner=user,
                            name=f"{user.first_name}'s Business",
                            business_type='default'
                        )
                        profile = UserProfile.objects.create(
                            user=user,
                            business=business,
                            is_business_owner=True
                        )
                        return str(business.id)
                    except Exception as e:
                        logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                        raise
                    finally:
                        # Restore previous autocommit setting
                        try:
                            if old_autocommit != connection.get_autocommit():
                                connection.set_autocommit(old_autocommit)
                        except Exception as ac_error:
                            logger.error(f"Error restoring autocommit: {ac_error}")
                except Exception as e:
                    logger.error(f"Error creating profile and business: {str(e)}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay * (2 ** attempt))
                        continue
                    raise
                    
            except Exception as e:
                # Handle deadlocks and other database errors with retries
                logger.warning(f"Database error in get_business_id (attempt {attempt+1}): {str(e)}")
                
                if "deadlock detected" in str(e).lower() and attempt < max_retries - 1:
                    # Exponential backoff for retries
                    wait_time = retry_delay * (2 ** attempt)
                    logger.info(f"Deadlock detected, retrying in {wait_time} seconds")
                    time.sleep(wait_time)
                    continue
                else:
                    # If we've exhausted retries or it's not a deadlock, re-raise
                    logger.error(f"Failed to get business ID after {attempt+1} attempts: {str(e)}")
                    raise
        
        # If we get here, we've exhausted all retries
        raise Exception(f"Failed to get business ID after {max_retries} attempts")

    def options(self, request, *args, **kwargs):
        response = self.initialize_response({}, status.HTTP_200_OK)
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin')
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    def post(self, request):
        """Handle POST requests with improved memory efficiency and error handling"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        logger.info(f"Starting onboarding process - Request ID: {request_id}")
        
        # Validate authorization header first to fail fast
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.error(f"[{request_id}] Missing or invalid authorization header")
            return self.initialize_response({
                'error': 'Missing or invalid authorization header',
                'code': 'invalid_auth'
            }, status.HTTP_401_UNAUTHORIZED)
        
        # Explicitly close all database connections before starting
        # This helps prevent transaction issues
        for conn in connections.all():
            conn.close()
        logger.debug(f"[{request_id}] Closed all database connections before starting")
        
        try:
            # Get business ID - this is a critical operation
            business_id = None
            try:
                # Use the utility function instead
                business = get_business_for_user(request.user)
                if business:
                    business_id = str(business.id)
                else:
                    # If no business exists, create a minimal one
                    from users.models import Business
                    
                    # Manual transaction handling instead of atomic
                    from django.db import connection
                    
                    # Store autocommit setting
                    old_autocommit = connection.get_autocommit()
                    connection.set_autocommit(True)  # Important: Set autocommit to True
                    
                    try:
                        # Create a new connection if needed
                        if connection.in_atomic_block:
                            connection.close()
                            connection.connect()
                        
                        business = Business.objects.create(
                            owner=request.user,
                            name=f"{request.user.first_name}'s Business",
                            business_type='default'
                        )
                        # Update profile in a separate query to avoid deadlocks
                        if profile:
                            UserProfile.objects.filter(id=profile.id).update(business=business)
                        else:
                            UserProfile.objects.create(user=request.user, business=business)
                        business_id = str(business.id)
                    except Exception as e:
                        logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                        raise
                    finally:
                        # Restore previous autocommit setting
                        try:
                            if old_autocommit != connection.get_autocommit():
                                connection.set_autocommit(old_autocommit)
                        except Exception as ac_error:
                            logger.error(f"Error restoring autocommit: {ac_error}")
            except Exception as e:
                logger.error(f"[{request_id}] Failed to get/create business: {str(e)}")
                return self.initialize_response({
                    'error': 'Failed to get or create business',
                    'code': 'business_error'
                }, status.HTTP_400_BAD_REQUEST)
            
            # Get or create onboarding progress with minimal DB operations
            onboarding = None
            try:
                # First try to get without locking
                onboarding = OnboardingProgress.objects.filter(user=request.user).first()
                if not onboarding:
                    # Create with minimal fields
                    onboarding = OnboardingProgress.objects.create(
                        user=request.user,
                        onboarding_status='setup',
                        current_step='setup',
                        next_step='complete'
                    )
                else:
                    # Update with direct SQL for efficiency
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            UPDATE onboarding_onboardingprogress
                            SET onboarding_status = 'setup',
                                current_step = 'setup',
                                next_step = 'complete',
                                setup_error = NULL,
                                updated_at = NOW()
                            WHERE user_id = %s
                        """, [str(request.user.id)])
            except Exception as e:
                logger.error(f"[{request_id}] Failed to get/create onboarding: {str(e)}")
                return self.initialize_response({
                    'error': 'Failed to get or create onboarding progress',
                    'code': 'onboarding_error'
                }, status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update tenant status if it exists - use direct SQL for efficiency
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE auth_tenant
                        SET database_status = 'pending',
                            setup_status = 'in_progress',
                            last_setup_attempt = NOW()
                        WHERE owner_id = %s
                    """, [str(request.user.id)])
            except Exception as e:
                # Log but continue - this is not critical
                logger.warning(f"[{request_id}] Failed to update tenant status: {str(e)}")
            
            # Check for deferred setup
            is_deferred = False
            task_id = None
            
            # First check session
            pending_setup = request.session.get('pending_schema_setup', {})
            if pending_setup and pending_setup.get('deferred', False) is True:
                is_deferred = True
                logger.info(f"Schema setup deferred for user {request.user.id} - will be triggered at dashboard")
                request.session['setup_task_id'] = None
            else:
                # Check profile metadata
                try:
                    profile = UserProfile.objects.filter(user=request.user).first()
                    if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                        profile_setup = profile.metadata.get('pending_schema_setup', {})
                        if profile_setup and profile_setup.get('deferred', False) is True:
                            is_deferred = True
                            logger.info(f"Using deferred setup from profile metadata for user {request.user.id}")
                            request.session['setup_task_id'] = None
                except Exception as e:
                    # Log but continue - this is not critical
                    logger.warning(f"Could not check profile metadata: {str(e)}")
            
            # Queue task if not deferred
            if not is_deferred:
                try:
                    task = setup_user_tenant_task.apply_async(
                        args=[str(request.user.id), business_id],
                        queue='setup',
                        retry=True,
                        retry_policy={
                            'max_retries': 3,
                            'interval_start': 5,
                            'interval_step': 30,
                            'interval_max': 300
                        }
                    )
                    task_id = task.id
                    request.session['setup_task_id'] = task_id
                    logger.info(f"Setup task {task_id} queued successfully")
                except Exception as e:
                    logger.error(f"Failed to queue setup task: {str(e)}")
                    return self.initialize_response({
                        "error": "System busy - failed to queue setup task",
                        "code": "queue_error"
                    }, status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Prepare response
            response_data = {
                "status": "success",
                "setup_id": task_id,
                "message": "Setup deferred until dashboard" if is_deferred else "Setup initiated successfully",
                "onboarding_id": str(onboarding.id) if onboarding else None,
                "onboarding_status": "setup",
                "current_step": "setup",
                "setup_deferred": is_deferred
            }
            
            logger.info(f"[{request_id}] {is_deferred and 'Setup deferred' or 'Setup initiated successfully'}", extra={
                'user_id': str(request.user.id),
                'task_id': task_id,
                'business_id': business_id,
                'deferred': is_deferred
            })
            
            response = self.initialize_response(response_data, status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            # Handle any unexpected errors
            logger.error(f"[{request_id}] Unexpected error: {str(e)}", exc_info=True)
            return self.initialize_response({
                "error": f"Setup failed: {str(e)}",
                "code": "setup_error"
            }, status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateOnboardingView(BaseOnboardingView):
    @sync_to_async
    def get_user(self, request):
        return request.user

    @sync_to_async
    def update_progress(self, user, step, data):
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
                
            onboarding = get_object_or_404(OnboardingProgress, user=user)
            data['onboarding_status'] = f'step{step}'
            serializer = OnboardingProgressSerializer(onboarding, data=data, partial=True)
            if serializer.is_valid():
                return serializer.save()
            raise ValidationError(serializer.errors)
        except Exception as e:
            logger.error(f"Error updating progress: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
    def complete_onboarding(self, onboarding, payment_data=None):
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
            
            # Update payment fields if payment data is provided
            if payment_data:
                if payment_data.get('payment_verified'):
                    onboarding.payment_completed = True
                    onboarding.payment_timestamp = timezone.now()
                    onboarding.subscription_status = 'active'
                    
                if payment_data.get('payment_intent_id'):
                    onboarding.payment_id = payment_data['payment_intent_id']
                    onboarding.payment_method = 'stripe'
                    
                if payment_data.get('subscription_id'):
                    onboarding.stripe_subscription_id = payment_data['subscription_id']
                    
                if payment_data.get('selected_plan'):
                    onboarding.selected_plan = payment_data['selected_plan']
                    onboarding.subscription_plan = payment_data['selected_plan']
                    
                if payment_data.get('billing_cycle'):
                    onboarding.billing_cycle = payment_data['billing_cycle']
            
            # Mark onboarding as complete
            onboarding.onboarding_status = 'complete'
            onboarding.current_step = 'complete'
            onboarding.next_step = 'dashboard'
            onboarding.completed_at = timezone.now()
            onboarding.setup_completed = True
            onboarding.setup_timestamp = timezone.now()
            
            # Mark complete step in completed_steps
            completed_steps = onboarding.completed_steps or []
            if 'complete' not in completed_steps:
                completed_steps.append('complete')
            onboarding.completed_steps = completed_steps
            
            onboarding.save()
            return onboarding
        except Exception as e:
            logger.error(f"Error completing onboarding: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
            
            # Check if payment is required and completed for paid tiers
            selected_plan = request.data.get('selected_plan', 'free')
            payment_verified = request.data.get('payment_verified', False)
            force_complete = request.data.get('force_complete', False)
            mark_onboarding_complete = request.data.get('mark_onboarding_complete', False)
            
            # For paid tiers, only complete if payment is verified OR force_complete is set
            # The force_complete flag is used when the frontend needs to mark onboarding as complete
            # even without payment verification (e.g., after successful onboarding flow completion)
            if selected_plan != 'free' and not payment_verified and not force_complete and not mark_onboarding_complete:
                logger.info(f"[CompleteOnboarding] Payment required for {selected_plan} plan")
                return Response({
                    'status': 'payment_required',
                    'message': 'Payment verification required for paid tier',
                    'data': {
                        'selected_plan': selected_plan,
                        'current_step': 'payment'
                    }
                }, status=status.HTTP_402_PAYMENT_REQUIRED)
            
            # Log when force_complete is used
            if force_complete or mark_onboarding_complete:
                logger.info(f"[CompleteOnboarding] Force completing onboarding for {user.email} with plan {selected_plan} (force_complete={force_complete}, mark_onboarding_complete={mark_onboarding_complete})")
            
            # Prepare payment data if provided
            payment_data = None
            if payment_verified or force_complete:
                payment_data = {
                    'payment_verified': True,
                    'payment_intent_id': request.data.get('payment_intent_id'),
                    'subscription_id': request.data.get('subscription_id'),
                    'selected_plan': selected_plan,
                    'billing_cycle': request.data.get('billing_cycle', 'monthly')
                }
                logger.info(f"[CompleteOnboarding] Processing payment completion for {user.email} with plan {selected_plan}")
            
            # Complete onboarding with payment data
            logger.info(f"[CompleteOnboarding] Calling complete_onboarding for {user.email}, current status: {onboarding.onboarding_status}")
            await self.complete_onboarding(onboarding, payment_data)
            logger.info(f"[CompleteOnboarding] After complete_onboarding for {user.email}, status: {onboarding.onboarding_status}")
            
            # Update user's onboarding status if the field exists
            if hasattr(user, 'needs_onboarding'):
                logger.info(f"[CompleteOnboarding] Updating user.needs_onboarding from {user.needs_onboarding} to False for {user.email}")
                user.needs_onboarding = False
                await sync_to_async(user.save)(update_fields=['needs_onboarding'])
            else:
                logger.warning(f"[CompleteOnboarding] User {user.email} does not have needs_onboarding field")
            
            # Get tenant_id for response
            tenant_id = onboarding.tenant_id
            if not tenant_id and hasattr(user, 'tenant_id'):
                tenant_id = user.tenant_id
            
            logger.info(f"[CompleteOnboarding] Onboarding completed successfully for {user.email}")
            
            return Response({
                "message": "Onboarding completed successfully",
                "redirect": f"/tenant/{tenant_id}/dashboard" if tenant_id else "/dashboard",
                "data": {
                    "tenantId": str(tenant_id) if tenant_id else None,
                    "tenant_id": str(tenant_id) if tenant_id else None,
                    "onboarding_completed": True,
                    "payment_completed": payment_verified,
                    "subscription_plan": selected_plan
                }
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
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
                
            expiration_time = timezone.now() - timedelta(hours=5)
            return OnboardingProgress.objects.filter(
                created_at__lt=expiration_time
            ).delete()
        except Exception as e:
            logger.error(f"Error cleaning up expired records: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

    @sync_to_async
    def get_or_create_progress(self, user):
        """Get or create onboarding progress with retries"""
        max_retries = 3
        retry_delay = 0.5
        last_error = None

        for attempt in range(max_retries):
            try:
                # Manual transaction handling instead of atomic
                from django.db import connection
                
                # Store autocommit setting
                old_autocommit = connection.get_autocommit()
                connection.set_autocommit(True)  # Important: Set autocommit to True
                
                try:
                    # Create a new connection if needed
                    if connection.in_atomic_block:
                        connection.close()
                        connection.connect()
                    
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
                except Exception as e:
                    logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                    raise
                finally:
                    # Restore previous autocommit setting
                    try:
                        if old_autocommit != connection.get_autocommit():
                            connection.set_autocommit(old_autocommit)
                    except Exception as ac_error:
                        logger.error(f"Error restoring autocommit: {ac_error}")
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

@method_decorator(csrf_exempt, name='dispatch')
class SaveStep1View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        from django.db import connection, transaction
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        logger.info("Received business info save request:", {
            'request_id': request_id,
            'user_id': request.user.id,
            'data': request.data
        })

        # Store autocommit setting to restore later
        old_autocommit = connection.get_autocommit()
        
        try:
            # Set autocommit to True to avoid transaction issues
            connection.set_autocommit(True)
            
            # Validate request data
            logger.info(f"Request data received: {request.data}")
            serializer = BusinessInfoSerializer(data=request.data, context={'request': request})
            if not serializer.is_valid():
                logger.error(f"Validation failed with errors: {serializer.errors}")
                logger.error(f"Request data was: {request.data}")
                return Response({
                    'success': False,
                    'message': 'Validation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            # Generate business number
            business_num = ''.join(random.choices(string.digits, k=6))
            
            # Get tenant ID from headers
            tenant_id = request.headers.get('X-Tenant-ID')
            if not tenant_id:
                raise ValidationError("X-Tenant-ID header is required")
            
            # Generate schema name for this tenant
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            
            # Create a business ID to use in the response and for storing in session
            business_id = uuid.uuid4()
            
            # Get user's name
            first_name = request.user.first_name or ''
            last_name = request.user.last_name or ''
            
            # Step 1: Create or ensure schema exists with minimal structure - without foreign keys
            try:
                # Import schema_creation_lock here if it's not accessible in the current scope
                from custom_auth.tenant_middleware import schema_creation_lock
                
                # Create a new connection with autocommit=True specifically for schema operations
                schema_conn = None
                try:
                    # Get connection parameters from Django's connection
                    conn_params = connection.get_connection_params()
                    
                    # Import psycopg2 for direct connection
                    import psycopg2
                    
                    # Create a new connection with autocommit=True
                    schema_conn = psycopg2.connect(**conn_params)
                    schema_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                    
                    # Set statement timeout to prevent long-running queries
                    with schema_conn.cursor() as timeout_cursor:
                        timeout_cursor.execute("SET statement_timeout = '30s'")
                    
                    with schema_creation_lock:
                        with schema_conn.cursor() as cursor:
                            # Check if schema already exists
                            cursor.execute("""
                                SELECT schema_name FROM information_schema.schemata
                                WHERE schema_name = %s
                            """, [schema_name])
                            schema_exists = cursor.fetchone() is not None
                            
                            if not schema_exists:
                                # Create the schema if it doesn't exist
                                logger.info(f"Creating minimal schema for {schema_name}")
                                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                                
                                # Verify schema was created
                                cursor.execute("""
                                    SELECT schema_name FROM information_schema.schemata
                                    WHERE schema_name = %s
                                """, [schema_name])
                                if not cursor.fetchone():
                                    logger.error(f"Failed to create schema {schema_name}")
                                    raise Exception(f"Failed to create schema {schema_name}")
                                
                                # Set up basic permissions
                                db_user = connection.settings_dict['USER']
                                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                            else:
                                logger.info(f"Schema {schema_name} already exists, using it")
                                
                            # Set search path to the schema
                            # RLS: Use tenant context instead of schema
                            # cursor.execute(f'SET search_path TO {schema_name}')
                            set_current_tenant_id(tenant_id)
                            cursor.execute('SET search_path TO public')
                            
                            # Defer all constraints to avoid transaction issues
                            logger.debug("Deferring all constraints")
                            cursor.execute("SET CONSTRAINTS ALL DEFERRED")
                            
                            # Create django_migrations table in the schema if it doesn't exist
                            cursor.execute(f"""
                                CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "django_migrations" (
                                    "id" serial NOT NULL PRIMARY KEY,
                                    "app" varchar(255) NOT NULL,
                                    "name" varchar(255) NOT NULL,
                                    "applied" timestamp with time zone NOT NULL
                                );
                            """)
                            
                            # Create essential tables for business info - WITHOUT FOREIGN KEY CONSTRAINTS
                            # First, check if users_business exists
                            cursor.execute("""
                                SELECT 1 FROM information_schema.tables
                                WHERE table_schema = %s AND table_name = 'users_business'
                            """, [schema_name])
                            
                            if not cursor.fetchone():
                                # Create users_business table without foreign keys
                                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "users_business" (
                                        "id" uuid NOT NULL PRIMARY KEY,
                                        "business_num" varchar(6) NOT NULL,
                                        "name" varchar(200) NOT NULL,
                                        "business_type" varchar(50) NOT NULL,
                                        "business_subtype_selections" jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                                        "street" varchar(200) NULL,
                                        "city" varchar(200) NULL,
                                        "state" varchar(200) NULL,
                                        "postcode" varchar(20) NULL,
                                        "country" varchar(2) NOT NULL DEFAULT 'US',
                                        "address" text NULL,
                                        "email" varchar(254) NULL,
                                        "phone_number" varchar(20) NULL,
                                        "database_name" varchar(255) NULL,
                                        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                        "date_founded" date NULL,
                                        "owner_id" uuid NOT NULL
                                    );
                                """)
                                
                                # Create an index for business_num
                                cursor.execute(f"""
                                    CREATE INDEX IF NOT EXISTS "users_business_business_num_idx"
                                    ON /* RLS: Use tenant_id filtering */ "users_business" ("business_num");
                                """)
                            
                            # Check if users_business_details exists
                            cursor.execute("""
                                SELECT 1 FROM information_schema.tables
                                WHERE table_schema = %s AND table_name = 'users_business_details'
                            """, [schema_name])
                            
                            if not cursor.fetchone():
                                # Create users_business_details table without foreign key constraint
                                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "users_business_details" (
                                        "business_id" uuid NOT NULL PRIMARY KEY,
                                        "business_type" varchar(50) NOT NULL,
                                        "business_subtype_selections" jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                                        "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                        "country" varchar(2) NOT NULL DEFAULT 'US',
                                        "date_founded" date NULL,
                                        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
                                    );
                                """)
                            
                            # Check if users_userprofile exists
                            cursor.execute("""
                                SELECT 1 FROM information_schema.tables
                                WHERE table_schema = %s AND table_name = 'users_userprofile'
                            """, [schema_name])
                            
                            if not cursor.fetchone():
                                # Create users_userprofile table - without foreign key constraints
                                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "users_userprofile" (
                                        "id" bigserial NOT NULL PRIMARY KEY,
                                        "occupation" varchar(200) NULL,
                                        "street" varchar(200) NULL,
                                        "city" varchar(200) NULL,
                                        "state" varchar(200) NULL,
                                        "postcode" varchar(200) NULL,
                                        "country" varchar(2) NOT NULL DEFAULT 'US',
                                        "phone_number" varchar(200) NULL,
                                        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "is_business_owner" boolean NOT NULL DEFAULT false,
                                        "shopify_access_token" varchar(255) NULL,
                                        "schema_name" varchar(63) NULL,
                                        "metadata" jsonb NULL DEFAULT '{{}}'::jsonb,
                                        "business_id" uuid NULL,
                                        "tenant_id" uuid NULL,
                                        "user_id" uuid NOT NULL,
                                        "updated_at" timestamp with time zone DEFAULT NOW()
                                    );
                                """)
                                
                                # Create index on tenant_id
                                cursor.execute(f"""
                                    CREATE INDEX IF NOT EXISTS "users_userprofile_tenant_id_idx"
                                    ON /* RLS: Use tenant_id filtering */ "users_userprofile" ("tenant_id");
                                """)
                                
                                # Create unique index on user_id
                                cursor.execute(f"""
                                    CREATE UNIQUE INDEX IF NOT EXISTS "users_userprofile_user_id_key"
                                    ON /* RLS: Use tenant_id filtering */ "users_userprofile" ("user_id");
                                """)
                            
                            # Record deferred migrations marker in django_migrations
                            cursor.execute(f"""
                                INSERT INTO /* RLS: Use tenant_id filtering */ "django_migrations" (app, name, applied)
                                VALUES ('onboarding', 'deferred_migrations', NOW())
                                ON CONFLICT DO NOTHING;
                            """)
                            
                            # Update tenant status if it exists
                            cursor.execute("""
                                UPDATE auth_tenant
                                SET schema_name = %s,
                                    setup_status = 'minimal',
                                    last_setup_attempt = NOW()
                                WHERE owner_id = %s;
                            """, [schema_name, str(request.user.id)])
                            
                            # If rows affected is 0, tenant doesn't exist yet
                            if cursor.rowcount == 0:
                                # Create tenant record
                                tenant_uuid = uuid.UUID(tenant_id)
                                cursor.execute("""
                                    INSERT INTO auth_tenant (id, schema_name, name, owner_id, created_on, is_active, setup_status)
                                    VALUES (%s, %s, %s, %s, NOW(), TRUE, 'minimal');
                                """, [tenant_id, schema_name, f"Tenant for {request.user.email}", str(request.user.id)])
                                logger.info(f"Created tenant record for user {request.user.id}")
                finally:
                    # Close the dedicated connection if it exists
                    if schema_conn:
                        try:
                            # Make sure to rollback any pending transactions before closing
                            if schema_conn.status in (psycopg2.extensions.STATUS_IN_TRANSACTION,
                                                    psycopg2.extensions.STATUS_BEGIN):
                                schema_conn.rollback()
                            schema_conn.close()
                            logger.debug("Closed dedicated schema connection")
                        except Exception as close_error:
                            logger.error(f"Error closing schema connection: {str(close_error)}")
            except Exception as schema_error:
                logger.error(f"Error setting up schema: {str(schema_error)}", exc_info=True)
                # Continue even if schema setup fails - we'll try again at dashboard
            
            # Step 2: Create the business in database - WITHOUT FOREIGN KEY CONSTRAINTS
            try:
                # Create a new connection with autocommit=True to avoid transaction issues
                with connection.cursor() as cursor:
                    # First, create the business in the tenant schema
                    # Ensure we're using fresh connections and auto-commit mode
                    connection.close()
                    connection.connect()
                    connection.set_autocommit(True)
                    
                    # Check if we're in a transaction and log warning
                    if connection.in_atomic_block:
                        logger.warning(f"Still in atomic block after setting autocommit=True for schema {schema_name}")
                        # Force transaction isolation level to READ COMMITTED to avoid deadlocks
                        cursor.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
                        logger.debug("Set transaction isolation level to READ COMMITTED")
                    
                    # Create a completely separate connection for tenant operations to avoid transaction issues
                    import psycopg2
                    
                    # Get connection parameters from Django's connection
                    conn_params = connection.get_connection_params()
                    # Add explicit isolation level to connection parameters
                    conn_params['options'] = f'{conn_params.get("options", "")} -c default_transaction_isolation="read committed"'
                    tenant_conn = None
                    
                    logger.debug(f"Creating tenant connection with params: {conn_params}")
                    
                    try:
                        # Create a new connection with autocommit=True
                        logger.debug(f"Creating dedicated tenant connection for schema {schema_name}")
                        tenant_conn = psycopg2.connect(**conn_params)
                        tenant_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
                        
                        # Create a cursor from this dedicated connection
                        with tenant_conn.cursor() as tenant_cursor:
                            # Set search path to the tenant schema
                            logger.debug(f"Setting search path to schema {schema_name}")
                            tenant_cursor.execute(f"SET search_path TO {schema_name}")
                            
                            # Defer all constraints to avoid transaction issues
                            logger.debug("Deferring all constraints")
                            tenant_cursor.execute("SET CONSTRAINTS ALL DEFERRED")
                            
                            # Defer constraints
                            tenant_cursor.execute("SET CONSTRAINTS ALL DEFERRED")
                            
                            # Insert business directly using raw SQL with improved retry logic
                            now = timezone.now()
                            max_retries = 3
                            retry_delay = 0.5  # seconds
                            
                            for attempt in range(max_retries):
                                try:
                                    # Ensure we're in a clean connection state before each attempt
                                    if tenant_conn.status in (psycopg2.extensions.STATUS_IN_TRANSACTION,
                                                            psycopg2.extensions.STATUS_BEGIN):
                                        tenant_conn.rollback()
                                        logger.debug("Rolled back existing transaction before new attempt")
                                    
                                    # Set statement timeout to prevent long-running queries
                                    tenant_cursor.execute("SET statement_timeout = '30s'")
                                    
                                    # Set transaction isolation level to READ COMMITTED
                                    tenant_cursor.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
                                    
                                    logger.debug(f"Attempting to insert business data (attempt {attempt+1}/{max_retries})")
                                    tenant_cursor.execute("""
                                        INSERT INTO users_business (
                                            id, business_num, name, business_type,
                                            created_at, updated_at, owner_id, legal_structure
                                        ) VALUES (
                                            %s, %s, %s, %s,
                                            %s, %s, %s, %s
                                        ) RETURNING id;
                                    """, [
                                        str(business_id),
                                        business_num,
                                        serializer.validated_data['name'],
                                        serializer.validated_data['business_type'],
                                        now,
                                        now,
                                        str(request.user.id),
                                        serializer.validated_data.get('legal_structure', 'SOLE_PROPRIETORSHIP')
                                    ])
                                    # Explicitly commit after successful insertion
                                    tenant_conn.commit()
                                    logger.debug(f"Successfully inserted business data on attempt {attempt+1}")
                                    break
                                except psycopg2.Error as e:
                                    # Always rollback on error to ensure clean state
                                    try:
                                        tenant_conn.rollback()
                                        logger.debug(f"Rolled back transaction after error on attempt {attempt+1}")
                                    except Exception as rollback_error:
                                        logger.error(f"Error rolling back: {str(rollback_error)}")
                                    
                                    if attempt < max_retries - 1:
                                        logger.warning(f"Database error on attempt {attempt+1}: {str(e)}")
                                        time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
                                        continue
                                    else:
                                        logger.error(f"Failed to insert business data after {max_retries} attempts")
                                        raise
                            
                            # Create business details with raw SQL and proper transaction handling
                            try:
                                date_founded = serializer.validated_data.get('date_founded')
                                date_founded_str = date_founded.isoformat() if date_founded else None
                                
                                tenant_cursor.execute("""
                                    INSERT INTO users_business_details (
                                        business_id, business_type, legal_structure, country, date_founded,
                                        created_at, updated_at
                                    ) VALUES (
                                        %s, %s, %s, %s, %s, %s, %s
                                    );
                                """, [
                                    str(business_id),
                                    serializer.validated_data['business_type'],
                                    serializer.validated_data['legal_structure'],
                                    str(serializer.validated_data['country']),
                                    date_founded_str,
                                    now,
                                    now
                                ])
                                
                                # Commit after business details insertion
                                tenant_conn.commit()
                                logger.debug("Successfully inserted business details")
                            except psycopg2.Error as e:
                                # Rollback on error
                                tenant_conn.rollback()
                                logger.error(f"Error inserting business details: {str(e)}")
                                raise
                            
                            # Update or create user profile with raw SQL in a separate transaction
                            try:
                                # First check if profile exists
                                tenant_cursor.execute("""
                                    SELECT id FROM users_userprofile
                                    WHERE user_id = %s;
                                """, [str(request.user.id)])
                                profile_exists = tenant_cursor.fetchone()
                                
                                if profile_exists:
                                    # Update existing profile
                                    tenant_cursor.execute("""
                                        UPDATE users_userprofile
                                        SET business_id = %s,
                                            modified_at = %s,
                                            updated_at = %s,
                                            is_business_owner = TRUE,
                                            tenant_id = %s
                                        WHERE user_id = %s;
                                    """, [
                                        str(business_id),
                                        now,
                                        now,
                                        tenant_id,
                                        str(request.user.id)
                                    ])
                                else:
                                    # Create new profile
                                    tenant_cursor.execute("""
                                        INSERT INTO users_userprofile
                                        (user_id, business_id, tenant_id, is_business_owner, created_at, modified_at, updated_at, country)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                                    """, [
                                        str(request.user.id),
                                        str(business_id),
                                        tenant_id,
                                        True,
                                        now,
                                        now,
                                        now,
                                        'US'
                                    ])
                                
                                # Commit after profile update/creation
                                tenant_conn.commit()
                                logger.debug("Successfully updated/created user profile")
                            except psycopg2.Error as e:
                                # Rollback on error
                                tenant_conn.rollback()
                                logger.error(f"Error updating/creating user profile: {str(e)}")
                                raise
                            
                            # Add foreign key constraints AFTER data is inserted in a separate transaction
                            try:
                                # Ensure we're in a clean connection state
                                if tenant_conn.status in (psycopg2.extensions.STATUS_IN_TRANSACTION,
                                                        psycopg2.extensions.STATUS_BEGIN):
                                    tenant_conn.rollback()
                                    logger.debug("Rolled back existing transaction before adding constraints")
                                
                                # Add FK constraint for business_details to business
                                tenant_cursor.execute(f"""
                                    ALTER TABLE /* RLS: Use tenant_id filtering */ "users_business_details"
                                    ADD CONSTRAINT IF NOT EXISTS users_business_details_business_id_fk
                                    FOREIGN KEY (business_id) REFERENCES "{schema_name}"."users_business" (id)
                                    DEFERRABLE INITIALLY DEFERRED;
                                """)
                                
                                # Commit after first constraint
                                tenant_conn.commit()
                                logger.debug("Added business_details foreign key constraint")
                                
                                # Add FK constraint for userprofile to business in a separate transaction
                                tenant_cursor.execute(f"""
                                    ALTER TABLE /* RLS: Use tenant_id filtering */ "users_userprofile"
                                    ADD CONSTRAINT IF NOT EXISTS users_userprofile_business_id_fk
                                    FOREIGN KEY (business_id) REFERENCES "{schema_name}"."users_business" (id)
                                    DEFERRABLE INITIALLY DEFERRED;
                                """)
                                
                                # Commit after second constraint
                                tenant_conn.commit()
                                logger.info(f"Added foreign key constraints to {schema_name} schema")
                            except psycopg2.Error as fk_error:
                                # Rollback on error
                                try:
                                    tenant_conn.rollback()
                                    logger.debug("Rolled back transaction after constraint error")
                                except Exception as rollback_error:
                                    logger.error(f"Error rolling back after constraint error: {str(rollback_error)}")
                                
                                # Log but continue if constraint addition fails
                                logger.warning(f"Error adding foreign key constraints: {str(fk_error)}")
                    except psycopg2.OperationalError as op_error:
                        # Handle operational errors specifically
                        logger.error(f"Database operational error: {str(op_error)}", exc_info=True)
                        logger.error(f"Connection details: schema_name={schema_name}, autocommit=True",
                                    extra={'schema': schema_name, 'error_type': 'OperationalError'})
                        # Re-raise with more context
                        raise Exception(f"Database connection error: {str(op_error)}. This may indicate connection issues or server overload.")
                    except psycopg2.IntegrityError as int_error:
                        # Handle integrity errors (constraint violations)
                        logger.error(f"Database integrity error: {str(int_error)}", exc_info=True)
                        logger.error(f"Integrity violation: schema_name={schema_name}, business_id={business_id}",
                                    extra={'schema': schema_name, 'error_type': 'IntegrityError'})
                        # Re-raise with more context
                        raise Exception(f"Data integrity error: {str(int_error)}. This may indicate duplicate or invalid data.")
                    except Exception as db_op_error:
                        # Log the error with detailed context
                        logger.error(f"Database operation failed: {str(db_op_error)}", exc_info=True)
                        logger.error(f"Database operation context: schema_name={schema_name}, business_id={business_id}",
                                    extra={
                                        'schema': schema_name,
                                        'error_type': type(db_op_error).__name__,
                                        'sql_state': getattr(db_op_error, 'pgcode', 'unknown'),
                                        'transaction_status': getattr(tenant_conn, 'status', None) if 'tenant_conn' in locals() else 'unknown'
                                    })
                        # Re-raise to be caught by the outer try/except
                        raise
                    finally:
                        # Always close the dedicated connection
                        if 'tenant_conn' in locals() and tenant_conn:
                            try:
                                # Check connection status before closing
                                conn_status = tenant_conn.status if hasattr(tenant_conn, 'status') else 'unknown'
                                logger.debug(f"Closing dedicated tenant connection for schema {schema_name} (status: {conn_status})")
                                
                                # If connection is in error state, try to reset it
                                if conn_status in (psycopg2.extensions.STATUS_IN_TRANSACTION,
                                                  psycopg2.extensions.STATUS_BEGIN):
                                    logger.warning(f"Connection in transaction state before closing (status: {conn_status})")
                                    try:
                                        # Try to rollback any pending transaction
                                        tenant_conn.rollback()
                                        logger.debug("Successfully rolled back transaction before closing")
                                    except Exception as rollback_error:
                                        logger.error(f"Error rolling back transaction: {str(rollback_error)}")
                                
                                # Close the connection
                                tenant_conn.close()
                                logger.debug(f"Successfully closed dedicated tenant connection for schema {schema_name}")
                            except Exception as close_error:
                                logger.error(f"Error closing tenant connection: {str(close_error)}", exc_info=True)
                                logger.error(f"Connection details: schema={schema_name}, status={getattr(tenant_conn, 'status', 'unknown')}")
            except Exception as db_error:
                # Log the error but continue with the response
                logger.error(f"Error creating business record: {str(db_error)}", exc_info=True)
                # We'll continue with the deferred setup approach
            
            # Store setup info in response data 
            pending_setup = {
                'user_id': str(request.user.id),
                'business_id': str(business_id),
                'schema_name': schema_name,  # Store the schema name
                'business_data': {
                    'business_num': business_num,
                    'business_name': serializer.validated_data['name'],
                    'business_type': serializer.validated_data['business_type'],
                    'country': str(serializer.validated_data['country']),
                    'legal_structure': serializer.validated_data['legal_structure'],
                    'date_founded': serializer.validated_data['date_founded'].isoformat() if serializer.validated_data.get('date_founded') else None
                },
                'timestamp': timezone.now().isoformat(),
                'source': 'business_info_page',
                'deferred': True,
                'minimal_schema_created': True,  # Flag that we created a minimal schema
                'next_step': 'subscription'
            }
            
            # Define onboarding status
            onboarding_status = 'business-info'
            next_step = 'subscription'
            
            # Create response data
            response_data = {
                "success": True,
                "message": "Business information saved successfully. You can continue with the onboarding process without waiting.",
                "request_id": request_id,
                "data": {
                    "onboarding": {
                        "status": onboarding_status,
                        "currentStep": onboarding_status,
                        "nextStep": next_step,
                        "redirectTo": "/onboarding/subscription"
                    },
                    "businessInfo": {
                        "id": str(business_id),
                        "business_num": business_num,
                        "business_name": serializer.validated_data['name'],
                        "business_type": serializer.validated_data['business_type'],
                        "country": serializer.validated_data['country'].code if hasattr(serializer.validated_data['country'], 'code') else None,
                        "legal_structure": serializer.validated_data['legal_structure'],
                        "date_founded": serializer.validated_data['date_founded'].isoformat() if serializer.validated_data.get('date_founded') else None,
                        "first_name": first_name,
                        "last_name": last_name,
                        "created_at": timezone.now().isoformat()
                    },
                    "pendingSetup": pending_setup,
                    "schemaSetup": {
                        "status": "minimal",
                        "message": "Basic database setup complete. Full setup will be performed when you reach the dashboard.",
                        "backgroundProcessing": True,
                        "schema_name": schema_name
                    },
                    "timestamp": timezone.now().isoformat()
                }
            }
            
            # Create a response object
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Store the pending setup data in a cookie instead of session
            response.set_cookie(
                'pending_schema_setup',
                json.dumps(pending_setup),
                max_age=86400,  # 1 day
                httponly=True,
                samesite='Lax'
            )
            
            # Also store in user profile metadata for persistence using direct SQL
            try:
                # First check if profile exists in public schema
                with connection.cursor() as cursor:
                    # Reset search path to public
                    cursor.execute('-- RLS: No need to set search_path with tenant-aware context')
                    cursor.execute('SET search_path TO public')
                    
                    # Check if profile exists
                    cursor.execute("""
                        SELECT id, metadata FROM users_userprofile 
                        WHERE user_id = %s;
                    """, [str(request.user.id)])
                    
                    profile_data = cursor.fetchone()
                    
                    if profile_data:
                        profile_id, existing_metadata = profile_data
                        
                        # Parse existing metadata or initialize empty dict
                        if existing_metadata is None:
                            metadata = {}
                        else:
                            metadata = existing_metadata
                        
                        # Update metadata
                        metadata['pending_schema_setup'] = pending_setup
                        
                        # Update profile with new metadata
                        cursor.execute("""
                            UPDATE users_userprofile 
                            SET metadata = %s
                            WHERE id = %s;
                        """, [json.dumps(metadata), profile_id])
                        
                        logger.info(f"Stored schema setup info in user profile metadata")
                    else:
                        # Create public schema profile if it doesn't exist
                        cursor.execute("""
                            INSERT INTO users_userprofile (user_id, metadata, created_at, modified_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s);
                        """, [
                            str(request.user.id),
                            json.dumps({'pending_schema_setup': pending_setup}),
                            timezone.now(),
                            timezone.now(),
                            timezone.now()
                        ])
                        logger.info(f"Created new public schema profile with metadata for user {request.user.id}")
            except Exception as meta_error:
                logger.warning(f"Failed to store schema info in profile metadata: {str(meta_error)}")
            
            # Update the session with tenant information
            try:
                from session_manager.services import session_service
                
                # Get the current session ID from the request
                session_id = None
                
                # Check if user has auth tokens or session cookies
                if hasattr(request, 'session') and hasattr(request.session, 'session_id'):
                    session_id = str(request.session.session_id)
                elif hasattr(request, 'auth') and hasattr(request.auth, 'session_id'):
                    session_id = str(request.auth.session_id)
                    
                # If we don't have a session ID, try to get from cookies
                if not session_id:
                    session_cookie = request.COOKIES.get('sid')
                    if session_cookie:
                        session_id = session_cookie
                
                if session_id:
                    # Update the session with tenant information
                    updated_session = session_service.update_session(
                        session_id=session_id,
                        tenant_id=tenant_id,
                        needs_onboarding=True,  # Still in onboarding
                        onboarding_step='subscription',  # Next step
                        onboarding_completed=False
                    )
                    
                    if updated_session:
                        logger.info(f"Updated session {session_id} with tenant_id: {tenant_id}")
                    else:
                        logger.warning(f"Failed to update session {session_id} with tenant_id")
                else:
                    logger.warning(f"No session ID found to update with tenant_id")
                    
                # Also update all active sessions for the user
                from session_manager.models import UserSession
                active_sessions = UserSession.objects.filter(
                    user=request.user,
                    is_active=True,
                    expires_at__gt=timezone.now()
                )
                
                sessions_updated = 0
                for session in active_sessions:
                    session.tenant_id = tenant_id
                    session.save(update_fields=['tenant_id'])
                    sessions_updated += 1
                    
                if sessions_updated > 0:
                    logger.info(f"Updated {sessions_updated} active session(s) with tenant_id: {tenant_id}")
                    
            except Exception as session_error:
                logger.error(f"Error updating session with tenant ID: {str(session_error)}")
                # Don't fail the request just because session update failed
            
            # Log that we're setting up with minimal schema
            logger.info(f"Created minimal schema and business data for user {request.user.id}", extra={
                'user_id': str(request.user.id),
                'business_id': str(business_id),
                'schema_name': schema_name,
                'minimal': True,
                'next_step': 'subscription',
                'tenant_id': tenant_id
            })
            
            # Add tenant_id to response data
            response_data['data']['tenant_id'] = tenant_id
            response_data['data']['tenantId'] = tenant_id  # Include both formats
            
            return response

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
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")


    def options(self, request, *args, **kwargs):
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin')
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    def get_business(self, request):
        """Retrieve business with explicit default database connection"""
        try:
            # Use our utility function
            business = get_business_for_user(request.user)
            if business:
                return business
                
            # If we reach here, no business exists yet
            # Create a new basic business
            from users.models import Business, BusinessDetails
            
            # Create the base business with valid fields only
            business = Business.objects.create(
                name=f"{request.user.first_name}'s Business"
            )
            
            # Set owner
            business._owner = request.user
            business._owner_id = request.user.id
            business.save()
            
            # Ensure business details exist
            BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'business_type': 'default',
                    'legal_structure': 'SOLE_PROPRIETORSHIP',
                    'country': 'US'
                }
            )
            
            # Update OnboardingProgress with this business
            try:
                # FIXED: Remove business_id update since the column doesn't exist in the database
                # The OnboardingProgress is already linked to the user and tenant, 
                # business relationship can be established through those
                # OnboardingProgress.objects.filter(user=request.user).update(business_id=business.id)
                logger.info(f"Business {business.id} linked to user {request.user.email} via tenant relationship")
            except Exception as e:
                logger.warning(f"Failed to update OnboardingProgress with new business: {str(e)}")
            
            return business
            
        except Exception as e:
            logger.error(f"Business lookup error: {str(e)}", extra={'user': request.user.id})
            logger.error("Business lookup failed", extra={'user': request.user.id})
            raise ValidationError({
                'error': 'Complete business setup first',
                'code': 'missing_business',
                'next_step': '/onboarding/business-info'
            })

@method_decorator(csrf_exempt, name='dispatch')
class SaveStep2View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    VALID_PLANS = ['free', 'professional', 'enterprise']
    VALID_BILLING_CYCLES = ['monthly', 'annual']

    def validate_subscription_data(self, data):
        """Validates subscription data"""
        logger.debug("Validating subscription data", extra={'data': data})

        # Normalize plan input
        if isinstance(data.get('selected_plan'), dict):
            data['selected_plan'] = data['selected_plan'].get('type')
        elif 'tier_type' in data:
            data['selected_plan'] = data['tier_type']

        # Validate required fields
        if not data.get('selected_plan'):
            return False, "Plan selection is required"
        if data['selected_plan'] not in self.VALID_PLANS:
            return False, f"Invalid plan type: {data['selected_plan']}"
        if data.get('billing_cycle') and data['billing_cycle'] not in self.VALID_BILLING_CYCLES:
            return False, f"Invalid billing cycle: {data['billing_cycle']}"

        return True, None

    def get_business(self, request):
        """Retrieve business with explicit default database connection"""
        try:
            # Use our utility function
            business = get_business_for_user(request.user)
            if business:
                return business
                
            # If we reach here, no business exists yet
            # Create a new basic business
            from users.models import Business, BusinessDetails
            
            # Create the base business with valid fields only
            business = Business.objects.create(
                name=f"{request.user.first_name}'s Business"
            )
            
            # Set owner
            business._owner = request.user
            business._owner_id = request.user.id
            business.save()
            
            # Ensure business details exist
            logger.info(f"Business data reset for user {user.email}")
            return True
        except Exception as e:
            logger.error(f"Business data reset error: {str(e)}")
            return False

    def get_user_profile(self, user):
        """Get user profile with proper error handling, creating one if needed"""
        try:
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            logger.info(f"Creating new profile for user {user.email}")
            try:
                # Create a basic profile with minimal required fields
                return UserProfile.objects.create(user=user)
            except Exception as create_error:
                logger.error(f"Error creating user profile: {str(create_error)}")
                return None
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            return None

    def cleanup_tenant_schema(self, tenant):
        """Clean up existing tenant schema"""
        try:
            with connection.cursor() as cursor:
                # Drop schema and all objects within it
                cursor.execute(f'DROP SCHEMA IF EXISTS "{tenant.id}" CASCADE')
                
                # Update tenant status
                tenant.is_active = False
                tenant.save(update_fields=['is_active'])
            return True
        except Exception as e:
            logger.error(f"Schema cleanup error: {str(e)}")
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
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
                
            # Reset tenant-related fields
            user = profile.user
            if hasattr(user, 'tenant') and user.tenant:
                # Clean up schema
                self.cleanup_tenant_schema(user.tenant)
                # Delete tenant
                user.tenant.delete()
                user.tenant = None
                user.save(update_fields=['tenant'])

            # Check which fields exist on the profile model before setting them
            # Use introspection to avoid field errors
            model_fields = [f.name for f in profile._meta.fields]
            update_fields = []
            
            if 'last_setup_attempt' in model_fields:
                profile.last_setup_attempt = None
                update_fields.append('last_setup_attempt')
                
            if 'setup_error_message' in model_fields:
                profile.setup_error_message = None
                update_fields.append('setup_error_message')
                
            if 'database_setup_task_id' in model_fields:
                profile.database_setup_task_id = None
                update_fields.append('database_setup_task_id')
            
            # Only save if there are fields to update
            if update_fields:
                profile.save(update_fields=update_fields)
            
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
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
            
            # Clean up schema if tenant exists
            if request.user.tenant:
                try:
                    self.cleanup_tenant_schema(request.user.tenant)
                except Exception as e:
                    logger.error(f"Schema cleanup error: {str(e)}")
                    # Continue even if schema cleanup fails
            
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

    def get_or_create_profile(self, user):
        """Get user profile or create one if it doesn't exist"""
        try:
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            logger.info(f"Creating new profile for user {user.email}")
            try:
                return UserProfile.objects.create(user=user)
            except Exception as e:
                logger.error(f"Error creating user profile: {str(e)}")
                return None
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            return None

    def post(self, request):
        """
        Handle POST requests to reset onboarding state.
        
        This endpoint completely resets a user's onboarding progress,
        including database configuration and profile settings.
        """
        try:
            # Get or create user profile instead of just getting it
            profile = self.get_or_create_profile(request.user)
            if not profile:
                logger.warning(f"Could not create or retrieve profile for user {request.user.email}")
                # Return a more helpful response instead of an error
                return Response({
                    "status": "incomplete",
                    "message": "Proceeding with incomplete profile",
                    "next_step": "step3"
                }, status=status.HTTP_202_ACCEPTED)

            # Perform the reset operation
            self.reset_profile(profile)
            
            # Clean up schema if tenant exists
            if request.user.tenant:
                try:
                    self.cleanup_tenant_schema(request.user.tenant)
                except Exception as e:
                    logger.error(f"Schema cleanup error: {str(e)}")
                    # Continue even if schema cleanup fails
            
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
@authentication_classes([SessionTokenAuthentication, Auth0JWTAuthentication])
async def get_schema_status(request):
    try:
        if not request.user.tenant:
            return Response({
                'status': 'pending',
                'message': 'Schema setup in progress'
            })

        is_healthy = await check_schema_health(request.user.tenant.id)
        return Response({
            'status': 'ready' if is_healthy else 'initializing',
            'schema_name': request.user.tenant.id,
            'setup_complete': is_healthy
        })
    except Exception as e:
        # Update tenant status on error if tenant exists
        if request.user.tenant:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE auth_tenant
                        SET database_status = 'error',
                            setup_status = 'failed',
                            last_health_check = NOW(),
                            setup_error_message = %s
                        WHERE owner_id = %s
                    """, [str(e), str(request.user.id)])
            except Exception as update_error:
                logger.error(f"Failed to update tenant status on error: {str(update_error)}")

        return Response({
            'status': 'error',
            'message': str(e),
            'tenant_status': {
                'database_status': 'error',
                'setup_status': 'failed',
                'last_health_check': timezone.now().isoformat()
            }
        })

def check_schema_setup(tenant_id: uuid.UUID):
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
        # Set tenant context for RLS
        from custom_auth.rls import set_current_tenant_id
        set_current_tenant_id(tenant_id)
        
        # Check tables in current context (public schema with RLS)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            """)
            existing_tables = {row[0] for row in cursor.fetchall()}
            
            # Check if all required tables exist
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            if missing_tables:
                logger.warning(f"Missing tables for tenant {tenant_id}: {missing_tables}")
                return False
                
            return True
            
    except Exception as e:
        logger.error(f"Error checking schema setup: {str(e)}")
        return False

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([SessionTokenAuthentication, Auth0JWTAuthentication])
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
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def options(self, request, *args, **kwargs):
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

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
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        try:
            # Get progress with related data
            progress = OnboardingProgress.objects.select_related(
                'user',
                'business'
            ).get(user=request.user)

            # Build base response
            response_data = {
                "request_id": request_id,
                "timestamp": timezone.now().isoformat(),
                "status": progress.onboarding_status or 'not_started',
                "selected_plan": progress.selected_plan,
                "progress": progress.setup_progress or 0,
                "current_step": progress.current_step,
                "next_step": progress.next_step,
                "onboarding_status": progress.onboarding_status
            }

            # Add task info if available
            if progress.database_setup_task_id:
                task_info = self.get_task_info(progress.database_setup_task_id)
                if task_info:
                    response_data.update({
                        "task_id": progress.database_setup_task_id,
                        "task_status": task_info.get('status'),
                        "task_progress": task_info.get('progress', 0),
                        "current_operation": task_info.get('step'),
                        "error": task_info.get('error')
                    })

            # Add CORS headers
            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        except OnboardingProgress.DoesNotExist:
            logger.warning(f"[{request_id}] No progress found for user {request.user.id}")
            return Response({
                "request_id": request_id,
                "status": "not_found",
                "message": "No onboarding progress found",
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"[{request_id}] Setup status error: {str(e)}", exc_info=True)
            return Response({
                "request_id": request_id,
                "status": "error",
                "error": str(e),
                "timestamp": timezone.now().isoformat()
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
                    getattr(business, 'name', None),
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
                    'business_name': getattr(business, 'name', None),
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


class SetupStatusCheckView(APIView):
    """
    View to check the status of a background schema setup task.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get(self, request, task_id):
        """
        Get the current status of a background schema setup task.
        """
        try:
            # Retrieve the task result
            task = AsyncResult(task_id)
            
            # Get task info
            task_info = task.info if isinstance(task.info, dict) else {}
            
            # Prepare response based on task state
            if task.state == 'PENDING':
                response_data = {
                    'status': 'pending',
                    'message': 'Setup task is pending execution',
                    'progress': 0
                }
            elif task.state == 'STARTED':
                response_data = {
                    'status': 'in_progress',
                    'message': 'Setup task has started',
                    'progress': task_info.get('progress', 5)
                }
            elif task.state == 'SUCCESS':
                response_data = {
                    'status': 'complete',
                    'message': 'Setup completed successfully',
                    'progress': 100,
                    'result': task.result
                }
            elif task.state == 'FAILURE':
                response_data = {
                    'status': 'failed',
                    'message': f'Setup failed: {str(task.result)}',
                    'error': str(task.result),
                    'progress': -1
                }
            else:
                # For states like RETRY, REVOKED, etc.
                response_data = {
                    'status': task.state.lower(),
                    'message': f'Setup task is in {task.state} state',
                    'progress': task_info.get('progress', 0)
                }
                
            # Add task details if available
            if task_info:
                response_data.update({
                    'step': task_info.get('step', 'Unknown'),
                    'details': task_info
                })
                
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error checking task status: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Error checking task status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]

    def get(self, request, *args, **kwargs):
        try:
            # Use the custom method that handles tenant context during onboarding
            progress = OnboardingProgress.get_for_user(request.user)
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

            # Manual transaction handling instead of atomic
            from django.db import connection
            
            # Store autocommit setting
            old_autocommit = connection.get_autocommit()
            connection.set_autocommit(True)  # Important: Set autocommit to True
            
            try:
                # Create a new connection if needed
                if connection.in_atomic_block:
                    connection.close()
                    connection.connect()
                    
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
            except Exception as e:
                logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                raise
            finally:
                # Restore previous autocommit setting
                try:
                    if old_autocommit != connection.get_autocommit():
                        connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")

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
            # Manual transaction handling instead of atomic
            from django.db import connection
            
            # Store autocommit setting
            old_autocommit = connection.get_autocommit()
            connection.set_autocommit(True)  # Important: Set autocommit to True
            
            try:
                # Create a new connection if needed
                if connection.in_atomic_block:
                    connection.close()
                    connection.connect()
                    
                profile = UserProfile.objects.select_for_update().get(user=user)
                progress = OnboardingProgress.objects.select_for_update().get(user=user)
                
                # Get plan from session metadata or default to professional
                selected_plan = 'professional'  # Default
                if session.metadata and 'plan' in session.metadata:
                    selected_plan = session.metadata['plan']
                    # Validate plan
                    if selected_plan not in ['free', 'professional', 'enterprise']:
                        selected_plan = 'professional'  # Fallback to professional if invalid
                
                # Update subscription
                subscription = Subscription.objects.update_or_create(
                    business=profile.business,
                    defaults={
                        'selected_plan': selected_plan,
                        'start_date': timezone.now().date(),
                        'is_active': True,
                        'billing_cycle': 'monthly' if session.subscription else 'annual'
                    }
                )[0]
                
                # Update progress
                progress.payment_completed = True
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.save()
                
                # Trigger schema setup task
                try:
                    # Get business ID from profile
                    business_id = str(profile.business.id) if profile.business else None
                    
                    # For webhook events, we'll update the user's profile data if possible
                    # The actual schema setup will be triggered when they reach the dashboard
                    if business_id:
                        logger.info(f"Marking payment as completed for user {user.id} via webhook")
                        
                        # Store this information in the user's profile or another persistent storage
                        # so it can be checked when they reach the dashboard
                        try:
                            profile = user.profile
                            profile.metadata = profile.metadata or {}
                            profile.metadata['pending_schema_setup'] = {
                                'user_id': str(user.id),
                                'business_id': business_id,
                                'plan': 'paid',
                                'payment_completed': True,
                                'timestamp': timezone.now().isoformat()
                            }
                            profile.save(update_fields=['metadata'])
                            logger.info(f"Updated user profile with pending schema setup info via webhook")
                        except Exception as e:
                            logger.error(f"Error updating user profile via webhook: {str(e)}")
                    else:
                        logger.error(f"Cannot trigger schema setup: No business ID for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to trigger schema setup from webhook: {str(e)}")
                    # Continue even if setup task fails - we can retry later
                
                # Update Cognito attributes
                try:
                    # from custom_auth.cognito import update_user_attributes_sync  # REMOVED - using Auth0
                    
                    # Create attributes dictionary with valid values
                    cognito_attributes = {
                        'custom:onboarding': 'COMPLETE',  # Always set a valid string value
                        'custom:subplan': 'professional'   # Always set a valid string value
                    }
                    
                    # Update Cognito attributes
                    # update_user_attributes_sync(str(user.id), cognito_attributes)  # REMOVED - using Auth0
                    logger.info(f"Updated Cognito attributes for user {user.id}: {cognito_attributes}")
                except Exception as e:
                    logger.error(f"Failed to update Cognito attributes: {str(e)}")
                    # Continue even if Cognito update fails
                
                logger.info(f"Subscription activated for user {user.id}")
                
            except Exception as e:
                logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                raise
            finally:
                # Restore previous autocommit setting
                try:
                    if old_autocommit != connection.get_autocommit():
                        connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")
                
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

class DatabaseHealthCheckView(BaseOnboardingView):
    """View for checking database health status and connectivity"""

    def get_user_tenant(self, user):
        """Get user's tenant information with related data"""
        try:
            if not hasattr(user, 'tenant') or not user.tenant:
                logger.warning(f"No tenant configured for user {user.email}")
                return None
            return user.tenant
        except Exception as e:
            logger.error(f"Error getting tenant for user {user.email}: {str(e)}")
            return None

    def check_table_requirements(tenant_id: uuid.UUID):
        """Verify required tables exist in schema"""
        try:
            return validate_schema_creation(schema_name)
        except Exception as e:
            logger.error(f"Schema validation error: {str(e)}")
            return False

    def get(self, request, *args, **kwargs):
        """Handle GET request for schema health check"""
        try:
            tenant = self.get_user_tenant(request.user)
            
            # Case 1: No tenant configured
            if not tenant:
                return Response({
                    "status": "not_found",
                    "schema_name": None,
                    "message": "No tenant configured",
                    "onboarding_required": True,
                    "tenant_status": {
                        "database_status": 'not_created',
                        "setup_status": 'not_started',
                        "last_health_check": None
                    },
                    "details": {
                        "connection_status": "disconnected",
                        "tables_status": "invalid"
                    },
                    "timestamp": timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)

            # Use our utility function to get business
            business = get_business_for_user(request.user)
            
            # Check health and update statuses
            is_healthy = check_schema_health(tenant.id)
            tables_valid = self.check_table_requirements(tenant.id) if is_healthy else False

            # Manual transaction handling instead of atomic
            from django.db import connection
            
            # Store autocommit setting
            old_autocommit = connection.get_autocommit()
            connection.set_autocommit(True)  # Important: Set autocommit to True
            
            try:
                # Create a new connection if needed
                if connection.in_atomic_block:
                    connection.close()
                    connection.connect()
                
                # Update tenant status based on health check
                with connection.cursor() as cursor:
                    if is_healthy and tables_valid:
                        cursor.execute("""
                            UPDATE auth_tenant
                            SET database_status = 'active',
                                setup_status = 'complete',
                                last_health_check = NOW()
                            WHERE owner_id = %s
                        """, [str(request.user.id)])
                    else:
                        cursor.execute("""
                            UPDATE auth_tenant
                            SET database_status = 'error',
                                setup_status = 'failed',
                                last_health_check = NOW()
                            WHERE owner_id = %s
                        """, [str(request.user.id)])
                    
                # Get updated tenant status
                tenant_status = None
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT database_status, setup_status, last_health_check
                        FROM auth_tenant
                        WHERE owner_id = %s
                    """, [str(request.user.id)])
                    
                    tenant_status = cursor.fetchone()
                
                response_data = {
                    "status": "healthy" if (is_healthy and tables_valid) else "unhealthy",
                    "schema_name": tenant.id,
                    "tenant_status": {
                        "database_status": tenant_status[0] if tenant_status else 'error',
                        "setup_status": tenant_status[1] if tenant_status else 'failed',
                        "last_health_check": tenant_status[2].isoformat() if tenant_status and tenant_status[2] else None
                    },
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
                logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                raise
            finally:
                # Restore previous autocommit setting
                try:
                    if old_autocommit != connection.get_autocommit():
                        connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")

        except Exception as e:
            logger.error(f"Health check error: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "onboarding_status": 'error',
                "setup_error": 'failed',
                "message": str(e),
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def update_session(request):
    """
    Update the session without causing database transaction issues.
    
    This function handles updating session data safely without using 
    database transactions that could cause conflicts.
    """
    try:
        # Get data from request
        data = json.loads(request.body)
        
        # Update session data
        for key, value in data.items():
            request.session[key] = value
        
        request.session.modified = True
        
        # Return success response
        return JsonResponse({
            'success': True,
            'message': 'Session updated successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

# Add CheckOnboardingStatusView class
class CheckOnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get(self, request):
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))

        try:
            # Use our utility function to get business
            business = get_business_for_user(request.user)
            
            # Get progress with direct query to avoid select_related issues
            progress = OnboardingProgress.objects.filter(user=request.user).first()

            if not progress:
                return Response({
                    'status': 'new',
                    'currentStep': 0,  # Indicate onboarding hasn't started
                    'setup_complete': False,
                }, status=status.HTTP_200_OK)

            has_business_info = business and all([
                hasattr(business, 'name') and business.name,
                hasattr(business, 'business_type') and business.business_type,
                hasattr(business, 'country') and business.country,
                hasattr(business, 'legal_structure') and business.legal_structure,
            ])

            response_data = {
                'status': str(progress.onboarding_status or 'unknown'),
                'currentStep': str(progress.current_step or 'unknown'),
                'setup_complete': bool(progress.onboarding_status == 'complete'),
                'hasBusinessInfo': bool(has_business_info),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error checking onboarding status: {str(e)}")
            return Response({'status': 'error', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Add ResetOnboardingView class
class ResetOnboardingView(BaseOnboardingView):
    def get_user_profile(self, user):
        """Get user profile with proper error handling"""
        try:
            # Don't use select_related, use direct query
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            logger.error(f"Profile not found for user {user.email}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            raise

    def cleanup_tenant_schema(self, tenant):
        """Clean up existing tenant schema"""
        try:
            with connection.cursor() as cursor:
                # Drop schema and all objects within it
                cursor.execute(f'DROP SCHEMA IF EXISTS "{tenant.id}" CASCADE')
                
                # Update tenant status
                tenant.is_active = False
                tenant.save(update_fields=['is_active'])
            return True
        except Exception as e:
            logger.error(f"Schema cleanup error: {str(e)}")
            return False

    def reset_business_data(self, user):
        """Reset business data to initial state"""
        try:
            # Use our utility function to get business
            business = get_business_for_user(user)
            if not business:
                logger.warning(f"No business found for user {user.email}")
                return False
                
            logger.info(f"Resetting business data for user {user.email}")
            business.name = f"{user.first_name}'s Business" if user.first_name else "My Business"
            business.save()
            
            # Ensure business details exist
            from users.models import BusinessDetails
            BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'business_type': 'default',
                    'legal_structure': 'SOLE_PROPRIETORSHIP',
                    'country': 'US'
                }
            )
            
            logger.info(f"Business data reset for user {user.email}")
            return True
        except Exception as e:
            logger.error(f"Business data reset error: {str(e)}")
            return False

    def post(self, request):
        """Handle POST request to reset onboarding data"""
        try:
            # Get user profile
            profile = self.get_user_profile(request.user)
            if not profile:
                return Response({
                    'error': 'Profile not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Reset business data
            business_reset = self.reset_business_data(request.user)
            
            # Reset onboarding progress
            progress_reset = False
            try:
                progress = OnboardingProgress.objects.get(user=request.user)
                progress.onboarding_status = 'not_started'
                progress.current_step = 'not_started'
                progress.next_step = 'business-info'
                progress.save(update_fields=['onboarding_status', 'current_step', 'next_step'])
                progress_reset = True
            except OnboardingProgress.DoesNotExist:
                logger.warning(f"No onboarding progress found for user {request.user.email}")
            
            # Reset Cognito attributes
            cognito_reset = False
            try:
                # from custom_auth.cognito import update_user_attributes_sync  # REMOVED - using Auth0
                
                # Create attributes dictionary with valid values
                cognito_attributes = {
                    'custom:onboarding': 'NOT_STARTED',  # Always set a valid string value
                    'custom:setupdone': 'FALSE'          # Always set a valid string value
                }
                
                # Update Cognito attributes
                # update_user_attributes_sync(str(request.user.id), cognito_attributes)  # REMOVED - using Auth0
                logger.info(f"Updated Cognito attributes for user {request.user.id}: {cognito_attributes}")
                cognito_reset = True
            except Exception as e:
                logger.error(f"Failed to update Cognito attributes: {str(e)}")
                # Continue even if Cognito update fails
            
            return Response({
                'success': True,
                'message': 'Onboarding reset successful',
                'details': {
                    'business_reset': business_reset,
                    'progress_reset': progress_reset,
                    'cognito_reset': cognito_reset
                }
            })
            
        except Exception as e:
            logger.error(f"Error resetting onboarding: {str(e)}")
            return Response({
                'error': f'Failed to reset onboarding: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Add utility functions
def get_task_status(task_id, request_id=None):
    """Retrieve the status of a Celery task"""
    if not task_id:
        return None

    try:
        from celery.result import AsyncResult
        task = AsyncResult(task_id)
        task_info = task.info if isinstance(task.info, dict) else {}
        
        return {
            'status': task.state,
            'progress': int(task_info.get('progress', 0)),  # Ensure integer
            'step': str(task_info.get('step', 'Initializing')),  # Ensure string
            'error': str(task.result) if task.failed() else None
        }
    except Exception as e:
        logger.error(f"Task status retrieval failed: {str(e)}")
        return None

def check_setup_status(user_id):
    """Check the status of a user's database setup"""
    try:
        user = User.objects.get(id=user_id)
        progress = OnboardingProgress.objects.get(user=user)
        
        if not progress.database_setup_task_id:
            return {
                'status': 'not_started',
                'message': 'Setup not initiated'
            }
            
        task_status = get_task_status(progress.database_setup_task_id)
        if not task_status:
            return {
                'status': 'unknown',
                'message': 'Task status not available'
            }
            
        return task_status
    except User.DoesNotExist:
        logger.error(f"User not found for ID {user_id}")
        return {
            'status': 'error',
            'message': 'User not found'
        }
    except OnboardingProgress.DoesNotExist:
        logger.error(f"OnboardingProgress not found for user {user_id}")
        return {
            'status': 'error',
            'message': 'Onboarding progress not found'
        }
    except Exception as e:
        logger.error(f"Error checking setup status: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

def get_schema_status(user_id):
    """Get the status of a user's database schema"""
    try:
        user = User.objects.get(id=user_id)
        
        if not hasattr(user, 'tenant') or not user.tenant:
            return {
                'status': 'not_found',
                'message': 'No tenant configured for user'
            }
            
        tenant = user.tenant
        is_healthy = check_schema_health(tenant.id)
        
        return {
            'status': 'healthy' if is_healthy else 'unhealthy',
            'schema_name': tenant.id,
            'database_status': tenant.database_status,
            'setup_status': tenant.setup_status,
            'last_health_check': tenant.last_health_check.isoformat() if tenant.last_health_check else None
        }
    except User.DoesNotExist:
        logger.error(f"User not found for ID {user_id}")
        return {
            'status': 'error',
            'message': 'User not found'
        }
    except Exception as e:
        logger.error(f"Error getting schema status: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

def cancel_task(task_id):
    """Cancel a running Celery task"""
    try:
        from celery.result import AsyncResult
        task = AsyncResult(task_id)
        
        if task.state in ['PENDING', 'STARTED', 'RETRY']:
            task.revoke(terminate=True, signal='SIGTERM')
            return {
                'status': 'cancelled',
                'message': 'Task cancelled successfully'
            }
        else:
            return {
                'status': 'not_running',
                'message': f'Task not running (state: {task.state})'
            }
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }


def update_session(request):
    """
    Update the session without causing database transaction issues.
    
    This function handles updating session data safely without using 
    database transactions that could cause conflicts.
    """
    try:
        # Get data from request
        data = json.loads(request.body)
        
        # Update session data
        for key, value in data.items():
            request.session[key] = value
        
        request.session.modified = True
        
        # Return success response
        return JsonResponse({
            'success': True,
            'message': 'Session updated successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

# After the SaveStep2View class but before SaveStep4View class

class SaveStep3View(BaseOnboardingView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    @sync_to_async
    def get_user(self, request):
        """Retrieve the user from the request."""
        return request.user
    
    @sync_to_async
    def save_payment_status(self, user, payment_completed, payment_data=None):
        """Save payment status with validation and transaction handling."""
        # Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Create a new connection if needed
            if connection.in_atomic_block:
                connection.close()
                connection.connect()
                
            try:
                progress = OnboardingProgress.objects.get(user=user)

                # Validate plan type
                if progress.selected_plan not in ['professional', 'enterprise']:
                    raise ValidationError("Payment is only required for the Professional and Enterprise plans.")

                # Update payment status
                progress.payment_completed = payment_completed
                if payment_data:
                    if hasattr(progress, 'payment_method'):
                        progress.payment_method = payment_data.get('payment_method')
                    if hasattr(progress, 'payment_reference'):
                        progress.payment_reference = payment_data.get('payment_reference')
                if hasattr(progress, 'last_payment_attempt'):
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
        except Exception as e:
            logger.error(f"Transaction error: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            try:
                if old_autocommit != connection.get_autocommit():
                    connection.set_autocommit(old_autocommit)
            except Exception as ac_error:
                logger.error(f"Error restoring autocommit: {ac_error}")

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
            if hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
                import stripe
                payment = stripe.PaymentIntent.retrieve(payment_reference)
                return payment.status == 'succeeded'
            return False
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            raise ValidationError("Failed to verify payment.")

    @sync_to_async
    def validate_state(self, user, expected_step):
        """Validate that user is in the expected onboarding step."""
        try:
            progress = OnboardingProgress.objects.get(user=user)
            return progress.current_step == 'subscription'
        except Exception as e:
            logger.error(f"State validation error: {str(e)}")
            return False

    @sync_to_async
    def get_onboarding_progress(self, user):
        """Get onboarding progress with proper error handling."""
        try:
            return OnboardingProgress.objects.get(user=user)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.id}")
            raise
        except Exception as e:
            logger.error(f"Error getting onboarding progress: {str(e)}")
            raise

    @sync_to_async
    def handle_error(self, exception, user_id, error_type):
        """Handle and log errors."""
        logger.error(f"Error in step 3 ({error_type}): {str(exception)}", 
                     extra={'user_id': user_id, 'error_type': error_type})
        return True

    async def post(self, request):
        """Handle step 3 submission with enhanced error handling."""
        user = await self.get_user(request)
        data = request.data

        try:
            # Validate current state
            state_valid = await self.validate_state(user, 'step3')
            if not state_valid:
                return Response({
                    "error": "Invalid state for step 3",
                    "current_step": "unknown"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate and process payment
            payment_completed_raw = data.get('payment_completed', False)
            
            # Convert string boolean values to actual booleans using our safe converter
            payment_completed = safe_bool_convert(payment_completed_raw)
                
            if payment_completed:
                await self.validate_payment_data(data)
                payment_verified = await self.verify_payment(data.get('payment_reference'))
                if not payment_verified:
                    raise ValidationError("Payment verification failed.")

            # Save payment status
            progress = await self.save_payment_status(user, payment_completed, data)

            # Update onboarding progress
            progress.onboarding_status = 'payment'
            progress.current_step = 'payment'
            progress.next_step = 'complete' if payment_completed else 'payment'
            progress.save(update_fields=['onboarding_status', 'current_step', 'next_step'])

            return Response({
                "message": "Step 3 completed successfully",
                "payment_status": "completed" if payment_completed else "pending",
                "next_step": "complete" if payment_completed else "payment"
            }, status=status.HTTP_200_OK)

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
            
            # Check if the progress has the required attributes
            payment_completed = getattr(progress, 'payment_completed', False)
            last_attempt = getattr(progress, 'last_payment_attempt', None)
            payment_method = getattr(progress, 'payment_method', None)
            
            return Response({
                "payment_required": progress.selected_plan == 'professional',
                "payment_status": {
                    "completed": payment_completed,
                    "last_attempt": last_attempt,
                    "payment_method": payment_method
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

# After the TaskState enum class definition

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
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    # Configuration constants
    SETUP_TIMEOUT = 30  # seconds
    MAX_RETRIES = 3
    RETRY_DELAY = 1  # seconds

    def dispatch(self, request, *args, **kwargs):
        """
        Enhanced dispatch method with comprehensive token validation and logging.
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))

        # Add CORS headers for OPTIONS requests
        if request.method == 'OPTIONS':
            response = Response()
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        try:
            # Validate authentication
            if not request.user.is_authenticated:
                logger.error(f"[{request_id}] Authentication required")
                return Response({
                    'error': 'Authentication required',
                    'code': 'authentication_required'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Validate token if present
            auth_header = request.headers.get('Authorization', '')
            if auth_header:
                try:
                    token = auth_header.split(' ')[1]
                    access_token = AccessToken(token)
                    access_token.verify()
                    
                    # Verify token expiration
                    if access_token['exp'] < timezone.now().timestamp():
                        raise TokenError('Token has expired')
                        
                    # Verify user ID matches
                    if str(access_token['user_id']) != str(request.user.id):
                        raise TokenError('Token user mismatch')
                except TokenError as e:
                    logger.error(f"[{request_id}] Token validation failed: {str(e)}")
                    return Response({
                        'error': str(e),
                        'code': 'invalid_token'
                    }, status=status.HTTP_401_UNAUTHORIZED)

            return super().dispatch(request, *args, **kwargs)

        except Exception as e:
            logger.error(f"[{request_id}] Dispatch error: {str(e)}")
            return Response({
                'error': str(e),
                'code': 'dispatch_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    def _error_response(self, message, code, status_code, request_id):
        """Create a standardized error response"""
        response = Response({
            'error': message,
            'code': code,
            'request_id': request_id
        }, status=status_code)
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

    def get_or_create_user_profile(self, user, request_id=None):
        """
        Retrieves or creates a user profile with error handling and retries.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Try to get existing profile first without using select_related
                profile = UserProfile.objects.get(user=user)
                return profile
                
            except UserProfile.DoesNotExist:
                try:
                    # Create new profile
                    # Get business first using our utility function
                    business = get_business_for_user(user)
                    if not business:
                        # Create a new business if none exists
                        business = Business.objects.create(
                            name=f"{user.first_name}'s Business" if user.first_name else "My Business"
                        )
                        
                        # Ensure business details exist
                        from users.models import BusinessDetails
                        BusinessDetails.objects.get_or_create(
                            business=business,
                            defaults={
                                'business_type': 'default',
                                'legal_structure': 'SOLE_PROPRIETORSHIP',
                                'country': 'US'
                            }
                        )

                    # Create profile with business link
                    profile = UserProfile.objects.create(
                        user=user,
                        business_id=business.id,
                        is_business_owner=True
                    )
                    return profile
                    
                except IntegrityError:
                    # Handle race condition
                    if attempt < self.MAX_RETRIES - 1:
                        time.sleep(self.RETRY_DELAY)
                        continue
                    raise

        raise Exception("Failed to create user profile after retries")

    def get_progress_with_lock(self, user, request_id=None):
        """
        Retrieves onboarding progress with locking to prevent race conditions.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Check if progress exists first
                progress_exists = OnboardingProgress.objects.filter(user=user).exists()
                
                if progress_exists:
                    # Get progress without using select_related
                    progress = OnboardingProgress.objects.get(user=user)
                    
                    # Fetch business separately using our utility function
                    if not progress.business_id:
                        business = get_business_for_user(user)
                        if business:
                            progress.business_id = business.id
                            progress.save(update_fields=['business_id'])
                            
                    return progress
                else:
                    raise OnboardingProgress.DoesNotExist()
                    
            except OnboardingProgress.DoesNotExist:
                # Create a new progress record
                try:
                    business = get_business_for_user(user)
                    progress = OnboardingProgress.objects.create(
                        user=user,
                        business_id=business.id if business else None,
                        onboarding_status='setup',
                        current_step='setup',
                        next_step='complete'
                    )
                    # Fix any corrupted boolean fields before returning
                    progress = fix_boolean_fields(progress)
                    return progress
                except Exception as e:
                    logger.error(f"Error creating progress: {str(e)}")
                    raise
                    
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY)
                    continue
                raise

        raise Exception("Failed to get progress with lock after maximum retries")

    def post(self, request, *args, **kwargs):
        """Handles step 4 submission with proper authentication and error handling."""
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        try:
            # Extract setup options from request
            try:
                data = json.loads(request.body) if isinstance(request.body, (str, bytes)) else request.data
                force_restart = data.get('force_restart', False)
            except json.JSONDecodeError:
                return self._error_response("Invalid JSON", "invalid_json", status.HTTP_400_BAD_REQUEST, request_id)

            # Get or create profile and progress
            profile = self.get_or_create_user_profile(request.user, request_id)
            progress = self.get_progress_with_lock(request.user, request_id)

            # Check existing task state
            if progress.database_setup_task_id and not force_restart:
                # Check task status
                task_status = get_task_status(progress.database_setup_task_id)
                
                if task_status and task_status.get('status') in TaskState.active_states():
                    return Response({
                        'status': 'in_progress',
                        'task_id': progress.database_setup_task_id,
                        'message': 'Setup already in progress',
                        'current_state': task_status.get('status'),
                        'progress': task_status.get('progress', 0)
                    }, status=status.HTTP_202_ACCEPTED)

            # Get business ID
            business = get_business_for_user(request.user)
            if not business:
                return self._error_response(
                    "No business found for user", 
                    "missing_business",
                    status.HTTP_400_BAD_REQUEST, 
                    request_id
                )

            # Queue setup task
            from onboarding.tasks import setup_user_tenant_task
            from custom_auth.rls import set_current_tenant_id, tenant_context
            
            task = setup_user_tenant_task.delay(
                str(request.user.id),
                str(business.id)
            )

            # Update progress state
            progress.database_setup_task_id = task.id
            progress.onboarding_status = 'setup'
            progress.setup_started_at = timezone.now()
            
            # Fix any corrupted boolean fields before saving
            progress = fix_boolean_fields(progress)
            progress.save(update_fields=[
                'database_setup_task_id',
                'onboarding_status',
                'setup_started_at'
            ])

            response_data = {
                'status': 'started',
                'task_id': task.id,
                'message': 'Setup initiated successfully',
                'started_at': progress.setup_started_at.isoformat() if progress.setup_started_at else None
            }

            return Response(response_data, status=status.HTTP_202_ACCEPTED)

        except OnboardingProgress.DoesNotExist:
            return self._error_response(
                "Onboarding progress not found", 
                "not_found",
                status.HTTP_404_NOT_FOUND,
                request_id
            )
            
        except Exception as e:
            return self._handle_exception(e, request_id)

    def get(self, request, *args, **kwargs):
        """Get step 4 status"""
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        try:
            # Get progress for the user
            try:
                progress = OnboardingProgress.objects.get(user=request.user)
            except OnboardingProgress.DoesNotExist:
                return Response({
                    'status': 'not_found',
                    'message': 'No onboarding progress found',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)

            # If there's an active task, get its status
            response_data = {
                'request_id': request_id,
                'timestamp': timezone.now().isoformat(),
                'user_email': request.user.email,
                'status': progress.onboarding_status,
                'current_step': progress.current_step,
                'next_step': progress.next_step
            }
            
            if progress.database_setup_task_id:
                task_status = get_task_status(progress.database_setup_task_id)
                
                if task_status:
                    response_data.update({
                        'task_id': progress.database_setup_task_id,
                        'task_status': task_status.get('status'),
                        'progress': task_status.get('progress', 0),
                        'started_at': progress.setup_started_at.isoformat() if progress.setup_started_at else None
                    })

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self._handle_exception(e, request_id)

class OnboardingSuccessView(BaseOnboardingView):
    """
    View to handle successful onboarding completion.
    
    This view provides:
    - Confirmation of completed onboarding
    - Final status checks
    - User and business information validation
    - Next steps guidance
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request, *args, **kwargs):
        """Get onboarding success status and information"""
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        
        try:
            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=request.user)
            except OnboardingProgress.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'No onboarding progress found',
                    'code': 'no_progress'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify onboarding is complete
            if progress.current_step != 'complete':
                return Response({
                    'success': False,
                    'message': 'Onboarding is not complete',
                    'code': 'incomplete',
                    'current_step': progress.current_step,
                    'next_step': progress.next_step
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get business information
            business = get_business_for_user(request.user)
            if not business:
                return Response({
                    'success': False,
                    'message': 'No business found for user',
                    'code': 'no_business'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get schema status
            schema_status = get_schema_status(str(request.user.id))
            
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                profile = None
            
            # Prepare success response
            response_data = {
                'success': True,
                'request_id': request_id,
                'user': {
                    'id': str(request.user.id),
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'is_staff': request.user.is_staff,
                    'is_business_owner': profile.is_business_owner if profile else False
                },
                'business': {
                    'id': str(business.id),
                    'name': business.name,
                    'created_at': business.created_at.isoformat() if hasattr(business, 'created_at') else None
                },
                'onboarding': {
                    'status': progress.onboarding_status,
                    'current_step': progress.current_step,
                    'next_step': progress.next_step,
                    'completed_at': progress.completed_at.isoformat() if progress.completed_at else None
                },
                'schema': schema_status,
                'timestamp': timezone.now().isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Onboarding success view error: {str(e)}", extra={
                'request_id': request_id,
                'user_id': str(request.user.id) if request.user else None,
                'error': str(e),
                'traceback': traceback.format_exc()
            })
            return Response({
                'success': False,
                'message': str(e),
                'code': 'server_error',
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def safe_bool_convert(value, default=False):
    """
    Safely convert various input types to boolean values.
    Handles string 'false'/'true', numbers, and actual booleans.
    
    Args:
        value: The value to convert (str, int, bool, etc.)
        default: Default value if conversion fails
        
    Returns:
        bool: The converted boolean value
    """
    if isinstance(value, bool):
        return value
    elif isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    elif isinstance(value, (int, float)):
        return bool(value)
    else:
        return default

def fix_boolean_fields(progress):
    """
    Fix any corrupted boolean fields in OnboardingProgress before saving.
    Converts string "false"/"true" to proper boolean values.
    
    Args:
        progress: OnboardingProgress instance
    """
    # Fix all boolean fields that might be corrupted
    progress.payment_completed = safe_bool_convert(progress.payment_completed)
    progress.rls_setup_completed = safe_bool_convert(progress.rls_setup_completed)
    progress.setup_completed = safe_bool_convert(progress.setup_completed)
    
    # Fix any other boolean fields that exist
    if hasattr(progress, 'business_info_completed'):
        progress.business_info_completed = safe_bool_convert(progress.business_info_completed)
    if hasattr(progress, 'subscription_completed'):
        progress.subscription_completed = safe_bool_convert(progress.subscription_completed)
    
    return progress

# Configure Django logging