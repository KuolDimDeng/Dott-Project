#!/usr/bin/env python3
"""
Restore All Soft-Deleted Users Script

This script restores all soft-deleted users back to active status.
Useful for reversing a batch soft deletion.

Usage:
    python scripts/restore_all_users.py
    python scripts/restore_all_users.py --dry-run
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction
import argparse
from datetime import datetime

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant, AccountDeletionLog
from quick_user_soft_delete import restore_user


class BatchUserRestoration:
    """Handles restoration of all soft-deleted users"""
    
    def __init__(self):
        self.stats = {
            'total_users': 0,
            'restored': 0,
            'failed': 0,
            'errors': []
        }
    
    def count_deleted_users(self):
        """Count and display soft-deleted users"""
        deleted_users = User.objects.filter(is_deleted=True)
        total = deleted_users.count()
        
        print("\n📊 Soft-Deleted Users:")
        print(f"   Total soft-deleted users: {total}")
        
        if total > 0:
            # Show some examples
            print("\n   First 5 deleted users:")
            for user in deleted_users[:5]:
                deleted_at = user.deleted_at.strftime('%Y-%m-%d %H:%M') if user.deleted_at else 'Unknown'
                print(f"   - {user.email} (deleted: {deleted_at})")
            
            if total > 5:
                print(f"   ... and {total - 5} more users")
        
        return total
    
    def restore_all_users(self, dry_run=False, batch_size=50):
        """Restore all soft-deleted users"""
        print(f"\n♻️  {'DRY RUN - ' if dry_run else ''}Starting restoration of all soft-deleted users...")
        
        # Get deleted users
        deleted_users = User.objects.filter(is_deleted=True)
        total_users = deleted_users.count()
        self.stats['total_users'] = total_users
        
        if total_users == 0:
            print("No soft-deleted users to restore.")
            return
        
        print(f"Found {total_users} users to restore")
        
        if dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made")
            print("\nUsers that would be restored:")
            for user in deleted_users[:20]:  # Show first 20
                print(f"   - {user.email}")
            if total_users > 20:
                print(f"   ... and {total_users - 20} more users")
            return
        
        # Process in batches
        processed = 0
        
        with transaction.atomic():
            for user in deleted_users.iterator(chunk_size=batch_size):
                try:
                    # Restore user
                    user.is_deleted = False
                    user.deleted_at = None
                    user.deletion_reason = None
                    user.deletion_feedback = None
                    user.deletion_initiated_by = None
                    user.is_active = True
                    user.save()
                    
                    # Restore tenant if user owns one
                    if hasattr(user, 'tenant') and user.tenant:
                        tenant = user.tenant
                        if not tenant.is_active:
                            tenant.is_active = True
                            tenant.deactivated_at = None
                            tenant.is_recoverable = None
                            tenant.save()
                    
                    self.stats['restored'] += 1
                    processed += 1
                    
                    # Show progress every 10 users
                    if processed % 10 == 0:
                        print(f"   Progress: {processed}/{total_users} users restored")
                        
                except Exception as e:
                    self.stats['failed'] += 1
                    self.stats['errors'].append(f"Error restoring {user.email}: {str(e)}")
                    print(f"   ❌ Error restoring {user.email}: {str(e)}")
            
            # Create batch restoration log
            try:
                AccountDeletionLog.objects.create(
                    user_email="BATCH_RESTORATION",
                    user_id=0,
                    deletion_reason="Batch restoration - reversing soft deletion",
                    deletion_initiated_by="system",
                    database_deleted=False,
                    deletion_errors={
                        'action': 'batch_restore',
                        'stats': self.stats,
                        'timestamp': datetime.now().isoformat()
                    }
                )
            except:
                pass
        
        self._print_results()
    
    def restore_tenants(self):
        """Restore all deactivated tenants with active owners"""
        print("\n🏢 Restoring deactivated tenants...")
        
        deactivated_tenants = Tenant.objects.filter(is_active=False)
        restored_count = 0
        
        for tenant in deactivated_tenants:
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    if owner.is_active and not owner.is_deleted:
                        tenant.is_active = True
                        tenant.deactivated_at = None
                        tenant.is_recoverable = None
                        tenant.save()
                        restored_count += 1
                        print(f"   - Restored tenant: {tenant.name}")
                except User.DoesNotExist:
                    pass
        
        if restored_count > 0:
            print(f"   Total tenants restored: {restored_count}")
        else:
            print("   No tenants to restore")
    
    def _print_results(self):
        """Print restoration results"""
        print("\n📊 Restoration Results:")
        print(f"   Total soft-deleted users: {self.stats['total_users']}")
        print(f"   Successfully restored: {self.stats['restored']}")
        print(f"   Failed: {self.stats['failed']}")
        
        if self.stats['errors']:
            print(f"\n❌ Errors ({len(self.stats['errors'])}):")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(self.stats['errors']) > 10:
                print(f"   ... and {len(self.stats['errors']) - 10} more errors")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Restore all soft-deleted users')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be restored without making changes')
    parser.add_argument('--include-tenants', action='store_true', help='Also restore deactivated tenants')
    
    args = parser.parse_args()
    
    batch_restoration = BatchUserRestoration()
    
    # Show current statistics
    total_deleted = batch_restoration.count_deleted_users()
    
    if total_deleted == 0:
        print("\n✅ No soft-deleted users found")
        return
    
    if not args.dry_run:
        # Get confirmation
        print(f"\n⚠️  You are about to restore {total_deleted} soft-deleted users")
        response = input('\nType "RESTORE" to continue: ')
        if response != "RESTORE":
            print("❌ Restoration cancelled")
            return
    
    # Perform restoration
    try:
        batch_restoration.restore_all_users(dry_run=args.dry_run)
        
        if args.include_tenants and not args.dry_run:
            batch_restoration.restore_tenants()
        
        if not args.dry_run:
            print("\n✅ Batch restoration completed successfully!")
            
    except Exception as e:
        print(f"\n❌ Critical error during batch restoration: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()