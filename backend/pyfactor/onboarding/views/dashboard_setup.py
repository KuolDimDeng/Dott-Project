import logging
import uuid
import traceback
import psycopg2
from django.utils import timezone
from django.db import transaction, connection
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from celery.result import AsyncResult
from django.conf import settings

from custom_auth.authentication import CognitoAuthentication
from custom_auth.cognito import cognito_client
from custom_auth.models import Tenant
from users.models import UserProfile, Business
from ..models import OnboardingProgress
from ..tasks import setup_user_schema_task

# Configure logger
logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class DashboardSchemaSetupView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CognitoAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Handle POST request to trigger schema setup with improved memory efficiency.
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        logger.info("Dashboard schema setup request initiated", extra={
            'request_id': request_id,
            'user_id': str(request.user.id) if request.user.is_authenticated else None,
            'timestamp': timezone.now().isoformat(),
            'auth_header': bool(request.headers.get('Authorization')),
            'id_token': bool(request.headers.get('X-Id-Token'))
        })

        # Create a direct connection outside transactions to avoid connection pool issues
        direct_conn = None

        try:
            # Check authentication first
            if not request.user.is_authenticated:
                logger.error(f"Authentication required for setup trigger", extra={
                    'request_id': request_id
                })
                return Response({
                    'status': 'error',
                    'message': 'Authentication required'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            # Get the setup_done flag from request headers or user attributes
            setup_done = request.headers.get('X-Setup-Done', '').upper() == 'TRUE'
            
            # Check if it's in the request data
            request_data = getattr(request, 'data', {})
            force_setup = request_data.get('force_setup', False)
            
            if setup_done and not force_setup:
                logger.info("Schema setup already completed according to setupdone flag", extra={
                    'request_id': request_id,
                    'user_id': str(request.user.id)
                })
                
                return Response({
                    'status': 'complete',
                    'message': 'Schema setup already completed',
                    'request_id': request_id
                }, status=status.HTTP_200_OK)
            
            # Check if an active task already exists - with improved error handling
            progress = OnboardingProgress.objects.filter(user=request.user).first()
            
            # Safely check if the task_id attribute exists and has a value
            if progress and hasattr(progress, 'database_setup_task_id') and progress.database_setup_task_id:
                try:
                    task = AsyncResult(progress.database_setup_task_id)
                    if task.state in ['PENDING', 'STARTED', 'PROGRESS']:
                        logger.info(f"Setup task already running for user {request.user.id}", extra={
                            'request_id': request_id,
                            'task_id': progress.database_setup_task_id,
                            'task_state': task.state
                        })
                        return Response({
                            'status': 'in_progress',
                            'message': 'Setup task already running',
                            'task_id': progress.database_setup_task_id,
                            'request_id': request_id
                        }, status=status.HTTP_200_OK)
                except Exception as task_error:
                    # Handle errors when checking task state
                    logger.warning(f"Error checking task state: {str(task_error)}", extra={
                        'request_id': request_id,
                        'error': str(task_error)
                    })
                    # Continue with setup since we couldn't verify task state
                    
            # Create a direct database connection to avoid connection pool issues
            try:
                db_settings = settings.DATABASES['default']
                direct_conn = psycopg2.connect(
                    dbname=db_settings['NAME'],
                    user=db_settings['USER'],
                    password=db_settings['PASSWORD'],
                    host=db_settings['HOST'],
                    port=db_settings['PORT']
                )
                direct_conn.set_session(autocommit=True)  # Use autocommit mode
                logger.info("Created direct database connection for tenant operations")
            except Exception as conn_error:
                logger.error(f"Failed to create direct database connection: {str(conn_error)}")
                return Response({
                    'status': 'error',
                    'message': f'Database connection error: {str(conn_error)}',
                    'request_id': request_id
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Check session for pending schema setup first
            pending_setup = request.session.get('pending_schema_setup')
            source = 'session'
            
            # If not in session, check user profile metadata
            if not pending_setup:
                try:
                    profile = UserProfile.objects.filter(user=request.user).first()
                    
                    if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                        profile_setup = profile.metadata.get('pending_schema_setup')
                        if profile_setup:
                            pending_setup = profile_setup
                            source = 'profile'
                            
                            logger.info("Found pending schema setup in profile", extra={
                                'request_id': request_id,
                                'profile_id': str(profile.id),
                                'deferred': profile_setup.get('deferred', False)
                            })
                except Exception as e:
                    logger.warning("Error checking profile metadata", extra={
                        'request_id': request_id,
                        'error': str(e)
                    })
            
            # Auto-create setup data if needed or if forced
            if not pending_setup or force_setup:
                # Get business ID from tenant ID or from profile
                business_id = request.headers.get('X-Tenant-ID')
                
                if not business_id:
                    try:
                        profile = UserProfile.objects.select_related('business').filter(user=request.user).first()
                        if profile and profile.business:
                            business_id = str(profile.business.id)
                    except Exception as profile_error:
                        logger.warning(f"Error fetching profile: {str(profile_error)}", extra={
                            'request_id': request_id,
                            'error': str(profile_error)
                        })
                
                if business_id:
                    # Create minimal pending setup data
                    pending_setup = {
                        'user_id': str(request.user.id),
                        'business_id': business_id,
                        'tenant_id': business_id,
                        'minimal_schema_created': True,
                        'deferred': True,
                        'force_setup': force_setup,
                        'plan': 'free',  # Default plan
                        'timestamp': timezone.now().isoformat()
                    }
                    source = 'auto_created'
                    
                    logger.info("Auto-created pending schema setup", extra={
                        'request_id': request_id,
                        'business_id': business_id,
                        'force_setup': force_setup
                    })
            
            # If still no pending setup found, return error
            if not pending_setup:
                logger.error("No pending schema setup could be found or created", extra={
                    'request_id': request_id,
                    'user_id': str(request.user.id),
                    'tenant_id': request.headers.get('X-Tenant-ID')
                })
                
                return Response({
                    'status': 'error',
                    'message': 'No pending schema setup found',
                    'request_id': request_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if tenant exists for this user or create one using direct connection
            tenant = None
            try:
                with direct_conn.cursor() as cursor:
                    # Check if tenant exists
                    cursor.execute("""
                        SELECT id, schema_name FROM custom_auth_tenant
                        WHERE owner_id = %s
                    """, [str(request.user.id)])
                    
                    tenant_record = cursor.fetchone()
                    
                    if tenant_record:
                        tenant_id, schema_name = tenant_record
                        tenant = {
                            'id': tenant_id,
                            'schema_name': schema_name
                        }
                        logger.info(f"Found existing tenant: {tenant_id}")
                    else:
                        # Get business name
                        business_name = "Default Tenant"
                        business_id = pending_setup.get('business_id')
                        if business_id:
                            cursor.execute("""
                                SELECT name FROM users_business
                                WHERE id = %s
                            """, [business_id])
                            business_record = cursor.fetchone()
                            if business_record:
                                business_name = business_record[0]
                            else:
                                logger.warning(f"Business with ID {business_id} not found in database")
                        
                        # Create a new tenant with safer SQL
                        tenant_id = str(uuid.uuid4())
                        schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                        created_on = timezone.now().isoformat()
                        
                        cursor.execute("""
                            INSERT INTO custom_auth_tenant (
                                id, schema_name, name, created_on, owner_id, setup_status, 
                                is_active, database_status
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, 
                                TRUE, %s
                            )
                        """, [
                            tenant_id, schema_name, business_name, created_on, 
                            str(request.user.id), 'not_started', 'not_created'
                        ])
                        
                        tenant = {
                            'id': tenant_id,
                            'schema_name': schema_name
                        }
                        logger.info(f"Created new tenant: {tenant_id} with schema {schema_name}")
                        
                # Update pending_setup with tenant information
                pending_setup['tenant_id'] = str(tenant['id'])
                pending_setup['schema_name'] = tenant['schema_name']
                    
            except Exception as tenant_error:
                logger.error(f"Error creating/finding tenant: {str(tenant_error)}", extra={
                    'request_id': request_id,
                    'error': str(tenant_error),
                    'traceback': traceback.format_exc()
                })
                
                return Response({
                    'status': 'error',
                    'message': f'Failed to create tenant: {str(tenant_error)}',
                    'request_id': request_id
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Wrap the remaining database operations in a transaction
            with transaction.atomic():
                # When creating the task, include the tenant ID and schema name
                setup_task = setup_user_schema_task.apply_async(
                    args=[str(request.user.id), pending_setup.get('business_id')],
                    kwargs={
                        'force_setup': force_setup, 
                        'request_id': request_id,
                        'tenant_id': tenant['id'],
                        'schema_name': tenant['schema_name']
                    },
                    queue='setup',
                    retry=True,
                    retry_policy={
                        'max_retries': 3,
                        'interval_start': 5,
                        'interval_step': 30,
                        'interval_max': 300,
                    }
                )
                
                task_id = setup_task.id
                
                # Update onboarding progress - with better error handling
                try:
                    if progress:
                        # Check if the field exists before trying to set it
                        if hasattr(progress, 'database_setup_task_id'):
                            progress.database_setup_task_id = task_id
                        else:
                            # Field doesn't exist, log the issue but continue
                            logger.warning("database_setup_task_id field not found on OnboardingProgress", extra={
                                'request_id': request_id,
                                'user_id': str(request.user.id)
                            })
                            
                        if hasattr(progress, 'setup_started_at'):
                            progress.setup_started_at = timezone.now()
                            
                        # Only save if we have fields to update
                        fields_to_update = []
                        if hasattr(progress, 'database_setup_task_id'):
                            fields_to_update.append('database_setup_task_id')
                        if hasattr(progress, 'setup_started_at'):
                            fields_to_update.append('setup_started_at')
                            
                        if fields_to_update:
                            progress.save(update_fields=fields_to_update)
                    else:
                        # Create new progress record with error handling
                        try:
                            progress_data = {
                                'user': request.user,
                                'setup_started_at': timezone.now(),
                                'onboarding_status': 'setup',
                                'current_step': 'setup',
                                'next_step': 'complete'
                            }
                            
                            # Only add task_id if field exists in model
                            field_names = [f.name for f in OnboardingProgress._meta.get_fields()]
                            if 'database_setup_task_id' in field_names:
                                progress_data['database_setup_task_id'] = task_id
                                
                            OnboardingProgress.objects.create(**progress_data)
                        except Exception as create_error:
                            logger.warning("Failed to create progress record", extra={
                                'request_id': request_id,
                                'error': str(create_error)
                            })
                except Exception as progress_error:
                    logger.warning("Failed to update onboarding progress", extra={
                        'request_id': request_id,
                        'error': str(progress_error)
                    })
                
                # Update pending setup with task ID and save back to sources
                pending_setup['task_id'] = task_id
                pending_setup['setup_triggered_at'] = timezone.now().isoformat()
                pending_setup['force_setup'] = force_setup
                
                # Save to session
                try:
                    request.session['pending_schema_setup'] = pending_setup
                    request.session.modified = True
                except Exception as session_error:
                    logger.warning("Failed to update session", extra={
                        'request_id': request_id,
                        'error': str(session_error)
                    })
                
                # Save to profile metadata
                try:
                    profile = UserProfile.objects.filter(user=request.user).first()
                    if profile:
                        if not profile.metadata:
                            profile.metadata = {}
                        profile.metadata['pending_schema_setup'] = pending_setup
                        profile.save(update_fields=['metadata'])
                except Exception as profile_error:
                    logger.warning("Failed to update profile metadata", extra={
                        'request_id': request_id,
                        'error': str(profile_error)
                    })
                
                # Return a consistent JSON response
                return Response({
                    'status': 'success',
                    'message': 'Schema setup initiated',
                    'task_id': task_id,
                    'request_id': request_id,
                    'schema_name': tenant['schema_name'],
                    'source': source,
                    'force_setup': force_setup,
                    'tenant_id': tenant['id']
                }, status=status.HTTP_202_ACCEPTED)
                
        except Exception as e:
            logger.error("Error initiating schema setup", extra={
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'traceback': traceback.format_exc()
            })
            return Response({
                'status': 'error',
                'message': f'Failed to initiate schema setup: {str(e)}',
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Close the direct connection
            if direct_conn:
                try:
                    if not direct_conn.closed:
                        direct_conn.close()
                        logger.info("Closed direct database connection")
                except Exception as close_error:
                    logger.error(f"Error closing direct connection: {str(close_error)}")