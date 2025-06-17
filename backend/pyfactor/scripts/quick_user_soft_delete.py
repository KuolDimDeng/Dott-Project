#!/usr/bin/env python
"""
Quick User Soft Delete Script

A simplified script for quickly soft-deleting users and their associated data.
This script marks users as deleted without permanently removing data.

Usage:
    python manage.py shell
    >>> from scripts.quick_user_soft_delete import soft_delete_user
    >>> soft_delete_user('user@example.com')
"""

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()


def soft_delete_user(email, reason='User requested account closure'):
    """
    Quickly soft delete a user by marking them as deleted
    
    Args:
        email: User's email address
        reason: Reason for deletion
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        user = User.objects.get(email=email)
        
        with transaction.atomic():
            # Mark user as deleted
            user.is_deleted = True
            user.deleted_at = timezone.now()
            user.deletion_reason = reason
            user.deletion_initiated_by = 'user'
            user.is_active = False
            user.save()
            
            logger.info(f"✓ Soft deleted user: {user.email}")
            
            # Deactivate all sessions
            try:
                from session_manager.models import UserSession
                count = UserSession.objects.filter(user=user).update(
                    is_active=False,
                    expires_at=timezone.now()
                )
                logger.info(f"✓ Deactivated {count} user sessions")
            except Exception as e:
                logger.warning(f"Could not deactivate sessions: {str(e)}")
            
            # Mark tenant as inactive
            if hasattr(user, 'tenant') and user.tenant:
                tenant = user.tenant
                tenant.is_active = False
                tenant.deactivated_at = timezone.now()
                tenant.is_recoverable = True
                tenant.save()
                logger.info(f"✓ Deactivated tenant: {tenant.name}")
            
            # Create audit log
            try:
                from custom_auth.models import AccountDeletionLog
                
                AccountDeletionLog.objects.create(
                    user_email=user.email,
                    user_id=user.id,
                    tenant_id=user.tenant.id if user.tenant else None,
                    auth0_sub=getattr(user, 'auth0_sub', None),
                    deletion_reason=reason,
                    deletion_initiated_by='user',
                    database_deleted=False
                )
                logger.info("✓ Created deletion audit log")
            except Exception as e:
                logger.warning(f"Could not create audit log: {str(e)}")
            
            print(f"\n✅ Successfully soft deleted user: {email}")
            print("   - User marked as deleted")
            print("   - Sessions deactivated")
            print("   - Tenant deactivated (if applicable)")
            print("   - Audit log created")
            print("\n💡 To restore this user, use: restore_user('{email}')")
            
            return True
            
    except User.DoesNotExist:
        logger.error(f"❌ User not found: {email}")
        return False
    except Exception as e:
        logger.error(f"❌ Error soft deleting user: {str(e)}")
        return False


def restore_user(email):
    """
    Restore a soft-deleted user
    
    Args:
        email: User's email address
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        user = User.objects.get(email=email, is_deleted=True)
        
        with transaction.atomic():
            # Restore user
            user.is_deleted = False
            user.deleted_at = None
            user.deletion_reason = None
            user.deletion_feedback = None
            user.deletion_initiated_by = None
            user.is_active = True
            user.save()
            
            logger.info(f"✓ Restored user: {user.email}")
            
            # Restore tenant
            if hasattr(user, 'tenant') and user.tenant:
                tenant = user.tenant
                tenant.is_active = True
                tenant.deactivated_at = None
                tenant.is_recoverable = None
                tenant.save()
                logger.info(f"✓ Restored tenant: {tenant.name}")
            
            print(f"\n✅ Successfully restored user: {email}")
            print("   - User marked as active")
            print("   - Tenant reactivated (if applicable)")
            print("\n⚠️  Note: User will need to login again to create new sessions")
            
            return True
            
    except User.DoesNotExist:
        logger.error(f"❌ No soft-deleted user found with email: {email}")
        return False
    except Exception as e:
        logger.error(f"❌ Error restoring user: {str(e)}")
        return False


def list_deleted_users():
    """List all soft-deleted users"""
    deleted_users = User.objects.filter(is_deleted=True).order_by('-deleted_at')
    
    if not deleted_users:
        print("No soft-deleted users found.")
        return
    
    print("\n=== Soft-Deleted Users ===")
    print(f"{'Email':<40} {'Deleted At':<20} {'Reason':<30}")
    print("-" * 90)
    
    for user in deleted_users:
        deleted_at = user.deleted_at.strftime('%Y-%m-%d %H:%M') if user.deleted_at else 'Unknown'
        reason = (user.deletion_reason[:27] + '...') if user.deletion_reason and len(user.deletion_reason) > 30 else user.deletion_reason or 'Not specified'
        print(f"{user.email:<40} {deleted_at:<20} {reason:<30}")
    
    print(f"\nTotal: {deleted_users.count()} soft-deleted users")


def check_user_status(email):
    """Check the deletion status of a user"""
    try:
        user = User.objects.get(email=email)
        
        print(f"\n=== User Status: {email} ===")
        print(f"Active: {'No' if user.is_deleted else 'Yes'}")
        print(f"Deleted: {'Yes' if user.is_deleted else 'No'}")
        
        if user.is_deleted:
            print(f"Deleted at: {user.deleted_at}")
            print(f"Reason: {user.deletion_reason or 'Not specified'}")
            print(f"Initiated by: {user.deletion_initiated_by or 'Unknown'}")
            
            if hasattr(user, 'tenant') and user.tenant:
                print(f"\nTenant: {user.tenant.name}")
                print(f"Tenant active: {'No' if not user.tenant.is_active else 'Yes'}")
                print(f"Recoverable: {'Yes' if user.tenant.is_recoverable else 'No'}")
        else:
            print("\nUser is active and not deleted.")
            
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")


# Example usage
if __name__ == "__main__":
    print("Quick User Soft Delete Script")
    print("=============================")
    print("\nAvailable functions:")
    print("- soft_delete_user(email) - Soft delete a user")
    print("- restore_user(email) - Restore a soft-deleted user")
    print("- list_deleted_users() - List all soft-deleted users")
    print("- check_user_status(email) - Check user deletion status")
    print("\nExamples:")
    print(">>> soft_delete_user('user@example.com')")
    print(">>> restore_user('user@example.com')")
    print(">>> list_deleted_users()")