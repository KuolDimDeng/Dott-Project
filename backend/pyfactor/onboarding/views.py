# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/views.py

import re
import asyncio
import stripe
import traceback
import sys
import time  # Add this import at the top
import json  # Add this import at the top with your other imports
from django.db.models import Q
from celery.result import AsyncResult
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async, async_to_sync
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from requests import request
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.decorators import (
    api_view, 
    permission_classes, 
    authentication_classes

    
)


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from .models import OnboardingProgress
from .serializers import OnboardingProgressSerializer
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction, connections, DatabaseError, InterfaceError, connection, transaction as db_transaction
from users.models import User, UserProfile
from django.db.utils import OperationalError


from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.renderers import JSONRenderer
from django.http import HttpResponse, JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import MethodNotAllowed


from business.models import Business, Subscription
from finance.models import Account
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from .locks import acquire_lock, release_lock, task_lock
from rest_framework_simplejwt.tokens import RefreshToken
from pyfactor.logging_config import get_logger
from google.oauth2 import id_token
from google.auth.transport import requests
from django.db import IntegrityError
from celery import shared_task
from rest_framework.exceptions import AuthenticationFailed
from .tasks import setup_user_database_task  # Add this at the top with other imports
from .state import OnboardingStateManager
from django.core.exceptions import ValidationError
from .utils import (
    generate_unique_database_name,
    validate_database_creation,

)

# Keep these imports
from users.utils import (
    create_user_database,
    setup_user_database,
    check_database_readiness,
    populate_initial_data,
    cleanup_database
)
from typing import Dict, Any, Optional, Tuple

stripe.api_key = settings.STRIPE_SECRET_KEY

logger = get_logger()



class BaseOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    content_negotiation_class = DefaultContentNegotiation

    def get_content_negotiator(self):
        """Get or create content negotiator instance safely"""
        if not hasattr(self, '_negotiator'):
            self._negotiator = self.content_negotiation_class()
        return self._negotiator

    def get_renderer_context(self):
        """Create renderer context with all necessary data"""
        context = {
            'view': self,
            'request': getattr(self, 'request', None),
            'response': getattr(self, 'response', None),
            'args': getattr(self, 'args', ()),
            'kwargs': getattr(self, 'kwargs', {})
        }
        # Add format-related context
        context['format'] = getattr(self, 'format_kwarg', None)
        return context

    async def dispatch(self, request, *args, **kwargs):
        """Enhanced async dispatch method"""
        try:
            # Initialize request
            self.request = request
            self.args = args
            self.kwargs = kwargs
            
            # Handle options method
            if request.method.lower() == 'options':
                response = self.options(request, *args, **kwargs)
                return await self.finalize_async_response(request, response)

            # Get handler and ensure it's awaited
            handler = getattr(self, request.method.lower(), None)
            if handler is None:
                raise MethodNotAllowed(request.method)

            # Execute handler and ensure response is awaited
            response = await handler(request, *args, **kwargs)
            
            # Important: Handle coroutines explicitly
            while asyncio.iscoroutine(response):
                response = await response

            return await self.finalize_async_response(request, response)

        except Exception as e:
            logger.error(f"Error in dispatch: {str(e)}", exc_info=True)
            error_response = Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            return await self.finalize_async_response(request, error_response)

    async def finalize_async_response(self, request, response):
        """Finalize the response with proper renderer handling"""
        if not isinstance(response, (Response, HttpResponse)):
            response = Response(response)

        if isinstance(response, Response) and not hasattr(response, 'accepted_renderer'):
            negotiator = self.content_negotiation_class()
            try:
                renderer, media_type = negotiator.select_renderer(
                    request,
                    self.get_renderers(),
                    self.format_kwarg
                )
            except Exception:
                renderer = self.get_renderers()[0]
                media_type = renderer.media_type

            response.accepted_renderer = renderer
            response.accepted_media_type = media_type
            response.renderer_context = self.get_renderer_context()

        return response

    def get_renderers(self):
        """Ensure we always have at least one renderer"""
        renderers = super().get_renderers()
        if not renderers:
            return [JSONRenderer()]
        return renderers

    def perform_content_negotiation(self, request):
        """Perform content negotiation to select renderer"""
        renderers = self.get_renderers()
        negotiator = self.get_content_negotiator()
        try:
            return negotiator.select_renderer(request, renderers, self.format_kwarg)
        except Exception as e:
            # Fall back to first renderer if negotiation fails
            logger.warning(f"Content negotiation failed: {str(e)}")
            return renderers[0], renderers[0].media_type
    


    @sync_to_async
    def get_user(self, request):
        """Get authenticated user"""
        return request.user
    
    @sync_to_async
    def check_authentication(self, request):
        """Check authentication with better error handling"""
        try:
            for auth in self.authentication_classes:
                try:
                    auth_tuple = auth().authenticate(request)
                    if auth_tuple:
                        logger.debug(f"Authentication successful for user: {auth_tuple[0].email}")
                        return auth_tuple
                except Exception as e:
                    logger.warning(f"Authentication attempt failed: {str(e)}")
                    continue
            logger.error("All authentication methods failed")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {str(e)}")
            return None


    async def notify_websocket(self, user_id, message_type, data):
        """Send WebSocket notifications with improved error handling"""
        max_retries = 3
        retry_delay = 0.5

        if not message_type:
            logger.error("Invalid message type for WebSocket notification")
            return False
            
        for attempt in range(max_retries):
            try:
                channel_layer = get_channel_layer()
                if not channel_layer:
                    logger.error("Failed to get channel layer")
                    return False

                # Create copy of data to avoid modifying original
                message_data = data.copy() if data else {}
                
                # Add metadata
                message_data.update({
                    'timestamp': timezone.now().isoformat(),
                    'attempt': attempt + 1,
                    'type': message_type  # Add message type to payload
                })
                
                # Send message using proper async call
                await channel_layer.group_send(
                    f'onboarding_{user_id}',
                    {
                        'type': message_type,
                        'data': data,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.debug(f"WebSocket notification sent: {message_type}")
                return True
                
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"WebSocket notification failed after {max_retries} attempts: {str(e)}")
                    return False
                    
                logger.warning(f"WebSocket notification attempt {attempt + 1} failed: {str(e)}")
                await asyncio.sleep(retry_delay * (2 ** attempt))

        return False

    async def validate_state(self, user, expected_state):
        """Validate onboarding state with error handling"""
        try:
            state_manager = await self.get_state_manager(user)  # Use passed user parameter
            await state_manager.initialize()
            current_state = await state_manager.get_current_state()
            
            if current_state != expected_state:
                logger.warning(
                    f"Invalid state transition attempted from {current_state} to {expected_state}"
                )
                return False
            
            logger.debug(f"State validation successful: {current_state}")
            return True
            
        except Exception as e:
            logger.error(f"State validation error: {str(e)}")
            return False

    @sync_to_async
    def get_onboarding_progress(self, user):
        """Get onboarding progress with better race condition handling"""
        for attempt in range(3):
            try:
                with transaction.atomic():
                    # Try to get existing progress with select_for_update
                    try:
                        return OnboardingProgress.objects.select_for_update(
                            nowait=True
                        ).get(
                            Q(user=user) | Q(email=user.email)
                        )
                    except OnboardingProgress.DoesNotExist:
                        # Create new if not exists
                        return OnboardingProgress.objects.create(
                            user=user,
                            email=user.email,
                            onboarding_status='step4',
                            current_step=1
                        )
                        
            except OperationalError:
                if attempt == 2:  # Last attempt
                    raise
                # Add exponential backoff
                time.sleep(0.1 * (2 ** attempt))
                continue
                
            except IntegrityError as e:
                if 'onboarding_progress_email_key' in str(e):
                    # Handle race condition by getting the existing record
                    return OnboardingProgress.objects.select_for_update().get(
                        Q(user=user) | Q(email=user.email)
                    )
                raise

    async def handle_error(self, error, user_id=None, error_type=None):
        """Handle errors with proper async/await"""
        error_message = str(error)
        logger.error(
            f"Error in {self.__class__.__name__}: {error_message}",
            exc_info=True,
            extra={
                'error_type': error_type or error.__class__.__name__,
                'user_id': user_id
            }
        )

        if user_id:
            try:
                await self.notify_websocket(
                    user_id,
                    'error',
                    {
                        'message': error_message,
                        'type': error_type or 'server_error',
                        'timestamp': timezone.now().isoformat()
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send error notification: {str(e)}")

    async def initial(self, request, *args, **kwargs):
        """Enhanced initialization with better error handling"""
        try:
            auth_tuple = await self.check_authentication(request)
            if not auth_tuple:
                return Response(
                    {"error": "Authentication failed", "code": "auth_failed"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            request.user = auth_tuple[0]
            logger.info(f"Request initialized for user: {request.user.email}")
            
            return await super().initial(request, *args, **kwargs)
            
        except Exception as e:
            await self.handle_error(e, error_type='initialization_error')
            return Response(
                {"error": "Server error during initialization"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    async def manage_task(self, task_id, user_id):
        """Centralized task management"""
        try:
            task = AsyncResult(task_id)
            task_status = {
                "status": task.status,
                "progress": getattr(task.info, 'progress', 0),
                "step": getattr(task.info, 'step', 'Processing')
            }
            
            await self.notify_websocket(
                user_id,
                'task_status',
                task_status
            )
            
            return task_status
            
        except Exception as e:
            await self.handle_error(e, user_id, 'task_management_error')
            raise

    @sync_to_async
    def save_progress(self, progress, state=None):
        """Save progress with transaction handling"""
        with transaction.atomic():
            try:
                if state:
                    progress.onboarding_status = state
                progress.save()
                return progress
            except Exception as e:
                logger.error(f"Error saving progress: {str(e)}")
                raise

    def get_authenticators(self):
        """Override to ensure proper authentication chain"""
        return [auth() for auth in self.authentication_classes]

@transaction.atomic
def start_database_setup(request):
    try:
        user = request.user
        business = user.userprofile.business
        
        # Check if a task is already running
        progress = OnboardingProgress.objects.get(user=user)
        if progress.database_setup_task_id:
            task_result = AsyncResult(progress.database_setup_task_id)
            if task_result.status in ['PENDING', 'STARTED']:
                return JsonResponse({
                    'status': 'in_progress',
                    'task_id': progress.database_setup_task_id
                })
        
        # Start new task
        task = setup_user_database_task.delay(user.id, business.id)
        
        # Save task ID
        progress.database_setup_task_id = task.id
        progress.save()
        
        return JsonResponse({
            'status': 'started',
            'task_id': task.id
        })
        
    except Exception as e:
        logger.error(f"Error starting database setup: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def poll_setup_status(request):
    user = request.user
    try:
        progress = OnboardingProgress.objects.get(user=user)
        if progress.database_setup_task_id:
            task = AsyncResult(progress.database_setup_task_id)
            return Response({
                "status": task.status,
                "progress": getattr(task.info, 'progress', 0),
                "step": getattr(task.info, 'step', 'Processing'),
                "currentStep": "step4",
                "taskId": progress.database_setup_task_id
            })
        return Response({
            "status": "NOT_STARTED",
            "currentStep": "step4"
        })
    except OnboardingProgress.DoesNotExist:
        return Response({
            "status": "ERROR",
            "message": "Onboarding progress not found"
        }, status=status.HTTP_404_NOT_FOUND)



@sync_to_async
def get_task_status(self, task_id):
    """Get task status with async handling"""
    try:
        task = AsyncResult(task_id)
        return {
            'status': task.status,
            'info': task.info,
            'result': task.result if task.successful() else None,
            'error': str(task.result) if task.failed() else None
        }
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_task(request, task_id):
    logger.info(f"Cancelling task: {task_id}")
    try:
        task_result = AsyncResult(task_id)
        task_result.revoke(terminate=True)
        return Response({'status': 'cancelled'}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class GoogleTokenExchangeView(BaseOnboardingView):
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    @sync_to_async
    def _verify_token_sync(self, token, clock_skew=10):
        """Synchronous token verification"""
        return id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=clock_skew
        )

    @sync_to_async
    def _create_user_and_profile_sync(self, user_data):
        """Synchronous database operations"""
        with transaction.atomic():
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            
            if created:
                UserProfile.objects.get_or_create(
                    user=user,
                    defaults={'is_business_owner': True}
                )
            return user

    @sync_to_async
    def _create_onboarding_sync(self, user):
        """Synchronous database operations"""
        with transaction.atomic():
            progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'email': user.email,
                    'onboarding_status': 'step1',
                    'current_step': 1
                }
            )
            return progress

    @sync_to_async
    def _create_token(self, user):
        """Synchronous token creation"""
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        }

    async def post(self, request, *args, **kwargs):
        """Handle token exchange request"""
        logger.info("Processing Google token exchange request")
        
        try:
            request_data = json.loads(request.body.decode('utf-8'))
            google_token = request_data.get('token')
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON data'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not google_token:
            return Response(
                {'error': 'Token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify token with retry
            try:
                idinfo = await self._verify_token_sync(google_token)
            except ValueError as e:
                if "Token used too early" in str(e):
                    logger.warning(f"Clock sync issue: {str(e)}")
                    await asyncio.sleep(2)
                    idinfo = await self._verify_token_sync(google_token, clock_skew=15)
                else:
                    raise

            user_data = {
                'email': idinfo['email'],
                'first_name': idinfo.get('given_name', ''),
                'last_name': idinfo.get('family_name', '')
            }

            # Create user and profile
            user = await self._create_user_and_profile_sync(user_data)
            progress = await self._create_onboarding_sync(user)
            tokens = await self._create_token(user)

            response_data = {
                'refresh': tokens['refresh'],
                'access': tokens['access'],
                'user_id': user.id,
                'onboarding_status': progress.onboarding_status,
            }

            return Response(response_data)

        except ValueError as e:
            logger.error(f"Token validation error: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response(
                {'error': 'Authentication failed'}, 
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
       logger.info("Starting onboarding process")
       user = await self.get_user(request)

       try:
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
           return Response(
               {"error": "Failed to start onboarding"},
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
    autoretry_for=(OperationalError,)
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


class SaveStep1View(APIView):
    """
    Enhanced Step 1 handler with improved validation and error handling
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    
    REQUIRED_FIELDS = [
        'businessName',
        'industry',
        'country',
        'legalStructure',
        'dateFounded',
        'firstName',
        'lastName'
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.channel_layer = get_channel_layer()

    def validate_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate incoming data"""
        try:
            # Check required fields
            missing_fields = [
                field for field in self.REQUIRED_FIELDS 
                if not data.get(field)
            ]
            
            if missing_fields:
                return False, f"Missing required fields: {', '.join(missing_fields)}"

            # Validate date format
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
        """Save business data with transaction safety"""
        try:
            # Format date
            date_founded = datetime.strptime(
                data['dateFounded'], 
                '%Y-%m-%d'
            ).date()

            # Create/update business
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
                # Update existing business
                business.business_name = data['businessName']
                business.business_type = data['industry']
                business.country = data['country']
                business.legal_structure = data['legalStructure']
                business.date_founded = date_founded
                business.save()

            return business, created

        except Exception as e:
            logger.error(f"Error saving business data: {str(e)}")
            raise

    @transaction.atomic
    def save_onboarding_progress(self, user: User, data: Dict[str, Any]) -> OnboardingProgress:
        """Save onboarding progress with validation"""
        try:
            # Get or create progress
            progress, _ = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'email': user.email,
                    'onboarding_status': 'step1',
                    'current_step': 1
                }
            )

            # Update progress fields
            date_founded = datetime.strptime(data['dateFounded'], '%Y-%m-%d').date()
            
            progress.first_name = data['firstName']
            progress.last_name = data['lastName']
            progress.business_name = data['businessName']
            progress.business_type = data['industry']
            progress.country = data['country']
            progress.legal_structure = data['legalStructure']
            progress.date_founded = date_founded
            progress.onboarding_status = 'step2'  # Move to next step
            progress.current_step = 2
            progress.last_updated = timezone.now()
            progress.save()

            return progress

        except Exception as e:
            logger.error(f"Error saving onboarding progress: {str(e)}")
            raise

    def post(self, request, *args, **kwargs):
        """Handle step 1 submission"""
        logger.info("Received Step1 save request")
        logger.debug(f"Request data: {request.data}")

        try:
            # Validate data first
            is_valid, error = self.validate_data(request.data)
            if not is_valid:
                return Response({
                    'error': error
                }, status=status.HTTP_400_BAD_REQUEST)

            # Save business data
            business, created = self.save_business_data(
                request.user,
                request.data
            )

            # Save onboarding progress
            progress = self.save_onboarding_progress(
                request.user,
                request.data
            )

            # Return success response
            return Response({
                "message": "Step 1 completed successfully",
                "business_id": str(business.id),
                "next_step": "step2",
                "business_created": created
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.warning(f"Validation error: {str(e)}")
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except (Business.DoesNotExist, OnboardingProgress.DoesNotExist) as e:
            logger.error(f"Data not found error: {str(e)}")
            return Response({
                "error": "Required data not found",
                "details": str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except IntegrityError as e:
            logger.error(f"Database integrity error: {str(e)}")
            return Response({
                "error": "Database constraint violation",
                "details": str(e)
            }, status=status.HTTP_409_CONFLICT)
            
        except Exception as e:
            logger.error(f"Unexpected error in SaveStep1View: {str(e)}", exc_info=True)
            return Response({
                "error": "An unexpected error occurred",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def validate_plan_selection(data):
    """Validate plan selection data with comprehensive checks"""
    if not data.get('selectedPlan'):
        raise ValidationError("Selected plan is required")
        
    if not data.get('billingCycle'):
        raise ValidationError("Billing cycle is required")
        
    valid_plans = ['Basic', 'Professional']
    if data['selectedPlan'] not in valid_plans:
        raise ValidationError(f"Invalid plan. Must be one of: {valid_plans}")
        
    valid_cycles = ['monthly', 'annual']
    if data['billingCycle'] not in valid_cycles:
        raise ValidationError(f"Invalid billing cycle. Must be one of: {valid_cycles}")

class SaveStep2View(BaseOnboardingView):
    VALID_PLANS = ['Basic', 'Professional']
    VALID_BILLING_CYCLES = ['monthly', 'annual']

    @sync_to_async
    def get_state_manager(self, user):
        """Create state manager with proper initialization"""
        try:
            # Create the manager but don't initialize it yet - that happens separately
            manager = OnboardingStateManager(user)
            return manager
        except Exception as e:
            logger.error(f"Failed to create state manager: {str(e)}")
            return None

    @sync_to_async
    def save_onboarding_data(self, user, data):
        """Save onboarding data with comprehensive transaction handling"""
        logger.debug(f"Saving step 2 data for user {user.email}")
        with transaction.atomic():
            # First validate all our data
            validate_plan_selection(data)
            
            # Get the progress record with proper locking
            progress = OnboardingProgress.objects.select_for_update(
                nowait=True  # Fail fast if record is locked
            ).get(user=user)
            
            # Update all our fields
            progress.subscription_type = data.get('selectedPlan')
            progress.billing_cycle = data.get('billingCycle')
            progress.onboarding_status = 'step2'
            progress.last_updated = timezone.now()
            
            # Save changes and return
            progress.save(update_fields=[
                'subscription_type',
                'billing_cycle',
                'onboarding_status',
                'updated_at'  # Changed from last_updated to updated_at
            ])
            
            logger.info(f"Successfully saved step 2 data for user {user.email}")
            return progress

    async def post(self, request, *args, **kwargs):
        logger.debug("Starting SaveStep2View.post method")
        try:
            user = await self.get_user(request)
            
            # Parse request data
            try:
                data = json.loads(request.body.decode('utf-8')) if isinstance(request.body, bytes) else request.data
            except json.JSONDecodeError as e:
                return Response({
                    "error": "Invalid JSON data",
                    "details": str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize state manager and save data
            state_manager = await self.get_state_manager(user)
            current_state = await state_manager.get_current_state()
            
            try:
                # Save data first to record plan selection
                progress = await self.save_onboarding_data(user, data)
            except ValidationError as e:
                return Response({
                    "error": str(e),
                    "type": "validation_error"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Determine next state based on plan
            selected_plan = data.get('selectedPlan')
            next_state = 'step4' if selected_plan == 'Basic' else 'step3'
            
            # For Basic plan, transition directly to step4
            # For Professional plan, go through step3
            if selected_plan == 'Basic':
                if await state_manager.transition('step4', plan_type='Basic'):
                    return Response({
                        "message": "Step 2 completed successfully",
                        "nextStep": "step4",
                        "plan": "Basic"
                    }, status=status.HTTP_200_OK)
            else:
                if await state_manager.transition('step3'):
                    return Response({
                        "message": "Step 2 completed successfully",
                        "nextStep": "step3",
                        "plan": "Professional"
                    }, status=status.HTTP_200_OK)
            
            return Response({
                "error": f"Failed to transition to {next_state}"
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            await self.handle_error(e, user.id, 'server_error')
            return Response({
                "error": "An unexpected error occurred"
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

   
class SaveStep4View(BaseOnboardingView):
    ASK_STATES = ['PENDING', 'STARTED', 'PROGRESS', 'SUCCESS', 'FAILURE']
    SETUP_TIMEOUT = 30  # seconds

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_status_lock = asyncio.Lock()  # Add lock initialization
 

    @sync_to_async
    def get_state_manager(self, user):
        """Create state manager with proper initialization"""
        try:
            # Create the manager but don't initialize it yet
            manager = OnboardingStateManager(user)
            return manager
        except Exception as e:
            logger.error(f"Failed to create state manager: {str(e)}")
            raise

    @sync_to_async
    def _get_progress_and_business_sync(self, user):
        """Synchronous part of getting progress and business"""
        with transaction.atomic():
            progress = OnboardingProgress.objects.select_for_update().get(user=user)
            business = Business.objects.get(owner=user)
            return progress, business

    async def get_progress_and_business(self, user):
        """Get progress and business with proper locking"""
        try:
            return await self._get_progress_and_business_sync(user)
        except Exception as e:
            logger.error(f"Error getting progress and business: {str(e)}")
            raise

    async def handle_complete(self, progress, data):
        """Handle setup completion"""
        try:
            if not progress.database_setup_task_id:
                return Response({
                    "error": "No setup task found"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            task = AsyncResult(progress.database_setup_task_id)
            if task.status != 'SUCCESS':
                return Response({
                    "error": "Setup task not completed",
                    "status": task.status
                }, status=status.HTTP_400_BAD_REQUEST)

            await sync_to_async(self._handle_complete_sync)(progress, data)
            
            return Response({
                "status": "complete",
                "database_name": progress.database_name
            })
            
        except Exception as e:
            logger.error(f"Error completing setup: {str(e)}")
            raise

    @sync_to_async
    def _update_task_status_sync(self, progress, task_id):
        """Synchronous part of task status update"""
        with transaction.atomic():
            progress.database_setup_task_id = task_id
            progress.last_setup_attempt = timezone.now() if task_id else None
            progress.save(update_fields=[
                'database_setup_task_id',
                'last_setup_attempt'
            ])
            return progress

    async def update_task_status(self, progress, task_id=None):
        """Update task status with transaction handling"""
        try:
            return await self._update_task_status_sync(progress, task_id)
        except Exception as e:
            logger.error(f"Error updating task status: {str(e)}")
            raise

    async def manage_setup_task(self, task_id):
        """Manage setup task with timeout"""
        try:
            async with asyncio.timeout(self.SETUP_TIMEOUT):
                task = AsyncResult(task_id)
                status = {
                    "status": task.status,
                    "progress": getattr(task.info, 'progress', 0),
                    "step": getattr(task.info, 'step', 'Processing'),
                    "error": str(task.result) if task.failed() else None
                }
                return status, task.successful()
        except asyncio.TimeoutError:
            logger.error(f"Task status check timed out for task {task_id}")
            raise
        except Exception as e:
            logger.error(f"Task management error: {str(e)}")
            raise

    @sync_to_async
    def clear_stale_task(self, progress):
        """Clear stale task information"""
        with transaction.atomic():
            progress.database_setup_task_id = None
            progress.save(update_fields=['database_setup_task_id'])
            # Also clear any associated locks
            lock_id = f"task_lock_database_setup_{progress.user.id}"
            cache.delete(lock_id)

    @sync_to_async
    def _cleanup_task(self, progress):
        """Clean up task resources"""
        logger.debug(f"Cleaning up task for user {progress.user.email}")
        try:
            with transaction.atomic():
                if progress.database_setup_task_id:
                    task = AsyncResult(progress.database_setup_task_id)
                    if task.status in ['PENDING', 'STARTED']:
                        task.revoke(terminate=True)
                    progress.database_setup_task_id = None
                    progress.save(update_fields=['database_setup_task_id'])
        except Exception as e:
            logger.error(f"Error cleaning up task: {str(e)}")

    @sync_to_async
    def _start_setup_task(self, user_id, business_id):
        """Synchronous part of setup task creation"""
        return setup_user_database_task.delay(str(user_id), str(business_id))

    async def handle_start(self, request, user, data):
        try:
            progress, business = await self.get_progress_and_business(user)
            logger.info(f"Starting database setup for user {user.email}")
            
            async with self.task_status_lock:
                # Clear any stale task
                if progress.database_setup_task_id:
                    old_task = AsyncResult(progress.database_setup_task_id)
                    if old_task.status not in ['SUCCESS', 'FAILURE']:
                        old_task.revoke(terminate=True)
                        await self.clear_stale_task(progress)

                # Start new task
                task = await self._start_setup_task(user.id, business.id)
                logger.info(f"Created task {task.id} for user {user.email}")
                
                # Update progress atomically
                await self.update_task_status(progress, task.id)
                
                # Send initial WebSocket notification
                await self.notify_websocket(
                    user.id,
                    'setup_started', 
                    {
                        'task_id': task.id,
                        'status': 'STARTED',
                        'progress': 0
                    }
                )

            return Response({
                "status": "started",
                "task_id": task.id,
                "message": "Setup initiated successfully"
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Failed to start setup: {e}", exc_info=True)
            await self.handle_error(e, user.id, 'setup_error')
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def handle_cancel(self, request, user):
        """Handle database setup cancellation"""
        try:
            progress = await self.get_onboarding_progress(user)
            if not progress:
                return Response({
                    "error": "No progress found"
                }, status=status.HTTP_404_NOT_FOUND)
                
            if progress.database_setup_task_id:
                task = AsyncResult(progress.database_setup_task_id)
                # Only revoke if task is still running
                if task.status in ['PENDING', 'STARTED']:
                    task.revoke(terminate=True)
                await self.update_task_status(progress, None)
                
            return Response({"status": "cancelled"})
            
        except Exception as e:
            logger.error(f"Error cancelling setup: {str(e)}")
            await self.handle_error(e, user.id, 'cancel_error')
            raise

    async def handle_setup(self, request, user):
        """Handle general setup operation"""
        logger.debug(f"Handling setup request for user {user.email}")
        try:
            progress = await self.get_onboarding_progress(user)
            if not progress:
                return Response({
                    "error": "No onboarding progress found"
                }, status=status.HTTP_404_NOT_FOUND)
                
            return Response({
                "status": "READY",
                "current_step": progress.current_step,
                "message": "Ready to start setup"
            })
        
        except Exception as e:
            logger.error(f"Error in handle_setup: {str(e)}")
            raise

    def _handle_complete_sync(self, progress, data):
        """Synchronous part of handle_complete"""
        logger.debug(f"Completing setup for user {progress.user.email}")
        with transaction.atomic():
            if not data or not isinstance(data, dict):
                raise ValidationError("Invalid data format")
                
            if not data.get('database_name'):
                raise ValidationError("Database name is required")
                
            if not data.get('status') == 'complete':
                raise ValidationError("Invalid status")
                
            # Update progress
            progress.onboarding_status = 'complete'
            progress.database_name = data['database_name']
            progress.current_step = 0
            progress.task_status = data.get('task_status', 'SUCCESS')
            
            # Update user profile
            profile = progress.user.profile
            profile.database_name = data['database_name']
            profile.database_status = 'active'
            
            # Save both
            progress.save(update_fields=[
                'onboarding_status',
                'database_name',
                'current_step', 
                'task_status'
            ])
            profile.save(update_fields=['database_name', 'database_status'])

    @sync_to_async
    def _get_user_business(self, user):
        """Get user's business information"""
        return Business.objects.get(owner=user)

    async def post(self, request, *args, **kwargs):
        logger.debug("Received setup request")
        logger.debug(f"Request path: {request.path}")
        logger.debug(f"Received setup request for user: {request.user.email}")

        # Fix action extraction
        path = request.path.strip('/').split('/')
        action = None
        for part in path:
            if part in ['start', 'cancel', 'complete']:  # Remove 'setup' from here
                action = part
                break
        
        if not action:  # Default to setup if no specific action found
            action = 'setup'

        try:
            user = request.user
            logger.debug(f"Action: {action}")
            
            # Parse request data
            try:
                raw_body = request.body
                data = json.loads(raw_body.decode('utf-8')) if raw_body else {}
                logger.debug(f"Request data: {data}")
            except json.JSONDecodeError:
                data = {}

            if action == 'start':
                logger.debug("Handling start action")
                return await self.handle_start(request, user, data)
            elif action == 'cancel':
                logger.debug("Handling cancel action") 
                return await self.handle_cancel(request, user)
            elif action == 'complete':
                logger.debug("Handling complete action")
                progress = await self.get_onboarding_progress(user)
                return await self.handle_complete(progress, data)
            elif action == 'setup':
                logger.debug("Handling setup check")
                return await self.handle_setup(request, user)
            else:
                logger.error(f"Invalid action: {action}")
                return Response({
                    "error": f"Invalid action: {action}"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Setup error: {str(e)}")
            await self.handle_error(e, user.id, 'setup_error')
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @sync_to_async
    def get_onboarding_progress(self, user):
        """Get onboarding progress with better race condition handling"""
        for attempt in range(3):  # Add retry logic
            try:
                with transaction.atomic():
                    # Try to get existing progress
                    try:
                        progress = OnboardingProgress.objects.select_for_update(
                            nowait=True
                        ).get(
                            Q(user=user) | Q(email=user.email)
                        )
                        
                        # If found by email but not linked to user, link it
                        if progress.user_id != user.id:
                            progress.user = user
                            progress.save()
                        
                        return progress
                        
                    except OnboardingProgress.DoesNotExist:
                        # Create new if not exists
                        return OnboardingProgress.objects.create(
                            user=user,
                            email=user.email,
                            onboarding_status='step4',
                            current_step=1
                        )
                        
            except OperationalError:
                if attempt == 2:  # Last attempt
                    raise
                time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
                continue
                
            except IntegrityError as e:
                if 'onboarding_progress_email_key' in str(e):
                    # Handle race condition - get the record that was just created
                    return OnboardingProgress.objects.get(
                        Q(user=user) | Q(email=user.email)
                    )
                raise

    async def get(self, request, *args, **kwargs):
        try:
            user = await self.get_user(request)
            progress = await self.get_onboarding_progress(user)

            if not progress:
                return Response({
                    "status": "NOT_STARTED",
                    "progress": 0,
                    "current_step": 1
                })

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

        except Exception as e:
            logger.error(f"Error getting setup status: {str(e)}")
            return Response({
                "error": str(e)
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
    authentication_classes = [JWTAuthentication, SessionAuthentication]

    def get(self, request):
        """Handle GET request to check onboarding status"""
        logger.debug("Checking onboarding status")
        logger.debug(f"Retrieved user: {request.user.email}")
        
        try:
            # First check if user has completed setup
            user_profile = UserProfile.objects.filter(user=request.user).first()
            if user_profile and user_profile.database_name:
                logger.info(f"User {request.user.email} has completed setup")
                return Response({
                    'status': 'complete',
                    'redirect': '/dashboard'
                })

            # Get existing progress
            progress = OnboardingProgress.objects.get(user=request.user)
            
            if progress.onboarding_status == 'complete':
                logger.info(f"User {request.user.email} has completed onboarding")
                return Response({
                    'status': 'complete',
                    'currentStep': 0,
                    'redirect': '/dashboard'
                })
            
            logger.debug(f"Retrieved progress status: {progress.onboarding_status}")
            
            return Response({
                'status': progress.onboarding_status,
                'currentStep': progress.current_step
            })
            
        except OnboardingProgress.DoesNotExist:
            return Response({
                'status': 'new',
                'currentStep': 1
            })