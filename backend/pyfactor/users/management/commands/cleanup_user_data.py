"""
Django management command to completely clean up a user and all associated data.
This includes the user account, tenant, and all related records.

Usage: python manage.py cleanup_user_data <email>
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction as db_transaction
from django.apps import apps
from users.models import CustomUser, TenantUser
from tenants.models import Tenant
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up a user account and all associated data including tenant and related records'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address of the user to clean up'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        email = options['email']
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)

        try:
            # Find the user
            user = CustomUser.objects.get(email=email)
            self.stdout.write(f"Found user: {user.email} (ID: {user.id})")

            # Find associated tenants
            tenant_users = TenantUser.objects.filter(user=user)
            tenants = [tu.tenant for tu in tenant_users]
            
            if not tenants:
                self.stdout.write(self.style.WARNING("No tenants found for this user"))
            else:
                self.stdout.write(f"Found {len(tenants)} tenant(s) associated with this user:")
                for tenant in tenants:
                    self.stdout.write(f"  - {tenant.name} (ID: {tenant.id})")

            # Get all models that might have tenant relationships
            models_to_check = []
            for app_config in apps.get_app_configs():
                for model in app_config.get_models():
                    # Check if model has a tenant field
                    if hasattr(model, 'tenant'):
                        models_to_check.append(model)

            # Count related records
            self.stdout.write("\nRelated records to be deleted:")
            deletion_summary = {}
            
            for tenant in tenants:
                self.stdout.write(f"\nFor tenant '{tenant.name}':")
                for model in models_to_check:
                    model_name = f"{model._meta.app_label}.{model._meta.model_name}"
                    try:
                        count = model.objects.filter(tenant=tenant).count()
                        if count > 0:
                            deletion_summary[model_name] = deletion_summary.get(model_name, 0) + count
                            self.stdout.write(f"  - {model_name}: {count} records")
                    except Exception as e:
                        # Some models might have different field names or relationships
                        pass

            # Add user-specific models
            user_model_counts = {
                'notifications.NotificationRecipient': user.notificationrecipient_set.count() if hasattr(user, 'notificationrecipient_set') else 0,
                'smart_insights.SmartInsightsCreditTransaction': user.smart_insights_credit_transactions.count() if hasattr(user, 'smart_insights_credit_transactions') else 0,
                'sessions.Session': user.session_set.count() if hasattr(user, 'session_set') else 0,
            }

            for model_name, count in user_model_counts.items():
                if count > 0:
                    self.stdout.write(f"\nUser-specific records:")
                    self.stdout.write(f"  - {model_name}: {count} records")

            # Confirmation
            if not force and not dry_run:
                self.stdout.write(self.style.WARNING("\nWARNING: This will permanently delete all the above data!"))
                confirm = input("Are you sure you want to proceed? Type 'yes' to confirm: ")
                if confirm.lower() != 'yes':
                    self.stdout.write(self.style.ERROR("Operation cancelled"))
                    return

            if dry_run:
                self.stdout.write(self.style.SUCCESS("\nDry run completed. No data was deleted."))
                return

            # Perform deletion
            self.stdout.write("\nDeleting data...")
            
            with db_transaction.atomic():
                # Delete all tenant-related data
                for tenant in tenants:
                    self.stdout.write(f"\nDeleting data for tenant '{tenant.name}'...")
                    
                    # Delete all records from models with tenant field
                    for model in models_to_check:
                        model_name = f"{model._meta.app_label}.{model._meta.model_name}"
                        try:
                            deleted_count = model.objects.filter(tenant=tenant).delete()[0]
                            if deleted_count > 0:
                                self.stdout.write(f"  - Deleted {deleted_count} {model_name} records")
                        except Exception as e:
                            # Some models might have different relationships
                            pass
                    
                    # Delete the tenant itself
                    tenant.delete()
                    self.stdout.write(f"  - Deleted tenant '{tenant.name}'")

                # Delete user-specific data
                if hasattr(user, 'notificationrecipient_set'):
                    count = user.notificationrecipient_set.all().delete()[0]
                    if count > 0:
                        self.stdout.write(f"  - Deleted {count} notification recipients")
                
                if hasattr(user, 'smart_insights_credit_transactions'):
                    count = user.smart_insights_credit_transactions.all().delete()[0]
                    if count > 0:
                        self.stdout.write(f"  - Deleted {count} smart insights transactions")
                
                if hasattr(user, 'session_set'):
                    count = user.session_set.all().delete()[0]
                    if count > 0:
                        self.stdout.write(f"  - Deleted {count} sessions")

                # Delete TenantUser relationships
                TenantUser.objects.filter(user=user).delete()
                
                # Finally, delete the user
                user.delete()
                self.stdout.write(self.style.SUCCESS(f"\nSuccessfully deleted user '{email}' and all associated data"))

        except CustomUser.DoesNotExist:
            raise CommandError(f"User with email '{email}' does not exist")
        except Exception as e:
            logger.exception(f"Error cleaning up user data for {email}")
            raise CommandError(f"Error occurred: {str(e)}")