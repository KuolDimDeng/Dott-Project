import logging
import uuid
import traceback
import psycopg2
from django.utils import timezone
from django.db import transaction, connection, DatabaseError
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
from django.contrib.auth import get_user_model
from datetime import datetime

from custom_auth.authentication import CognitoAuthentication
from custom_auth.cognito import cognito_client
from custom_auth.models import Tenant
from custom_auth.utils import consolidate_user_tenants
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
        Handle POST request to trigger tenant creation and RLS setup.
        This view no longer creates schemas since we've migrated to Row Level Security.
        """
        request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
        logger.info("Dashboard tenant and RLS setup request initiated", extra={
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
                logger.info("Tenant and RLS setup already completed according to setupdone flag", extra={
                    'request_id': request_id,
                    'user_id': str(request.user.id)
                })
                
                return Response({
                    'status': 'complete',
                    'message': 'Tenant and RLS setup already completed',
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
            
            # Check if tenant exists for this user or create one using direct connection
            tenant = None
            try:
                # Consolidate any duplicate tenants that might exist for this user
                try:
                    consolidated_tenant = consolidate_user_tenants(request.user)
                    if consolidated_tenant:
                        logger.info(f"[DASHBOARD-SETUP] Found consolidated tenant: {consolidated_tenant.id}")
                except Exception as e:
                    logger.error(f"[DASHBOARD-SETUP] Error consolidating tenants: {str(e)}")
                    
                # Initialize pending_setup with default values
                pending_setup = {
                    'business_name': request.data.get('business_name', 'New Business'),
                    'tenant_id': None,
                    'setup_time': timezone.now().isoformat(),
                    'business_id': request.headers.get('X-Tenant-ID')
                }
                
                # Check session for pending setup first
                session_pending_setup = request.session.get('pending_tenant_setup')
                if session_pending_setup:
                    pending_setup.update(session_pending_setup)
                    logger.info(f"[DASHBOARD-SETUP] Found pending setup in session")
                
                with direct_conn.cursor() as cursor:
                    # Check if tenant exists - check both owner_id and regular user association
                    cursor.execute("""
                        -- First check if user owns any tenant
                        SELECT id FROM custom_auth_tenant
                        WHERE owner_id = %s
                        
                        UNION
                        
                        -- Then check if user is associated with any tenant
                        SELECT t.id 
                        FROM custom_auth_tenant t
                        JOIN custom_auth_user u ON u.tenant_id = t.id
                        WHERE u.id = %s
                        
                        LIMIT 1
                    """, [str(request.user.id), str(request.user.id)])
                    
                    tenant_record = cursor.fetchone()
                    
                    if tenant_record:
                        tenant_id = tenant_record[0]
                        tenant = {
                            'id': tenant_id,
                        }
                        logger.info(f"Found existing tenant: {tenant_id} for user {request.user.email}")
                        
                        # Make sure user is properly linked to the tenant if not already
                        cursor.execute("""
                            UPDATE custom_auth_user 
                            SET tenant_id = %s
                            WHERE id = %s AND (tenant_id IS NULL OR tenant_id != %s)
                        """, [tenant_id, str(request.user.id), tenant_id])
                        
                        if cursor.rowcount > 0:
                            logger.info(f"Updated user {request.user.email} to link with existing tenant {tenant_id}")
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
                        created_on = timezone.now().isoformat()
                        
                        # Create the tenant record in the database
                        cursor.execute("""
                            INSERT INTO custom_auth_tenant (
                                id, name, created_on, owner_id, setup_status, 
                                is_active
                            ) VALUES (
                                %s, %s, %s, %s, %s, 
                                TRUE
                            )
                        """, [
                            tenant_id, business_name, created_on, 
                            str(request.user.id), 'active'
                        ])
                        
                        # Also update the user to link to this tenant
                        cursor.execute("""
                            UPDATE custom_auth_user
                            SET tenant_id = %s
                            WHERE id = %s
                        """, [tenant_id, str(request.user.id)])
                        
                        tenant = {
                            'id': tenant_id,
                        }
                        logger.info(f"Created new tenant: {tenant_id} for user {request.user.email}")
                    
                # Update pending_setup with tenant information
                pending_setup['tenant_id'] = str(tenant['id'])
                
                # Apply RLS policies to tenant-aware tables
                try:
                    # Import RLS utilities
                    from custom_auth.rls import set_tenant_in_db, create_rls_policy_for_table
                    
                    # Set current tenant context for RLS
                    set_tenant_in_db(tenant_id)
                    logger.info(f"Set tenant context to {tenant_id} for RLS application")
                    
                    # Get list of tenant-aware tables
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.columns 
                        WHERE column_name = 'tenant_id' 
                        AND table_schema = 'public'
                    """)
                    
                    tenant_tables = [row[0] for row in cursor.fetchall()]
                    logger.info(f"Found {len(tenant_tables)} tenant-aware tables")
                    
                    # Apply RLS policies to tenant tables
                    for table_name in tenant_tables:
                        # Enable RLS on the table
                        cursor.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;')
                        
                        # Create tenant isolation policy
                        cursor.execute(f"""
                            DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
                            CREATE POLICY tenant_isolation_policy ON {table_name}
                                USING (
                                    tenant_id = current_setting('app.current_tenant_id')::uuid
                                    OR current_setting('app.current_tenant_id', TRUE) IS NULL
                                );
                        """)
                        logger.info(f"Applied RLS policy to table: {table_name}")
                    
                    logger.info(f"Successfully applied RLS policies to all tenant-aware tables")

                    # Update user's onboarding status in Cognito
                    try:
                        import boto3
                        from botocore.exceptions import ClientError
                        
                        cognito_client = boto3.client('cognito-idp', 
                            region_name=settings.AWS_REGION,
                            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                        )
                        
                        # Check if user has cognito_sub
                        if hasattr(request.user, 'cognito_sub') and request.user.cognito_sub:
                            # Update Cognito attributes to mark onboarding as complete
                            cognito_client.admin_update_user_attributes(
                                UserPoolId=settings.COGNITO_USER_POOL_ID,
                                Username=request.user.cognito_sub,
                                UserAttributes=[
                                    {
                                        'Name': 'custom:onboarding',
                                        'Value': 'COMPLETE'
                                    },
                                    {
                                        'Name': 'custom:setupdone',
                                        'Value': 'TRUE'
                                    },
                                    {
                                        'Name': 'custom:updated_at',
                                        'Value': timezone.now().isoformat()
                                    }
                                ]
                            )
                            logger.info(f"Updated Cognito attributes for user {request.user.id} - onboarding marked as COMPLETE")
                        else:
                            logger.warning(f"User {request.user.id} does not have a cognito_sub, could not update Cognito attributes")
                            
                        # Update OnboardingProgress record if it exists
                        from onboarding.models import OnboardingProgress
                        progress = OnboardingProgress.objects.filter(user=request.user).first()
                        if progress:
                            progress.onboarding_status = 'complete'
                            progress.completed_at = timezone.now()
                            progress.rls_setup_completed = True
                            progress.rls_setup_timestamp = timezone.now()
                            progress.save(update_fields=['onboarding_status', 'completed_at', 'rls_setup_completed', 'rls_setup_timestamp'])
                            logger.info(f"Updated OnboardingProgress record for user {request.user.id}")
                    except Exception as cognito_error:
                        logger.error(f"Error updating Cognito attributes: {str(cognito_error)}", extra={
                            'request_id': request_id,
                            'error': str(cognito_error),
                            'traceback': traceback.format_exc()
                        })
                        # Continue despite Cognito errors
                        
                except Exception as rls_error:
                    logger.error(f"Error applying RLS policies: {str(rls_error)}", extra={
                        'request_id': request_id,
                        'error': str(rls_error),
                        'traceback': traceback.format_exc()
                    })
                    # Continue despite RLS errors as they will be retried during management command execution
                    
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
                
                # Set default source if not defined
                source = "session"
                
                # Save to session
                try:
                    request.session['pending_tenant_setup'] = pending_setup
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
                        profile.metadata['pending_tenant_setup'] = pending_setup
                        profile.save(update_fields=['metadata'])
                except Exception as profile_error:
                    logger.warning("Failed to update profile metadata", extra={
                        'request_id': request_id,
                        'error': str(profile_error)
                    })
                
                # Return a consistent JSON response
                return Response({
                    'status': 'success',
                    'message': 'Tenant and RLS setup initiated',
                    'task_id': task_id,
                    'request_id': request_id,
                    'tenant_id': tenant['id'],
                    'source': source,
                    'force_setup': force_setup,
                }, status=status.HTTP_202_ACCEPTED)
                
        except Exception as e:
            logger.error("Error initiating tenant and RLS setup", extra={
                'request_id': request_id,
                'error': str(e),
                'error_type': type(e).__name__,
                'traceback': traceback.format_exc()
            })
            return Response({
                'status': 'error',
                'message': f'Failed to initiate tenant and RLS setup: {str(e)}',
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