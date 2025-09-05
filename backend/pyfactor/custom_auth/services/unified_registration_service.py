"""
Unified Registration Service
Standardizes user creation and tenant management across all registration methods
"""

import logging
from typing import Optional, Dict, Any, Tuple
from django.db import transaction
from django.utils import timezone
from custom_auth.models import User, Tenant
from users.models import UserProfile, Business

logger = logging.getLogger(__name__)

class UnifiedRegistrationService:
    """
    Centralized service for user registration to ensure consistency
    across OAuth, email/password, and phone registration methods.
    
    Key principles:
    1. Users are created WITHOUT tenants initially (they're consumers)
    2. Tenants are ONLY created when users create a business
    3. has_business is determined by Business ownership, not tenant existence
    """
    
    @staticmethod
    @transaction.atomic
    def create_user(
        email: str,
        password: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone_number: Optional[str] = None,
        auth_provider: str = 'email',
        auth0_id: Optional[str] = None,
        **kwargs
    ) -> Tuple[User, bool]:
        """
        Create a new user with consistent initialization.
        
        Args:
            email: User's email address
            password: Password (for email/password auth)
            first_name: User's first name
            last_name: User's last name
            phone_number: User's phone number
            auth_provider: 'email', 'google', 'phone', etc.
            auth0_id: Auth0 user ID if applicable
            **kwargs: Additional user fields
            
        Returns:
            Tuple of (user, created) where created is True if new user
        """
        
        # Check if user exists
        user = User.objects.filter(email=email).first()
        if user:
            logger.info(f"User {email} already exists")
            return user, False
        
        # Create new user WITHOUT tenant (they're a consumer initially)
        user = User.objects.create_user(
            email=email,
            username=email,  # Use email as username
            password=password,
            first_name=first_name or '',
            last_name=last_name or '',
        )
        
        # Set additional fields
        if phone_number:
            user.phone_number = phone_number
        if auth0_id:
            user.auth0_id = auth0_id
        
        # Set default role as USER (not OWNER until they create a business)
        user.role = 'USER'
        
        # DO NOT create tenant here - users start as consumers
        user.tenant = None
        
        # Set auth provider metadata
        user.auth_provider = auth_provider
        user.date_joined = timezone.now()
        user.is_active = True
        
        user.save()
        
        # Create UserProfile
        UserProfile.objects.create(
            user=user,
            onboarding_completed=False,  # Not completed until business created
            subscription_plan='free',
            country=kwargs.get('country', 'US')
        )
        
        logger.info(f"Created new user: {email} via {auth_provider}")
        return user, True
    
    @staticmethod
    @transaction.atomic
    def create_business_for_user(
        user: User,
        business_name: str,
        business_type: Optional[str] = None,
        country: str = 'US',
        **kwargs
    ) -> Business:
        """
        Create a business for a user and handle all related setup.
        This is when a consumer becomes a business owner.
        
        Args:
            user: The user creating the business
            business_name: Name of the business
            business_type: Type of business
            country: Country code
            **kwargs: Additional business fields
            
        Returns:
            The created Business object
        """
        
        # Check if user already has a business
        existing_business = Business.objects.filter(owner_id=user.id).first()
        if existing_business:
            logger.warning(f"User {user.email} already has business: {existing_business.name}")
            return existing_business
        
        # Create the business
        business = Business.objects.create(
            name=business_name,
            owner_id=user.id,  # This will need migration to fix type
            business_type=business_type,
            country=country,
            entity_type=kwargs.get('entity_type', 'INDIVIDUAL'),
            registration_status=kwargs.get('registration_status', 'INFORMAL'),
            **{k: v for k, v in kwargs.items() if k not in ['entity_type', 'registration_status']}
        )
        
        # NOW create tenant for the business owner
        tenant, created = Tenant.objects.get_or_create(
            id=user.id,  # Use user ID as tenant ID for consistency
            defaults={
                'name': business_name,
                'owner_id': str(user.id),
                'setup_status': 'active',
                'is_active': True,
                'rls_enabled': True
            }
        )
        
        if created:
            logger.info(f"Created tenant {tenant.id} for business {business_name}")
        
        # Link user to tenant and update role
        user.tenant = tenant
        user.role = 'OWNER'  # Now they're a business owner
        user.business_id = str(business.id)
        user.save()
        
        # Update UserProfile
        profile = UserProfile.objects.filter(user=user).first()
        if profile:
            profile.business_id = str(business.id)
            profile.tenant_id = str(tenant.id)
            profile.onboarding_completed = True
            profile.save()
        
        logger.info(f"User {user.email} is now business owner of {business_name}")
        return business
    
    @staticmethod
    def user_has_business(user: User) -> bool:
        """
        Check if a user has a business.
        This is the SINGLE SOURCE OF TRUTH for has_business checks.
        
        Args:
            user: The user to check
            
        Returns:
            True if user owns a business, False otherwise
        """
        return Business.objects.filter(owner_id=user.id).exists()
    
    @staticmethod
    @transaction.atomic
    def complete_onboarding(user: User) -> bool:
        """
        Complete onboarding for a user.
        Simplified version that ensures consistency.
        
        Args:
            user: The user completing onboarding
            
        Returns:
            True if successful
        """
        
        # Check if user has a business
        business = Business.objects.filter(owner_id=user.id).first()
        if not business:
            logger.error(f"Cannot complete onboarding for {user.email} - no business found")
            return False
        
        # Ensure user has tenant
        if not user.tenant:
            tenant, created = Tenant.objects.get_or_create(
                id=user.id,
                defaults={
                    'name': business.name,
                    'owner_id': str(user.id),
                    'setup_status': 'active',
                    'is_active': True,
                    'rls_enabled': True
                }
            )
            user.tenant = tenant
            user.save()
        
        # Update profile
        profile = UserProfile.objects.filter(user=user).first()
        if profile:
            profile.onboarding_completed = True
            profile.business_id = str(business.id)
            profile.tenant_id = str(user.tenant.id)
            profile.save()
        
        logger.info(f"Completed onboarding for {user.email}")
        return True