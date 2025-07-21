"""
Management command to fix duplicate PagePermission entries
"""
from django.core.management.base import BaseCommand
from django.db import models
from custom_auth.models import PagePermission


class Command(BaseCommand):
    help = 'Fixes duplicate PagePermission entries that prevent migrations from running'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Fixing PagePermission duplicates...\n')
        
        # Find duplicates based on path
        duplicates = (
            PagePermission.objects
            .values('path')
            .annotate(count=models.Count('id'))
            .filter(count__gt=1)
        )
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS('✅ No duplicate PagePermissions found!'))
            return
        
        total_deleted = 0
        
        for dup in duplicates:
            path = dup['path']
            count = dup['count']
            
            self.stdout.write(f'Found {count} entries for path: {path}')
            
            # Get all records for this path
            records = PagePermission.objects.filter(path=path).order_by('id')
            
            # Keep the first one, delete the rest
            first_record = records.first()
            self.stdout.write(f'  Keeping: ID={first_record.id}, Name="{first_record.name}"')
            
            # Delete duplicates
            duplicates_to_delete = records[1:]
            for record in duplicates_to_delete:
                self.stdout.write(f'  Deleting: ID={record.id}, Name="{record.name}"')
                record.delete()
                total_deleted += 1
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Fixed duplicates! Deleted {total_deleted} duplicate entries.'))
        self.stdout.write(f'Total PagePermissions remaining: {PagePermission.objects.count()}')