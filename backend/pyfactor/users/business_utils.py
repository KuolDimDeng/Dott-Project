"""
Business utility functions that work with RLS multi-tenant architecture.
These provide a single source of truth for business access patterns.
"""

import logging
from typing import Optional
from django.db import transaction
from django.core.cache import cache

logger = logging.getLogger(__name__)


def get_user_business(user, use_cache=True) -> Optional['Business']:
    """
    Get user's primary business (RLS-aware).
    
    This is the SINGLE SOURCE OF TRUTH for getting a user's business.
    It handles all the complexity of our multi-tenant architecture.
    
    Args:
        user: User object
        use_cache: Whether to use cache for performance
    
    Returns:
        Business object or None
    """
    if not user or not user.is_authenticated:
        logger.debug(f"get_user_business: User not authenticated")
        return None
    
    # Check cache first
    cache_key = f"user_business_{user.id}"
    if use_cache:
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f"get_user_business: Cache hit for user {user.email}")
            return cached
    
    from users.models import Business
    business = None
    
    # Method 1: User.business_id (most common in your system)
    if hasattr(user, 'business_id') and user.business_id:
        try:
            business = Business.objects.get(
                id=user.business_id,
                is_active=True
            )
            logger.debug(f"get_user_business: Found via business_id for {user.email}")
        except Business.DoesNotExist:
            logger.warning(f"get_user_business: business_id {user.business_id} not found for {user.email}")
    
    # Method 2: User.tenant_id (tenant = business in our system)
    if not business and hasattr(user, 'tenant_id') and user.tenant_id:
        try:
            business = Business.objects.get(
                id=user.tenant_id,
                is_active=True
            )
            logger.debug(f"get_user_business: Found via tenant_id for {user.email}")
        except Business.DoesNotExist:
            logger.warning(f"get_user_business: tenant_id {user.tenant_id} not found for {user.email}")
    
    # Method 3: Owner relationship (skip due to type mismatch - owner_id is UUID, user.id is int)
    # This method won't work until we fix the schema mismatch
    
    # Method 4: Through UserProfile (legacy)
    if not business:
        try:
            profile = user.profile
            if profile and profile.business_id:
                business = Business.objects.select_related('owner').get(
                    id=profile.business_id,
                    is_active=True
                )
                logger.debug(f"get_user_business: Found via UserProfile for {user.email}")
        except Exception as e:
            logger.debug(f"get_user_business: UserProfile lookup failed: {e}")
    
    # Method 5: Through BusinessMember (for non-owners)
    if not business:
        try:
            from users.models import BusinessMember
            membership = BusinessMember.objects.filter(
                user=user,
                is_active=True
            ).select_related('business', 'business__owner').first()
            
            if membership:
                business = membership.business
                logger.debug(f"get_user_business: Found via membership for {user.email}")
        except Exception as e:
            logger.debug(f"get_user_business: Membership lookup failed: {e}")
    
    # Cache the result
    if business and use_cache:
        cache.set(cache_key, business, 300)  # Cache for 5 minutes
    
    if not business:
        logger.info(f"get_user_business: No business found for user {user.email}")
    
    return business


def get_business_for_request(request) -> Optional['Business']:
    """
    Get business from request context (RLS-aware).
    
    Args:
        request: Django request object
    
    Returns:
        Business object or None
    """
    # Check if business is already attached to request
    if hasattr(request, 'business'):
        return request.business
    
    # Get from user
    if hasattr(request, 'user') and request.user.is_authenticated:
        business = get_user_business(request.user)
        # Cache on request for this request lifecycle
        request.business = business
        return business
    
    # Check for tenant context (set by middleware)
    if hasattr(request, 'tenant_id'):
        from users.models import Business
        try:
            business = Business.objects.get(
                id=request.tenant_id,
                is_active=True
            )
            request.business = business
            return business
        except Business.DoesNotExist:
            logger.warning(f"get_business_for_request: tenant_id {request.tenant_id} not found")
    
    return None


