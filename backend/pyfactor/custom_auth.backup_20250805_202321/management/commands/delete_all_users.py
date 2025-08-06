"""
Django management command for deleting all users

Usage:
    python manage.py delete_all_users --soft
    python manage.py delete_all_users --hard --confirm
    python manage.py delete_all_users --analyze
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
import sys
import os

# Add scripts directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'scripts'))

from delete_all_users import BatchUserDeletion

User = get_user_model()


class Command(BaseCommand):
    help = 'Delete all users from the database - DANGEROUS OPERATION'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--soft',
            action='store_true',
            help='Soft delete all users (recoverable)'
        )
        
        parser.add_argument(
            '--hard',
            action='store_true',
            help='Hard delete all users (PERMANENT - cannot be undone)'
        )
        
        parser.add_argument(
            '--include-superusers',
            action='store_true',
            help='Include superusers in deletion (default: exclude superusers)'
        )
        
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Analyze impact without deleting'
        )
        
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompts (use with caution)'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion even in production (EXTREMELY DANGEROUS)'
        )
    
    def handle(self, *args, **options):
        batch_deletion = BatchUserDeletion()
        
        # Check environment unless forced
        if not options['force'] and not batch_deletion.check_environment():
            self.stdout.write(self.style.ERROR(
                '\n🚨 DANGER: Production environment detected!\n'
                'This command is disabled in production.\n'
                'If you really need to do this, add --force flag (NOT RECOMMENDED)'
            ))
            return
        
        # Show current statistics
        total_users = batch_deletion.count_users()
        
        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('No users in the database'))
            return
        
        # Analyze only
        if options['analyze']:
            self.stdout.write(self.style.WARNING(
                f'\nImpact Analysis:\n'
                f'- Would delete {total_users} users\n'
                f'- Deletion type: {"HARD (permanent)" if options["hard"] else "Soft (recoverable)"}\n'
                f'- Include superusers: {"Yes" if options["include_superusers"] else "No"}'
            ))
            return
        
        # Validate options
        if not options['soft'] and not options['hard']:
            raise CommandError('Please specify --soft or --hard deletion type')
        
        if options['soft'] and options['hard']:
            raise CommandError('Cannot specify both --soft and --hard')
        
        # Show warnings
        if options['hard']:
            self.stdout.write(self.style.ERROR(
                '\n⚠️  EXTREME WARNING ⚠️\n'
                'You are about to PERMANENTLY DELETE ALL USERS!\n'
                'This action is IRREVERSIBLE!\n'
                'All user data, sessions, and related records will be PERMANENTLY LOST!'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                '\n⚠️  WARNING: You are about to soft delete all users!\n'
                'Users can be restored later using the restore function.'
            ))
        
        # Get confirmation unless --confirm is used
        if not options['confirm']:
            if options['hard']:
                confirmation = input('\nType "DELETE ALL USERS PERMANENTLY" to continue: ')
                if confirmation != "DELETE ALL USERS PERMANENTLY":
                    self.stdout.write(self.style.WARNING('Deletion cancelled'))
                    return
            else:
                confirmation = input('\nType "DELETE ALL" to continue: ')
                if confirmation != "DELETE ALL":
                    self.stdout.write(self.style.WARNING('Deletion cancelled'))
                    return
        
        # Perform deletion
        try:
            # Override input for batch processing
            import builtins
            original_input = builtins.input
            
            if options['confirm']:
                # Auto-confirm individual deletions
                builtins.input = lambda _: 'yes'
            
            try:
                if options['hard']:
                    batch_deletion.hard_delete_all_users(
                        exclude_superusers=not options['include_superusers']
                    )
                else:
                    batch_deletion.soft_delete_all_users(
                        exclude_superusers=not options['include_superusers']
                    )
                
                # Clean up orphaned tenants
                batch_deletion.delete_all_tenants()
                
                self.stdout.write(self.style.SUCCESS('\n✅ Batch deletion completed successfully!'))
                
            finally:
                builtins.input = original_input
                
        except Exception as e:
            raise CommandError(f'Error during batch deletion: {str(e)}')