"""
Onboarding API Views

This module provides API endpoints for the onboarding process using a tiered storage approach
with Redis for session management and PostgreSQL with RLS for secure data storage.
"""
import logging
import uuid
import json
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from custom_auth.models import User
from onboarding.models import OnboardingProgress
from onboarding.services.redis_session import onboarding_session_service
from users.models import Business

logger = logging.getLogger(__name__)

class OnboardingStatusAPI(APIView):
    """
    API endpoint for retrieving and updating onboarding status
    
    Utilizes the tiered storage approach to provide a seamless onboarding experience
    with Redis for session management and PostgreSQL with RLS for secure data storage.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request):
        """
        Get onboarding status and progress
        
        Returns:
            Response: Onboarding status and progress
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Get session ID from request
            session_id = getattr(request, 'onboarding_session_id', None)
            if not session_id:
                session_id = request.COOKIES.get('onboardingSessionId')
                
            # Try to get progress from database first
            progress = getattr(request, 'onboarding_progress', None)
            if not progress:
                progress = OnboardingProgress.objects.filter(user=request.user).first()
                
            # Initialize response with defaults
            response_data = {
                'status': 'not_started',
                'current_step': 'business-info',
                'next_step': 'subscription',
                'progress': 0,
                'session_id': session_id,
                'request_id': request_id,
                'business_info': {},
                'has_active_session': bool(session_id)
            }
            
            if progress:
                # Get data from database
                response_data.update({
                    'status': progress.onboarding_status,
                    'current_step': progress.current_step,
                    'next_step': progress.next_step,
                    'progress': progress.progress_percentage,
                    'completed_steps': progress.completed_steps,
                    'session_id': str(progress.session_id) if progress.session_id else session_id,
                    'last_active_step': progress.last_active_step,
                    'setup_completed': progress.setup_completed,
                    'payment_completed': progress.payment_completed,
                    'rls_setup_completed': progress.rls_setup_completed,
                    'metadata': progress.metadata
                })
                
                # Get business information if available
                if progress.business:
                    business = progress.business
                    response_data['business_info'] = {
                        'id': str(business.id),
                        'name': business.name if hasattr(business, 'name') else '',
                        'type': business.business_type if hasattr(business, 'business_type') else '',
                        'country': business.country if hasattr(business, 'country') else '',
                        'legal_structure': business.legal_structure if hasattr(business, 'legal_structure') else ''
                    }
            
            # If we have a session ID, check Redis for more recent data
            if session_id:
                # Get progress from Redis
                redis_progress = onboarding_session_service.get_progress(session_id)
                if redis_progress:
                    # Update progress data from Redis
                    response_data['current_step'] = redis_progress.get('current_step', response_data['current_step'])
                    response_data['progress'] = float(redis_progress.get('progress', response_data['progress']))
                    response_data['last_updated'] = redis_progress.get('last_updated')
                    
                # Get latest step data from Redis
                current_step = response_data['current_step']
                redis_data = onboarding_session_service.get_onboarding_data(session_id, current_step)
                if redis_data:
                    # Include latest step data in response
                    response_data['step_data'] = redis_data
                    response_data['has_active_session'] = True
                    
                    # For business-info step, update business_info in response
                    if current_step == 'business-info' and 'business_info' not in response_data:
                        response_data['business_info'] = redis_data.get('business_info', {})
            
            logger.info(f"Onboarding status retrieved", {
                'request_id': request_id,
                'user_id': request.user.id,
                'current_step': response_data['current_step'],
                'progress': response_data['progress'],
                'has_session': bool(session_id)
            })
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving onboarding status: {str(e)}", {
                'request_id': request_id,
                'user_id': getattr(request.user, 'id', None),
                'error': str(e)
            })
            return Response({
                'status': 'error',
                'error': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Update onboarding status
        
        Request Body:
            - step: Current onboarding step
            - data: Step-specific data
            
        Returns:
            Response: Updated onboarding status
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Parse request data
            step = request.data.get('step')
            step_data = request.data.get('data', {})
            
            if not step:
                return Response({
                    'status': 'error',
                    'error': 'Missing required field: step',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Get session ID from request or create new session
            session_id = getattr(request, 'onboarding_session_id', None)
            if not session_id:
                session_id = request.COOKIES.get('onboardingSessionId')
                if not session_id:
                    session_id = onboarding_session_service.create_session(str(request.user.id))
            
            # Store data in Redis
            onboarding_session_service.store_onboarding_data(session_id, step, step_data)
            
            # Get or create progress in database
            progress = getattr(request, 'onboarding_progress', None)
            if not progress:
                # Get the user's tenant for progress creation
                from custom_auth.models import Tenant
                user_tenant = None
                if hasattr(request.user, 'tenant') and request.user.tenant:
                    user_tenant = request.user.tenant
                else:
                    # Try to find tenant where user is owner
                    user_tenant = Tenant.objects.filter(owner_id=request.user.id).first()
                
                progress, _ = OnboardingProgress.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'tenant_id': user_tenant.id if user_tenant else None,
                        'session_id': session_id,
                        'current_step': step,
                        'onboarding_status': step,
                        'last_session_activity': timezone.now()
                    }
                )
            
            # Update progress in database
            with transaction.atomic():
                # Update step-specific fields
                if step == 'business-info' and 'business_info' in step_data:
                    business_info = step_data.get('business_info', {})
                    
                    # Get or create business
                    business = progress.business
                    if not business:
                        # Get the user's tenant for business creation
                        from custom_auth.models import Tenant
                        user_tenant = None
                        if hasattr(request.user, 'tenant') and request.user.tenant:
                            user_tenant = request.user.tenant
                        else:
                            # Try to find tenant where user is owner
                            user_tenant = Tenant.objects.filter(owner_id=request.user.id).first()
                        
                        business, _ = Business.objects.get_or_create(
                            tenant_id=user_tenant.id if user_tenant else progress.tenant_id,
                            created_by=request.user,
                            defaults={
                                'name': business_info.get('name', ''),
                                'business_type': business_info.get('type', ''),
                                'country': business_info.get('country', ''),
                                'legal_structure': business_info.get('legal_structure', '')
                            }
                        )
                        progress.business = business
                    else:
                        # Update existing business
                        business.name = business_info.get('name', business.name)
                        business.business_type = business_info.get('type', business.business_type)
                        business.country = business_info.get('country', business.country)
                        business.legal_structure = business_info.get('legal_structure', business.legal_structure)
                        business.save()
                
                # Update progress metadata
                metadata = progress.metadata or {}
                metadata[step] = step_data
                progress.metadata = metadata
                
                # Mark step as complete
                progress.mark_step_complete(step)
                
                # Set session ID
                progress.session_id = session_id
                progress.last_session_activity = timezone.now()
                progress.save()
                
                # Log Auth0 attributes update (replaces Cognito update)
                logger.info(f"Auth0 user attributes logged for {request.user.email}: status={step}, plan={selected_plan}")
            
            # Sync to database immediately
            onboarding_session_service.sync_to_db(session_id, OnboardingProgress)
            
            # Prepare response
            response_data = {
                'status': 'success',
                'step': step,
                'current_step': progress.current_step,
                'next_step': progress.next_step,
                'progress': progress.progress_percentage,
                'session_id': session_id,
                'request_id': request_id
            }
            
            logger.info(f"Onboarding status updated", {
                'request_id': request_id,
                'user_id': request.user.id,
                'step': step,
                'progress': progress.progress_percentage
            })
            
            # Create response with cookie
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Set session cookie
            max_age = 24 * 60 * 60  # 24 hours
            response.set_cookie(
                'onboardingSessionId',
                session_id,
                max_age=max_age,
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error updating onboarding status: {str(e)}", {
                'request_id': request_id,
                'user_id': getattr(request.user, 'id', None),
                'step': request.data.get('step'),
                'error': str(e)
            })
            return Response({
                'status': 'error',
                'error': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompleteOnboardingAPI(APIView):
    """
    API endpoint for completing the onboarding process
    
    Finalizes the onboarding process, marking it as complete and transitioning the user
    to the dashboard. This endpoint ensures all data is properly stored in the database
    and triggers necessary setup processes.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Complete the onboarding process
        
        Returns:
            Response: Completion status
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Get session ID from request
            session_id = getattr(request, 'onboarding_session_id', None)
            if not session_id:
                session_id = request.COOKIES.get('onboardingSessionId')
            
            # Get onboarding progress
            progress = getattr(request, 'onboarding_progress', None)
            if not progress:
                progress = OnboardingProgress.objects.filter(user=request.user).first()
                
            if not progress:
                return Response({
                    'status': 'error',
                    'error': 'No onboarding progress found',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Sync any remaining Redis data to database
            if session_id:
                onboarding_session_service.sync_to_db(session_id, OnboardingProgress)
            
            # Mark onboarding as complete
            with transaction.atomic():
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.next_step = 'dashboard'
                progress.completed_at = timezone.now()
                
                # Mark completed steps
                completed_steps = progress.completed_steps or []
                if 'complete' not in completed_steps:
                    completed_steps.append('complete')
                progress.completed_steps = completed_steps
                
                # Set setup as completed
                progress.setup_completed = True
                progress.setup_timestamp = timezone.now()
                
                # Save progress
                progress.save()
            
            # Invalidate Redis session to clean up
            if session_id:
                onboarding_session_service.invalidate_session(session_id)
            
            logger.info(f"Onboarding completed successfully", {
                'request_id': request_id,
                'user_id': request.user.id,
                'business_id': str(progress.business.id) if progress.business else None
            })
            
            # Get tenant ID from user or progress
            tenant_id = None
            if hasattr(request.user, 'tenant') and request.user.tenant:
                tenant_id = str(request.user.tenant.id)
            elif progress.tenant_id:
                tenant_id = str(progress.tenant_id)
            
            return Response({
                'status': 'success',
                'message': 'Onboarding completed successfully',
                'tenant_id': tenant_id,
                'tenantId': tenant_id,  # Include both formats for compatibility
                'redirect_to': f'/tenant/{tenant_id}/dashboard' if tenant_id else '/dashboard',
                'request_id': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error completing onboarding: {str(e)}", {
                'request_id': request_id,
                'user_id': getattr(request.user, 'id', None),
                'error': str(e)
            })
            return Response({
                'status': 'error',
                'error': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResumeOnboardingAPI(APIView):
    """
    API endpoint for resuming the onboarding process
    
    Retrieves the user's current onboarding status and provides the necessary
    information to resume the onboarding process from where they left off.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request):
        """
        Get resume information for onboarding
        
        Returns:
            Response: Resume information
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Get session ID from request
            session_id = getattr(request, 'onboarding_session_id', None)
            if not session_id:
                session_id = request.COOKIES.get('onboardingSessionId')
            
            # Get onboarding progress
            progress = getattr(request, 'onboarding_progress', None)
            if not progress:
                progress = OnboardingProgress.objects.filter(user=request.user).first()
            
            # Initialize response
            response_data = {
                'can_resume': False,
                'current_step': 'business-info',
                'redirect_to': '/onboarding/business-info',
                'has_session': bool(session_id),
                'request_id': request_id
            }
            
            if progress:
                # Check if onboarding is already complete
                if progress.onboarding_status == 'complete':
                    response_data['can_resume'] = False
                    response_data['redirect_to'] = '/dashboard'
                    response_data['message'] = 'Onboarding already completed'
                else:
                    # User can resume onboarding
                    response_data['can_resume'] = True
                    response_data['current_step'] = progress.current_step
                    response_data['next_step'] = progress.next_step
                    response_data['redirect_to'] = f"/onboarding/{progress.current_step}"
                    response_data['progress'] = progress.progress_percentage
                    response_data['last_active_step'] = progress.last_active_step
                    
                    # Include metadata for the current step
                    if progress.metadata and progress.current_step in progress.metadata:
                        response_data['step_data'] = progress.metadata[progress.current_step]
            
            # If no database progress but session exists, check Redis
            elif session_id:
                # Get progress from Redis
                redis_progress = onboarding_session_service.get_progress(session_id)
                if redis_progress:
                    current_step = redis_progress.get('current_step', 'business-info')
                    response_data['can_resume'] = True
                    response_data['current_step'] = current_step
                    response_data['redirect_to'] = f"/onboarding/{current_step}"
                    response_data['progress'] = float(redis_progress.get('progress', 0))
                    
                    # Get step data from Redis
                    redis_data = onboarding_session_service.get_onboarding_data(session_id, current_step)
                    if redis_data:
                        response_data['step_data'] = redis_data
            
            logger.info(f"Onboarding resume information retrieved", {
                'request_id': request_id,
                'user_id': request.user.id,
                'can_resume': response_data['can_resume'],
                'current_step': response_data['current_step']
            })
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving resume information: {str(e)}", {
                'request_id': request_id,
                'user_id': getattr(request.user, 'id', None),
                'error': str(e)
            })
            return Response({
                'status': 'error',
                'error': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 