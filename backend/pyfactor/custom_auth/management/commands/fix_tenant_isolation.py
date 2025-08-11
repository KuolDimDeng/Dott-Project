"""
Management command to fix tenant isolation issues.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.tenant_fix import (
    fix_user_tenant_mapping,
    ensure_all_data_has_tenant,
    verify_tenant_isolation
)


class Command(BaseCommand):
    help = 'Fix tenant isolation issues to ensure users only see their own data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verify-only',
            action='store_true',
            help='Only verify isolation without applying fixes',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Verify isolation for a specific user email',
        )

    def handle(self, *args, **options):
        verify_only = options.get('verify_only')
        user_email = options.get('user')
        
        if user_email:
            # Verify specific user
            self.stdout.write(f"Verifying tenant isolation for {user_email}...")
            result = verify_tenant_isolation(user_email)
            
            if result['status'] == 'success':
                self.stdout.write(self.style.SUCCESS(f"✅ User: {user_email}"))
                self.stdout.write(f"   Tenant ID: {result['tenant_id']}")
                self.stdout.write(f"   Data counts: {result['data_counts']}")
                if any(result['orphaned_data'].values()):
                    self.stdout.write(self.style.WARNING(f"   ⚠️  Orphaned data found: {result['orphaned_data']}"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ Error: {result['message']}"))
            return
        
        if verify_only:
            # Just verify without fixing
            self.stdout.write("Verifying tenant isolation (no fixes will be applied)...")
            
            # Check key users
            key_users = ['support@dottapps.com', 'jubacargovillage@outlook.com']
            for email in key_users:
                result = verify_tenant_isolation(email)
                if result['status'] == 'success':
                    self.stdout.write(self.style.SUCCESS(f"✅ {email}: {result['data_counts']}"))
                else:
                    self.stdout.write(self.style.ERROR(f"❌ {email}: {result.get('message', 'Unknown error')}"))
        else:
            # Apply fixes
            self.stdout.write("Applying tenant isolation fixes...")
            
            with transaction.atomic():
                # Fix user tenant mappings
                self.stdout.write("Step 1: Fixing user tenant mappings...")
                user_fixes = fix_user_tenant_mapping()
                self.stdout.write(self.style.SUCCESS(f"✅ Fixed {user_fixes['users_fixed']} users"))
                if user_fixes['users_with_issues']:
                    self.stdout.write(self.style.WARNING(f"⚠️  Users with issues: {user_fixes['users_with_issues']}"))
                
                # Ensure all data has tenant_id
                self.stdout.write("\nStep 2: Ensuring all data has tenant_id...")
                data_fixes = ensure_all_data_has_tenant()
                if data_fixes:
                    self.stdout.write(self.style.SUCCESS(f"✅ Fixed orphaned data: {data_fixes}"))
                else:
                    self.stdout.write(self.style.SUCCESS("✅ No orphaned data found"))
                
                # Verify key users
                self.stdout.write("\nStep 3: Verifying key users...")
                key_users = ['support@dottapps.com', 'jubacargovillage@outlook.com']
                for email in key_users:
                    result = verify_tenant_isolation(email)
                    if result['status'] == 'success':
                        self.stdout.write(self.style.SUCCESS(f"✅ {email}: {result['data_counts']}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"⚠️  {email}: {result.get('message', 'Unknown error')}"))
            
            self.stdout.write(self.style.SUCCESS("\n✅ Tenant isolation fixes applied successfully!"))