def ensure_business_tenant_sync(business) -> 'Tenant':
    """
    Ensure business and tenant are synchronized for RLS.
    In our system: business.id MUST equal tenant.id
    
    Args:
        business: Business object
    
    Returns:
        Tenant object
    """
    from custom_auth.models import Tenant
    
    with transaction.atomic():
        # Get or create tenant with same ID as business
        tenant, created = Tenant.objects.get_or_create(
            id=business.id,
            defaults={
                'name': business.name,
                'owner_id': str(business.owner_id) if business.owner_id else None,
                'rls_enabled': True,
                'is_active': business.is_active
            }
        )
        
        # Update tenant if business info changed
        if not created:
            updated = False
            if tenant.name != business.name:
                tenant.name = business.name
                updated = True
            if business.owner_id and tenant.owner_id != str(business.owner_id):
                tenant.owner_id = str(business.owner_id)
                updated = True
            if tenant.is_active != business.is_active:
                tenant.is_active = business.is_active
                updated = True
            
            if updated:
                tenant.save()
                logger.info(f"Updated tenant {tenant.id} to match business {business.name}")
        else:
            logger.info(f"Created tenant {tenant.id} for business {business.name}")
    
    # Also ensure business.tenant_id is set
    if business.tenant_id != business.id:
        business.tenant_id = business.id
        business.save(update_fields=['tenant_id'])
    
    return tenant


def create_business_for_user(user, business_name, business_type=None, country='US'):
    """
    Create a new business for a user (with RLS setup).
    
    Args:
        user: User object (will be the owner)
        business_name: Name of the business
        business_type: Type of business (optional)
        country: Country code (default 'US')
    
    Returns:
        Business object
    """
    from users.models import Business, BusinessMember
    from custom_auth.models import Tenant
    
    with transaction.atomic():
        # Create business
        business = Business.objects.create(
            name=business_name,
            owner=user,
            business_type=business_type,
            country=country,
            is_active=True
        )
        
        # Set tenant_id = business.id for RLS
        business.tenant_id = business.id
        business.save(update_fields=['tenant_id'])
        
        # Create tenant with same ID
        tenant = Tenant.objects.create(
            id=business.id,
            name=business_name,
            owner_id=str(user.id),
            rls_enabled=True,
            is_active=True
        )
        
        # Create owner membership
        BusinessMember.objects.create(
            business=business,
            user=user,
            role='owner',
            is_active=True,
            can_edit_business=True,
            can_manage_users=True,
            can_view_reports=True,
            tenant_id=business.id  # Set tenant_id for RLS
        )
        
        # Update user's business_id
        user.business_id = business.id
        user.tenant = tenant
        user.save(update_fields=['business_id', 'tenant'])
        
        # Clear cache
        cache_key = f"user_business_{user.id}"
        cache.delete(cache_key)
        
        logger.info(f"Created business {business.name} (ID: {business.id}) for user {user.email}")
        
    return business


def get_business_display_name(business) -> str:
    """
    Get formatted business display name.
    
    Args:
        business: Business object
    
    Returns:
        Formatted display name
    """
    if not business:
        return "No Business"
    
    name = business.name
    
    # Add legal structure if applicable
    if hasattr(business, 'legal_structure') and business.legal_structure:
        structure_map = {
            'LLC': 'LLC',
            'CORPORATION': 'Corp.',
            'PARTNERSHIP': 'Partnership',
            'SOLE_PROPRIETORSHIP': '',
            'NON_PROFIT': 'Non-Profit',
        }
        suffix = structure_map.get(business.legal_structure, '')
        if suffix:
            name = f"{name} {suffix}"
    
    return name


def get_business_currency(business) -> dict:
    """
    Get business currency information.
    
    Args:
        business: Business object
    
    Returns:
        Dictionary with currency info
    """
    if not business:
        return {
            'code': 'USD',
            'symbol': '$',
            'name': 'US Dollar'
        }
    
    return {
        'code': business.preferred_currency_code or 'USD',
        'symbol': business.preferred_currency_symbol or '$',
        'name': business.preferred_currency_name or 'US Dollar'
    }


def invalidate_business_cache(user_or_business):
    """
    Invalidate cached business data.
    
    Args:
        user_or_business: User or Business object
    """
    from users.models import Business
    from custom_auth.models import User
    
    if isinstance(user_or_business, User):
        cache_key = f"user_business_{user_or_business.id}"
        cache.delete(cache_key)
    elif isinstance(user_or_business, Business):
        # Clear cache for all users in this business
        for member in user_or_business.members.all():
            cache_key = f"user_business_{member.user_id}"
            cache.delete(cache_key)