#!/usr/bin/env python
"""
User Deletion with Auth0 Integration

This script handles user deletion including Auth0 account removal.
It ensures users are deleted from both the Django database and Auth0.

Usage:
    python manage.py shell
    >>> from scripts.user_deletion_with_auth0 import delete_user_complete
    >>> delete_user_complete('user@example.com')
"""

import logging
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction as db_transaction
from django.utils import timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()


class Auth0Manager:
    """Manages Auth0 API interactions for user deletion"""
    
    def __init__(self):
        self.domain = getattr(settings, 'AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
        self.client_id = getattr(settings, 'AUTH0_CLIENT_ID', '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF')
        self.client_secret = getattr(settings, 'AUTH0_CLIENT_SECRET', None)
        self.api_identifier = getattr(settings, 'AUTH0_API_IDENTIFIER', 'https://api.dottapps.com')
        self.management_token = None
    
    def get_management_token(self):
        """Get Auth0 Management API token"""
        if not self.client_secret:
            logger.error("AUTH0_CLIENT_SECRET not configured in settings")
            return None
        
        url = f"https://{self.domain}/oauth/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "audience": f"https://{self.domain}/api/v2/",
            "grant_type": "client_credentials"
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            self.management_token = data['access_token']
            return self.management_token
        except Exception as e:
            logger.error(f"Failed to get Auth0 management token: {str(e)}")
            return None
    
    def delete_user_from_auth0(self, auth0_sub):
        """Delete user from Auth0"""
        if not auth0_sub:
            logger.warning("No Auth0 sub provided, skipping Auth0 deletion")
            return False
        
        if not self.management_token:
            self.get_management_token()
        
        if not self.management_token:
            logger.error("Cannot delete from Auth0 - no management token")
            return False
        
        url = f"https://{self.domain}/api/v2/users/{auth0_sub}"
        headers = {
            "Authorization": f"Bearer {self.management_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.delete(url, headers=headers)
            
            if response.status_code == 204:
                logger.info(f"Successfully deleted user from Auth0: {auth0_sub}")
                return True
            elif response.status_code == 404:
                logger.warning(f"User not found in Auth0: {auth0_sub}")
                return True  # Consider it successful if user doesn't exist
            else:
                logger.error(f"Failed to delete from Auth0: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting from Auth0: {str(e)}")
            return False
    
    def get_user_from_auth0(self, auth0_sub):
        """Get user details from Auth0"""
        if not self.management_token:
            self.get_management_token()
        
        if not self.management_token:
            return None
        
        url = f"https://{self.domain}/api/v2/users/{auth0_sub}"
        headers = {
            "Authorization": f"Bearer {self.management_token}"
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                return None
        except Exception as e:
            logger.error(f"Error getting user from Auth0: {str(e)}")
            return None


def delete_user_complete(email, delete_from_auth0=True, hard_delete=False):
    """
    Complete user deletion including Auth0
    
    Args:
        email: User's email address
        delete_from_auth0: Whether to delete from Auth0 (default: True)
        hard_delete: If True, permanently delete from database (default: False)
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        user = User.objects.get(email=email)
        auth0_sub = getattr(user, 'auth0_sub', None)
        
        # Initialize Auth0 manager if needed
        auth0_manager = Auth0Manager() if delete_from_auth0 else None
        
        # Create deletion log
        from custom_auth.models import AccountDeletionLog
        
        deletion_log = AccountDeletionLog.objects.create(
            user_email=user.email,
            user_id=user.id,
            tenant_id=user.tenant.id if hasattr(user, 'tenant') and user.tenant else None,
            auth0_sub=auth0_sub,
            deletion_reason='Complete account deletion requested',
            deletion_initiated_by='admin',
            database_deleted=hard_delete
        )
        
        with db_transaction.atomic():
            # Step 1: Delete from Auth0 if requested
            if delete_from_auth0 and auth0_sub:
                logger.info(f"Attempting to delete user from Auth0: {auth0_sub}")
                auth0_deleted = auth0_manager.delete_user_from_auth0(auth0_sub)
                deletion_log.auth0_deleted = auth0_deleted
                deletion_log.save()
                
                if not auth0_deleted:
                    logger.warning("Failed to delete from Auth0, but continuing with database deletion")
            
            # Step 2: Handle database deletion
            if hard_delete:
                # Import the comprehensive deletion manager
                try:
                    from scripts.comprehensive_user_deletion import UserDeletionManager
                except ImportError:
                    # If running as a script, try relative import
                    from comprehensive_user_deletion import UserDeletionManager
                
                manager = UserDeletionManager()
                # Override the confirmation prompt for hard delete
                import builtins
                original_input = builtins.input
                builtins.input = lambda _: 'yes'  # Auto-confirm
                
                try:
                    success = manager.hard_delete_user(user, reason='Complete account deletion')
                finally:
                    builtins.input = original_input  # Restore original input
                
                deletion_log.database_deleted = success
                deletion_log.save()
                
                if success:
                    print(f"\n✅ Successfully deleted user completely:")
                    print(f"   - Email: {email}")
                    print(f"   - Auth0 deleted: {'Yes' if deletion_log.auth0_deleted else 'No'}")
                    print(f"   - Database deleted: Yes (permanent)")
                
            else:
                # Soft delete
                user.is_deleted = True
                user.deleted_at = timezone.now()
                user.deletion_reason = 'Complete account deletion requested'
                user.deletion_initiated_by = 'admin'
                user.is_active = False
                user.save()
                
                # Deactivate sessions
                try:
                    from session_manager.models import UserSession
                    UserSession.objects.filter(user=user).update(
                        is_active=False,
                        expires_at=timezone.now()
                    )
                except:
                    pass
                
                # Deactivate tenant
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    tenant.is_active = False
                    tenant.deactivated_at = timezone.now()
                    tenant.save()
                
                deletion_log.database_deleted = False
                deletion_log.save()
                
                print(f"\n✅ Successfully soft deleted user:")
                print(f"   - Email: {email}")
                print(f"   - Auth0 deleted: {'Yes' if deletion_log.auth0_deleted else 'No'}")
                print(f"   - Database: Soft deleted (recoverable)")
            
            # Update tenant deletion status in log
            if hasattr(user, 'tenant') and user.tenant:
                deletion_log.tenant_deleted = True
                deletion_log.save()
            
            return True
            
    except User.DoesNotExist:
        logger.error(f"User not found: {email}")
        return False
    except Exception as e:
        logger.error(f"Error during complete deletion: {str(e)}")
        
        # Update deletion log with error
        if 'deletion_log' in locals():
            deletion_log.deletion_errors = {'error': str(e)}
            deletion_log.save()
        
        return False


def check_auth0_user(email):
    """Check if user exists in Auth0"""
    try:
        user = User.objects.get(email=email)
        auth0_sub = getattr(user, 'auth0_sub', None)
        
        if not auth0_sub:
            print(f"User {email} has no Auth0 sub stored")
            return
        
        auth0_manager = Auth0Manager()
        auth0_user = auth0_manager.get_user_from_auth0(auth0_sub)
        
        if auth0_user:
            print(f"\n=== Auth0 User Details ===")
            print(f"Email: {auth0_user.get('email')}")
            print(f"Name: {auth0_user.get('name')}")
            print(f"User ID: {auth0_user.get('user_id')}")
            print(f"Email Verified: {auth0_user.get('email_verified')}")
            print(f"Created: {auth0_user.get('created_at')}")
            print(f"Last Login: {auth0_user.get('last_login')}")
        else:
            print(f"User {email} not found in Auth0")
            
    except User.DoesNotExist:
        print(f"User not found in database: {email}")


def sync_deletion_status():
    """Sync deletion status between database and Auth0"""
    deleted_users = User.objects.filter(is_deleted=True, auth0_sub__isnull=False)
    auth0_manager = Auth0Manager()
    
    print(f"\nChecking {deleted_users.count()} soft-deleted users in Auth0...")
    
    for user in deleted_users:
        auth0_user = auth0_manager.get_user_from_auth0(user.auth0_sub)
        
        if auth0_user:
            print(f"\n⚠️  {user.email} is soft-deleted in DB but still exists in Auth0")
            response = input("Delete from Auth0? (y/n): ")
            
            if response.lower() == 'y':
                if auth0_manager.delete_user_from_auth0(user.auth0_sub):
                    print(f"✅ Deleted {user.email} from Auth0")
                    
                    # Update deletion log
                    try:
                        from custom_auth.models import AccountDeletionLog
                        log = AccountDeletionLog.objects.filter(
                            user_email=user.email
                        ).order_by('-deletion_date').first()
                        
                        if log:
                            log.auth0_deleted = True
                            log.save()
                    except:
                        pass
                else:
                    print(f"❌ Failed to delete {user.email} from Auth0")


# Example usage
if __name__ == "__main__":
    print("User Deletion with Auth0 Integration")
    print("====================================")
    print("\nAvailable functions:")
    print("- delete_user_complete(email) - Delete from both DB and Auth0")
    print("- delete_user_complete(email, delete_from_auth0=False) - Delete only from DB")
    print("- delete_user_complete(email, hard_delete=True) - Permanently delete all data")
    print("- check_auth0_user(email) - Check if user exists in Auth0")
    print("- sync_deletion_status() - Sync deletion status between DB and Auth0")
    print("\nExamples:")
    print(">>> delete_user_complete('user@example.com')")
    print(">>> check_auth0_user('user@example.com')")