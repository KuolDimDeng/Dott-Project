import logging
import uuid
import traceback
from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser

from custom_auth.authentication import CognitoAuthentication
from users.models import UserProfile
from ..models import OnboardingProgress
from ..tasks import setup_user_schema_task

# Configure logger
logger = logging.getLogger(__name__)

class DashboardSchemaSetupView(APIView):
    """
    View to handle deferred schema setup when user reaches the dashboard.
    
    This view checks for pending schema setup information in either:
    1. The user's session
    2. The user's profile metadata
    
    If found, it triggers the setup process and returns a success response.
    If not found, it returns a 404 error.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CognitoAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Handle POST request to trigger schema setup with improved memory efficiency.
        
        This method checks for pending schema setup information in either:
        1. The user's session
        2. The user's profile metadata
        
        If found, it triggers the setup process and returns a success response.
        If not found, it returns a 404 error.
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        logger.info("Dashboard schema setup request initiated", extra={
            'request_id': request_id,
            'user_id': str(request.user.id),
            'timestamp': timezone.now().isoformat()
        })
        
        try:
            # Check session for pending schema setup first (memory efficient)
            pending_setup = request.session.get('pending_schema_setup')
            source = 'session'
            
            # If not in session, check user profile metadata with minimal query
            if not pending_setup:
                try:
                    # Use filter().first() instead of get() to avoid exceptions
                    profile = UserProfile.objects.filter(user=request.user).only('id', 'metadata').first()
                    
                    # Check if metadata exists and contains pending setup
                    if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                        profile_setup = profile.metadata.get('pending_schema_setup')
                        if profile_setup:
                            pending_setup = profile_setup
                            source = 'profile'
                            
                            # Log only essential information
                            logger.info("Found pending schema setup in profile", extra={
                                'request_id': request_id,
                                'profile_id': str(profile.id),
                                'deferred': profile_setup.get('deferred', False)
                            })
                except Exception as e:
                    # Log but continue - not critical
                    logger.warning("Error checking profile metadata", extra={
                        'request_id': request_id,
                        'error': str(e)
                    })
            
            # Auto-create setup data if needed with minimal queries
            if not pending_setup:
                # Check if user has a business and tenant but no schema
                business_id = None
                
                # Use efficient queries with only() to reduce memory usage
                profile = UserProfile.objects.filter(user=request.user).only('id', 'business_id').first()
                if profile and profile.business_id:
                    business_id = str(profile.business_id)
                    
                    # Check tenant status with direct SQL to avoid ORM overhead
                    tenant_status = None
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT database_status FROM auth_tenant
                            WHERE owner_id = %s LIMIT 1
                        """, [str(request.user.id)])
                        result = cursor.fetchone()
                        if result:
                            tenant_status = result[0]
                    
                    if tenant_status in ['not_created', 'pending', None]:
                        # Create minimal pending setup data
                        pending_setup = {
                            'user_id': str(request.user.id),
                            'business_id': business_id,
                            'plan': 'auto_created',
                            'timestamp': timezone.now().isoformat(),
                            'deferred': True
                        }
                        source = 'auto_created'
            
            # If still no pending setup found, return error
            if not pending_setup:
                return Response({
                    'status': 'error',
                    'message': 'No pending schema setup found',
                    'request_id': request_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Extract setup information
            user_id = pending_setup.get('user_id')
            business_id = pending_setup.get('business_id')
            plan = pending_setup.get('plan', 'free')
            
            if not user_id or not business_id:
                return Response({
                    'status': 'error',
                    'message': 'Invalid schema setup data',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Queue setup task without transaction to reduce DB load
            setup_task = setup_user_schema_task.apply_async(
                args=[user_id, business_id],
                queue='setup',
                retry=True,
                retry_policy={
                    'max_retries': 3,
                    'interval_start': 5,
                    'interval_step': 30,
                    'interval_max': 300,
                }
            )
            
            logger.info("Schema setup task queued", extra={
                'request_id': request_id,
                'task_id': setup_task.id,
                'plan': plan,
                'source': source
            })
            
            # Update onboarding progress with direct SQL for efficiency
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE onboarding_onboardingprogress
                        SET database_setup_task_id = %s,
                            setup_started_at = NOW()
                        WHERE user_id = %s
                    """, [setup_task.id, str(request.user.id)])
            except Exception as e:
                # Log but continue - not critical
                logger.warning("Failed to update onboarding progress", extra={
                    'request_id': request_id,
                    'error': str(e)
                })
            
            # Clear the pending setup from session
            if 'pending_schema_setup' in request.session:
                del request.session['pending_schema_setup']
                request.session.modified = True
            
            # Clear from profile metadata with direct SQL if possible
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE users_userprofile
                        SET metadata = metadata - 'pending_schema_setup'
                        WHERE user_id = %s AND metadata ? 'pending_schema_setup'
                    """, [str(request.user.id)])
            except Exception as e:
                # Log but continue - not critical
                logger.warning("Failed to clear profile metadata", extra={
                    'request_id': request_id,
                    'error': str(e)
                })
            
            return Response({
                'status': 'success',
                'message': 'Schema setup initiated',
                'task_id': setup_task.id,
                'plan': plan,
                'request_id': request_id
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error("Error initiating schema setup", extra={
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__
            })
            return Response({
                'status': 'error',
                'message': f'Failed to initiate schema setup: {str(e)}',
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)