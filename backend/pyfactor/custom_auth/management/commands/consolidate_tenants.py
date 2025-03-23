import logging
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from pyfactor.custom_auth.models import User, Tenant
from pyfactor.custom_auth.utils import consolidate_user_tenants

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Find and consolidate duplicate tenants for users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only report duplicate tenants without consolidating them',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Consolidate tenants for a specific user email',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        specific_email = options.get('email')
        
        self.stdout.write(self.style.SUCCESS('Starting tenant consolidation task'))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all users with multiple tenants (either owned or linked)
        if specific_email:
            try:
                users = [User.objects.get(email=specific_email)]
                self.stdout.write(self.style.SUCCESS(f'Found user with email: {specific_email}'))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with email {specific_email} not found'))
                return
        else:
            # Find users who are either owners of multiple tenants or linked to multiple tenants
            user_tenant_counts = defaultdict(int)
            
            # Check users who own tenants
            owners = User.objects.filter(owned_tenants__isnull=False).annotate(
                owned_count=Count('owned_tenants')
            ).filter(owned_count__gt=0)
            
            for user in owners:
                user_tenant_counts[user.id] += user.owned_count
            
            # Check users linked to tenants
            linked_users = User.objects.filter(tenant__isnull=False)
            for user in linked_users:
                user_tenant_counts[user.id] += 1
            
            # Find users with multiple tenants
            users_with_multiple_tenants = []
            for user_id, count in user_tenant_counts.items():
                if count > 1:
                    try:
                        user = User.objects.get(id=user_id)
                        users_with_multiple_tenants.append(user)
                    except User.DoesNotExist:
                        continue
            
            users = users_with_multiple_tenants
        
        self.stdout.write(self.style.SUCCESS(f'Found {len(users)} users with potential duplicate tenants'))
        
        # Process each user
        consolidated_count = 0
        for user in users:
            # Count owned tenants
            owned_tenants = Tenant.objects.filter(owner=user)
            # Count linked tenants
            linked_tenants = Tenant.objects.filter(users=user)
            
            total_tenants = set([t.id for t in owned_tenants] + [t.id for t in linked_tenants])
            
            if len(total_tenants) > 1:
                self.stdout.write(f'User {user.email} has {len(total_tenants)} tenants')
                
                if dry_run:
                    for tenant in owned_tenants:
                        self.stdout.write(f'  - Owned: {tenant.schema_name} (ID: {tenant.id})')
                    for tenant in linked_tenants:
                        if tenant.id not in [t.id for t in owned_tenants]:
                            self.stdout.write(f'  - Linked: {tenant.schema_name} (ID: {tenant.id})')
                else:
                    try:
                        # Consolidate tenants for this user
                        primary_tenant = consolidate_user_tenants(user)
                        if primary_tenant:
                            self.stdout.write(self.style.SUCCESS(
                                f'Consolidated tenants for {user.email}, primary tenant: {primary_tenant.schema_name}'
                            ))
                            consolidated_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'Error consolidating tenants for {user.email}: {str(e)}'
                        ))
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'Found {len(users)} users with duplicate tenants. Run without --dry-run to consolidate.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Successfully consolidated tenants for {consolidated_count} out of {len(users)} users'
            )) 