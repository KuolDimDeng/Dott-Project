"""
Django management command for user deletion

Usage:
    python manage.py delete_user user@example.com
    python manage.py delete_user user@example.com --hard
    python manage.py delete_user user@example.com --no-auth0
    python manage.py delete_user --list
    python manage.py delete_user --restore user@example.com
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
import sys
import os

# Add scripts directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'scripts'))

from comprehensive_user_deletion import UserDeletionManager
from user_deletion_with_auth0 import delete_user_complete, check_auth0_user
from quick_user_soft_delete import list_deleted_users, check_user_status, soft_delete_user, restore_user

User = get_user_model()


class Command(BaseCommand):
    help = 'Delete users from the system with various options'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            nargs='?',
            type=str,
            help='Email address of the user to delete'
        )
        
        parser.add_argument(
            '--hard',
            action='store_true',
            help='Perform hard delete (permanent removal of all data)'
        )
        
        parser.add_argument(
            '--no-auth0',
            action='store_true',
            help='Skip Auth0 deletion'
        )
        
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Analyze user relationships without deleting'
        )
        
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all soft-deleted users'
        )
        
        parser.add_argument(
            '--restore',
            type=str,
            help='Restore a soft-deleted user by email'
        )
        
        parser.add_argument(
            '--status',
            type=str,
            help='Check deletion status of a user'
        )
        
        parser.add_argument(
            '--reason',
            type=str,
            default='Admin requested deletion',
            help='Reason for deletion'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompts'
        )
    
    def handle(self, *args, **options):
        # Handle list command
        if options['list']:
            list_deleted_users()
            return
        
        # Handle restore command
        if options['restore']:
            email = options['restore']
            try:
                if restore_user(email):
                    self.stdout.write(self.style.SUCCESS(f'Successfully restored user: {email}'))
                else:
                    self.stdout.write(self.style.ERROR(f'Failed to restore user: {email}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error restoring user: {str(e)}'))
            return
        
        # Handle status check
        if options['status']:
            check_user_status(options['status'])
            return
        
        # Get email from arguments
        email = options['email']
        if not email:
            self.stdout.write(self.style.ERROR('Please provide an email address'))
            return
        
        # Verify user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User not found: {email}')
        
        # Handle analyze command
        if options['analyze']:
            manager = UserDeletionManager()
            manager.analyze_user_relationships(user)
            return
        
        # Determine deletion type
        hard_delete = options['hard']
        skip_auth0 = options['no_auth0']
        reason = options['reason']
        
        # Show warning and get confirmation
        if not options['force']:
            self.stdout.write(self.style.WARNING('\n=== USER DELETION WARNING ==='))
            self.stdout.write(f'User: {email}')
            self.stdout.write(f'Type: {"HARD DELETE (Permanent)" if hard_delete else "Soft Delete (Recoverable)"}')
            self.stdout.write(f'Delete from Auth0: {"No" if skip_auth0 else "Yes"}')
            self.stdout.write(f'Reason: {reason}')
            
            if hard_delete:
                self.stdout.write(self.style.WARNING('\n⚠️  HARD DELETE will permanently remove ALL user data!'))
                self.stdout.write(self.style.WARNING('This action cannot be undone!'))
            
            confirmation = input('\nType "DELETE" to confirm: ')
            if confirmation != 'DELETE':
                self.stdout.write(self.style.WARNING('Deletion cancelled'))
                return
        
        # Perform deletion
        try:
            if skip_auth0:
                # Use local deletion without Auth0
                if hard_delete:
                    # Use comprehensive deletion manager for hard delete
                    manager = UserDeletionManager()
                    success = manager.hard_delete_user(user, reason=reason)
                else:
                    # Use quick soft delete
                    success = soft_delete_user(email, reason=reason)
            else:
                # Use complete deletion including Auth0
                success = delete_user_complete(email, delete_from_auth0=True, hard_delete=hard_delete)
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully deleted user: {email}'))
                if not hard_delete:
                    self.stdout.write(self.style.SUCCESS(f'To restore: python manage.py delete_user --restore {email}'))
            else:
                self.stdout.write(self.style.ERROR(f'\n❌ Failed to delete user: {email}'))
                
        except Exception as e:
            raise CommandError(f'Error deleting user: {str(e)}')