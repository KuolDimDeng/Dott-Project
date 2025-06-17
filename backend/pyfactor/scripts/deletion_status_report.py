#!/usr/bin/env python3
"""
Deletion Status Report Script

Provides a comprehensive report on user deletion status including:
- Active vs deleted users
- Recent deletions
- Deletion logs
- System health

Usage:
    python scripts/deletion_status_report.py
    python scripts/deletion_status_report.py --export report.json
"""

import os
import sys
import django
from django.utils import timezone
from django.db.models import Count, Q
import json
import argparse
from datetime import datetime, timedelta

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant, AccountDeletionLog
from session_manager.models import UserSession


class DeletionStatusReport:
    """Generate comprehensive deletion status reports"""
    
    def __init__(self):
        self.report_data = {}
    
    def generate_user_statistics(self):
        """Generate user statistics"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True, is_deleted=False).count()
        soft_deleted = User.objects.filter(is_deleted=True).count()
        inactive_not_deleted = User.objects.filter(is_active=False, is_deleted=False).count()
        superusers = User.objects.filter(is_superuser=True).count()
        
        # Users by deletion reason
        deletion_reasons = User.objects.filter(is_deleted=True).values('deletion_reason').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.report_data['user_statistics'] = {
            'total_users': total_users,
            'active_users': active_users,
            'soft_deleted_users': soft_deleted,
            'inactive_not_deleted': inactive_not_deleted,
            'superusers': superusers,
            'deletion_reasons': list(deletion_reasons)
        }
        
        print("\n📊 User Statistics:")
        print(f"   Total users: {total_users}")
        print(f"   Active users: {active_users}")
        print(f"   Soft-deleted users: {soft_deleted}")
        print(f"   Inactive (not deleted): {inactive_not_deleted}")
        print(f"   Superusers: {superusers}")
        
        if deletion_reasons:
            print("\n   Deletion Reasons:")
            for reason in deletion_reasons[:5]:
                print(f"   - {reason['deletion_reason'] or 'Not specified'}: {reason['count']}")
    
    def generate_tenant_statistics(self):
        """Generate tenant statistics"""
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(is_active=True).count()
        inactive_tenants = Tenant.objects.filter(is_active=False).count()
        
        # Tenants with deleted owners
        orphaned_tenants = 0
        for tenant in Tenant.objects.all():
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    if owner.is_deleted:
                        orphaned_tenants += 1
                except User.DoesNotExist:
                    orphaned_tenants += 1
        
        self.report_data['tenant_statistics'] = {
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'inactive_tenants': inactive_tenants,
            'orphaned_tenants': orphaned_tenants
        }
        
        print("\n🏢 Tenant Statistics:")
        print(f"   Total tenants: {total_tenants}")
        print(f"   Active tenants: {active_tenants}")
        print(f"   Inactive tenants: {inactive_tenants}")
        print(f"   Orphaned tenants: {orphaned_tenants}")
    
    def generate_recent_deletions(self, days=7):
        """Show recent deletion activity"""
        since = timezone.now() - timedelta(days=days)
        
        # Recent soft deletions
        recent_deletions = User.objects.filter(
            is_deleted=True,
            deleted_at__gte=since
        ).order_by('-deleted_at')
        
        # Recent deletion logs
        recent_logs = AccountDeletionLog.objects.filter(
            deletion_date__gte=since
        ).order_by('-deletion_date')
        
        self.report_data['recent_activity'] = {
            'period_days': days,
            'recent_deletions_count': recent_deletions.count(),
            'recent_logs_count': recent_logs.count(),
            'recent_deletions': [
                {
                    'email': user.email,
                    'deleted_at': user.deleted_at.isoformat() if user.deleted_at else None,
                    'reason': user.deletion_reason
                }
                for user in recent_deletions[:10]
            ]
        }
        
        print(f"\n📅 Recent Activity (last {days} days):")
        print(f"   Recent deletions: {recent_deletions.count()}")
        print(f"   Deletion log entries: {recent_logs.count()}")
        
        if recent_deletions.exists():
            print("\n   Recent Deletions:")
            for user in recent_deletions[:5]:
                deleted_at = user.deleted_at.strftime('%Y-%m-%d %H:%M') if user.deleted_at else 'Unknown'
                print(f"   - {user.email} (deleted: {deleted_at})")
    
    def generate_deletion_logs_summary(self):
        """Summarize deletion logs"""
        total_logs = AccountDeletionLog.objects.count()
        
        # Logs by type
        logs_by_type = AccountDeletionLog.objects.values('deletion_initiated_by').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Auth0 deletion status
        auth0_deleted = AccountDeletionLog.objects.filter(auth0_deleted=True).count()
        database_deleted = AccountDeletionLog.objects.filter(database_deleted=True).count()
        
        # Batch operations
        batch_operations = AccountDeletionLog.objects.filter(
            Q(user_email='BATCH_DELETION') | 
            Q(user_email='BATCH_HARD_DELETION') | 
            Q(user_email='BATCH_RESTORATION')
        ).order_by('-deletion_date')
        
        self.report_data['deletion_logs'] = {
            'total_logs': total_logs,
            'logs_by_initiator': list(logs_by_type),
            'auth0_deletions': auth0_deleted,
            'database_deletions': database_deleted,
            'batch_operations_count': batch_operations.count()
        }
        
        print("\n📝 Deletion Logs Summary:")
        print(f"   Total log entries: {total_logs}")
        print(f"   Auth0 deletions: {auth0_deleted}")
        print(f"   Database deletions: {database_deleted}")
        
        if logs_by_type:
            print("\n   Deletions by Initiator:")
            for log_type in logs_by_type:
                print(f"   - {log_type['deletion_initiated_by'] or 'Unknown'}: {log_type['count']}")
        
        if batch_operations.exists():
            print(f"\n   Batch Operations: {batch_operations.count()}")
            for op in batch_operations[:3]:
                print(f"   - {op.user_email} on {op.deletion_date.strftime('%Y-%m-%d %H:%M')}")
    
    def generate_session_statistics(self):
        """Generate session statistics"""
        total_sessions = UserSession.objects.count()
        active_sessions = UserSession.objects.filter(is_active=True).count()
        
        # Sessions for deleted users
        deleted_user_sessions = 0
        for session in UserSession.objects.filter(is_active=True):
            if session.user.is_deleted:
                deleted_user_sessions += 1
        
        self.report_data['session_statistics'] = {
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'deleted_user_sessions': deleted_user_sessions
        }
        
        print("\n🔐 Session Statistics:")
        print(f"   Total sessions: {total_sessions}")
        print(f"   Active sessions: {active_sessions}")
        print(f"   Active sessions for deleted users: {deleted_user_sessions}")
    
    def generate_health_check(self):
        """Check for potential issues"""
        issues = []
        
        # Check for active sessions on deleted users
        active_deleted_sessions = UserSession.objects.filter(
            is_active=True,
            user__is_deleted=True
        ).count()
        if active_deleted_sessions > 0:
            issues.append(f"Found {active_deleted_sessions} active sessions for deleted users")
        
        # Check for orphaned tenants
        orphaned_count = 0
        for tenant in Tenant.objects.filter(is_active=True):
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    if owner.is_deleted:
                        orphaned_count += 1
                except User.DoesNotExist:
                    orphaned_count += 1
        
        if orphaned_count > 0:
            issues.append(f"Found {orphaned_count} active tenants with deleted/missing owners")
        
        # Check for users marked deleted but still active
        inconsistent_users = User.objects.filter(is_deleted=True, is_active=True).count()
        if inconsistent_users > 0:
            issues.append(f"Found {inconsistent_users} users marked as deleted but still active")
        
        self.report_data['health_check'] = {
            'issues_count': len(issues),
            'issues': issues
        }
        
        print("\n🏥 Health Check:")
        if issues:
            print(f"   ⚠️  Found {len(issues)} potential issues:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("   ✅ No issues found")
    
    def export_report(self, filename):
        """Export report to JSON file"""
        self.report_data['generated_at'] = datetime.now().isoformat()
        self.report_data['environment'] = os.environ.get('DJANGO_SETTINGS_MODULE', 'unknown')
        
        with open(filename, 'w') as f:
            json.dump(self.report_data, f, indent=2)
        
        print(f"\n📄 Report exported to: {filename}")
    
    def generate_full_report(self):
        """Generate complete deletion status report"""
        print("=" * 60)
        print("DELETION STATUS REPORT")
        print("=" * 60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.generate_user_statistics()
        self.generate_tenant_statistics()
        self.generate_recent_deletions()
        self.generate_deletion_logs_summary()
        self.generate_session_statistics()
        self.generate_health_check()
        
        print("\n" + "=" * 60)


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Generate deletion status report')
    parser.add_argument('--export', type=str, help='Export report to JSON file')
    parser.add_argument('--days', type=int, default=7, help='Days to look back for recent activity')
    
    args = parser.parse_args()
    
    report = DeletionStatusReport()
    report.generate_full_report()
    
    if args.export:
        report.export_report(args.export)


if __name__ == "__main__":
    main()