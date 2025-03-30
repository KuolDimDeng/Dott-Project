import uuid
import logging
import traceback
from django.utils import timezone
from django.db import connection, transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser

from custom_auth.authentication import CognitoAuthentication
from custom_auth.models import Tenant
from custom_auth.rls import setup_tenant_context_in_db, set_tenant_in_db, create_rls_policy_for_table
from onboarding.models import OnboardingProgress
from users.models import Business, UserProfile

# Configure logger
logger = logging.getLogger(__name__)

class SubscriptionSaveView(APIView):
    """
    Handle subscription plan selection and set up tenant with RLS
    for both free and paid tiers.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CognitoAuthentication]
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
        elif 'plan' in data:
            data['selected_plan'] = data['plan']

        # Normalize billing cycle input
        if 'interval' in data and not data.get('billing_cycle'):
            data['billing_cycle'] = data['interval']

        # Validate required fields
        if not data.get('selected_plan'):
            return False, "Plan selection is required"
        if data['selected_plan'] not in self.VALID_PLANS:
            return False, f"Invalid plan type: {data['selected_plan']}"
        if data.get('billing_cycle') and data['billing_cycle'] not in self.VALID_BILLING_CYCLES:
            return False, f"Invalid billing cycle: {data['billing_cycle']}"

        return True, None
    
    def get_business(self, request):
        """Retrieve business for the current user"""
        try:
            from users.models import Business
            
            # First try to get business from user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
                if profile.business:
                    return profile.business
            except (UserProfile.DoesNotExist, Exception) as e:
                logger.warning(f"Error getting business from profile: {str(e)}")
            
            # Then try direct query for business owned by user
            business = Business.objects.filter(owner=request.user).first()
            if business:
                return business
                
            # Create a basic business if none exists
            business_name = f"{request.user.first_name or request.user.email.split('@')[0]}'s Business"
            business = Business.objects.create(
                owner=request.user,
                business_name=business_name
            )
            
            logger.info(f"Created new business for user {request.user.email}")
            return business
            
        except Exception as e:
            logger.error(f"Error retrieving/creating business: {str(e)}")
            return None
    
    def setup_rls_for_free_plan(self, request, tenant_id):
        """Set up RLS policies for free plan users"""
        try:
            # Initialize tenant context for RLS
            setup_tenant_context_in_db()
            set_tenant_in_db(tenant_id)
            logger.info(f"Set tenant context to {tenant_id} for RLS application")
            
            # Get list of tenant-aware tables
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.columns 
                    WHERE column_name = 'tenant_id' 
                    AND table_schema = 'public'
                """)
                
                tenant_tables = [row[0] for row in cursor.fetchall()]
                logger.info(f"Found {len(tenant_tables)} tenant-aware tables for RLS application")
                
                # Apply RLS policies to tenant tables
                for table_name in tenant_tables:
                    try:
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
                        logger.info(f"Applied RLS policy to table: {table_name} for free plan user")
                    except Exception as table_error:
                        logger.error(f"Error applying RLS policy to {table_name}: {str(table_error)}")
            
            # Update progress to mark RLS setup as completed
            progress = OnboardingProgress.objects.filter(user=request.user).first()
            if progress:
                progress.rls_setup_completed = True
                progress.rls_setup_timestamp = timezone.now()
                progress.save(update_fields=['rls_setup_completed', 'rls_setup_timestamp'])
                
            return True
        except Exception as e:
            logger.error(f"Error setting up RLS for free plan: {str(e)}")
            return False
    
    def post(self, request):
        """
        Handle subscription plan selection and create tenant with RLS.
        For free tier, immediately set up RLS.
        For paid tiers, prepare for payment and defer RLS setup.
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        logger.info(f"Processing subscription plan selection - Request ID: {request_id}")
        
        try:
            # Validate input data
            data = request.data.copy()
            valid, error_message = self.validate_subscription_data(data)
            if not valid:
                return Response({
                    'error': error_message,
                    'code': 'validation_error'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            selected_plan = data['selected_plan']
            billing_cycle = data.get('billing_cycle', 'monthly')
            
            # Get user's business
            business = self.get_business(request)
            if not business:
                return Response({
                    'error': 'Failed to retrieve or create business',
                    'code': 'business_error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update onboarding progress
            with transaction.atomic():
                # Get or create progress record
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'business': business,
                        'onboarding_status': 'subscription',
                        'current_step': 'subscription',
                        'next_step': 'complete' if selected_plan == 'free' else 'payment',
                        'selected_plan': selected_plan,
                        'subscription_plan': selected_plan,
                        'billing_cycle': billing_cycle,
                        'created_at': timezone.now()
                    }
                )
                
                if not created:
                    # Update existing record
                    progress.business = business
                    progress.onboarding_status = 'subscription'
                    progress.current_step = 'subscription'
                    progress.next_step = 'complete' if selected_plan == 'free' else 'payment'
                    progress.selected_plan = selected_plan
                    progress.subscription_plan = selected_plan
                    progress.billing_cycle = billing_cycle
                    progress.updated_at = timezone.now()
                    progress.save()
            
            # Process based on plan type
            if selected_plan == 'free':
                # For free plan, create tenant and set up RLS immediately
                try:
                    # Check if tenant already exists for user
                    tenant = None
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT id FROM custom_auth_tenant
                            WHERE owner_id = %s
                            LIMIT 1
                        """, [str(request.user.id)])
                        
                        tenant_record = cursor.fetchone()
                        
                        if tenant_record:
                            tenant_id = tenant_record[0]
                            logger.info(f"Found existing tenant {tenant_id} for free plan user {request.user.id}")
                            
                            # Update tenant record to reflect free plan
                            cursor.execute("""
                                UPDATE custom_auth_tenant
                                SET setup_status = 'active',
                                    is_active = TRUE,
                                    rls_enabled = TRUE,
                                    rls_setup_date = %s
                                WHERE id = %s
                            """, [timezone.now(), tenant_id])
                        else:
                            # Create new tenant for free plan
                            tenant_id = str(uuid.uuid4())
                            
                            # Create tenant record with RLS enabled
                            cursor.execute("""
                                INSERT INTO custom_auth_tenant (
                                    id, name, created_on, owner_id, setup_status, 
                                    is_active, rls_enabled, rls_setup_date
                                ) VALUES (
                                    %s, %s, %s, %s, %s, 
                                    TRUE, TRUE, %s
                                )
                            """, [
                                tenant_id, business.business_name, timezone.now(), 
                                str(request.user.id), 'active', timezone.now()
                            ])
                            
                            # Also update the user to link to this tenant
                            cursor.execute("""
                                UPDATE custom_auth_user
                                SET tenant_id = %s
                                WHERE id = %s
                            """, [tenant_id, str(request.user.id)])
                            
                            logger.info(f"Created new tenant {tenant_id} for free plan user {request.user.id}")
                    
                    # Set up RLS for this tenant
                    self.setup_rls_for_free_plan(request, tenant_id)
                    
                    # Update Cognito attributes for free tier users
                    try:
                        from django.conf import settings
                        import boto3
                        
                        # Only update if user has a cognito_sub
                        if hasattr(request.user, 'cognito_sub') and request.user.cognito_sub:
                            cognito_client = boto3.client('cognito-idp', 
                                region_name=settings.AWS_REGION,
                                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                            )
                            
                            # Update user attributes in Cognito
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
                                        'Name': 'custom:subplan',
                                        'Value': 'free'
                                    },
                                    {
                                        'Name': 'custom:updated_at',
                                        'Value': timezone.now().isoformat()
                                    }
                                ]
                            )
                            logger.info(f"Updated Cognito attributes for free plan user {request.user.id}")
                            
                            # Update progress record to mark onboarding complete
                            if progress:
                                progress.onboarding_status = 'complete'
                                progress.completed_at = timezone.now()
                                progress.save(update_fields=['onboarding_status', 'completed_at'])
                                logger.info(f"Marked onboarding as complete for user {request.user.id}")
                                
                    except Exception as cognito_error:
                        logger.error(f"Error updating Cognito attributes: {str(cognito_error)}")
                        # Continue despite Cognito errors
                    
                    # Return success for free plan
                    return Response({
                        'status': 'success',
                        'plan': selected_plan,
                        'message': 'Free plan activated with RLS security',
                        'next_step': 'dashboard',
                        'onboarding_complete': True
                    }, status=status.HTTP_200_OK)
                    
                except Exception as free_plan_error:
                    logger.error(f"Error setting up free plan: {str(free_plan_error)}", exc_info=True)
                    return Response({
                        'error': f'Failed to set up free plan: {str(free_plan_error)}',
                        'code': 'free_plan_error'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # For paid plans, prepare for payment
                return Response({
                    'status': 'success',
                    'plan': selected_plan,
                    'billing_cycle': billing_cycle,
                    'message': 'Plan selection saved, proceed to payment',
                    'next_step': 'payment'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error saving subscription plan: {str(e)}", exc_info=True)
            return Response({
                'error': f'Failed to process subscription plan: {str(e)}',
                'code': 'general_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 