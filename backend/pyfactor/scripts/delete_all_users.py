#!/usr/bin/env python3
"""
Delete All Users Script
WARNING: This script will delete ALL users from the database!

This is an extremely dangerous operation that should only be used in:
- Development environments
- Test environments
- Complete system reset scenarios

Usage:
    python scripts/delete_all_users.py --soft
    python scripts/delete_all_users.py --hard --confirm "DELETE ALL USERS"
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction as db_transaction
import argparse
from datetime import datetime

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant, AccountDeletionLog
from comprehensive_user_deletion import UserDeletionManager
from quick_user_soft_delete import soft_delete_user


class BatchUserDeletion:
    """Handles deletion of all users in the system"""
    
    def __init__(self):
        self.stats = {
            'total_users': 0,
            'deleted': 0,
            'failed': 0,
            'errors': []
        }
        self.deletion_manager = UserDeletionManager()
    
    def check_environment(self):
        """Check if we're in a safe environment for mass deletion"""
        # Check for production indicators
        dangerous_indicators = [
            ('DATABASE_URL', 'render.com'),
            ('DATABASE_URL', 'production'),
            ('DJANGO_SETTINGS_MODULE', 'production'),
            ('ENVIRONMENT', 'production'),
            ('RENDER', 'true')
        ]
        
        for env_var, indicator in dangerous_indicators:
            value = os.environ.get(env_var, '').lower()
            if indicator in value:
                print("🚨 DANGER: Production environment detected!")
                print(f"   {env_var} contains '{indicator}'")
                return False
        
        return True
    
    def count_users(self):
        """Count total users and show statistics"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        deleted_users = User.objects.filter(is_deleted=True).count()
        superusers = User.objects.filter(is_superuser=True).count()
        
        print("\n📊 Current User Statistics:")
        print(f"   Total users: {total_users}")
        print(f"   Active users: {active_users}")
        print(f"   Soft-deleted users: {deleted_users}")
        print(f"   Superusers: {superusers}")
        
        # Show tenant statistics
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(is_active=True).count()
        
        print(f"\n🏢 Tenant Statistics:")
        print(f"   Total tenants: {total_tenants}")
        print(f"   Active tenants: {active_tenants}")
        
        return total_users
    
    def soft_delete_all_users(self, exclude_superusers=True, batch_size=50):
        """Soft delete all users in batches"""
        print("\n🗑️  Starting soft deletion of all users...")
        
        # Get users to delete
        users_query = User.objects.filter(is_deleted=False)
        if exclude_superusers:
            users_query = users_query.filter(is_superuser=False)
        
        total_users = users_query.count()
        self.stats['total_users'] = total_users
        
        if total_users == 0:
            print("No users to delete.")
            return
        
        print(f"Found {total_users} users to soft delete")
        
        # Process in batches
        processed = 0
        for user in users_query.iterator(chunk_size=batch_size):
            try:
                # Use the quick soft delete function
                success = soft_delete_user(user.email, reason="Batch deletion - system reset")
                
                if success:
                    self.stats['deleted'] += 1
                    processed += 1
                    
                    # Show progress every 10 users
                    if processed % 10 == 0:
                        print(f"   Progress: {processed}/{total_users} users deleted")
                else:
                    self.stats['failed'] += 1
                    self.stats['errors'].append(f"Failed to delete {user.email}")
                    
            except Exception as e:
                self.stats['failed'] += 1
                self.stats['errors'].append(f"Error deleting {user.email}: {str(e)}")
                print(f"   ❌ Error deleting {user.email}: {str(e)}")
        
        # Create batch deletion log
        try:
            AccountDeletionLog.objects.create(
                user_email="BATCH_DELETION",
                user_id=0,
                deletion_reason="Batch soft deletion - system reset",
                deletion_initiated_by="system",
                database_deleted=False,
                deletion_errors={
                    'stats': self.stats,
                    'timestamp': datetime.now().isoformat()
                }
            )
        except:
            pass
        
        self._print_results()
    
    def hard_delete_all_users(self, exclude_superusers=True, batch_size=10):
        """Permanently delete all users in batches"""
        print("\n🔥 Starting HARD deletion of all users...")
        print("⚠️  WARNING: This is IRREVERSIBLE!")
        
        # Get users to delete
        users_query = User.objects.all()
        if exclude_superusers:
            users_query = users_query.filter(is_superuser=False)
        
        total_users = users_query.count()
        self.stats['total_users'] = total_users
        
        if total_users == 0:
            print("No users to delete.")
            return
        
        print(f"Found {total_users} users to permanently delete")
        
        # Process in smaller batches for hard delete
        processed = 0
        
        # Override input for batch processing
        import builtins
        original_input = builtins.input
        builtins.input = lambda _: 'yes'  # Auto-confirm
        
        try:
            for user in users_query.iterator(chunk_size=batch_size):
                try:
                    # Use the comprehensive deletion manager
                    success = self.deletion_manager.hard_delete_user(
                        user, 
                        reason="Batch hard deletion - complete system reset"
                    )
                    
                    if success:
                        self.stats['deleted'] += 1
                        processed += 1
                        
                        # Show progress every 5 users (hard delete is slower)
                        if processed % 5 == 0:
                            print(f"   Progress: {processed}/{total_users} users deleted")
                    else:
                        self.stats['failed'] += 1
                        self.stats['errors'].append(f"Failed to delete {user.email}")
                        
                except Exception as e:
                    self.stats['failed'] += 1
                    self.stats['errors'].append(f"Error deleting {user.email}: {str(e)}")
                    print(f"   ❌ Error deleting {user.email}: {str(e)}")
                    
        finally:
            builtins.input = original_input  # Restore original input
        
        # Create batch deletion log
        try:
            AccountDeletionLog.objects.create(
                user_email="BATCH_HARD_DELETION",
                user_id=0,
                deletion_reason="Batch hard deletion - complete system reset",
                deletion_initiated_by="system",
                database_deleted=True,
                deletion_errors={
                    'stats': self.stats,
                    'timestamp': datetime.now().isoformat()
                }
            )
        except:
            pass
        
        self._print_results()
    
    def delete_all_tenants(self):
        """Delete all orphaned tenants (tenants without owners)"""
        print("\n🏢 Cleaning up orphaned tenants...")
        
        # Find tenants without active owners
        orphaned_tenants = []
        for tenant in Tenant.objects.all():
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    if owner.is_deleted or not owner.is_active:
                        orphaned_tenants.append(tenant)
                except User.DoesNotExist:
                    orphaned_tenants.append(tenant)
            else:
                orphaned_tenants.append(tenant)
        
        if orphaned_tenants:
            print(f"Found {len(orphaned_tenants)} orphaned tenants")
            for tenant in orphaned_tenants:
                tenant.delete()
                print(f"   - Deleted tenant: {tenant.name}")
        else:
            print("No orphaned tenants found")
    
    def _print_results(self):
        """Print deletion results"""
        print("\n📊 Deletion Results:")
        print(f"   Total users: {self.stats['total_users']}")
        print(f"   Successfully deleted: {self.stats['deleted']}")
        print(f"   Failed: {self.stats['failed']}")
        
        if self.stats['errors']:
            print(f"\n❌ Errors ({len(self.stats['errors'])}):")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(self.stats['errors']) > 10:
                print(f"   ... and {len(self.stats['errors']) - 10} more errors")


def main():
    """Main function with safety checks"""
    parser = argparse.ArgumentParser(description='Delete all users from the database')
    parser.add_argument('--soft', action='store_true', help='Soft delete all users')
    parser.add_argument('--hard', action='store_true', help='Hard delete all users (permanent)')
    parser.add_argument('--include-superusers', action='store_true', help='Include superusers in deletion')
    parser.add_argument('--confirm', type=str, help='Confirmation string (must be "DELETE ALL USERS")')
    parser.add_argument('--force', action='store_true', help='Skip environment check (DANGEROUS)')
    
    args = parser.parse_args()
    
    if not args.soft and not args.hard:
        print("❌ Please specify --soft or --hard deletion type")
        return
    
    batch_deletion = BatchUserDeletion()
    
    # Environment safety check
    if not args.force and not batch_deletion.check_environment():
        print("\n🚨 STOPPING: Unsafe environment detected!")
        print("Add --force to override (NOT RECOMMENDED)")
        return
    
    # Show current statistics
    total_users = batch_deletion.count_users()
    
    if total_users == 0:
        print("\n✅ No users in the database")
        return
    
    # Require explicit confirmation
    if args.hard:
        print("\n⚠️  EXTREME WARNING ⚠️")
        print("You are about to PERMANENTLY DELETE ALL USERS!")
        print("This action is IRREVERSIBLE!")
        print("All user data, sessions, and related records will be PERMANENTLY LOST!")
        
        if args.confirm != "DELETE ALL USERS":
            print('\n❌ To proceed, add: --confirm "DELETE ALL USERS"')
            return
        
        # Double confirmation for hard delete
        response = input('\nType "I UNDERSTAND THIS IS PERMANENT" to continue: ')
        if response != "I UNDERSTAND THIS IS PERMANENT":
            print("❌ Deletion cancelled")
            return
    else:
        print("\n⚠️  WARNING: You are about to soft delete all users!")
        print("Users can be restored later using the restore function.")
        
        response = input('\nType "DELETE" to continue: ')
        if response != "DELETE":
            print("❌ Deletion cancelled")
            return
    
    # Perform deletion
    try:
        with db_transaction.atomic():
            if args.hard:
                batch_deletion.hard_delete_all_users(
                    exclude_superusers=not args.include_superusers
                )
            else:
                batch_deletion.soft_delete_all_users(
                    exclude_superusers=not args.include_superusers
                )
            
            # Clean up orphaned tenants
            batch_deletion.delete_all_tenants()
            
        print("\n✅ Batch deletion completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Critical error during batch deletion: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()