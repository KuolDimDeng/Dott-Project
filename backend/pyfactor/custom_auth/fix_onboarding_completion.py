"""
Fix for onboarding completion when no progress record exists.
This handles cases where users (especially OAuth users) don't have an onboarding progress record.
"""

from django.db import models
from django.utils import timezone
import uuid


def ensure_onboarding_progress(user, onboarding_data):
    """
    Ensure that an onboarding progress record exists for the user.
    If not, create one with the provided data.
    
    Args:
        user: The User instance
        onboarding_data: Dictionary containing onboarding data
        
    Returns:
        OnboardingProgress instance
    """
    from .models import OnboardingProgress, Tenant
    
    # Try to get existing progress
    progress = OnboardingProgress.objects.filter(user=user).first()
    
    if not progress:
        # Create new progress record
        progress = OnboardingProgress.objects.create(
            user=user,
            current_step='business_info',
            business_name=onboarding_data.get('business_name', ''),
            business_type=onboarding_data.get('business_type', ''),
            business_country=onboarding_data.get('business_country', 'United States'),
            business_state=onboarding_data.get('business_state', ''),
            legal_structure=onboarding_data.get('legal_structure', ''),
            subscription_plan=onboarding_data.get('selected_plan', 'free'),
            billing_cycle=onboarding_data.get('billing_cycle', 'monthly'),
            role=onboarding_data.get('role', 'owner'),
            completed=False,
            started_at=timezone.now()
        )
    
    # Update with latest data
    progress.business_name = onboarding_data.get('business_name', progress.business_name)
    progress.business_type = onboarding_data.get('business_type', progress.business_type)
    progress.business_country = onboarding_data.get('business_country', progress.business_country)
    progress.business_state = onboarding_data.get('business_state', progress.business_state)
    progress.legal_structure = onboarding_data.get('legal_structure', progress.legal_structure)
    progress.subscription_plan = onboarding_data.get('selected_plan', progress.subscription_plan)
    progress.billing_cycle = onboarding_data.get('billing_cycle', progress.billing_cycle)
    progress.role = onboarding_data.get('role', progress.role)
    
    return progress


def complete_onboarding_with_tenant_creation(user, onboarding_data):
    """
    Complete onboarding and ensure tenant is created.
    
    Args:
        user: The User instance
        onboarding_data: Dictionary containing onboarding data
        
    Returns:
        tuple: (success: bool, tenant_id: str, message: str)
    """
    from .models import Tenant, OnboardingProgress
    
    try:
        # Ensure onboarding progress exists
        progress = ensure_onboarding_progress(user, onboarding_data)
        
        # Check if user already has a tenant
        if user.tenant:
            tenant = user.tenant
        else:
            # Create new tenant
            tenant_name = onboarding_data.get('business_name', f"{user.first_name}'s Business")
            tenant = Tenant.objects.create(
                name=tenant_name,
                owner_id=user.auth0_sub or str(user.id),
                schema_name=f"tenant_{uuid.uuid4().hex[:8]}",  # Temporary, will be removed
                setup_status='complete',
                rls_enabled=True
            )
            
            # Assign tenant to user
            user.tenant = tenant
            user.save()
        
        # Complete the onboarding progress
        progress.completed = True
        progress.completed_at = timezone.now()
        progress.tenant_id = str(tenant.id)
        progress.save()
        
        return True, str(tenant.id), "Onboarding completed successfully"
        
    except Exception as e:
        return False, None, f"Error completing onboarding: {str(e)}"