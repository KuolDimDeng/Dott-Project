"""
Simplified onboarding completion endpoint that ensures data consistency
Created to fix redirect loop issue
"""

from django.utils import timezone
from custom_auth.rls import set_tenant_context, clear_tenant_context
from django.db import transaction as db_transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from custom_auth.api.authentication import Auth0JWTAuthentication
from onboarding.models import OnboardingProgress
from user_sessions.models import UserSession
import logging
import uuid

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_all_onboarding(request):
    """
    Complete all onboarding steps and ensure User.onboarding_completed is True.
    This endpoint fixes the redirect loop issue by properly updating all models.
    """
    try:
        user = request.user
        
        with db_transaction.atomic():
            # 1. Ensure user has a tenant - if not, try to get or create one
            if not user.tenant:
                logger.warning(f"[Complete-All] User {user.email} has no tenant, attempting to create one")
                
                # Try to find existing tenant for this user
                from custom_auth.models import Tenant
                existing_tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
                
                if existing_tenant:
                    logger.info(f"[Complete-All] Found existing tenant {existing_tenant.id} for user {user.email}")
                    user.tenant = existing_tenant
                    user.save(update_fields=['tenant'])
                    tenant_id = existing_tenant.id
                else:
                    # Create a new tenant for the user
                    import uuid
                    from users.models import Business, UserProfile
                    
                    # First ensure business exists
                    profile = UserProfile.objects.filter(user=user).first()
                    business = None
                    
                    if profile and profile.business:
                        business = profile.business
                    else:
                        # Try to find business by owner_id
                        owner_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{user.id}'))
                        business = Business.objects.filter(owner_id=owner_uuid).first()
                        
                        if not business:
                            # Create a minimal business
                            business_id = uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{user.id}')
                            business_name = f"{user.email.split('@')[0]}'s Business"
                            if user.first_name or user.last_name:
                                user_name = f"{user.first_name} {user.last_name}".strip()
                                business_name = f"{user_name}'s Business"
                            
                            logger.info(f"[Complete-All] Creating business for user {user.email}")
                            business = Business.objects.create(
                                id=business_id,
                                name=business_name,
                                owner_id=owner_uuid,
                                is_active=True,
                                created_at=timezone.now()
                            )
                            
                            # Link to profile
                            if not profile:
                                profile = UserProfile.objects.create(
                                    user=user,
                                    business=business,
                                    business_id=business_id
                                )
                            else:
                                profile.business = business
                                profile.business_id = business_id
                                profile.save(update_fields=['business', 'business_id'])
                    
                    # Now create the tenant
                    tenant_id = str(uuid.uuid4())
                    logger.info(f"[Complete-All] Creating tenant {tenant_id} for user {user.email}")
                    
                    new_tenant = Tenant.objects.create(
                        id=tenant_id,
                        name=business.name if business else f"{user.email.split('@')[0]}'s Organization",
                        owner_id=str(user.id),
                        setup_status='active',
                        is_active=True,
                        rls_enabled=True,
                        rls_setup_date=timezone.now(),
                        created_at=timezone.now()
                    )
                    
                    user.tenant = new_tenant
                    user.save(update_fields=['tenant'])
                    
                    # Update profile with tenant_id
                    if profile:
                        profile.tenant_id = tenant_id
                        profile.save(update_fields=['tenant_id'])
                    
                    logger.info(f"[Complete-All] Successfully created and assigned tenant {tenant_id} to user {user.email}")
            else:
                tenant_id = user.tenant.id
            
            # 2. Update or create OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant_id,
                    'onboarding_status': 'complete',
                    'current_step': 'complete',
                    'setup_completed': True,
                    'payment_completed': True,
                    'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete']
                }
            )
            
            if not created:
                # Update existing progress
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.setup_completed = True
                progress.payment_completed = True
                progress.tenant_id = tenant_id
                
                # Ensure all steps are marked complete
                all_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                progress.completed_steps = list(set(progress.completed_steps + all_steps))
                progress.save()
            
            # 3. Initialize Chart of Accounts for the new tenant
            try:
                from finance.chart_of_accounts_init import initialize_chart_of_accounts
                from users.models import Business
                
                business = Business.objects.filter(tenant_id=tenant_id).first()
                logger.info(f"[Complete-All] Initializing Chart of Accounts for tenant {tenant_id}")
                
                coa_result = initialize_chart_of_accounts(tenant_id, business)
                if coa_result['success']:
                    if coa_result.get('existing'):
                        logger.info(f"[Complete-All] Chart of Accounts already exists with {coa_result['existing']} accounts")
                    else:
                        logger.info(f"[Complete-All] Successfully initialized {coa_result.get('created', 0)} Chart of Accounts")
                else:
                    logger.warning(f"[Complete-All] Chart of Accounts initialization failed: {coa_result.get('error')}")
            except Exception as coa_error:
                logger.error(f"[Complete-All] Error initializing Chart of Accounts: {str(coa_error)}")
                # Don't fail onboarding if COA init fails - it can be done later
            
            # 4. CRITICAL: Update User.onboarding_completed (single source of truth)
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            
            # Set business_id from UserProfile (required for HR module)
            try:
                from users.models import UserProfile
                profile = UserProfile.objects.select_related('business').get(user=user)
                if profile.business:
                    user.business_id = profile.business.id
                    logger.info(f"[Complete-All] Setting user.business_id from UserProfile: {user.business_id}")
                else:
                    logger.warning(f"[Complete-All] UserProfile has no business for user {user.email}")
            except UserProfile.DoesNotExist:
                logger.error(f"[Complete-All] UserProfile not found for user {user.email}")
            except Exception as e:
                logger.error(f"[Complete-All] Error getting business_id from UserProfile: {str(e)}")
            
            # Log all incoming request data for debugging
            logger.info(f"[Complete-All] Incoming request data: {request.data}")
            logger.info(f"[Complete-All] User email: {user.email}")
            logger.info(f"[Complete-All] Current user data - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
            
            # Extract subscription plan from request data
            subscription_plan = request.data.get('subscriptionPlan') or request.data.get('selectedPlan') or 'free'
            if subscription_plan == 'basic':
                subscription_plan = 'free'  # Normalize 'basic' to 'free'
            
            # Extract billing cycle from request data
            billing_cycle = request.data.get('billingCycle') or request.data.get('billing_cycle') or 'monthly'
            
            # Extract currency from request data
            currency = request.data.get('currency') or request.data.get('preferredCurrency') or 'USD'
            
            logger.info(f"[Complete-All] Extracted subscription plan: {subscription_plan}, billing cycle: {billing_cycle}, currency: {currency}")
            
            # Update subscription plan on User model
            if subscription_plan in ['free', 'professional', 'enterprise']:
                user.subscription_plan = subscription_plan
                logger.info(f"[Complete-All] Setting user subscription plan to: {subscription_plan}")
            else:
                logger.warning(f"[Complete-All] Invalid subscription plan: {subscription_plan}")
            
            # Extract user name from request data (for Auth0 users who might not have it set)
            first_name = request.data.get('given_name', '').strip() or request.data.get('first_name', '').strip()
            last_name = request.data.get('family_name', '').strip() or request.data.get('last_name', '').strip()
            
            logger.info(f"[Complete-All] Extracted names from request - first_name: '{first_name}', last_name: '{last_name}'")
            
            # If names are not provided in request, try to extract from user's name field
            if (not first_name or not last_name) and hasattr(user, 'name') and user.name:
                name_parts = user.name.strip().split(' ', 1)
                if not first_name and len(name_parts) >= 1:
                    first_name = name_parts[0]
                    logger.info(f"[Complete-All] Extracted first_name from user.name: '{first_name}'")
                if not last_name and len(name_parts) >= 2:
                    last_name = name_parts[1]
                    logger.info(f"[Complete-All] Extracted last_name from user.name: '{last_name}'")
            
            # If STILL no names, check if user already has data and keep it
            if not first_name and user.first_name:
                first_name = user.first_name
                logger.info(f"[Complete-All] Keeping existing first_name: '{first_name}'")
            if not last_name and user.last_name:
                last_name = user.last_name
                logger.info(f"[Complete-All] Keeping existing last_name: '{last_name}'")
            
            # Final fallback for first name - use email prefix
            if not first_name:
                email_prefix = user.email.split('@')[0]
                first_name = email_prefix.capitalize()
                logger.info(f"[Complete-All] Using email prefix as first_name: '{first_name}'")
            
            # Always update name fields to ensure they're set (even if empty strings become actual names)
            needs_name_update = False
            if first_name and (not user.first_name or user.first_name != first_name):
                user.first_name = first_name
                needs_name_update = True
                logger.info(f"[Complete-All] Setting user.first_name to: '{first_name}'")
            if last_name and (not user.last_name or user.last_name != last_name):
                user.last_name = last_name
                needs_name_update = True
                logger.info(f"[Complete-All] Setting user.last_name to: '{last_name}'")
            
            if needs_name_update:
                logger.info(f"[Complete-All] Name fields will be updated during save")
            
            # Extract and set timezone from request data
            timezone_value = request.data.get('timezone')
            if timezone_value:
                # Validate timezone
                try:
                    import pytz
                    pytz.timezone(timezone_value)
                    user.timezone = timezone_value
                    logger.info(f"[Complete-All] Setting user timezone to: {timezone_value}")
                except:
                    logger.warning(f"[Complete-All] Invalid timezone: {timezone_value}, keeping default")
            elif not user.timezone:
                # Set default timezone if none provided
                user.timezone = 'UTC'
                logger.info(f"[Complete-All] Setting default timezone: UTC")
            
            # Save all user updates
            update_fields = ['onboarding_completed', 'onboarding_completed_at', 'subscription_plan', 'timezone', 'business_id']
            if first_name:
                update_fields.append('first_name')
            if last_name:
                update_fields.append('last_name')
                
            logger.info(f"[Complete-All] Saving user with update_fields: {update_fields}")
            user.save(update_fields=update_fields)
            
            # Log user data after save
            logger.info(f"[Complete-All] After save - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
            
            # 3.5. Save currency preference to BusinessSettings and BusinessDetails
            try:
                from users.models import BusinessSettings, BusinessDetails
                
                # Save to BusinessSettings for the tenant
                if tenant_id:
                    business_settings, created = BusinessSettings.objects.get_or_create(
                        tenant_id=tenant_id,
                        defaults={
                            'preferred_currency_code': currency,
                            'business': profile.business if 'profile' in locals() and profile.business else None
                        }
                    )
                    if not created and business_settings.preferred_currency_code != currency:
                        business_settings.preferred_currency_code = currency
                        business_settings.save()
                        logger.info(f"[Complete-All] Updated currency preference to {currency} for tenant {tenant_id}")
                    else:
                        logger.info(f"[Complete-All] {'Created' if created else 'Kept'} currency preference as {currency} for tenant {tenant_id}")
                
                # Also save to BusinessDetails if business exists
                if 'profile' in locals() and profile and profile.business:
                    business_details, created = BusinessDetails.objects.get_or_create(
                        business=profile.business,
                        defaults={
                            'preferred_currency_code': currency,
                            'country': profile.business.country if hasattr(profile.business, 'country') else 'US'
                        }
                    )
                    if not created and business_details.preferred_currency_code != currency:
                        business_details.preferred_currency_code = currency
                        business_details.save()
                        logger.info(f"[Complete-All] Updated BusinessDetails currency to {currency}")
            except Exception as e:
                logger.error(f"[Complete-All] Error saving currency preference: {str(e)}")
                # Don't fail the whole operation if currency save fails
            
            # 3.6. Create or update Subscription record for the business
            try:
                from users.models import UserProfile, Subscription
                profile = UserProfile.objects.select_related('business').get(user=user)
                if profile.business:
                    subscription, created = Subscription.objects.get_or_create(
                        business=profile.business,
                        defaults={
                            'selected_plan': subscription_plan,
                            'billing_cycle': billing_cycle,
                            'is_active': True,
                            'status': 'active'
                        }
                    )
                    if not created:
                        # Update existing subscription
                        subscription.selected_plan = subscription_plan
                        subscription.billing_cycle = billing_cycle
                        subscription.save()
                    logger.info(f"[Complete-All] {'Created' if created else 'Updated'} subscription for business {profile.business.name}: {subscription_plan} ({billing_cycle})")
                else:
                    logger.warning(f"[Complete-All] No business found for user {user.email}, skipping subscription creation")
            except Exception as e:
                logger.error(f"[Complete-All] Error creating/updating subscription: {str(e)}")
                # Don't fail the whole operation if subscription creation fails
            
            # 4. Update user session
            try:
                # Get all active sessions for the user
                sessions = UserSession.objects.filter(user=user, is_active=True)
                for session in sessions:
                    session.needs_onboarding = False
                    session.onboarding_completed = True
                    session.tenant = user.tenant  # Set the tenant foreign key relationship
                    session.subscription_plan = user.subscription_plan  # Update subscription plan in session
                    session.save()
                logger.info(f"Updated {sessions.count()} active sessions for user {user.email} with subscription plan: {user.subscription_plan}")
            except Exception as e:
                logger.warning(f"Error updating sessions: {e}")
                # Don't fail the whole operation if session update fails
            
            logger.info(f"Successfully completed onboarding for user {user.email} with tenant {tenant_id}")
            
            return Response({
                'success': True,
                'message': 'Onboarding completed successfully',
                'tenant_id': str(tenant_id),
                'onboarding_completed': True,
                'needs_onboarding': False,
                'redirect_url': f'/{tenant_id}/dashboard'
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        return Response({
            'error': 'Failed to complete onboarding',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ensure_complete_onboarding(request):
    """
    Ensure onboarding is complete - wrapper around complete_all_onboarding
    This endpoint is called by the frontend as a backup to make sure onboarding is saved
    """
    logger.info(f"[Ensure-Complete] Called by user {request.user.email}")
    
    # Simply forward to complete_all_onboarding with the same request
    return complete_all_onboarding(request)
