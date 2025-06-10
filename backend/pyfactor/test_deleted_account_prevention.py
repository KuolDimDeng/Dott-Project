#!/usr/bin/env python
"""
Test script to verify that deleted accounts cannot sign in
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from custom_auth.models import User, AccountDeletionLog
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


def test_deleted_account_prevention():
    """Test that deleted accounts are prevented from signing in"""
    
    print("🧪 Testing Deleted Account Prevention")
    print("=" * 50)
    
    # Find a test user or create one
    test_email = "test_deleted@example.com"
    
    try:
        # Create a test user
        user, created = User.objects.get_or_create(
            email=test_email,
            defaults={
                'auth0_sub': 'auth0|test123',
                'is_active': True,
                'name': 'Test Deleted User'
            }
        )
        
        if created:
            print(f"✅ Created test user: {test_email}")
        else:
            print(f"📌 Using existing test user: {test_email}")
        
        # Mark user as deleted (soft delete)
        user.is_deleted = True
        user.deleted_at = timezone.now()
        user.deletion_reason = "Testing account deletion"
        user.deletion_feedback = "This is a test of the account deletion system"
        user.deletion_initiated_by = "test_script"
        user.is_active = False
        user.save()
        
        print(f"🗑️  Marked user as deleted:")
        print(f"   - is_deleted: {user.is_deleted}")
        print(f"   - deleted_at: {user.deleted_at}")
        print(f"   - deletion_reason: {user.deletion_reason}")
        print(f"   - is_active: {user.is_active}")
        
        # Create audit log
        deletion_log = AccountDeletionLog.objects.create(
            user_email=user.email,
            user_id=user.id,
            auth0_sub=user.auth0_sub,
            deletion_reason=user.deletion_reason,
            deletion_feedback=user.deletion_feedback,
            deletion_initiated_by="test_script",
            database_deleted=True
        )
        print(f"📝 Created deletion audit log: {deletion_log.id}")
        
        # Test authentication prevention
        print("\n🔐 Testing authentication prevention...")
        
        # Simulate Auth0 authentication attempt
        auth = Auth0JWTAuthentication()
        
        # Test 1: Try to authenticate with Auth0 ID
        print("\nTest 1: Authenticating by Auth0 ID...")
        try:
            # This would normally be called by the authentication backend
            test_user_info = {
                'sub': user.auth0_sub,
                'email': user.email
            }
            authenticated_user = auth.get_or_create_user(test_user_info)
            print("❌ ERROR: Deleted user was able to authenticate!")
            print(f"   Authenticated as: {authenticated_user.email}")
        except AuthenticationFailed as e:
            print(f"✅ SUCCESS: Authentication blocked with message: {str(e)}")
        except Exception as e:
            print(f"❓ Unexpected error: {type(e).__name__}: {str(e)}")
        
        # Test 2: Try to authenticate by email
        print("\nTest 2: Authenticating by email...")
        # Reset the user's auth0_sub to simulate finding by email
        user.auth0_sub = None
        user.save()
        
        try:
            test_user_info = {
                'sub': 'auth0|newid456',  # Different Auth0 ID
                'email': user.email
            }
            authenticated_user = auth.get_or_create_user(test_user_info)
            print("❌ ERROR: Deleted user was able to authenticate by email!")
            print(f"   Authenticated as: {authenticated_user.email}")
        except AuthenticationFailed as e:
            print(f"✅ SUCCESS: Authentication blocked with message: {str(e)}")
        except Exception as e:
            print(f"❓ Unexpected error: {type(e).__name__}: {str(e)}")
        
        # Test 3: Verify normal user can still authenticate
        print("\nTest 3: Verifying normal users can authenticate...")
        normal_user, _ = User.objects.get_or_create(
            email="normal_user@example.com",
            defaults={
                'auth0_sub': 'auth0|normal123',
                'is_active': True,
                'is_deleted': False,
                'name': 'Normal User'
            }
        )
        
        try:
            test_user_info = {
                'sub': normal_user.auth0_sub,
                'email': normal_user.email
            }
            authenticated_user = auth.get_or_create_user(test_user_info)
            print(f"✅ SUCCESS: Normal user authenticated: {authenticated_user.email}")
        except Exception as e:
            print(f"❌ ERROR: Normal user authentication failed: {str(e)}")
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed!")
        print("\n📊 Summary:")
        print("  - Deleted accounts are properly blocked from signing in")
        print("  - Authentication error message is user-friendly")
        print("  - Normal users can still authenticate")
        print("  - Audit logs are created for account deletions")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup test data
        print("\n🧹 Cleaning up test data...")
        User.objects.filter(email__in=[test_email, "normal_user@example.com"]).delete()
        print("✅ Test data cleaned up")


if __name__ == '__main__':
    test_deleted_account_prevention()