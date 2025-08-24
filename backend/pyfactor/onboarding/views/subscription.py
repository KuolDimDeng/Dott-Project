import uuid
import logging
import traceback
from django.utils import timezone
from custom_auth.rls import set_tenant_context, clear_tenant_context
from django.db import connection, transaction as db_transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
import asyncio
from asgiref.sync import sync_to_async

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from custom_auth.models import Tenant
from custom_auth.rls import setup_tenant_context_in_db, setup_tenant_context_in_db_async
from custom_auth.rls import set_tenant_in_db, set_tenant_in_db_async
from custom_auth.rls import create_rls_policy_for_table
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
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    VALID_PLANS = ['free', 'professional', 'enterprise']
    VALID_BILLING_CYCLES = ['monthly', '6month', 'annual', 'yearly']
    
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
    
    def get_business_sync(self, request):
        """Retrieve or create business for the current user"""
        logger.info(f"[get_business_sync] === START === for user {request.user.email}")
        try:
            from users.models import Business
            
            # First try to get business from user profile
            logger.info(f"[get_business_sync] Checking UserProfile for user {request.user.id}")
            try:
                profile = UserProfile.objects.get(user=request.user)
                logger.info(f"[get_business_sync] Found UserProfile: {profile.id}")
                if profile.business:
                    logger.info(f"[get_business_sync] Profile has business: {profile.business.id}")
                    return profile.business
                else:
                    logger.info(f"[get_business_sync] Profile exists but has no business")
            except UserProfile.DoesNotExist:
                logger.warning(f"[get_business_sync] UserProfile does not exist for user {request.user.id}")
            except Exception as e:
                logger.warning(f"[get_business_sync] Error getting business from profile: {str(e)}")
            
            # Then try direct query for business owned by user
            # Generate the same UUID that would be used for this user
            owner_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{request.user.id}'))
            logger.info(f"[get_business_sync] Looking for business with owner_id: {owner_uuid}")
            business = Business.objects.filter(owner_id=owner_uuid).first()
            if business:
                logger.info(f"[get_business_sync] Found business by owner_id: {business.id}")
                return business
            else:
                logger.info(f"[get_business_sync] No business found with owner_id: {owner_uuid}")
            
            # Try to find business by expected ID (same logic as SaveStep1View)
            business_id = uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{request.user.id}')
            logger.info(f"[get_business_sync] Looking for business with ID: {business_id}")
            business = Business.objects.filter(id=business_id).first()
            if business:
                logger.info(f"[get_business_sync] Found business by ID {business_id} for user {request.user.email}")
                # Link it to profile if not already linked
                try:
                    profile, created = UserProfile.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'business': business,
                            'business_id': business_id
                        }
                    )
                    if not created and not profile.business:
                        profile.business = business
                        profile.business_id = business_id
                        profile.save(update_fields=['business', 'business_id'])
                except Exception as link_error:
                    logger.warning(f"Error linking business to profile: {str(link_error)}")
                return business
                
            # CRITICAL FIX: Only create business if it truly doesn't exist
            # Check OnboardingProgress for business name first
            business_name = None
            try:
                from onboarding.models import OnboardingProgress
                progress = OnboardingProgress.objects.filter(user=request.user).first()
                if progress and progress.business:
                    # Business exists in progress but not properly linked
                    logger.info(f"Found business in OnboardingProgress for user {request.user.email}")
                    return progress.business
            except Exception as progress_error:
                logger.warning(f"Error checking OnboardingProgress: {str(progress_error)}")
            
            # Check tenant for business name
            try:
                from custom_auth.models import Tenant
                tenant = Tenant.objects.filter(owner_id=str(request.user.id)).first()
                if tenant and tenant.name and not tenant.name.startswith('Tenant for'):
                    business_name = tenant.name
                    logger.info(f"Using tenant name as business name: {business_name}")
            except Exception as tenant_error:
                logger.warning(f"Error checking Tenant: {str(tenant_error)}")
            
            # Only create business as last resort with default name
            if not business_name:
                # Generate default business name from user info
                business_name = f"{request.user.email.split('@')[0]}'s Business"
                if request.user.first_name or request.user.last_name:
                    user_name = f"{request.user.first_name} {request.user.last_name}".strip()
                    business_name = f"{user_name}'s Business"
                logger.warning(f"Creating business with default name: {business_name}")
            
            logger.info(f"[get_business_sync] Creating new business for user {request.user.email} with name: {business_name}")
            logger.info(f"[get_business_sync] Business details - ID: {business_id}, owner_id: {owner_uuid}")
            
            try:
                with db_transaction.atomic():
                    business = Business.objects.create(
                        id=business_id,
                        name=business_name,
                        owner_id=owner_uuid,
                        is_active=True,
                        created_at=timezone.now()
                    )
                    logger.info(f"[get_business_sync] Successfully created business: {business.id}")
            except Exception as create_error:
                logger.error(f"[get_business_sync] Failed to create business: {str(create_error)}")
                logger.error(f"[get_business_sync] Error type: {type(create_error).__name__}")
                import traceback
                logger.error(f"[get_business_sync] Traceback: {traceback.format_exc()}")
                raise
                
                # Create or update UserProfile to link to business
                profile, created = UserProfile.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'business': business,
                        'business_id': business_id
                    }
                )
                if not created and not profile.business:
                    profile.business = business
                    profile.business_id = business_id
                    profile.save(update_fields=['business', 'business_id'])
                
                logger.info(f"Created business {business_id} with name '{business_name}' for user {request.user.email}")
                return business
            
        except Exception as e:
            logger.error(f"Error retrieving/creating business: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    @sync_to_async
    def get_business(self, request):
        """Retrieve or create business for the current user - async wrapper"""
        # Just call the sync version since this is wrapped with sync_to_async
        return self.get_business_sync(request)
    
    def update_onboarding_progress_sync(self, request, business, selected_plan, billing_cycle):
        """Update onboarding progress with transaction"""
        with db_transaction.atomic():
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
            
            return progress
    
    @sync_to_async
    def update_onboarding_progress(self, request, business, selected_plan, billing_cycle):
        """Update onboarding progress with transaction"""
        with db_transaction.atomic():
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
            
            return progress
    
    @sync_to_async
    def check_existing_tenant(self, user_id):
        """Check if tenant already exists for user"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM custom_auth_tenant
                WHERE owner_id = %s
                LIMIT 1
            """, [str(user_id)])
            
            tenant_record = cursor.fetchone()
            
            if tenant_record:
                return tenant_record[0]
            return None
    
    @sync_to_async
    def update_existing_tenant(self, tenant_id):
        """Update existing tenant record"""
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE custom_auth_tenant
                SET setup_status = 'active',
                    is_active = TRUE,
                    rls_enabled = TRUE,
                    rls_setup_date = %s
                WHERE id = %s
            """, [timezone.now(), tenant_id])
        return tenant_id
    
    @sync_to_async
    def create_new_tenant(self, tenant_id, business_name, user_id):
        """Create a new tenant record"""
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO custom_auth_tenant (
                    id, name, created_at, owner_id, setup_status, 
                    is_active, rls_enabled, rls_setup_date
                ) VALUES (
                    %s, %s, %s, %s, %s, 
                    TRUE, TRUE, %s
                )
            """, [
                tenant_id, business_name, timezone.now(), 
                str(user_id), 'active', timezone.now()
            ])
        return tenant_id
    
    def setup_rls_for_free_plan_sync(self, request, tenant_id):
        """Set up RLS policies for free plan users (synchronous version)"""
        try:
            # Initialize tenant context for RLS
            setup_tenant_context_in_db(tenant_id)
            set_tenant_in_db(tenant_id)
            logger.info(f"Set tenant context to {tenant_id} for RLS application")
            
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
                    with connection.cursor() as cursor:
                        # Enable RLS on the table
                        cursor.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;')
                        
                        # Create tenant isolation policy
                        cursor.execute(f"""
                            DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
                            CREATE POLICY tenant_isolation_policy ON {table_name}
                                USING (
                                    tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                                    AND current_setting('app.current_tenant_id', TRUE) != 'unset'
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
    
    async def setup_rls_for_free_plan(self, request, tenant_id):
        """Set up RLS policies for free plan users"""
        try:
            # Initialize tenant context for RLS - use the async version in async context
            await setup_tenant_context_in_db_async()
            await set_tenant_in_db_async(tenant_id)
            logger.info(f"Set tenant context to {tenant_id} for RLS application")
            
            @sync_to_async
            def get_tenant_tables():
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.columns 
                        WHERE column_name = 'tenant_id' 
                        AND table_schema = 'public'
                    """)
                    
                    return [row[0] for row in cursor.fetchall()]
            
            @sync_to_async
            def apply_rls_policies(table_name):
                try:
                    with connection.cursor() as cursor:
                        # Enable RLS on the table
                        cursor.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;')
                        
                        # Create tenant isolation policy
                        cursor.execute(f"""
                            DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
                            CREATE POLICY tenant_isolation_policy ON {table_name}
                                USING (
                                    tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                                    AND current_setting('app.current_tenant_id', TRUE) != 'unset'
                                );
                        """)
                    logger.info(f"Applied RLS policy to table: {table_name} for free plan user")
                    return True
                except Exception as table_error:
                    logger.error(f"Error applying RLS policy to {table_name}: {str(table_error)}")
                    return False
            
            @sync_to_async
            def update_progress_rls_completed(user):
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress:
                    progress.rls_setup_completed = True
                    progress.rls_setup_timestamp = timezone.now()
                    progress.save(update_fields=['rls_setup_completed', 'rls_setup_timestamp'])
                return True
            
            # Get list of tenant-aware tables
            tenant_tables = await get_tenant_tables()
            logger.info(f"Found {len(tenant_tables)} tenant-aware tables for RLS application")
            
            # Apply RLS policies to tenant tables
            for table_name in tenant_tables:
                await apply_rls_policies(table_name)
            
            # Update progress to mark RLS setup as completed
            await update_progress_rls_completed(request.user)
                
            return True
        except Exception as e:
            logger.error(f"Error setting up RLS for free plan: {str(e)}")
            return False
    
    @sync_to_async
    def create_success_response(self, data, status_code=status.HTTP_200_OK):
        """Create a DRF Response in a sync context"""
        return Response(data, status=status_code)
    
    @sync_to_async
    def create_error_response(self, error_data, status_code=status.HTTP_400_BAD_REQUEST):
        """Create an error Response in a sync context"""
        return Response(error_data, status=status_code)
    
    def post(self, request):
        """
        Handle subscription plan selection and create tenant with RLS.
        For free tier, immediately set up RLS.
        For paid tiers, prepare for payment and defer RLS setup.
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        logger.info(f"[SubscriptionSave] === START SUBSCRIPTION SAVE === Request ID: {request_id}")
        logger.info(f"[SubscriptionSave] User: {request.user.email}, ID: {request.user.id}")
        logger.info(f"[SubscriptionSave] User has tenant: {hasattr(request.user, 'tenant') and request.user.tenant}")
        logger.info(f"[SubscriptionSave] User tenant_id: {getattr(request.user, 'tenant_id', None)}")
        logger.info(f"[SubscriptionSave] User business_id: {getattr(request.user, 'business_id', None)}")
        logger.info(f"[SubscriptionSave] Request data: {request.data}")
        
        try:
            # Validate input data
            data = request.data.copy()
            valid, error_message = self.validate_subscription_data(data)
            if not valid:
                logger.error(f"[SubscriptionSave] Validation failed: {error_message}")
                return Response({
                    'error': error_message,
                    'code': 'validation_error'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            selected_plan = data['selected_plan']
            billing_cycle = data.get('billing_cycle', 'monthly')
            
            # Get user's business
            logger.info(f"[SubscriptionSave] Attempting to get business for user {request.user.email}")
            business = self.get_business_sync(request)
            if not business:
                logger.error(f"[SubscriptionSave] CRITICAL: Failed to get/create business for user {request.user.email}")
                logger.error(f"[SubscriptionSave] User details - ID: {request.user.id}, has UserProfile: {hasattr(request.user, 'userprofile')}")
                return Response({
                    'error': 'Failed to retrieve or create business',
                    'code': 'business_error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"[SubscriptionSave] Successfully got business: ID={business.id}, Name={business.name}")
            
            # Update onboarding progress
            progress = self.update_onboarding_progress_sync(request, business, selected_plan, billing_cycle)
            
            # CRITICAL: Update user's subscription_plan field AND reload to verify
            logger.info(f"🔍 [SubscriptionSave] Updating user.subscription_plan from '{request.user.subscription_plan}' to '{selected_plan}'")
            request.user.subscription_plan = selected_plan
            request.user.save(update_fields=['subscription_plan'])
            
            # Reload user from database to verify the save worked
            request.user.refresh_from_db()
            logger.info(f"🔍 [SubscriptionSave] User subscription_plan after refresh: {request.user.subscription_plan}")
            
            # Also update OnboardingProgress.subscription_plan for consistency
            if progress:
                progress.subscription_plan = selected_plan
                progress.save(update_fields=['subscription_plan'])
                logger.info(f"🔍 [SubscriptionSave] OnboardingProgress subscription_plan updated: {progress.subscription_plan}")
            
            # Update session with subscription information
            try:
                from session_manager.models import UserSession
                from django.utils import timezone as dj_timezone
                
                # Update all active sessions for the user
                active_sessions = UserSession.objects.filter(
                    user=request.user,
                    is_active=True,
                    expires_at__gt=dj_timezone.now()
                )
                
                sessions_updated = 0
                for session in active_sessions:
                    # Update session fields
                    session.subscription_plan = selected_plan
                    session.onboarding_step = 'subscription'
                    
                    # Store subscription details in session_data
                    if not session.session_data:
                        session.session_data = {}
                    session.session_data['selected_plan'] = selected_plan
                    session.session_data['billing_cycle'] = billing_cycle
                    session.session_data['subscription_selected_at'] = dj_timezone.now().isoformat()
                    
                    # If tenant_id is available from progress, update it
                    if progress and progress.tenant_id:
                        session.tenant_id = progress.tenant_id
                        
                    session.save(update_fields=['subscription_plan', 'onboarding_step', 'session_data', 'tenant_id', 'updated_at'])
                    sessions_updated += 1
                    
                logger.info(f"[SubscriptionSave] Updated {sessions_updated} active session(s) with subscription plan: {selected_plan}")
                
            except Exception as session_error:
                logger.warning(f"[SubscriptionSave] Session update error: {str(session_error)}")
                # Don't fail the request just because session update failed
            
            # Process based on plan type
            if selected_plan == 'free':
                # For free plan, create tenant and set up RLS immediately
                try:
                    # Check if tenant already exists for user
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT id FROM custom_auth_tenant
                            WHERE owner_id = %s
                            LIMIT 1
                        """, [str(request.user.id)])
                        
                        tenant_record = cursor.fetchone()
                        tenant_id = tenant_record[0] if tenant_record else None
                    
                    if tenant_id:
                        logger.info(f"Found existing tenant {tenant_id} for free plan user {request.user.id}")
                        # Update tenant record to reflect free plan
                        with connection.cursor() as cursor:
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
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                INSERT INTO custom_auth_tenant (
                                    id, name, created_at, owner_id, setup_status, 
                                    is_active, rls_enabled, rls_setup_date
                                ) VALUES (
                                    %s, %s, %s, %s, %s, 
                                    TRUE, TRUE, %s
                                )
                            """, [
                                tenant_id, business.name, timezone.now(), 
                                str(request.user.id), 'active', timezone.now()
                            ])
                    
                    # CRITICAL FIX: Assign tenant to user model
                    logger.info(f"[SubscriptionSave] Assigning tenant {tenant_id} to user {request.user.email}")
                    try:
                        from custom_auth.models import Tenant
                        tenant_obj = Tenant.objects.get(id=tenant_id)
                        request.user.tenant = tenant_obj
                        request.user.business_id = business.id
                        request.user.save(update_fields=['tenant', 'business_id'])
                        logger.info(f"[SubscriptionSave] Successfully assigned tenant to user")
                    except Exception as tenant_assign_error:
                        logger.error(f"[SubscriptionSave] Error assigning tenant to user: {str(tenant_assign_error)}")
                    
                    # Setup RLS for the tenant
                    rls_setup = self.setup_rls_for_free_plan_sync(request, tenant_id)
                    
                    if not rls_setup:
                        logger.warning(f"RLS setup not completed for free plan user {request.user.id}")
                    
                    # Update session with tenant ID for free plan
                    try:
                        from session_manager.models import UserSession
                        from django.utils import timezone as dj_timezone
                        
                        # Update all active sessions with tenant ID
                        active_sessions = UserSession.objects.filter(
                            user=request.user,
                            is_active=True,
                            expires_at__gt=dj_timezone.now()
                        )
                        
                        for session in active_sessions:
                            session.tenant_id = tenant_id
                            session.onboarding_step = 'complete' if selected_plan == 'free' else 'payment'
                            session.save(update_fields=['tenant_id', 'onboarding_step', 'updated_at'])
                            
                        logger.info(f"[SubscriptionSave] Updated sessions with tenant_id: {tenant_id} for free plan")
                        
                    except Exception as session_error:
                        logger.warning(f"[SubscriptionSave] Free plan session update error: {str(session_error)}")
                    
                    # Return successful response with redirection
                    return Response({
                        'status': 'success',
                        'plan': selected_plan,
                        'message': 'Free plan activated',
                        'redirect': '/onboarding/complete',
                        'tenant_id': tenant_id,
                        'tenantId': tenant_id,  # Also include camelCase version
                        'business_id': str(business.id)
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    logger.error(f"Error processing free plan: {str(e)}\n{traceback.format_exc()}")
                    return Response({
                        'error': 'Failed to set up free plan',
                        'code': 'setup_error',
                        'message': str(e)
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # For paid plans, redirect to payment
                return Response({
                    'status': 'success',
                    'plan': selected_plan,
                    'billing_cycle': billing_cycle,
                    'redirect': '/onboarding/payment',
                    'message': f'{selected_plan.title()} plan selected'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error processing subscription: {str(e)}\n{traceback.format_exc()}")
            return Response({
                'error': 'Failed to process subscription selection',
                'message': str(e),
                'code': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 