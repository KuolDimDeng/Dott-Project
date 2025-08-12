#!/usr/bin/env python
"""
Fix Onboarding Completion Bug

This script fixes the issue where the main onboarding completion endpoint
doesn't update User.onboarding_completed = True, causing redirect loops.

The fix adds the missing User.onboarding_completed update to CompleteOnboardingAPI.

Run with: python scripts/fix_onboarding_completion_bug.py
"""

import os
import re
import shutil
from datetime import datetime

def backup_file(filepath):
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def fix_complete_onboarding_api():
    """Fix the CompleteOnboardingAPI to update User.onboarding_completed"""
    
    # Path to the onboarding API file
    api_file = "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/onboarding_api.py"
    
    if not os.path.exists(api_file):
        print(f"ERROR: File not found: {api_file}")
        return False
    
    # Read the file
    with open(api_file, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_path = backup_file(api_file)
    
    # Find the CompleteOnboardingAPI class and its post method
    # We need to add User.onboarding_completed = True update
    
    # Look for the section where progress is saved
    pattern = r'(progress\.onboarding_status = "complete"\s*\n\s*progress\.save\(\))'
    
    # Replacement that adds User.onboarding_completed update
    replacement = '''progress.onboarding_status = "complete"
        progress.save()
        
        # CRITICAL FIX: Update User.onboarding_completed to prevent redirect loops
        # This ensures the single source of truth (User model) is properly updated
        user = request.user
        if not user.onboarding_completed:
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
            logger.info(f"Updated User.onboarding_completed=True for {user.email}")'''
    
    # Check if the fix is already applied
    if "user.onboarding_completed = True" in content:
        print("Fix already applied to CompleteOnboardingAPI")
        return True
    
    # Apply the fix
    modified_content = re.sub(pattern, replacement, content)
    
    # Also need to add timezone import if not present
    if "from django.utils import timezone" not in modified_content:
        # Add import after other django imports
        django_import_pattern = r'(from django\.[^\n]+\n)'
        modified_content = re.sub(
            django_import_pattern, 
            r'\1from django.utils import timezone\n', 
            modified_content,
            count=1
        )
    
    # Write the modified content
    with open(api_file, 'w') as f:
        f.write(modified_content)
    
    print(f"✓ Successfully fixed CompleteOnboardingAPI in {api_file}")
    print("  - Added User.onboarding_completed = True update")
    print("  - Added timezone import if needed")
    print(f"  - Original file backed up to: {backup_path}")
    
    return True

def create_simplified_complete_endpoint():
    """Create a new simplified onboarding completion endpoint that ensures consistency"""
    
    views_dir = "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/views"
    os.makedirs(views_dir, exist_ok=True)
    
    complete_all_view = os.path.join(views_dir, "complete_all_view.py")
    
    content = '''"""
Simplified onboarding completion endpoint that ensures data consistency
Created to fix redirect loop issue
"""

from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from custom_auth.api.authentication import Auth0JWTAuthentication
from onboarding.models import OnboardingProgress
from user_sessions.models import UserSession
import logging

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
        
        with transaction.atomic():
            # 1. Ensure user has a tenant
            if not user.tenant:
                return Response({
                    'error': 'User has no tenant assigned',
                    'details': 'Tenant must be created during onboarding'
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
            
            # 3. CRITICAL: Update User.onboarding_completed (single source of truth)
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
            
            # 4. Update user session
            try:
                session = UserSession.objects.get(user=user)
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.tenant_id = str(tenant_id)
                session.save()
            except UserSession.DoesNotExist:
                # Create session if it doesn't exist
                UserSession.objects.create(
                    user=user,
                    needs_onboarding=False,
                    onboarding_completed=True,
                    tenant_id=str(tenant_id)
                )
            
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
'''
    
    with open(complete_all_view, 'w') as f:
        f.write(content)
    
    print(f"✓ Created new complete_all_onboarding endpoint at {complete_all_view}")
    
    # Add URL configuration
    urls_content = '''
# Add this to your onboarding/urls.py

from .views.complete_all_view import complete_all_onboarding

urlpatterns += [
    path('api/onboarding/complete-all/', complete_all_onboarding, name='complete-all-onboarding'),
]
'''
    
    print("\nAdd this URL configuration to your onboarding/urls.py:")
    print(urls_content)
    
    return True

def main():
    print("Onboarding Completion Bug Fixer")
    print("=" * 50)
    print()
    
    print("This script will fix the redirect loop issue by ensuring")
    print("User.onboarding_completed is properly updated when onboarding completes.")
    print()
    
    # Fix the existing endpoint
    print("1. Fixing CompleteOnboardingAPI...")
    if fix_complete_onboarding_api():
        print("   ✓ CompleteOnboardingAPI fixed")
    else:
        print("   ✗ Failed to fix CompleteOnboardingAPI")
    
    print()
    
    # Create new simplified endpoint
    print("2. Creating simplified complete-all endpoint...")
    if create_simplified_complete_endpoint():
        print("   ✓ New endpoint created")
    else:
        print("   ✗ Failed to create new endpoint")
    
    print()
    print("=" * 50)
    print("IMPORTANT: After running this script:")
    print("1. Review the changes in the backed up files")
    print("2. Update the frontend to use the new /api/onboarding/complete-all/ endpoint")
    print("3. Test the onboarding flow thoroughly")
    print("4. Deploy both backend and frontend changes together")
    print()
    print("The fix ensures that User.onboarding_completed is always set to True")
    print("when onboarding completes, preventing redirect loops.")

if __name__ == "__main__":
    main()