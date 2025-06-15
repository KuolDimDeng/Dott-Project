#!/usr/bin/env python3
"""
Version 0008: Fix Paid User Authentication Issues
Author: Claude AI Assistant
Date: 2025-01-15

This script fixes the authentication issues for paid tier users:
1. Fixes the AttributeError in enhanced_rls_middleware.py
2. Adds comprehensive logging to debug session creation
3. Ensures proper handling of subscription plans in auth flow

Issue: Users with paid subscriptions can't sign in after clearing browser cache
- Session creation fails with 500 errors
- AttributeError: 'NoneType' object has no attribute 'is_authenticated'
- Users are redirected to onboarding despite having completed it
"""

import os
import sys
import json
import shutil
from datetime import datetime
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def backup_file(file_path):
    """Create a backup of the file before modifying"""
    if os.path.exists(file_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{file_path}.backup_{timestamp}"
        shutil.copy2(file_path, backup_path)
        print(f"✅ Created backup: {backup_path}")
        return backup_path
    return None

def fix_enhanced_rls_middleware():
    """Fix the AttributeError in enhanced_rls_middleware.py"""
    print("\n1. Fixing enhanced_rls_middleware.py...")
    
    middleware_path = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/enhanced_rls_middleware.py"
    
    # Backup the file
    backup_file(middleware_path)
    
    # Read the file
    with open(middleware_path, 'r') as f:
        content = f.read()
    
    # Fix line 227 - add proper None check
    old_line = "        if not tenant_id and hasattr(request, 'user') and request.user.is_authenticated:"
    new_line = "        if not tenant_id and hasattr(request, 'user') and request.user and request.user.is_authenticated:"
    
    if old_line in content:
        content = content.replace(old_line, new_line)
        print("✅ Fixed AttributeError issue with None user check")
    else:
        print("⚠️  Line already fixed or not found")
    
    # Write the file back
    with open(middleware_path, 'w') as f:
        f.write(content)
    
    print("✅ Enhanced RLS middleware fixed")

def add_session_creation_logging():
    """Add comprehensive logging to session creation for debugging"""
    print("\n2. Adding comprehensive logging to session views...")
    
    views_path = "/Users/kuoldeng/projectx/backend/pyfactor/session_manager/views.py"
    
    # Backup the file
    backup_file(views_path)
    
    # Read the file
    with open(views_path, 'r') as f:
        content = f.read()
    
    # Add logging for subscription plan handling
    if "# Log subscription information" not in content:
        # Find the line after tenant information logging
        insert_after = "            logger.info(f\"[SessionCreate] User tenant ID: {user_tenant.id}, Name: {user_tenant.name}\")"
        
        additional_logging = """
            
            # Log subscription information
            user_subscription = None
            if hasattr(user, 'onboardingprogress'):
                onboarding = user.onboardingprogress
                user_subscription = getattr(onboarding, 'subscription_plan', 'free')
                logger.info(f"[SessionCreate] User subscription from onboarding: {user_subscription}")
                logger.info(f"[SessionCreate] Onboarding status: {onboarding.onboarding_status}")
                logger.info(f"[SessionCreate] Setup completed: {onboarding.setup_completed}")
            
            # Check if user has active Stripe subscription
            try:
                from accounts.models import Subscription
                active_sub = Subscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing']
                ).first()
                if active_sub:
                    logger.info(f"[SessionCreate] Found active Stripe subscription: {active_sub.stripe_subscription_id}")
                    logger.info(f"[SessionCreate] Subscription plan: {active_sub.plan_name}")
                    user_subscription = active_sub.plan_name or user_subscription
            except Exception as e:
                logger.warning(f"[SessionCreate] Error checking Stripe subscription: {e}")"""
        
        if insert_after in content:
            content = content.replace(insert_after, insert_after + additional_logging)
            print("✅ Added subscription logging")
    
    # Fix the session creation to pass subscription info
    old_session_create = "            session = session_service.create_session(\n                user=user,\n                access_token=access_token,\n                request_meta=request_meta,\n                **serializer.validated_data\n            )"
    
    new_session_create = """            # Include subscription plan in session creation
            session_data = serializer.validated_data.copy()
            if user_subscription:
                session_data['subscription_plan'] = user_subscription
            
            session = session_service.create_session(
                user=user,
                access_token=access_token,
                request_meta=request_meta,
                **session_data
            )"""
    
    if old_session_create in content:
        content = content.replace(old_session_create, new_session_create)
        print("✅ Updated session creation to include subscription plan")
    
    # Write the file back
    with open(views_path, 'w') as f:
        f.write(content)
    
    print("✅ Session views updated with comprehensive logging")

def fix_auth0_user_creation():
    """Fix Auth0 user creation to properly handle subscription info"""
    print("\n3. Fixing Auth0 user creation view...")
    
    auth0_views_path = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/auth0_views.py"
    
    # Backup the file
    backup_file(auth0_views_path)
    
    # Read the file
    with open(auth0_views_path, 'r') as f:
        content = f.read()
    
    # Add subscription plan to response
    if "'subscriptionPlan':" not in content:
        # Find where to insert
        insert_before = "            response_data = {"
        
        subscription_check = """            # Get user's subscription plan
            user_subscription = 'free'
            if progress.subscription_plan:
                user_subscription = progress.subscription_plan
                logger.info(f"🔥 [AUTH0_CREATE_USER] User subscription plan: {user_subscription}")
            
            # Check for active Stripe subscription
            try:
                from accounts.models import Subscription
                active_sub = Subscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing']
                ).first()
                if active_sub:
                    user_subscription = active_sub.plan_name
                    logger.info(f"🔥 [AUTH0_CREATE_USER] Active Stripe subscription: {user_subscription}")
            except Exception as e:
                logger.warning(f"🔥 [AUTH0_CREATE_USER] Error checking Stripe: {e}")
            
            """
        
        content = content.replace(insert_before, subscription_check + insert_before)
        print("✅ Added subscription plan checking")
        
        # Add to response data
        old_response = "'onboardingComplete': bool(onboarding_complete),  # Ensure it's a boolean"
        new_response = """'onboardingComplete': bool(onboarding_complete),  # Ensure it's a boolean
                'subscriptionPlan': user_subscription,"""
        
        content = content.replace(old_response, new_response)
        print("✅ Added subscription plan to response")
    
    # Write the file back
    with open(auth0_views_path, 'w') as f:
        f.write(content)
    
    print("✅ Auth0 user creation fixed")

def create_debug_endpoint():
    """Create a debug endpoint to check user session state"""
    print("\n4. Creating debug endpoint for session state...")
    
    debug_view_content = '''"""
Debug endpoint for checking user session state
Created by Version0008_fix_paid_user_auth_issues.py
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from accounts.models import Subscription

logger = logging.getLogger(__name__)

class DebugSessionStateView(APIView):
    """
    Debug endpoint to check complete user session state
    GET /api/debug/session-state/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get complete session state for debugging"""
        try:
            user = request.user
            
            # Get all user sessions
            sessions = UserSession.objects.filter(user=user).order_by('-created_at')
            
            # Get onboarding progress
            onboarding = None
            try:
                onboarding = OnboardingProgress.objects.get(user=user)
            except OnboardingProgress.DoesNotExist:
                pass
            
            # Get active subscriptions
            subscriptions = Subscription.objects.filter(user=user).order_by('-created_at')
            
            response_data = {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'auth0_sub': getattr(user, 'auth0_sub', None),
                    'tenant_id': str(user.tenant.id) if hasattr(user, 'tenant') and user.tenant else None,
                },
                'sessions': [
                    {
                        'session_id': str(s.session_id),
                        'is_active': s.is_active,
                        'needs_onboarding': s.needs_onboarding,
                        'onboarding_completed': s.onboarding_completed,
                        'subscription_plan': s.subscription_plan,
                        'created_at': s.created_at.isoformat(),
                        'expires_at': s.expires_at.isoformat(),
                    }
                    for s in sessions[:5]  # Last 5 sessions
                ],
                'onboarding': {
                    'exists': onboarding is not None,
                    'status': onboarding.onboarding_status if onboarding else None,
                    'setup_completed': onboarding.setup_completed if onboarding else None,
                    'subscription_plan': onboarding.subscription_plan if onboarding else None,
                    'completed_steps': onboarding.completed_steps if onboarding else [],
                } if onboarding else None,
                'subscriptions': [
                    {
                        'stripe_id': s.stripe_subscription_id,
                        'status': s.status,
                        'plan_name': s.plan_name,
                        'created_at': s.created_at.isoformat(),
                    }
                    for s in subscriptions[:3]  # Last 3 subscriptions
                ],
                'request_info': {
                    'has_auth_token': bool(request.auth),
                    'headers': {
                        'authorization': 'present' if request.META.get('HTTP_AUTHORIZATION') else 'missing',
                        'x-tenant-id': request.META.get('HTTP_X_TENANT_ID'),
                    }
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Debug endpoint error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
'''
    
    debug_view_path = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/debug_views.py"
    
    with open(debug_view_path, 'w') as f:
        f.write(debug_view_content)
    
    print(f"✅ Created debug view at: {debug_view_path}")
    
    # Add URL configuration
    urls_path = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/urls.py"
    
    if os.path.exists(urls_path):
        with open(urls_path, 'r') as f:
            urls_content = f.read()
        
        if "debug/session-state" not in urls_content:
            # Add import
            if "from .views.debug_views import" not in urls_content:
                urls_content = urls_content.replace(
                    "from django.urls import path",
                    "from django.urls import path\nfrom .views.debug_views import DebugSessionStateView"
                )
            
            # Add URL pattern
            if "urlpatterns = [" in urls_content:
                urls_content = urls_content.replace(
                    "urlpatterns = [",
                    "urlpatterns = [\n    path('debug/session-state/', DebugSessionStateView.as_view(), name='debug-session-state'),"
                )
            
            with open(urls_path, 'w') as f:
                f.write(urls_content)
            
            print("✅ Added debug endpoint to URLs")

def update_script_registry():
    """Update the script registry"""
    print("\n5. Updating script registry...")
    
    registry_path = "/Users/kuoldeng/projectx/backend/pyfactor/scripts/script_registry.md"
    
    new_entry = """
## Version0008_fix_paid_user_auth_issues.py
- **Date**: 2025-01-15
- **Purpose**: Fix authentication issues for paid tier users
- **Changes**:
  - Fixed AttributeError in enhanced_rls_middleware.py (None user check)
  - Added comprehensive logging to session creation
  - Fixed Auth0 user creation to handle subscription plans
  - Created debug endpoint at /api/debug/session-state/
- **Files Modified**:
  - custom_auth/enhanced_rls_middleware.py
  - session_manager/views.py
  - custom_auth/api/views/auth0_views.py
  - custom_auth/api/views/debug_views.py (created)
  - custom_auth/api/urls.py
"""
    
    if os.path.exists(registry_path):
        with open(registry_path, 'a') as f:
            f.write(new_entry)
        print("✅ Updated script registry")
    else:
        print("⚠️  Script registry not found")

def main():
    """Run all fixes"""
    print("🔧 Starting Fix for Paid User Authentication Issues")
    print("=" * 60)
    
    try:
        # Run all fixes
        fix_enhanced_rls_middleware()
        add_session_creation_logging()
        fix_auth0_user_creation()
        create_debug_endpoint()
        update_script_registry()
        
        print("\n" + "=" * 60)
        print("✅ All fixes completed successfully!")
        print("\nNext steps:")
        print("1. Test the debug endpoint: GET /api/debug/session-state/")
        print("2. Monitor logs for [SessionCreate] and [AUTH0_CREATE_USER] entries")
        print("3. Test authentication flow with a paid user account")
        print("4. Check if session creation now succeeds for paid users")
        
    except Exception as e:
        print(f"\n❌ Error during fixes: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()